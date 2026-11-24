import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../database/prisma.js", () => ({
  prisma: {
    lease: { findFirst: vi.fn() },
    tenantNotice: { create: vi.fn() },
  },
}));

import { prisma } from "../../../database/prisma.js";
import { NotFoundException } from "../../finance/services/finance.service.js";
import { BadRequestException, createNotice } from "./notice.service.js";

const base = {
  leaseId: "lease-1",
  propertyId: "property-1",
  tenantId: "tenant-1",
  noticeDate: new Date("2026-01-01T00:00:00Z"),
};

describe("notice service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.lease.findFirst).mockResolvedValue({
      noticePeriodDays: 30,
    } as never);
    vi.mocked(prisma.tenantNotice.create).mockResolvedValue({
      id: "notice-1",
    } as never);
  });

  it("rejects a move-out date less than 30 days after the notice date", async () => {
    await expect(
      createNotice({
        ...base,
        intendedMoveOutDate: new Date("2026-01-15T00:00:00Z"),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.tenantNotice.create).not.toHaveBeenCalled();
  });

  it("creates a notice when the minimum period is satisfied", async () => {
    const result = await createNotice({
      ...base,
      intendedMoveOutDate: new Date("2026-02-01T00:00:00Z"),
      reason: "Relocating",
    });

    expect(result).toEqual({ id: "notice-1" });
    expect(prisma.tenantNotice.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        leaseId: "lease-1",
        propertyId: "property-1",
        tenantId: "tenant-1",
        reason: "Relocating",
      }),
    });
  });

  it("enforces property isolation for the lease", async () => {
    vi.mocked(prisma.lease.findFirst).mockResolvedValue(null);

    await expect(
      createNotice({
        ...base,
        intendedMoveOutDate: new Date("2026-02-01T00:00:00Z"),
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.tenantNotice.create).not.toHaveBeenCalled();
  });
});