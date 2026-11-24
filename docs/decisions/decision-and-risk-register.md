# Decision & Risk Register

Consolidated register of decisions and risks for the platform. Every
row is classified so it is clear what is safe to implement and what is
not.

- **Confirmed** — mandated by root `AGENTS.md` or an accepted ADR.
  Safe to implement.
- **Proposed** — a documented proposal in an ADR, awaiting sign-off.
  May be built behind a feature flag but must not be treated as final.
- **Blocked** — cannot be implemented until the business owner provides
  a written answer. **Do not invent values.**

Authoritative ADRs live in `../decisions/`; rules in
`../requirements/business-rules.md`.

## 1. Decisions

| # | Decision | Classification | Reference |
| --- | --- | --- | --- |
| D1 | Modular monolith (apps/api, apps/web, packages/contracts). | Confirmed | ADR-001 |
| D2 | PostgreSQL as source of truth; Prisma ORM; migrations required. | Confirmed | ADR-002 |
| D3 | Separate rent charges, payments, allocations, penalties; balances derived; append-only. | Confirmed | ADR-003 |
| D4 | Money stored as `numeric(12,2)` via `Prisma.Decimal`; never JS float. | Proposed | ADR-005 |
| D5 | Default allocation order: penalties → rent (oldest first) → fees. | **Blocked** (BR-PAY-004) | ADR-005 |
| D6 | Email + password auth; salted hash; server-side revocable sessions. | Proposed | ADR-004 |
| D7 | Four base roles (ADMIN, LANDLORD, PROPERTY_MANAGER, TENANT); backend RBAC + scope. | Proposed | ADR-004 / permissions-matrix |
| D8 | Property → optional Building → Unit hierarchy; standalone properties allowed. | Proposed | domain-model / data-model |
| D9 | Amenities modelled as reusable catalogue records assigned at property/building/unit level. | Confirmed | domain-model / data-model (002B) |
| D10 | Accommodation policies as a reusable, typed policy catalogue (not fixed columns). | Confirmed | domain-model / data-model (002B) |
| D11 | Location stored as optional GPS; photos stored as provider-neutral references (no binaries in DB). | Confirmed | data-model (002B) |
| D12 | Penalty rule (`3%`/day vs flat `1,500`) — **no formula approved**. | **Blocked** (BR-PEN-004/005) | ADR-006 |
| D13 | M-Pesa provider/API/auth/callback/refund/reconciliation capabilities. | **Blocked** | ADR-005 open Qs |
| D14 | Corporate landlord multi-user model & property scoping. | **Blocked** | ADR-004 / permissions-matrix |
| D15 | Dedicated `ACCOUNTANT`/staff role & maintenance visibility. | **Blocked** | ADR-004 / permissions-matrix |
| D16 | Amenity & policy catalogues are reusable; assignments use `INCLUDE`/`EXCLUDE` (amenities) and `SET`/`EXCLUDE` (policies). | Confirmed | data-model (002B) |
| D17 | Inheritance: amenities `PROPERTY→BUILDING→UNIT` (most-specific wins); policies `UNIT→BUILDING→PROPERTY` (first `SET` wins); `EXCLUDE` differs from no assignment. | Confirmed | data-model (002B) |
| D18 | Policy values are typed (`BOOLEAN`,`ENUM`,`INTEGER`,`TEXT`); `value_type` denormalised onto the assignment with a composite FK + CHECK. | Confirmed | data-model (002B) |
| D19 | Target tables use a stored generated `target_id` (raw SQL) for unique indexes; `units` gains `UNIQUE(id, property_id)`. | Confirmed | data-model (002B) |
| D20 | Images are provider-neutral metadata; soft-delete metadata then async object cleanup; 30-day retention before hard delete. | Confirmed | data-model (002B) |
| D21 | Initial policy catalogue: `gender_policy`(ENUM), `students_allowed`,`families_allowed`,`children_allowed`,`pets_allowed`,`smoking_allowed`,`shared_allowed`(BOOLEAN), `max_occupants`(INTEGER), `visitors_policy`(TEXT). | Confirmed | data-model (002B) |

## 2. Risks

| # | Risk | Impact | Likelihood | Mitigation / Status |
| --- | --- | --- | --- | --- |
| R1 | Penalty conflict (`3%` vs `1,500`) implemented from assumption. | Financial error, loss of trust, audit failure. | High if rushed. | **Blocked** until client confirms (ADR-006). No code. |
| R2 | M-Pesa integration built on guessed API/auth/callback shape. | Broken payments, security hole. | High. | **Blocked**; obtain provider docs before design finalize. |
| R3 | Cross-landlord / IDOR data leakage. | Data breach, legal (Kenya DPA). | Medium. | Backend scope enforcement + isolation tests (BR-AUTH-*, FR-AUTH-004). |
| R4 | Floating-point money errors. | Wrong balances. | Low if enforced. | `numeric(12,2)` + `Decimal`; no JS float (BR-MONEY-*). |
| R5 | Duplicate payment allocation from retried callbacks. | Double-counting. | Medium. | `external_ref` unique + idempotent callbacks (BR-LEDGER-003). |
| R6 | SMS treated as source of truth for payments. | Reconciliation errors. | Medium. | SMS is notification only; ledger from M-Pesa API/callback (to confirm). |
| R7 | Storing tenant national IDs / contact data without DPA compliance. | Legal/regulatory. | Medium. | Access-restricted fields, retention policy (open Q in ADR-004). |
| R8 | Over-eager unit bedroom/bathroom fields where not meaningful. | Data model mismatch. | Medium. | Optional attributes; flexible policy model (D10). |
| R9 | Historical financial records overwritten when rent/deposit terms change. | Lost audit trail. | Medium. | Terms versioned per lease; charges immutable (BR-LEDGER-005). |
| R10 | Scope creep into microservices/infrastructure without need. | Complexity for ≤100 properties. | Low. | Modular monolith (ADR-001); revisit only with evidence. |

## 3. Open Questions Requiring Business Input

1. Penalty: base, frequency, compounding, start/grace, partial-payment
   effect, cap, waiver/approval, rounding (ADR-006).
2. Payment allocation order; partial payment / overpayment treatment
   (ADR-005).
3. M-Pesa provider, API, auth, callback verification, refunds,
   reconciliation, auto vs manual allocation (ADR-005).
4. Authentication session timeouts, corporate multi-user model,
   staff/accountant role, maintenance visibility (ADR-004).
5. Gender-neutral meaning: unrestricted eligibility vs mixed-gender
   shared accommodation (D10).
6. Kenya Data Protection Act obligations (retention, consent, access).
7. Property registration: required vs optional fields for location,
   amenities, policies, images.