import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

vi.mock("../../../database/prisma.js", () => ({
  prisma: {
    lease: { findFirst: vi.fn() },
    ledgerEntry: { findMany: vi.fn() },
    payment: { findMany: vi.fn() },
  },
}));

import { prisma } from "../../../database/prisma.js";
import {
  calculateLeaseArrears,
  type LeaseArrears,
} from "./arrears.service.js";
import { NotFoundException } from "./finance.service.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const lease = { id: "lease-1", propertyId: "property-1" } as never;

function rentEntry(
  amount: string,
  effectiveDate: Date,
  type: "RENT" | "PENALTY" = "RENT",
) {
  return { type, amount: new Prisma.Decimal(amount), effectiveDate } as never;
}

function completedPayment(amount: string) {
  return { amount: new Prisma.Decimal(amount), status: "COMPLETED" } as never;
}

function expectDecimal(actual: Prisma.Decimal, expected: string) {
  expect(actual.equals(new Prisma.Decimal(expected))).toBe(true);
}

describe("arrears service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.lease.findFirst).mockResolvedValue(lease);
  });

  it("calculates days overdue and penalty after the grace period with no payments", async () => {
    const asOf = new Date("2026-03-01T00:00:00Z");
    const rentDate = new Date(asOf.getTime() - 60 * MS_PER_DAY);

    vi.mocked(prisma.ledgerEntry.findMany).mockResolvedValue([
      rentEntry("10000.00", rentDate),
    ]);
    vi.mocked(prisma.payment.findMany).mockResolvedValue([]);

    const result = await calculateLeaseArrears(
      "lease-1",
      "property-1",
      asOf,
    );

    // 60 days since rent, 30-day grace => 30 days overdue.
    expect(result.daysOverdue).toBe(30);
    expectDecimal(result.totalDue, "10000.00");
    expectDecimal(result.totalPaid, "0");
    expectDecimal(result.currentBalance, "10000.00");
    // 10000 * 0.03 * 30 = 9000 (simple interest).
    expectDecimal(result.penaltyAccrued, "9000.00");
  });

  it("reduces the balance and penalty for a partial payment", async () => {
    const asOf = new Date("2026-03-01T00:00:00Z");
    const rentDate = new Date(asOf.getTime() - 60 * MS_PER_DAY);

    vi.mocked(prisma.ledgerEntry.findMany).mockResolvedValue([
      rentEntry("10000.00", rentDate),
    ]);
    vi.mocked(prisma.payment.findMany).mockResolvedValue([
      completedPayment("4000.00"),
    ]);

    const result = await calculateLeaseArrears(
      "lease-1",
      "property-1",
      asOf,
    );

    expect(result.daysOverdue).toBe(30);
    expectDecimal(result.currentBalance, "6000.00");
    // 6000 * 0.03 * 30 = 5400.
    expectDecimal(result.penaltyAccrued, "5400.00");
  });

  it("returns zero balance, days overdue and penalty when fully paid", async () => {
    const asOf = new Date("2026-03-01T00:00:00Z");
    const rentDate = new Date(asOf.getTime() - 60 * MS_PER_DAY);

    vi.mocked(prisma.ledgerEntry.findMany).mockResolvedValue([
      rentEntry("10000.00", rentDate),
    ]);
    vi.mocked(prisma.payment.findMany).mockResolvedValue([
      completedPayment("10000.00"),
    ]);

    const result: LeaseArrears = await calculateLeaseArrears(
      "lease-1",
      "property-1",
      asOf,
    );

    expectDecimal(result.currentBalance, "0");
    expect(result.daysOverdue).toBe(0);
    expectDecimal(result.penaltyAccrued, "0");
  });

  it("throws when the lease does not belong to the property", async () => {
    vi.mocked(prisma.lease.findFirst).mockResolvedValue(null);

    await expect(
      calculateLeaseArrears("lease-1", "other-property"),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.ledgerEntry.findMany).not.toHaveBeenCalled();
    expect(prisma.payment.findMany).not.toHaveBeenCalled();
  });
});