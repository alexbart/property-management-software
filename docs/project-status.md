# Project Status

## Current Milestone

Milestone 011 - Authentication & Authorization (Complete)

## Current Status

Milestone 011 (Authentication & Authorization) is implemented and tested.
Server-side sessions with scrypt password hashing, RBAC, and strict
property/tenant scope derived from session (never from client headers).
All tests pass (99 API + 4 Web), typecheck and lint clean.

## Completed

### Milestone 001 (Foundation)

- Project requirements initially documented.
- Technology stack established.
- Repository architecture designed.
- AI instruction strategy established (AGENTS.md hierarchy).
- pnpm workspace monorepo configured.
- Backend foundation (Express + TypeScript) with health endpoints.
- Frontend foundation (React + TypeScript + Vite + Tailwind).
- Shared contracts package.
- PostgreSQL + Prisma 6 initialization.
- Environment variable validation (Zod).
- ESLint (flat config) and Prettier configured.
- Initial tests (API, web, contracts) with Vitest.
- GitHub Actions CI pipeline.
- Architecture decision records ADR-001..003, ADR-007 (tooling).

### Milestone 002 (Design)

- `docs/requirements/`: business requirements, functional requirements,
  business rules (property inventory, ledger, penalty, auth).
- `docs/architecture/`: domain model, data model, permissions matrix,
  system workflows, and `domain-model-review.md` (first + second review,
  with approved structural decisions SR-1..SR-6).
- ADRs: ADR-004 (authentication & authorization), ADR-005 (rent &
  payment ledger), ADR-006 (penalty calculation — Blocked).
- `docs/decisions/decision-and-risk-register.md`.

### Milestone 002A (Core Data Model)

- Prisma enums: `PropertyType`, `BuildingType`, `UnitType` (incl. approved
  `HOUSE`), `UnitSizeUnit`, `LandlordKind`.
- Models: `Landlord`, `Property`, `Building`, `Unit`.
- `properties.landlord_id` NOT NULL as the initial ownership/isolation
  anchor; co-ownership deferred.
- Structured Kenyan address (county required; town/neighbourhood/street
  optional; optional GPS lat/long).
- Unit fields: unit/room/house number, floor, bedrooms, bathrooms,
  optional size (SQM/SQFT), `standard_rent` and `deposit_required` as
  `Prisma.Decimal`.
- Initial migration `20261124064000_init_core_inventory` applied to the
  dev PostgreSQL database.
- CHECK constraints, two partial unique indexes for unit numbering, and a
  composite `(building_id, property_id)` foreign key.
- DB integration tests; full API suite passes (12 tests).
- Validated: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` green.

### Milestone 002B (Catalogue & Assignment)

- Reusable catalogues: `Amenity` (`FEATURE`/`AMENITY`/`UTILITY`) and
  `PolicyDefinition` (typed `BOOLEAN`/`ENUM`/`INTEGER`/`TEXT`), with
  deactivate-not-delete semantics.
- Target-based `AmenityAssignment` (`INCLUDE`/`EXCLUDE`) and
  `PolicyAssignment` (`SET`/`EXCLUDE`) at property/building/unit level.
- Stored generated `target_id` on all three target tables (raw SQL);
  `units` gains `UNIQUE(id, property_id)`; composite FKs keep every
  assignment within one property.
- Policy value typing enforced at the DB: denormalised `value_type` with a
  composite FK to the definition plus a CHECK requiring exactly one
  correctly-typed value column (or none for `EXCLUDE`).
- Provider-neutral `InventoryImage` metadata with a partial unique primary
  index (ignoring soft-deleted rows), soft-delete + `storage_cleanup_status`
  (`PENDING`/`DONE`/`FAILED`), 30-day retention before hard delete.
- Pure inheritance resolvers (`amenity-resolver`, `policy-resolver`) with
  unit tests; `EXCLUDE` is distinct from no assignment.
- Read API: `GET /api/v1/inventory/amenities`, `/policies`, `/effective`
  (auth middleware pending ADR-004).
- Migration `20261124120000_inventory_catalogue` applied; DB integration
  and route tests added. Full API suite passes (38 tests).
- **Fixed (2026-11-25)**: Missing composite FKs, CHECK constraints, and
  unique indexes applied via migration `20261125140000_add_missing_catalogue_constraints`.
- Validated: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` green.

