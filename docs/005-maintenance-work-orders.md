# Milestone 005 — Maintenance & Work Order Management

Purpose: manager-coordinated internal work orders with cost tracking, linking
tenants, units and the financial ledger for landlord transparency.

## Scope

- Maintenance tickets for repairs/requests.
- Priority and status lifecycle.
- Estimated vs actual cost tracking.
- Cross-property isolation on every query.

Out of scope (later): tenant portal submission UI, file attachments,
technician assignment, recurring preventive maintenance.

## Who can initiate

A ticket is initiated by either:

- a **Tenant** (`initiatedBy = TENANT`, `initiatorId` = tenant id), or
- a **Property Manager** (`initiatedBy = MANAGER`, `initiatorId` = user id).

`initiatorId` is a flexible string (no FK) because the identity tables are not
implemented yet (ADR-004).

## State machine

```
OPEN ──▶ IN_PROGRESS ──▶ RESOLVED
  └────────────────────────▶ CANCELLED
```

- `OPEN` — reported, not yet started.
- `IN_PROGRESS` — a manager/technician is working on it.
- `RESOLVED` — completed; `resolvedAt` set and `resolutionNotes` recorded.
- `CANCELLED` — will not be actioned.

## Cost tracking

- `estimatedCost` — optional expected cost.
- `actualCost` — optional, defaults to `0`.

When `actualCost` is finalised it provides transparency for the landlord
ledger. A later step may link/emit a `LedgerEntry` of type `ADJUSTMENT` (or a
dedicated `EXPENSE` type if approved) so maintenance spend is visible to the
landlord. The ledger link is not created automatically in this milestone.

## Isolation

Every query is scoped by `propertyId`. A ticket's `unitId` must belong to the
same property (composite FK `(unit_id, property_id) → units(id, property_id)`).

## Invariants

1. A ticket belongs to exactly one property and one unit.
2. The unit must belong to the ticket's property (composite FK).
3. Status transitions follow the state machine above.
4. Money uses `numeric(12,2)` via `Prisma.Decimal`; never JS float.
5. `resolvedAt` is set when a ticket becomes `RESOLVED`.

## Open items

- Whether to introduce a dedicated `EXPENSE` ledger type (currently
  `ADJUSTMENT` is the only non-income type).
- Technician/user assignment once identity exists (ADR-004).
- Attachment storage (reuse the 002B image/metadata approach).