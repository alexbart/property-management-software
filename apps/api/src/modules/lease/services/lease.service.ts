import type { Lease, Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";

/** Thrown when a lease is not found within the caller's property scope. */
export class NotFoundException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundException";
  }
}

/** Thrown when a lease transition is invalid or violates an invariant. */
export class ConflictException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictException";
  }
}

export interface CreateLeaseInput {
  tenantId: string;
  unitId: string;
  propertyId: string;
  startDate: Date;
  endDate: Date;
  noticePeriodDays?: number;
  rentAmount: Prisma.Decimal;
  depositAmount: Prisma.Decimal;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "P2002"
  );
}

/**
 * Create a lease in DRAFT status. Activation is a separate, explicit step so
 * the single-active-lease invariant is only asserted when the lease goes live.
 */
export async function createLease(data: CreateLeaseInput): Promise<Lease> {
  return prisma.lease.create({
    data: {
      tenantId: data.tenantId,
      unitId: data.unitId,
      propertyId: data.propertyId,
      startDate: data.startDate,
      endDate: data.endDate,
      noticePeriodDays: data.noticePeriodDays ?? 30,
      rentAmount: data.rentAmount,
      depositAmount: data.depositAmount,
      status: "DRAFT",
    },
  });
}

/**
 * Activate a DRAFT lease.
 *
 * Isolation: the lease must belong to `propertyId`. The DB partial unique
 * index (`lease_active_unit_key`) rejects a second ACTIVE lease for the same
 * unit; that P2002 is translated into a meaningful ConflictException.
 */
export async function activateLease(
  leaseId: string,
  propertyId: string,
): Promise<Lease> {
  const lease = await prisma.lease.findFirst({
    where: { id: leaseId, propertyId },
  });

  if (!lease) {
    throw new NotFoundException(
      `Lease ${leaseId} not found for property ${propertyId}`,
    );
  }

  if (lease.status !== "DRAFT") {
    throw new ConflictException(
      `Lease ${leaseId} cannot be activated from status ${lease.status}`,
    );
  }

  try {
    return await prisma.lease.update({
      where: { id: leaseId },
      data: { status: "ACTIVE" },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ConflictException(
        `Unit for lease ${leaseId} already has an active lease`,
      );
    }
    throw error;
  }
}

/**
 * Terminate an ACTIVE lease, recording the termination date.
 */
export async function terminateLease(
  leaseId: string,
  propertyId: string,
  terminationDate: Date,
): Promise<Lease> {
  const lease = await prisma.lease.findFirst({
    where: { id: leaseId, propertyId },
  });

  if (!lease) {
    throw new NotFoundException(
      `Lease ${leaseId} not found for property ${propertyId}`,
    );
  }

  if (lease.status !== "ACTIVE") {
    throw new ConflictException(
      `Lease ${leaseId} cannot be terminated from status ${lease.status}`,
    );
  }

  return prisma.lease.update({
    where: { id: leaseId },
    data: { status: "TERMINATED", terminatedAt: terminationDate },
  });
}