import { penaltyConfig } from "../../../config/penalty.config.js";
import { prisma } from "../../../database/prisma.js";
import { calculateLeaseArrears } from "../../finance/services/arrears.service.js";
import { NotFoundException } from "../../finance/services/finance.service.js";

/**
 * Tenant risk scoring configuration.
 *
 * Weights and thresholds are parameterised here (not inline literals). In
 * future they can be sourced from the PolicyDefinition catalogue.
 */
export const riskConfig = {
  /** Points added when the tenant has any active arrears. */
  ARREARS_POINTS: 50,
  /** Points added per lease whose current arrears exceed the late threshold. */
  LATE_PAYMENT_POINTS: 10,
  /** Score at or above which the HIGH_RISK flag is set. */
  HIGH_RISK_THRESHOLD: 50,
  /** Score at or above which the CHRONIC_LATE flag is set. */
  CHRONIC_LATE_THRESHOLD: 20,
} as const;

export interface TenantRiskResult {
  tenantId: string;
  riskScore: number;
  riskFlags: string[];
}

/**
 * Evaluate a tenant's payment behaviour across all of their leases in a
 * property and persist the resulting score and flags.
 *
 * Scoring:
 * - +ARREARS_POINTS once if any lease has currentBalance > 0.
 * - +LATE_PAYMENT_POINTS per lease whose daysOverdue exceeds
 *   LATE_THRESHOLD_DAYS (simplified late-payment heuristic).
 *
 * Flags are recomputed from the score so they clear when behaviour improves.
 */
export async function evaluateAndUpdateRiskScore(
  tenantId: string,
  propertyId: string,
): Promise<TenantRiskResult> {
  const leases = await prisma.lease.findMany({
    where: { tenantId, propertyId },
    select: { id: true },
  });

  if (leases.length === 0) {
    throw new NotFoundException(
      `Tenant ${tenantId} has no leases in property ${propertyId}`,
    );
  }

  let score = 0;
  let hasArrears = false;
  let lateLeases = 0;

  for (const lease of leases) {
    const arrears = await calculateLeaseArrears(lease.id, propertyId);

    if (arrears.currentBalance.greaterThan(0)) {
      hasArrears = true;
    }

    if (arrears.daysOverdue > penaltyConfig.LATE_THRESHOLD_DAYS) {
      lateLeases += 1;
    }
  }

  if (hasArrears) {
    score += riskConfig.ARREARS_POINTS;
  }
  score += lateLeases * riskConfig.LATE_PAYMENT_POINTS;

  const riskFlags: string[] = [];
  if (score >= riskConfig.HIGH_RISK_THRESHOLD) {
    riskFlags.push("HIGH_RISK");
  }
  if (score >= riskConfig.CHRONIC_LATE_THRESHOLD) {
    riskFlags.push("CHRONIC_LATE");
  }

  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: { riskScore: score, riskFlags },
  });

  return {
    tenantId,
    riskScore: tenant.riskScore,
    riskFlags: tenant.riskFlags,
  };
}