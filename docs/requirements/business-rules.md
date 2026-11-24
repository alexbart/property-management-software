# Business Rules

Rules are uniquely identified and carry a **Status**:

- **Approved** – mandated by project instructions (root `AGENTS.md`) or an
  accepted ADR.
- **Proposed** – recommended, awaiting sign-off.
- **Pending** – cannot be implemented until the business owner approves a
  written rule. **Do not invent values for Pending rules.**

> Financial rules marked Pending (notably penalty calculation and payment
> allocation order) must not be implemented from assumptions.

## Money & Arithmetic

| ID | Rule | Status |
| --- | --- | --- |
| BR-MONEY-001 | Store money with exact decimal or integer minor-unit representation. | Approved |
| BR-MONEY-002 | Never use JavaScript floating-point arithmetic for money. | Approved |
| BR-MONEY-003 | Round monetary results only at defined, documented points. | Proposed |
| BR-MONEY-004 | Currency is KES for all amounts. | Approved |

## Financial Ledger

| ID | Rule | Status |
| --- | --- | --- |
| BR-LEDGER-001 | Keep rent charges, payments, allocations and penalties as separate records. | Approved |
| BR-LEDGER-002 | Balances are derived from ledger records; never a mutable "balance" field is the source of truth. | Approved |
| BR-LEDGER-003 | Payment processing is idempotent. | Approved |
| BR-LEDGER-004 | Prevent duplicate allocation of a single payment. | Approved |
| BR-LEDGER-005 | Never silently delete financial transactions. | Approved |
| BR-LEDGER-006 | Corrections are auditable and traceable. | Approved |

## Rent Charges

| ID | Rule | Status |
| --- | --- | --- |
| BR-RENT-001 | A rent charge belongs to exactly one lease and one period. | Proposed |
| BR-RENT-002 | Generating rent charges for a period is idempotent. | Proposed |
| BR-RENT-003 | A rent charge can be partially or fully allocated; over-allocation is forbidden. | Proposed |

## Payments

| ID | Rule | Status |
| --- | --- | --- |
| BR-PAY-001 | Every payment records amount, currency, date and an external reference. | Approved |
| BR-PAY-002 | M-Pesa callbacks are authenticated before processing. | Approved |
| BR-PAY-003 | A payment may be unallocated, partially allocated, or fully allocated. | Proposed |
| BR-PAY-004 | Allocation order across rent charges, fees and penalties follows an approved rule. | **Pending** |
| BR-PAY-005 | Refunds/reversals are recorded as new, linked entries (never edits). | Proposed |

## Penalties

| ID | Rule | Status |
| --- | --- | --- |
| BR-PEN-001 | Never invent a penalty formula. | Approved |
| BR-PEN-002 | Never automatically compound penalties without an approved rule. | Approved |
| BR-PEN-003 | A penalty is applied only under an approved, versioned rule. | Approved |
| BR-PEN-004 | Grace period, penalty rate, base, cap and rounding are defined by the approved rule. | **Pending** |
| BR-PEN-005 | Penalty calculation formula. | **Pending** (see ADR-006) |

> **Conflict to resolve (ADR-006):** source material references both a
> **daily 3%** penalty (after failure to pay a month's rent) and an older
> flat **1,500** figure. These must not be combined or guessed; the
> client must confirm the authoritative rule before BR-PEN-004/005 move
> to Approved.

## Tenancy

| ID | Rule | Status |
| --- | --- | --- |
| BR-TEN-001 | A unit has at most one active lease at any time. | Proposed |
| BR-TEN-002 | Historical tenancy and financial records are preserved. | Approved |
| BR-TEN-003 | Ending a lease does not delete its charges/payments. | Approved |
| BR-TEN-004 | Rent/deposit term changes append a versioned history row; never overwrite historical terms. | Proposed |

## Property Inventory

| ID | Rule | Status |
| --- | --- | --- |
| BR-PROP-001 | A property may contain zero or more buildings; a standalone property attaches units directly. | Proposed |
| BR-PROP-002 | A unit belongs to exactly one container (property or building). | Proposed |
| BR-PROP-003 | Amenities are reusable records assignable at property, building or unit level. | Proposed |
| BR-PROP-004 | Accommodation policies are flexible structured attributes, not fixed yes/no columns. | Proposed |
| BR-PROP-005 | Location is optional GPS; when present it is validated and range-checked. | Proposed |
| BR-PROP-006 | Photos are stored as external references; no binaries in the relational DB. | Proposed |
| BR-PROP-007 | A property may have multiple owners via ownership shares summing to ≤100%. | Proposed |
| BR-PROP-008 | Unit bedroom/bathroom counts are optional and only captured where meaningful. | Proposed |

## Authorization & Tenancy Isolation

| ID | Rule | Status |
| --- | --- | --- |
| BR-AUTH-001 | Authorization is enforced on the backend, never only in the UI. | Approved |
| BR-AUTH-002 | Users cannot access data outside their role and assignments. | Approved |
| BR-AUTH-003 | Landlord A can never access Landlord B's data (cross-landlord isolation). | Approved |
| BR-AUTH-004 | Tenant access is limited to the tenant's own tenancy data. | Approved |
| BR-AUTH-005 | Prevent IDOR on all resource identifiers. | Approved |

## Data Integrity & Audit

| ID | Rule | Status |
| --- | --- | --- |
| BR-DATA-001 | Multi-record financial operations use database transactions. | Approved |
| BR-DATA-002 | Database constraints enforce integrity where appropriate. | Approved |
| BR-DATA-003 | Sensitive administrative actions are recorded in an audit log. | Approved |
| BR-DATA-004 | Secrets are never committed to source control. | Approved |

## Open Decisions Affecting Rules

The following require written approval before related rules move from
Pending to Approved:

1. Penalty calculation (BR-PEN-004/005) — `../decisions/ADR-006-penalty-calculation.md`.
2. Payment allocation order (BR-PAY-004).
3. Authentication/authorization mechanics (BR-AUTH-*) — `../decisions/ADR-004-authentication-and-authorization.md`.
4. Property inventory hierarchy, amenities, policies and images (BR-PROP-*) — `../decisions/decision-and-risk-register.md`.
5. Tenant payment-risk ranking method (FR-RISK-002).