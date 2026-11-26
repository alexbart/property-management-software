# ADR-006: Penalty Calculation

Status: Proposed (Blocked — awaiting client confirmation)

## Context

Root `AGENTS.md` is explicit and non-negotiable:

- "Never invent penalty formulas."
- "Never automatically compound penalties without an approved rule."
- "Keep financial business rules documented and tested."
- "Ask questions when ambiguity affects money, security or tenancy
  behaviour."

Penalty requirements FR-PEN-001..003 and rules BR-PEN-001..005 exist,
but **no formula is approved**. There is also a documented **conflict
in source material** that must be resolved before any formula is
implemented:

- One reference states a **daily `3%`** penalty after a failure to pay
  a month's rent.
- An older reference states a flat **`1,500`** (KES) figure.

Combining or averaging these (e.g. "3% or 1,500, whichever is greater")
would be **inventing** a rule and is explicitly forbidden.

## Decision

**No penalty formula is approved.** This ADR is recorded as
**Blocked**: the penalty module must not compute or apply penalties
until the client confirms the rule in writing.

The decision recorded here is limited to the **structural** approach
that will hold any eventually-approved rule:

- Penalties are stored as **separate, auditable, append-only** records
  referencing an **approved, versioned rule** (`rule_version`)
  (BR-PEN-003, FR-PEN-003).
- Each penalty records: lease, rule version, computed amount,
  reason/period, and the calculation inputs (base, rate, days) needed
  to reproduce it.
- A penalty may be waived or adjusted only through an audited,
  linked correction record — never by editing or deleting the original
  (BR-LEDGER-005/006).
- Penalties participate in the ledger and are allocatable via
  `payment_allocations` (allocation order per ADR-005, itself pending).

## What must be confirmed before implementing (Blocked)

1. **Resolve the conflict:** is the penalty `3%` per day of the
   outstanding rent, a flat `1,500`, or something else? Provide the
   authoritative source.
2. **Base amount:** is the percentage applied to the overdue month's
   rent, the outstanding balance, or the full rent for the period?
3. **Frequency and period:** per day, per week, per month? Calendar
   days or business days?
4. **Compounding:** is the penalty charged on the penalty accrued so
   far (compounding) or only on the original rent (simple)? Root
   `AGENTS.md` forbids automatic compounding without an approved rule.
5. **Start point:** from the day after the due date, after a grace
   period, or at month end? What is the due date convention?
6. **Grace period:** is there any grace period before penalties begin?
7. **Cap:** is there a maximum penalty (per period or total)?
8. **Partial payments:** how does a partial payment affect penalty
   accrual (reduced base? suspended? unchanged?).
9. **Waivers/adjustments:** who may waive or reduce a penalty, and what
   approval/audit is required?
10. **Rounding:** how are penalty amounts rounded (BR-MONEY-003)?

Until these are answered in writing, BR-PEN-004 and BR-PEN-005 remain
**Pending** and FR-PEN-001/002 remain **Pending ADR-006**.

## Consequences

- No penalty is computed, displayed or charged until the rule is
  approved; the arrears module still shows overdue charges without
  penalties.
- Once approved, the rule is versioned; changing it later creates a new
  rule version and does not rewrite historical penalties.
- The conflict is recorded in the decision/risk register as a blocking
  risk.