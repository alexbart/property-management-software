# ADR-004: Authentication and Authorization

Status: **Accepted** (implemented in Milestone 011)

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

## Decision (implemented)

### Authentication

- **Primary method:** email + password (FR-AUTH-001).
- **Password storage:** **scrypt** (N=16384, r=8, p=1) with per-user
  random 16-byte salt, `timingSafeEqual` verification (FR-AUTH-002).
  Plaintext passwords are never stored or logged.
- **Sessions:** **server-side sessions** via `express-session` +
  `connect-pg-simple` (PostgreSQL `sessions` table), because:
  - immediate **revocation** is required (FR-AUTH-005);
  - session records give a server-side audit trail;
  - portfolio size (≤100 properties) makes session store cheap.
  - Session token carried in `HttpOnly`, `Secure` (prod),
    `SameSite=Lax` cookie; CSRF via Origin/Referer check on mutating routes.
- **Session expiry:** 8-hour rolling idle TTL; expired/revoked sessions
  rejected server-side.

### Authorization

- **Role-based access control (RBAC)** with four base roles:
  `PLATFORM_ADMIN`, `LANDLORD`, `MANAGER`, `TENANT` (FR-USER-002).
- **Resource/assignment scoping** on every request (BR-AUTH-002/005):
  the authorization guard checks **role AND scope**, never trusting
  client-supplied ownership identifiers (FR-AUTH-004).
  - `PLATFORM_ADMIN`: unrestricted access; all sensitive actions audited.
  - `LANDLORD`: resources whose `landlord_id` matches the caller's
    landlord account (via `PropertyMembership`).
  - `MANAGER`: properties/units explicitly assigned via
    `PropertyMembership` (role `MANAGER`).
  - `TENANT`: only the caller's own lease/unit/charges/payments
    (via `TenantLink` to `Tenant` record).
- **Deny by default.** Absence of an explicit allow is a denial.
- **Per-request enforcement:** `require-auth` + `require-property-scope`
  + `require-tenant-scope` middleware applied to all protected routes;
  frontend role checks are presentation-only (BR-AUTH-001).
- **Cross-property isolation:** `x-property-id` header **never used**
  for authorization. Property/tenant scope derived **only from session**.
  Dev bypass (`AUTH_DEV_BYPASS=true` + `NODE_ENV!=='production'`)
  allows `x-property-id` for API testing only.
- **Rate limiting:** 5 login attempts / 15 min / IP (in-memory).
- **Audit:** administrative and financial-correction actions write to
  `audit_logs` (FR-AUDIT-001, BR-DATA-003).

### Data Model

New Prisma models (migration `20261125130000_auth_authz`):
- `User` (email unique, passwordHash, role, lastLoginAt)
- `PropertyMembership` (user + property + role `LANDLORD|MANAGER`)
- `TenantLink` (user + tenant, 1:1)
- `Session` (via `connect-pg-simple` table: `sid`, `sess`, `expire`)

Shared contracts (`packages/contracts/src/auth`):
- `LoginDto`, `RegisterDto`, `SessionUserDto`

### Web Integration

- `AuthProvider` + `useAuth` + `RequireAuth` (React context)
- `api-client.ts`: `credentials: 'include'` (cookie-based)
- `LoginPage` with password visibility toggle
- Protected routes wrapped in `PrivateRoute` → `RequireAuth`

## Consequences

- Server-side sessions add a session store and cookie/CSRF handling,
  but give reliable revocation and auditability.
- Backend authorization guards are mandatory on every endpoint; this
  is non-negotiable and covered by authorization tests
  (tenant isolation, landlord isolation) per root `AGENTS.md`.
- The four-role model is a starting point; the corporate multi-user
  and `ACCOUNTANT` questions may add roles/scoping rules later.

## Open Questions (require business input)

1. Corporate landlord multi-user model and per-user property scope.
2. Whether a dedicated `ACCOUNTANT` (or `STAFF`) role is required, and
   what maintenance visibility tenants/managers should have.
3. Password reset / invite mechanism and email delivery provider.
4. Whether MFA is required for `PLATFORM_ADMIN`/finance actions.
5. Kenyan Data Protection Act obligations for storing tenant IDs and
   contact data (retention, access, consent).

## Resolved in Milestone 011

- Session idle/absolute timeout durations: **8-hour rolling TTL** (no absolute max)
- Password hashing: **scrypt** (not argon2id/bcrypt)
- Dev bypass mechanism: **header-gated, env-flagged, non-production only**