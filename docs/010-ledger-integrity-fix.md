# Milestone 010 — Ledger Integrity Fix

Status: critical financial integrity fix. This milestone must merge before
Milestone 011 (authentication).

## Defects

### D1 — Payments wrote positive RENT ledger entries (Critical)

`recordPayment` created a `LedgerEntry` with `type: "RENT"` and a positive
`amount` for every payment. Because arrears compute
`totalDue = SUM(RENT) - SUM(COMPLETED payments)`, each payment increased
`totalDue` by its own amount and was then subtracted again. A lease with a
10,000 rent charge and a 10,000 completed payment reported a 10,000 balance
instead of zero.

### D2 — Two divergent arrears formulas (High)

`getLeaseBalance` summed `RENT + PENALTY`; `calculateLeaseArrears` summed only
`RENT`. The documentation specified `RENT + PENALTY`. Two read models for the
same financial quantity is a correctness and maintenance risk.

### D3 — Reconciliation rent due included payment rows (High)

`getPropertyReconciliation` summed every `RENT` ledger row. Payment-generated
RENT rows inflated `totalRentDue`. `estimatedNOI` was not directly affected
because it uses collected payments and maintenance costs, but the reported rent
due was wrong.

### D4 — `daysOverdue` used the earliest RENT row (Medium)

The earliest RENT row could be a payment-generated row whose `effectiveDate`
was the payment `receivedAt`, producing an incorrect due date and penalty.

### D5 — Penalties were never persisted (Medium)

`penaltyAccrued` was computed at read time only. No `PENALTY` ledger row was
ever created, so penalties had no audit trail and were excluded from
`currentBalance`.

## Fixes

1. **Payments no longer write RENT.** `recordPayment` records only the
   `Payment` row (the cash record) and the idempotency key. If an audit trail is
   required, a distinct `PAYMENT` ledger type may be used, and it is excluded
   from all due/arrears/reconciliation sums.
2. **One arrears formula.** `getLeaseBalance` is removed. All callers use
   `calculateLeaseArrears`, which sums `RENT + PENALTY` and subtracts COMPLETED
   payments.
3. **Correct `daysOverdue` source.** Use the earliest genuine `RENT` row, or the
   lease `startDate` when no rent charge exists. Payment rows are never used.
4. **Reconciliation rent sum.** `totalRentDue` sums only `RENT` charges. After
   fix 1, payments cannot inflate it. The choice is documented in code.
5. **Append-only data correction.** Existing payment-generated RENT rows are
   reversed with negative `ADJUSTMENT` entries. No ledger rows are deleted.
6. **Database constraint.** `RENT` and `PENALTY` amounts must be positive,
   enforced by a `CHECK` constraint.
7. **Penalty persistence is explicit.** `persistAccruedPenalty` writes a
   `PENALTY` row only when invoked by an authorised action (manager approval or
   scheduled job), never automatically on every read.

## Invariants after the fix

1. A payment affects exactly one cash record (`Payment`) and never `totalDue`.
2. `totalDue = SUM(RENT) + SUM(PENALTY)`.
3. `currentBalance = totalDue - SUM(COMPLETED payments)`.
4. `daysOverdue` is derived from rent charges or lease start, never payments.
5. Ledger corrections are append-only `ADJUSTMENT` rows.
6. Money stays in `Prisma.Decimal`; no JS floating-point arithmetic.

## Data correction

Run `apps/api/scripts/correct-ledger-double-count.ts` once after deployment.
It appends a negative `ADJUSTMENT` for each payment-generated RENT row and
leaves the original history intact.