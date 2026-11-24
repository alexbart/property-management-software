import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma, type MaintenanceTicket } from "@prisma/client";

vi.mock("../../../database/prisma.js", () => ({
  prisma: {
    unit: { findFirst: vi.fn() },
    maintenanceTicket: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "../../../database/prisma.js";
import {
  ConflictException,
  createTicket,
  NotFoundException,
  updateTicketCost,
  updateTicketStatus,
} from "./maintenance.service.js";

function makeTicket(overrides: Partial<MaintenanceTicket> = {}): MaintenanceTicket {
  return {
    id: "ticket-1",
    propertyId: "property-1",
    unitId: "unit-1",
    initiatedBy: "TENANT",
    initiatorId: "tenant-1",
    title: "Leaking tap",
    description: "Kitchen tap leaks",
    priority: "MEDIUM",
    status: "OPEN",
    estimatedCost: null,
    actualCost: new Prisma.Decimal("0"),
    resolutionNotes: null,
    resolvedAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

const unit = { id: "unit-1", propertyId: "property-1" } as never;

describe("maintenance service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a ticket after validating the unit belongs to the property", async () => {
    vi.mocked(prisma.unit.findFirst).mockResolvedValue(unit);
    vi.mocked(prisma.maintenanceTicket.create).mockResolvedValue(makeTicket());

    const result = await createTicket({
      propertyId: "property-1",
      unitId: "unit-1",
      initiatedBy: "TENANT",
      initiatorId: "tenant-1",
      title: "Leaking tap",
      description: "Kitchen tap leaks",
    });

    expect(result.status).toBe("OPEN");
    expect(prisma.maintenanceTicket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "OPEN", priority: "MEDIUM" }),
      }),
    );

    vi.mocked(prisma.unit.findFirst).mockResolvedValue(null);
    await expect(
      createTicket({
        propertyId: "property-1",
        unitId: "unit-1",
        initiatedBy: "TENANT",
        initiatorId: "tenant-1",
        title: "Leaking tap",
        description: "Kitchen tap leaks",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("requires resolution notes and sets resolvedAt when resolving", async () => {
    vi.mocked(prisma.maintenanceTicket.findFirst).mockResolvedValue(makeTicket());
    vi.mocked(prisma.maintenanceTicket.update).mockResolvedValue(
      makeTicket({ status: "RESOLVED", resolvedAt: new Date() }),
    );

    const result = await updateTicketStatus(
      "ticket-1",
      "property-1",
      "RESOLVED",
      "Replaced the tap",
    );

    expect(result.status).toBe("RESOLVED");
    expect(prisma.maintenanceTicket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "RESOLVED",
          resolutionNotes: "Replaced the tap",
          resolvedAt: expect.any(Date),
        }),
      }),
    );

    vi.mocked(prisma.maintenanceTicket.update).mockClear();
    await expect(
      updateTicketStatus("ticket-1", "property-1", "RESOLVED"),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.maintenanceTicket.update).not.toHaveBeenCalled();
  });

  it("enforces property isolation on status updates", async () => {
    vi.mocked(prisma.maintenanceTicket.findFirst).mockResolvedValue(null);

    await expect(
      updateTicketStatus("ticket-1", "other-property", "IN_PROGRESS"),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.maintenanceTicket.update).not.toHaveBeenCalled();
  });

  it("rejects a negative actual cost", async () => {
    vi.mocked(prisma.maintenanceTicket.findFirst).mockResolvedValue(makeTicket());

    await expect(
      updateTicketCost("ticket-1", "property-1", new Prisma.Decimal("-1")),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.maintenanceTicket.update).not.toHaveBeenCalled();
  });
});