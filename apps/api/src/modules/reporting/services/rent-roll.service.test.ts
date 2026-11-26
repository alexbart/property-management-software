import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

vi.mock("../../../database/prisma.js", () => ({
  prisma: {
    lease: { findMany: vi.fn() },
  },
}));

vi.mock("../../finance/services/arrears.service.js", () => ({
  calculateLeaseArrears: vi.fn(),
}));

import { prisma } from "../../../database/prisma.js";
import { calculateLeaseArrears } from "../../finance/services/arrears.service.js";
import { generateRentRollCsv } from "./rent-roll.service.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockedPrisma = vi.mocked(prisma) as any;
const mockedArrears = vi.mocked(calculateLeaseArrears);

describe("generateRentRollCsv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("formats active leases with arrears into CSV", async () => {
    mockedPrisma.lease.findMany.mockResolvedValue([
      {
        id: "lease_1",
        propertyId: "prop_1",
        status: "ACTIVE",
        rentAmount: new Prisma.Decimal("15000.00"),
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        tenant: { firstName: "Jane", lastName: "Doe", phone: "0712345678" },
        unit: { unitNumber: "A-101" },
      },
      {
        id: "lease_2",
        propertyId: "prop_1",
        status: "ACTIVE",
        rentAmount: new Prisma.Decimal("12000.00"),
        startDate: new Date("2026-02-01T00:00:00.000Z"),
        tenant: { firstName: "John", lastName: "Kamau", phone: "0722000111" },
        unit: { unitNumber: "B-202" },
      },
    ]);

    mockedArrears.mockResolvedValueOnce({
      totalDue: new Prisma.Decimal("15000.00"),
      totalPaid: new Prisma.Decimal("10000.00"),
      currentBalance: new Prisma.Decimal("5000.00"),
      daysOverdue: 5,
      penaltyAccrued: new Prisma.Decimal("0.00"),
    });
    mockedArrears.mockResolvedValueOnce({
      totalDue: new Prisma.Decimal("12000.00"),
      totalPaid: new Prisma.Decimal("12000.00"),
      currentBalance: new Prisma.Decimal("0.00"),
      daysOverdue: 0,
      penaltyAccrued: new Prisma.Decimal("0.00"),
    });

    const result = await generateRentRollCsv("prop_1");

    expect(result.mimeType).toBe("text/csv");
    expect(result.filename).toBe("rent-roll-prop_1.csv");
    expect(result.content).toContain("Unit Number");
    expect(result.content).toContain("Tenant Name");
    expect(result.content).toContain("Current Balance");
    expect(result.content).toContain("A-101");
    expect(result.content).toContain("Jane Doe");
    expect(result.content).toContain("5000.00");
    expect(result.content).toContain("B-202");
    expect(result.content).toContain("0.00");

    // Only ACTIVE leases are requested for the property.
    expect(mockedPrisma.lease.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ propertyId: "prop_1", status: "ACTIVE" }),
      }),
    );
    // Arrears calculated per lease against the same property.
    expect(mockedArrears).toHaveBeenCalledTimes(2);
    expect(mockedArrears).toHaveBeenCalledWith("lease_1", "prop_1");
  });
});