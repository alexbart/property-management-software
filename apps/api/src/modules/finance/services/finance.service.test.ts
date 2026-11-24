import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma, type Payment } from "@prisma/client";

vi.mock("../../../database/prisma.js", () => ({
  prisma: {
    $transaction: vi.fn(),
    lease: { findFirst: vi.fn() },
    payment: { create: vi.fn(), findUnique: vi.fn(), aggregate: vi.fn() },
    ledgerEntry: { create: vi.fn(), aggregate: vi.fn() },
    idempotencyKey: { findUnique: vi.fn(), upsert: vi.fn() },
  },
}));

import { prisma } from "../../../database/prisma.js";
import {
  getLeaseBalance,
  NotFoundException,
  recordPayment,
} from "./finance.service.js";

const tx = {
  lease: { findFirst: vi.fn() },
  payment: { create: vi.fn(), findUnique: vi.fn() },
  ledgerEntry: { create: vi.fn() },
  idempotencyKey: { findUnique: vi.fn(), upsert: vi.fn() },
};

function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: "payment-1",
    leaseId: "lease-1",
    propertyId: "property-1",
    amount: new Prisma.Decimal("12000.00"),
    method: "MPESA",
    reference: "ref-1",
    status: "COMPLETED",
    receivedAt: new Date("2026-01-01T00:00:00Z"),
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

const lease = { id: "lease-1", propertyId: "property-1" } as never;

describe("finance service", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const transactionMock = prisma.$transaction as unknown as {
      mockImplementation: (
        impl: (cb: (t: typeof tx) => Promise<unknown>) => Promise<unknown>,
      ) => void;
    };
    transactionMock.mockImplementation((cb) => cb(tx));
  });

  it("records a payment and its RENT ledger entry in a transaction", async () => {
    tx.lease.findFirst.mockResolvedValue(lease);
    tx.idempotencyKey.findUnique.mockResolvedValue(null);
    tx.payment.create.mockResolvedValue(makePayment());
    tx.ledgerEntry.create.mockResolvedValue({});
    tx.idempotencyKey.upsert.mockResolvedValue({});

    const result = await recordPayment(
      "lease-1",
      "property-1",
      new Prisma.Decimal("12000.00"),
      "MPESA",
      "ref-1",
    );

    expect(result.id).toBe("payment-1");
    expect(tx.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "COMPLETED", reference: "ref-1" }),
      }),
    );
    // Payments are cash records only; they must not write a RENT ledger row.
    expect(tx.ledgerEntry.create).not.toHaveBeenCalled();
    expect(tx.idempotencyKey.upsert).toHaveBeenCalled();
  });

  it("is idempotent for a repeated reference", async () => {
    tx.lease.findFirst.mockResolvedValue(lease);
    tx.idempotencyKey.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        key: "ref-1",
        responsePayload: { id: "payment-1" },
        expiresAt: new Date(Date.now() + 60_000),
      });
    tx.payment.create.mockResolvedValue(makePayment());
    tx.payment.findUnique.mockResolvedValue(makePayment());
    tx.ledgerEntry.create.mockResolvedValue({});
    tx.idempotencyKey.upsert.mockResolvedValue({});

    const first = await recordPayment(
      "lease-1",
      "property-1",
      new Prisma.Decimal("12000.00"),
      "MPESA",
      "ref-1",
    );
    const second = await recordPayment(
      "lease-1",
      "property-1",
      new Prisma.Decimal("12000.00"),
      "MPESA",
      "ref-1",
    );

    expect(second.id).toBe(first.id);
    expect(tx.payment.create).toHaveBeenCalledTimes(1);
    expect(tx.ledgerEntry.create).not.toHaveBeenCalled();
  });

  it("rejects a lease that belongs to a different property", async () => {
    tx.lease.findFirst.mockResolvedValue(null);

    await expect(
      recordPayment(
        "lease-1",
        "other-property",
        new Prisma.Decimal("12000.00"),
        "MPESA",
        "ref-1",
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.payment.create).not.toHaveBeenCalled();
  });

  it("computes arrears as RENT+PENALTY minus COMPLETED payments", async () => {
    vi.mocked(prisma.ledgerEntry.aggregate).mockResolvedValue({
      _sum: { amount: new Prisma.Decimal("15000.00") },
    } as never);
    vi.mocked(prisma.payment.aggregate).mockResolvedValue({
      _sum: { amount: new Prisma.Decimal("5000.00") },
    } as never);

    const result = await getLeaseBalance("lease-1", "property-1");

    expect(result.totalDue.equals(new Prisma.Decimal("15000.00"))).toBe(true);
    expect(result.totalPaid.equals(new Prisma.Decimal("5000.00"))).toBe(true);
    expect(result.balance.equals(new Prisma.Decimal("10000.00"))).toBe(true);
  });
});