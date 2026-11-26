import { prisma } from "../../../database/prisma.js";
import { calculateLeaseArrears } from "./arrears.service.js";

const PENALTY_DESCRIPTION = "Accrued penalty (Milestone 010)";

/**
 * Persist the currently accrued penalty as a PENALTY ledger entry.
 *
 * This is an explicit action (manager approval or scheduled job), never called
 * on every read, to prevent runaway penalty accrual. Repeated calls for the
 * same lease return the existing entry instead of duplicating it.
 */
export async function persistAccruedPenalty(leaseId: string, propertyId: string) {
  const arrears = await calculateLeaseArrears(leaseId, propertyId);

  if (!arrears.penaltyAccrued.greaterThan(0)) {
    return null;
  }

  const existing = await prisma.ledgerEntry.findFirst({
    where: { leaseId, propertyId, type: "PENALTY", description: PENALTY_DESCRIPTION },
  });

  if (existing) {
    return existing;
  }

  return prisma.ledgerEntry.create({
    data: {
      leaseId,
      propertyId,
      type: "PENALTY",
      amount: arrears.penaltyAccrued,
      description: PENALTY_DESCRIPTION,
      effectiveDate: new Date(),
    },
  });
}