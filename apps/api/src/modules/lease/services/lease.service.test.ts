import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma, type Lease } from "@prisma/client";

vi.mock("../../../database/prisma.js", () => ({
  prisma: {
    lease: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "../../../database/prisma.js";
import {
  activateLease,
  ConflictException,
  createLease,
  NotFoundException,
  terminateLease,
} from "./lease.service.js";

function makeLease(overrides: Partial<Lease> = {}): Lease {
  return {
    id: "lease-1",
    tenantId: "tenant-1",
    unitId: "unit-1",
    propertyId: "property-1",
    startDate: new Date("2026-01-01T00:00:00Z"),
    endDate: new Date("2026-12-31T00:00:00Z"),
    noticePeriodDays: 30,
    rentAmount: new Prisma.Decimal("12000.00"),
    depositAmount: new Prisma.Decimal("12000.00"),
    status: "DRAFT",
    terminatedAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("lease service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a lease in DRAFT status", async () => {
    vi.mocked(prisma.lease.create).mockResolvedValue(makeLease());

    const result = await createLease({
      tenantId: "tenant-1",
      unitId: "unit-1",
      propertyId: "property-1",
      startDate: new Date("2026-01-01T00:00:00Z"),
      endDate: new Date("2026-12-31T00:00:00Z"),
      rentAmount: new Prisma.Decimal("12000.00"),
      depositAmount: new Prisma.Decimal("12000.00"),
    });

    expect(result.status).toBe("DRAFT");
    expect(prisma.lease.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "DRAFT", noticePeriodDays: 30 }),
      }),
    );
  });

  it("activates a DRAFT lease", async () => {
    vi.mocked(prisma.lease.findFirst).mockResolvedValue(makeLease());
    vi.mocked(prisma.lease.update).mockResolvedValue(
      makeLease({ status: "ACTIVE" }),
    );

    const result = await activateLease("lease-1", "property-1");

    expect(result.status).toBe("ACTIVE");
    expect(prisma.lease.update).toHaveBeenCalledWith({
      where: { id: "lease-1" },
      data: { status: "ACTIVE" },
    });
  });

  it("throws ConflictException when the unit already has an active lease", async () => {
    vi.mocked(prisma.lease.findFirst).mockResolvedValue(makeLease());
    vi.mocked(prisma.lease.update).mockRejectedValue({ code: "P2002" });

    await expect(activateLease("lease-1", "property-1")).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(activateLease("lease-1", "property-1")).rejects.toThrow(
      /already has an active lease/,
    );
  });

  it("refuses to terminate a lease that is not ACTIVE", async () => {
    vi.mocked(prisma.lease.findFirst).mockResolvedValue(
      makeLease({ status: "DRAFT" }),
    );

    await expect(
      terminateLease("lease-1", "property-1", new Date()),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.lease.update).not.toHaveBeenCalled();
  });

  it("enforces property isolation when activating", async () => {
    vi.mocked(prisma.lease.findFirst).mockResolvedValue(null);

    await expect(activateLease("lease-1", "other-property")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.lease.update).not.toHaveBeenCalled();
  });
});