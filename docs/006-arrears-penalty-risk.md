# Milestone 006 — Arrears, Penalty Engine & Tenant Risk Scoring

Purpose: turn raw lease, ledger, payment and maintenance data into actionable
business intelligence: arrears, configurable penalties, and tenant risk.

## Scope

- Pure arrears/penalty calculation for a lease.
- Configurable penalty rule (no hardcoded magic numbers).
- Tenant risk scoring that updates `riskScore` and `riskFlags`.

Out of scope (later): policy-catalogue-driven rules, statements, notifications,
collections workflow, automatic ledger writes for penalties.

## Arrears calculation

```
totalDue        = SUM(ledger.amount WHERE type IN ('RENT','PENALTY'))
totalPaid       = SUM(payment.amount WHERE status = 'COMPLETED')
currentBalance  = totalDue - totalPaid
```

Computed per lease. Derived, never stored. `DEPOSIT` and `ADJUSTMENT` entries
are excluded from this formula.

## Penalty engine

A configurable rule, parameterised (not hardcoded):

- `GRACE_PERIOD_DAYS` (default `30`): no penalty before this many days past
  the rent due date.
- `DAILY_PENALTY_RATE` (default `0.03`): daily rate applied to the overdue
  balance once the grace period has elapsed.
- `LATE_THRESHOLD_DAYS` (default `15`): threshold used for late-payment risk
  scoring.

```
daysOverdue     = max(0, today - dueDate)
penaltyAccrued  = daysOverdue > GRACE_PERIOD_DAYS
                ? overdueBalance * DAILY_PENALTY_RATE * (daysOverdue - GRACE_PERIOD_DAYS)
                : 0
```

The rate and grace period live in `apps/api/src/config/penalty.config.ts` and
must be adjustable. In future they can be sourced from the
`PolicyDefinition` catalogue instead of a constant.

> Governance: this supersedes the previously blocked penalty decision
> (ADR-006 / register D12). ADR-006 and the decision register must be updated
> to record the approved, parameterised default.

## Tenant risk scoring

Tenants gain risk points from payment behaviour and active arrears. Example
rules (thresholds parameterised):

- `+10` points when a payment is more than `LATE_THRESHOLD_DAYS` late.
- `+50` points when the tenant has active arrears (`currentBalance > 0`).
- Add flag `CHRONIC_LATE` when the tenant has repeated late payments.

The score and flags are written to `Tenant.riskScore` and `Tenant.riskFlags`.
Exact weights and decay are configurable and must be documented/tested.

## Invariants

1. Arrears and penalties are derived; no mutable balance column.
2. Penalty parameters are configuration, never inline literals.
3. Risk scoring is deterministic and auditable.
4. Money uses `Prisma.Decimal`; never JS float.

## Open items

- Source of truth for penalty parameters (config vs PolicyDefinition).
- Penalty compounding/cap/waiver rules (still to confirm).
- Risk weight decay and `CHRONIC_LATE` definition.
- Whether penalties are written to the ledger automatically or on approval.