### Milestone 011 (Authentication & Authorization)

- **Session auth**: `express-session` + `connect-pg-simple` (PostgreSQL
  `sessions` table), `HttpOnly`, `Secure` (prod), `SameSite=Lax`, 8-hour
  rolling TTL.
- **Password hashing**: scrypt (N=16384, r=8, p=1), per-user random salt,
  `timingSafeEqual` verification.
- **Roles**: `PLATFORM_ADMIN`, `LANDLORD`, `MANAGER`, `TENANT` (enum in
  Prisma schema).
- **Scope derivation**: Property scope from `PropertyMembership`
  (`LANDLORD`/`MANAGER`) or `TenantLink` (`TENANT`); never from
  `x-property-id` header.
- **Dev bypass**: `x-property-id` header only works when
  `AUTH_DEV_BYPASS=true` AND `NODE_ENV!=='production'` (API tests only).
- **Rate limiting**: 5 login attempts / 15 min / IP (in-memory).
- **CSRF**: `SameSite=Lax` + Origin/Referer check on mutating routes.
- **Auth endpoints**: `POST /api/v1/auth/login`, `POST /api/v1/auth/register`,
  `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`.
- **Middleware**: `require-auth`, `require-property-scope`,
  `require-tenant-scope`, `require-role`, `origin-check`, `dev-bypass`.
- **Route protection**: `propertyScope` applied to lease, finance (except
  M-Pesa webhook), maintenance, tenant, inventory routes.
- **Web integration**: `AuthProvider`, `useAuth`, `RequireAuth`, `LoginPage`
  with password visibility toggle; `api-client.ts` uses `credentials: 'include'`.
- **Contracts**: `LoginDto`, `RegisterDto`, `SessionUserDto` in
  `packages/contracts/src/auth`.
- **Tests**: Auth service (6), auth middleware (8), inventory routes (4),
  all existing controller tests pass via dev bypass (99 total).
- **ADR-004**: Updated to Accepted with implemented decisions.

## In Progress

- Next Milestone 012 (to be defined)

## Pending

- `/register` page (API endpoint exists, UI missing)
- Component tests for auth UI
- Tenant/landlord dashboard content
- Authentication/authorization mechanics — ADR-004 (Accepted)
- Rent & payment ledger details (allocation order) — ADR-005 (Pending)
- Penalty calculation formula — ADR-006 (**Blocked**: `3%`/day vs flat
  `1,500`)
- M-Pesa provider/API/auth/callback/refund/reconciliation capabilities
- Corporate landlord multi-user model and property scoping
- Staff/accountant role and tenant maintenance visibility
- `off_market_reason` values (SR-5)
- Tenant payment-risk ranking method
- Production deployment infrastructure
- Kenya Data Protection Act obligations for tenant data

## Current Branch

feature/011-auth-authz

## Last Verified Commit

Milestone 011 complete - all tests pass, typecheck and lint clean

## Next Milestone

Define Milestone 012 scope (likely: tenancy lifecycle, rent charges,
M-Pesa integration, or maintenance management).

## Known Decisions Pending (require client input)

1. Rent & payment ledger details (allocation order) — ADR-005 (Pending).
2. Penalty calculation formula — ADR-006 (**Blocked**: `3%`/day vs flat
   `1,500`).
3. M-Pesa provider/API/auth/callback/refund/reconciliation capabilities.
4. Corporate landlord multi-user model and property scoping.
5. Staff/accountant role and tenant maintenance visibility.
6. `off_market_reason` values (SR-5).
7. Tenant payment-risk ranking method.
8. Production deployment infrastructure.
9. Kenya Data Protection Act obligations for tenant data.

Resolved: authentication/authorization mechanics (ADR-004), property
inventory field set, property/building/unit type vocabularies (incl.
`HOUSE`), gender eligibility semantics, ownership anchor, unit-number
uniqueness, derived occupancy, catalogue/assignment model.

See `docs/decisions/decision-and-risk-register.md` for the full register.