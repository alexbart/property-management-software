# ADR-004: Authentication and Authorization

Status: Proposed

## Context

The platform manages financial records, personal tenant data and
landlord-owned portfolios. Access must be secure, auditable and
correctly scoped (root `AGENTS.md`: "Enforce authorization on the
backend", "Prevent IDOR and cross-landlord data leakage").

Requirements this decision must satisfy:

- FR-AUTH-001..005 (authentication, salted hashes, backend RBAC,
  resource-level authorization, revocable sessions).
- BR-AUTH-001..005 (backend enforcement, role + assignment scoping,
  cross-landlord isolation, tenant isolation, IDOR prevention).
- Corporate landlords may have multiple authorized users
  (FR-LAND-002) — this is still an open scoping question.

The choice affects security, tenancy behaviour and data model and
**must not be assumed**. This ADR records a **proposal** for sign-off.

## Decision (proposed)

### Authentication

- **Primary method:** email + password (FR-AUTH-001).
- **Password storage:** salted, slow hash (argon2id, bcrypt fallback)
  via the Node runtime (BR: salted hash only — FR-AUTH-002). Plaintext
  passwords are never stored or logged.
- **Sessions:** **server-side sessions** (opaque session id) rather than
  stateless JWTs, because:
  - immediate **revocation** is required (FR-AUTH-005) and is hard with
    plain stateless JWTs;
  - session records give a server-side audit trail;
  - the portfolio is small (≤100 properties), so a session store is
    cheap.
  - Session token is carried in an `HttpOnly`, `Secure`,
    `SameSite=Lax` cookie; CSRF protection applies to state-changing
    requests.
- **Session expiry:** idle and absolute timeouts (values pending
  confirmation, see Open Questions). Expired/revoked sessions are
  rejected server-side.

### Authorization

- **Role-based access control (RBAC)** with four base roles:
  `ADMIN`, `LANDLORD`, `PROPERTY_MANAGER`, `TENANT` (FR-USER-002,
  `permissions-matrix.md`).
- **Resource/assignment scoping** on every request (BR-AUTH-002/005):
  the authorization guard checks **role AND scope**, never trusting
  client-supplied ownership identifiers (FR-AUTH-004).
  - `LANDLORD`: resources whose `landlord_id` matches the caller's
    landlord account.
  - `PROPERTY_MANAGER` (and any staff): properties/units explicitly
    assigned to the user.
  - `TENANT`: only the caller's own lease/unit/charges/payments.
  - `ADMIN`: unrestricted but every sensitive action is audited.
- **Deny by default.** Absence of an explicit allow is a denial.
- **Per-request enforcement:** authorization runs in a backend guard
  applied to every protected route; frontend role checks are
  presentation-only (BR-AUTH-001).
- **Audit:** administrative and financial-correction actions write to
  `audit_logs` (FR-AUDIT-001, BR-DATA-003).

### Tenant & landlord access model

- **Landlords** authenticate as `LANDLORD` users linked to a
  `Landlord` record; they see their owned portfolio (properties,
  arrears, statements) but **not** other landlords' data.
- **Tenants** authenticate as `TENANT` users linked to their `Tenant`
  record via `user_id`; they see only their own tenancy, charges,
  payments, notices and may raise maintenance requests.
- **Corporate multi-user access** (which company members see which
  properties, and whether a sub-role such as `ACCOUNTANT` is needed)
  is **not yet decided** — see Open Questions. The RBAC model is
  extensible to additional roles without re-architecture.

## Consequences

- Server-side sessions add a session store and cookie/CSRF handling,
  but give reliable revocation and auditability.
- Backend authorization guards are mandatory on every endpoint; this
  is non-negotiable and must be covered by authorization tests
  (tenant isolation, landlord isolation) per root `AGENTS.md`.
- The four-role model is a starting point; the corporate multi-user
  and `ACCOUNTANT` questions may add roles/scoping rules later.

## Open Questions (require business input)

1. Session idle/absolute timeout durations.
2. Corporate landlord multi-user model and per-user property scope.
3. Whether a dedicated `ACCOUNTANT` (or `STAFF`) role is required, and
   what maintenance visibility tenants/managers should have.
4. Password reset / invite mechanism and email delivery provider.
5. Whether MFA is required for `ADMIN`/finance actions.
6. Kenyan Data Protection Act obligations for storing tenant IDs and
   contact data (retention, access, consent).