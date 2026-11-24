import { Prisma } from "@prisma/client";
import { penaltyConfig } from "../../../config/penalty.config.js";
import { prisma } from "../../../database/prisma.js";
import { NotFoundException } from "./finance.service.js";

export interface LeaseArrears {
  totalDue: Prisma.Decimal;
  totalPaid: Prisma.Decimal;
  currentBalance: Prisma.Decimal;
  daysOverdue: number;
  penaltyAccrued: Prisma.Decimal;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Calculate arrears and the accrued penalty for a lease as of a given date.
 *
 * - totalDue = SUM(RENT + PENALTY ledger entries)
 * - totalPaid = SUM(COMPLETED payments)
 * - currentBalance = totalDue - totalPaid
 * - daysOverdue = days past (earliest RENT effectiveDate + GRACE_PERIOD_DAYS,
 *   or lease startDate when no rent charge exists)
 * - penaltyAccrued = currentBalance * DAILY_PENALTY_RATE * daysOverdue
 *   (simple interest, applied only after the grace period)
 */
export async function calculateLeaseArrears(
  leaseId: string,
  propertyId: string,
  asOfDate: Date = new Date(),
): Promise<LeaseArrears> {
  const lease = await prisma.lease.findFirst({
    where: { id: leaseId, propertyId },
  });

  if (!lease) {
    throw new NotFoundException(
      `Lease ${leaseId} not found for property ${propertyId}`,
    );
  }

  const [entries, payments] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where: { leaseId, propertyId, type: { in: ["RENT", "PENALTY"] } },
      orderBy: { effectiveDate: "asc" },
    }),
    prisma.payment.findMany({
      where: { leaseId, propertyId, status: "COMPLETED" },
    }),
  ]);

  const totalDue = entries.reduce(
    (sum, entry) =>
      entry.type === "RENT" || entry.type === "PENALTY"
        ? sum.plus(entry.amount)
        : sum,
    new Prisma.Decimal(0),
  );

  const totalPaid = payments.reduce(
    (sum, payment) => sum.plus(payment.amount),
    new Prisma.Decimal(0),
  );

  const currentBalance = totalDue.minus(totalPaid);

  let daysOverdue = 0;
  let penaltyAccrued = new Prisma.Decimal(0);

  if (currentBalance.greaterThan(0)) {
    // Entries are ordered by effectiveDate ascending. Only genuine rent
    // charges determine the due date; payment rows are never used.
    const earliestRent = entries.find((entry) => entry.type === "RENT");
    const dueDate = earliestRent
      ? new Date(
          earliestRent.effectiveDate.getTime() +
            penaltyConfig.GRACE_PERIOD_DAYS * MS_PER_DAY,
        )
      : new Date(
          lease.startDate.getTime() +
            penaltyConfig.GRACE_PERIOD_DAYS * MS_PER_DAY,
        );

    daysOverdue = Math.max(
      0,
      Math.floor((asOfDate.getTime() - dueDate.getTime()) / MS_PER_DAY),
    );

    if (daysOverdue > 0) {
      const rate = new Prisma.Decimal(
        String(penaltyConfig.DAILY_PENALTY_RATE),
      );
      penaltyAccrued = currentBalance
        .times(rate)
        .times(new Prisma.Decimal(daysOverdue));
    }
  }

  return {
    totalDue,
    totalPaid,
    currentBalance,
    daysOverdue,
    penaltyAccrued,
  };
}