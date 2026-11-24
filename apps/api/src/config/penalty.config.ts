/**
 * Penalty and risk configuration.
 *
 * These values are parameterised (not hardcoded in the engine). In future they
 * can be sourced from the PolicyDefinition catalogue instead of this constant.
 */
export const penaltyConfig = {
  /** Days after the rent due date before a penalty starts accruing. */
  GRACE_PERIOD_DAYS: 30,
  /** Daily penalty rate applied to the overdue balance after the grace period. */
  DAILY_PENALTY_RATE: 0.03,
  /** Days late beyond which a payment is flagged as late for risk scoring. */
  LATE_THRESHOLD_DAYS: 15,
} as const;

export type PenaltyConfig = typeof penaltyConfig;