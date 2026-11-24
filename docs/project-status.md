# Project Status

## Current Milestone

Milestone 002B - Catalogue & Assignment Model (Amenities, Policies, Images)

## Current Status

Milestone 002 design is approved. Milestone 002A (core inventory data
model) and Milestone 002B (reusable amenity/policy catalogues, target-based
assignments with inheritance, and provider-neutral image metadata) are
implemented and validated against a local PostgreSQL database. No
authentication, tenancy, rent, penalty or payment functionality is
implemented yet (by design).

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
- Validated: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` green.

## In Progress

- Next Milestone 002B slices: image upload integration (storage provider
  selection deferred), catalogue/assignment write APIs, property-manager
  assignments + authorization, inventory mutation endpoints.

## Pending

- Authentication/identity models (users/roles) — not started (ADR-004).
- Tenancy, rent charges, payments, penalties — later financial-ledger
  milestone; still blocked/require separate approval.
- `off_market_reason` values (SR-5) — to confirm.
- Storage provider selection and upload integration (002B deferred).
- Hard-delete cron for soft-deleted images after 30 days (`DONE` rows).

## Current Branch

feature/project-foundation

## Last Verified Commit

33a3f07 - chore: initialize property management platform foundation
(design docs and Milestone 002A/002B changes added since, not yet committed)

## Next Milestone

Finish the remaining Milestone 002B slices (image upload integration once a
storage provider is chosen, catalogue/assignment write APIs, manager
assignments + authorization), then the tenancy/ledger milestone.

## Known Decisions Pending (require client input)

1. Authentication/authorization mechanics — ADR-004 (Proposed).
2. Rent & payment ledger details (allocation order) — ADR-005 (Pending).
3. Penalty calculation formula — ADR-006 (**Blocked**: `3%`/day vs flat
   `1,500`).
4. M-Pesa provider/API/auth/callback/refund/reconciliation capabilities.
5. Corporate landlord multi-user model and property scoping.
6. Staff/accountant role and tenant maintenance visibility.
7. `off_market_reason` values (SR-5).
8. Tenant payment-risk ranking method.
9. Production deployment infrastructure.
10. Kenya Data Protection Act obligations for tenant data.

Resolved: property inventory field set, property/building/unit type
vocabularies (incl. `HOUSE`), gender eligibility semantics, ownership
anchor, unit-number uniqueness, derived occupancy.

See `docs/decisions/decision-and-risk-register.md` for the full register.