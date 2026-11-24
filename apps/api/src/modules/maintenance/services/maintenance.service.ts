import type {
  MaintenanceTicket,
  Prisma,
  TicketInitiator,
  TicketPriority,
  TicketStatus,
} from "@prisma/client";
import { prisma } from "../../../database/prisma.js";

/** Thrown when a ticket/unit is not found within the caller's property. */
export class NotFoundException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundException";
  }
}

/** Thrown when a lifecycle or cost rule is violated. */
export class ConflictException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictException";
  }
}

export interface CreateTicketInput {
  propertyId: string;
  unitId: string;
  initiatedBy: TicketInitiator;
  initiatorId: string;
  title: string;
  description: string;
  priority?: TicketPriority;
  estimatedCost?: Prisma.Decimal | null;
}

/**
 * Create a ticket in OPEN status. The unit must belong to the given property
 * (cross-property isolation).
 */
export async function createTicket(
  data: CreateTicketInput,
): Promise<MaintenanceTicket> {
  const unit = await prisma.unit.findFirst({
    where: { id: data.unitId, propertyId: data.propertyId },
  });

  if (!unit) {
    throw new NotFoundException(
      `Unit ${data.unitId} not found for property ${data.propertyId}`,
    );
  }

  return prisma.maintenanceTicket.create({
    data: {
      propertyId: data.propertyId,
      unitId: data.unitId,
      initiatedBy: data.initiatedBy,
      initiatorId: data.initiatorId,
      title: data.title,
      description: data.description,
      priority: data.priority ?? "MEDIUM",
      estimatedCost: data.estimatedCost ?? null,
      status: "OPEN",
    },
  });
}

function isTerminal(status: TicketStatus): boolean {
  return status === "RESOLVED" || status === "CANCELLED";
}

/**
 * Transition a ticket's status. RESOLVED/CANCELLED require resolution notes
 * and set resolvedAt. When RESOLVED with a positive actual cost, the ticket is
 * ready for ledger linkage (handled in a later step).
 */
export async function updateTicketStatus(
  ticketId: string,
  propertyId: string,
  newStatus: TicketStatus,
  resolutionNotes?: string,
): Promise<MaintenanceTicket> {
  const ticket = await prisma.maintenanceTicket.findFirst({
    where: { id: ticketId, propertyId },
  });

  if (!ticket) {
    throw new NotFoundException(
      `Ticket ${ticketId} not found for property ${propertyId}`,
    );
  }

  const terminal = isTerminal(newStatus);

  if (terminal && (!resolutionNotes || resolutionNotes.trim().length === 0)) {
    throw new ConflictException(
      "resolutionNotes is required when resolving or cancelling a ticket",
    );
  }

  const data: Prisma.MaintenanceTicketUpdateInput = { status: newStatus };

  if (terminal) {
    data.resolutionNotes = resolutionNotes;
    data.resolvedAt = new Date();
  } else {
    data.resolvedAt = null;
  }

  // TODO(ledger): when newStatus === "RESOLVED" and ticket.actualCost > 0,
  // create/link an ADJUSTMENT LedgerEntry for landlord transparency.

  return prisma.maintenanceTicket.update({
    where: { id: ticketId },
    data,
  });
}

/** Update the actual cost; must be non-negative. */
export async function updateTicketCost(
  ticketId: string,
  propertyId: string,
  actualCost: Prisma.Decimal,
): Promise<MaintenanceTicket> {
  const ticket = await prisma.maintenanceTicket.findFirst({
    where: { id: ticketId, propertyId },
  });

  if (!ticket) {
    throw new NotFoundException(
      `Ticket ${ticketId} not found for property ${propertyId}`,
    );
  }

  if (actualCost.lessThan(0)) {
    throw new ConflictException("actualCost must be greater than or equal to 0");
  }

  return prisma.maintenanceTicket.update({
    where: { id: ticketId },
    data: { actualCost },
  });
}

/** List tickets for a property, optionally filtered by status. */
export async function listTickets(
  propertyId: string,
  status?: TicketStatus,
): Promise<MaintenanceTicket[]> {
  return prisma.maintenanceTicket.findMany({
    where: { propertyId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
  });
}

/** Fetch a single ticket within the caller's property scope. */
export async function getTicket(
  ticketId: string,
  propertyId: string,
): Promise<MaintenanceTicket> {
  const ticket = await prisma.maintenanceTicket.findFirst({
    where: { id: ticketId, propertyId },
  });

  if (!ticket) {
    throw new NotFoundException(
      `Ticket ${ticketId} not found for property ${propertyId}`,
    );
  }

  return ticket;
}