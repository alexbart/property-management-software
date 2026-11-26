# ADR-005: Rent and Payment Ledger

Status: Proposed

## Context

Rent collection and reconciliation are the financial core of the
platform (root `AGENTS.md` "Financial Integrity"). The ledger must be
traceable, idempotent and auditable. This ADR records concrete
decisions that were previously open in `data-model.md` (money storage
standard, allocation order) and expands ADR-003.

Requirements: FR-RENT-001..003, FR-PAY-001..004, FR-ALLOC-001..003,
FR-ARR-001..002, BR-MONEY-*, BR-LEDGER-*, BR-RENT-*, BR-PAY-*.

## Decision (proposed)

### Money representation

- Store money in PostgreSQL as **`numeric(12,2)`**, accessed via
  **`Prisma.Decimal`** (BR-MONEY-001). **Never** use JavaScript `number`
  for money (BR-MONEY-002).
- `numeric(12,2)` is chosen over integer minor units because it maps
  directly to Prisma `Decimal`, is exact, and is self-describing in SQL.
  KES amounts up to 9,999,999,999.99 are covered; this comfortably
  exceeds the ≤100-property portfolio.
- All amounts are **KES** (BR-MONEY-004). Rounding happens only at
  documented points (BR-MONEY-003); half-up rounding is the proposed
  default pending confirmation.

### Ledger structure

- **Append-only** ledger: `rent_charges`, `payments`,
  `payment_allocations`, `penalties` (and later `adjustments`,
  `refunds_reversals`) are insert-only. Corrections create new linked
  rows; nothing is hard-deleted (BR-LEDGER-005/006).
- **Balances are derived** from charges minus allocations; there is no
  authoritative mutable `balance` field (BR-LEDGER-002).
- Each `RentCharge` belongs to exactly one lease and one period;
  generation is idempotent on `(lease_id, period)` with a unique
  constraint (BR-RENT-001/002).
- Each `Payment` records amount, currency, received date, method and an
  external reference; M-Pesa payments are keyed by `external_ref` with a
  unique constraint for idempotency (FR-PAY-003, BR-LEDGER-003).
- `PaymentAllocation` links one payment to one charge with an amount.
  **Over-allocation is forbidden** (sum of allocations ≤ payment
  amount), enforced inside a database transaction and optionally a DB
  constraint (BR-RENT-003, FR-ALLOC-002).

### Allocation order (proposed, pending approval)

When a `COMPLETED` payment is allocated across a lease's outstanding
charges, the proposed default order is:

1. **Penalties** (oldest first) — settle accrued penalties.
2. **Rent charges** (oldest period first) — clear oldest arrears.
3. **Fees / other charges** (oldest first).

Rationale: clearing penalties and oldest arrears first minimizes
long-term balance and matches common practice. This is a **proposal**
and remains **Pending** until the business owner confirms; it must not
be implemented from assumptions (BR-PAY-004).

### Payment lifecycle

- M-Pesa callbacks are **authenticated and validated** before processing
  (BR-PAY-002); duplicate callbacks are ignored via the `external_ref`
  unique constraint (idempotent).
- Status flow: `PENDING → COMPLETED` on success; `FAILED` for failed
  transactions; `REVERSED` for reversals/refunds.
- **Refunds/reversals** are recorded as **new, linked entries** (negative
  or reversal rows referencing the original payment); the original is
  never edited or deleted (BR-PAY-005).
- Every allocation and correction runs inside a transaction
  (BR-DATA-001).

### Arrears

- Arrears and aging are **read models** derived from open charges minus
  allocations (FR-ARR-001/002). They are never a stored mutable balance.

## Consequences

- Financial statements and arrears reports are fully reproducible from
  append-only source records.
- `Prisma.Decimal` + `numeric(12,2)` + transactions give exact,
  auditable money handling; no floating-point risk.
- Allocation order is configurable but **must wait for approval**
  before the allocation workflow is automated.
- Refunds/reversals and M-Pesa failure handling need concrete provider
  behaviour (see ADR-005 Open Questions / M-Pesa section).

## Open Questions (require business/provider input)

1. Confirm **allocation order** (penalties → rent → fees, or other).
2. Confirm rounding rule and rounding points (BR-MONEY-003).
3. M-Pesa provider capabilities: STK Push vs Paybill, callback shape,
   auth/signature verification, refund/reversal support, reconciliation
   reports, auto-allocation vs manual.
4. Treatment of **partial payments** and unallocated overpayments
   (tenant credit? next period? refund?).
5. Whether rent charges should be generated automatically on a schedule
   or only on demand.