import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

vi.mock("../../../database/prisma.js", () => ({
  prisma: {
    lease: { findMany: vi.fn() },
    tenant: { update: vi.fn() },
  },
}));

vi.mock("../../finance/services/arrears.service.js", () => ({
  calculateLeaseArrears: vi.fn(),
}));

import { prisma } from "../../../database/prisma.js";
import { calculateLeaseArrears } from "../../finance/services/arrears.service.js";
import { NotFoundException } from "../../finance/services/finance.service.js";
import {
  evaluateAndUpdateRiskScore,
  riskConfig,
} from "./tenant-risk.service.js";

const leases = [{ id: "lease-1" }] as never;

function arrears(balance: string, daysOverdue: number) {
  return {
    totalDue: new Prisma.Decimal(balance),
    totalPaid: new Prisma.Decimal("0"),
    currentBalance: new Prisma.Decimal(balance),
    daysOverdue,
    penaltyAccrued: new Prisma.Decimal("0"),
  };
}

describe("tenant risk service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.lease.findMany).mockResolvedValue(leases);
    vi.mocked(prisma.tenant.update).mockImplementation((({ data }: {
      data: { riskScore: number; riskFlags: string[] };
    }) =>
      Promise.resolve({
        id: "tenant-1",
        riskScore: data.riskScore,
        riskFlags: data.riskFlags,
      })) as never);
  });

  it("keeps a clean tenant at score 0 with no flags", async () => {
    vi.mocked(calculateLeaseArrears).mockResolvedValue(arrears("0", 0));

    const result = await evaluateAndUpdateRiskScore("tenant-1", "property-1");

    expect(result.riskScore).toBe(0);
    expect(result.riskFlags).toEqual([]);
    expect(prisma.tenant.update).toHaveBeenCalledWith({
      where: { id: "tenant-1" },
      data: { riskScore: 0, riskFlags: [] },
    });
  });

  it("adds HIGH_RISK for a tenant with active arrears", async () => {
    vi.mocked(calculateLeaseArrears).mockResolvedValue(arrears("10000", 30));

    const result = await evaluateAndUpdateRiskScore("tenant-1", "property-1");

    const expectedScore =
      riskConfig.ARREARS_POINTS + riskConfig.LATE_PAYMENT_POINTS;
    expect(result.riskScore).toBe(expectedScore);
    expect(result.riskFlags).toContain("HIGH_RISK");
    expect(result.riskFlags).toContain("CHRONIC_LATE");
  });

  it("throws when the tenant has no leases in the property", async () => {
    vi.mocked(prisma.lease.findMany).mockResolvedValue([]);

    await expect(
      evaluateAndUpdateRiskScore("tenant-1", "other-property"),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.tenant.update).not.toHaveBeenCalled();
    expect(calculateLeaseArrears).not.toHaveBeenCalled();
  });
});