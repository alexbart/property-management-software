import { prisma } from "../../../database/prisma.js";
import { NotFoundException } from "../../finance/services/finance.service.js";

/** Thrown when a notice violates a business rule (e.g. the 30-day minimum). */
export class BadRequestException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadRequestException";
  }
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Absolute minimum notice period, regardless of the lease configuration. */
const MINIMUM_NOTICE_DAYS = 30;

export interface CreateNoticeInput {
  leaseId: string;
  propertyId: string;
  tenantId: string;
  noticeDate: Date;
  intendedMoveOutDate: Date;
  reason?: string;
}

/**
 * Create a tenant move-out notice.
 *
 * Enforces property isolation (the lease must belong to the property and
 * tenant) and the minimum notice period: the intended move-out date must be
 * at least the lease's notice period (and never less than 30 days) after the
 * notice date.
 */
export async function createNotice(data: CreateNoticeInput) {
  const lease = await prisma.lease.findFirst({
    where: {
      id: data.leaseId,
      propertyId: data.propertyId,
      tenantId: data.tenantId,
    },
    select: { noticePeriodDays: true },
  });

  if (!lease) {
    throw new NotFoundException(
      `Lease ${data.leaseId} not found for tenant ${data.tenantId} in property ${data.propertyId}`,
    );
  }

  const requiredDays = Math.max(MINIMUM_NOTICE_DAYS, lease.noticePeriodDays);
  const actualDays =
    (data.intendedMoveOutDate.getTime() - data.noticeDate.getTime()) /
    MS_PER_DAY;

  if (actualDays < requiredDays) {
    throw new BadRequestException(
      `Notice must be at least ${requiredDays} days before the intended move-out date`,
    );
  }

  return prisma.tenantNotice.create({
    data: {
      leaseId: data.leaseId,
      propertyId: data.propertyId,
      tenantId: data.tenantId,
      noticeDate: data.noticeDate,
      intendedMoveOutDate: data.intendedMoveOutDate,
      reason: data.reason,
    },
  });
}