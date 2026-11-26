import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

vi.mock("../../../database/prisma.js", () => ({
  prisma: {
    payment: { findFirst: vi.fn() },
  },
}));

vi.mock("pdfmake", () => {
  return {
    default: class {
      createPdfKitDocument() {
        const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
        return {
          on(event: string, cb: (...args: unknown[]) => void) {
            (listeners[event] ??= []).push(cb);
          },
          end() {
            for (const cb of listeners["data"] ?? []) {
              cb(Buffer.from("%PDF-1.4 fake receipt"));
            }
            for (const cb of listeners["end"] ?? []) {
              cb();
            }
          },
        };
      }
    },
  };
});

import { prisma } from "../../../database/prisma.js";
import { generatePaymentReceiptPdf } from "./receipt.service.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockedPrisma = vi.mocked(prisma) as any;

function completedPayment(overrides: Record<string, unknown> = {}) {
  return {
    id: "pay_1",
    propertyId: "prop_1",
    amount: new Prisma.Decimal("15000.00"),
    method: "MPESA",
    reference: "REF123",
    status: "COMPLETED",
    receivedAt: new Date("2026-03-01T00:00:00.000Z"),
    lease: {
      tenant: { firstName: "Jane", lastName: "Doe" },
      unit: { unitNumber: "A-101" },
    },
    ...overrides,
  };
}

describe("generatePaymentReceiptPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws NotFound when the payment is not owned by the property", async () => {
    mockedPrisma.payment.findFirst.mockResolvedValue(null);

    await expect(
      generatePaymentReceiptPdf("pay_1", "other_property"),
    ).rejects.toThrow(/not found for property/);

    expect(mockedPrisma.payment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "pay_1", propertyId: "other_property" },
      }),
    );
  });

  it("throws Conflict when the payment is not COMPLETED", async () => {
    mockedPrisma.payment.findFirst.mockResolvedValue(
      completedPayment({ status: "PENDING" }),
    );

    await expect(
      generatePaymentReceiptPdf("pay_1", "prop_1"),
    ).rejects.toThrow(/not completed/);
  });

  it("returns a PDF buffer for a completed payment", async () => {
    mockedPrisma.payment.findFirst.mockResolvedValue(completedPayment());

    const result = await generatePaymentReceiptPdf("pay_1", "prop_1");

    expect(result.mimeType).toBe("application/pdf");
    expect(result.filename).toBe("receipt-pay_1.pdf");
    expect(Buffer.isBuffer(result.buffer)).toBe(true);
    expect(result.buffer.length).toBeGreaterThan(0);
  });
});