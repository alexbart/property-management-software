import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

vi.mock("../../../database/prisma.js", () => ({
  prisma: {
    property: { findUnique: vi.fn() },
    ledgerEntry: { aggregate: vi.fn() },
    payment: { aggregate: vi.fn() },
    maintenanceTicket: { aggregate: vi.fn() },
  },
}));

import { prisma } from "../../../database/prisma.js";
import { NotFoundException } from "./finance.service.js";
import { getPropertyReconciliation } from "./reconciliation.service.js";

const range = {
  startDate: new Date("2026-01-01T00:00:00Z"),
  endDate: new Date("2026-02-01T00:00:00Z"),
};

describe("reconciliation service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.property.findUnique).mockResolvedValue({
      id: "property-1",
    } as never);
  });

  it("aggregates rent, payments and maintenance into an NOI", async () => {
    vi.mocked(prisma.ledgerEntry.aggregate).mockResolvedValue({
      _sum: { amount: new Prisma.Decimal("20000.00") },
    } as never);
    vi.mocked(prisma.payment.aggregate).mockResolvedValue({
      _sum: { amount: new Prisma.Decimal("15000.00") },
    } as never);
    vi.mocked(prisma.maintenanceTicket.aggregate).mockResolvedValue({
      _sum: { actualCost: new Prisma.Decimal("2500.00") },
    } as never);

    const result = await getPropertyReconciliation(
      "property-1",
      range.startDate,
      range.endDate,
    );

    expect(Number(result.totalRentDue)).toBe(20000);
    expect(Number(result.totalCollected)).toBe(15000);
    expect(Number(result.totalMaintenanceExpenses)).toBe(2500);
    // 15000 - 2500 = 12500.
    expect(Number(result.estimatedNOI)).toBe(12500);
  });

  it("throws when the property does not exist", async () => {
    vi.mocked(prisma.property.findUnique).mockResolvedValue(null);

    await expect(
      getPropertyReconciliation(
        "missing-property",
        range.startDate,
        range.endDate,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.ledgerEntry.aggregate).not.toHaveBeenCalled();
  });
});