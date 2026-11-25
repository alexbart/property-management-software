# ADR-008 — Authentication & Session Model

Status: Accepted (implementation: Milestone 011)

## Context

Every API route currently trusts a client-supplied `x-property-id` header.
That is not authorization: any caller can read any landlord's financials by
changing a header. Authentication and server-derived authorization are required
before public exposure.

## Decision

### Authentication

- Cookie-based sessions via `express-session`.
- Session store: PostgreSQL through `connect-pg-simple` (table `sessions`).
- Cookie: `httpOnly`, `sameSite=lax`, `secure` when `NODE_ENV=production`,
  `rolling` with an 8-hour `maxAge`.
- Session is regenerated on login (fixation defence) and destroyed on logout.

### Password storage

- `node:crypto` `scrypt` with `N=16384, r=8, p=1`.
- Per-user random salt; stored alongside the derived key.
- Verification uses `timingSafeEqual`.
- No plaintext and no reversible encryption. Passwords are never returned in
  any DTO or log.

### Roles

- `PLATFORM_ADMIN` — global.
- `LANDLORD` — owns properties.
- `MANAGER` — property-scoped through `PropertyMembership`.
- `TENANT` — scoped through `TenantLink` to one `Tenant` record.

### Authorization

- Property scope is **derived from the session**, never from a client header.
- A requested `propertyId` is validated against `PropertyMembership` (or
  platform admin). Non-members receive 403; missing resources keep the
  existing not-found-as-403 behaviour to avoid existence leaks.
- Tenant scope is derived from `TenantLink`. Tenants may only read their own
  lease, tickets and notices, and may not call manager-only mutations.
- Manager-only mutations (lease activate/terminate, notice status, cost
  updates, catalogue writes, risk evaluation) require an allowed membership
  role.

### CSRF

- `sameSite=lax` cookies plus an `Origin`/`Referer` check on every mutating
  route. The check compares against `WEB_ORIGIN`.
- The M-Pesa webhook is public and exempt (Safaricom cannot send cookies or a
  browser Origin).

### Development bypass

- `x-property-id` is honoured **only** when `NODE_ENV !== 'production'` and
  `AUTH_DEV_BYPASS=true` (default `false`).
- In production the header is ignored entirely.
- This exists solely to keep local/test development unblocked before the full
  UI login flow is adopted.

### Rate limiting

- Login is rate-limited with an in-memory limiter. This is per-process only;
  multi-instance deployments need a shared store (documented caveat).

## Consequences

- Existing tests that asserted isolation via `x-property-id` must be rewritten
  to use real sessions; the header is no longer a security boundary.
- A `sessions` table and auth-related tables are added by migration.
- `AUTH_DEV_BYPASS` must never be enabled in production.