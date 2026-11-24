# Milestone 007 — Tenant Notices & Landlord Reconciliation

Purpose: give tenants a formal move-out notice workflow and give landlords a
property-level income/expense reconciliation.

## Tenant notices

A `TenantNotice` records a tenant's intention to vacate. It links to a `Lease`,
its `Property`, and the `Tenant`.

Fields: `noticeDate`, `intendedMoveOutDate`, `status`, optional `reason`,
optional `reviewedBy` / `reviewedAt`.

Statuses:

- `PENDING` — submitted, awaiting review.
- `APPROVED` — accepted by an authorised manager/landlord.
- `REJECTED` — declined.
- `WITHDRAWN` — retracted by the tenant.

### 30-day minimum notice rule

Tenants must give at least the lease's notice period (default 30 days) before
the intended move-out date:

```
intendedMoveOutDate - noticeDate >= noticePeriodDays (lease, default 30)
```

The rule is enforced in the service layer (not the database) so the required
period can vary per lease and be reported clearly to the caller. A notice that
violates the minimum is rejected with a validation error.

## Reconciliation

A pure, read-only aggregation for one `propertyId` over a date range
`[from, to)`:

| Component | Source |
| --- | --- |
| Total Rent Due | `SUM(LedgerEntry.amount)` where `type = RENT` and `effectiveDate` in range |
| Total Collected | `SUM(Payment.amount)` where `status = COMPLETED` and `receivedAt` in range |
| Total Maintenance Expenses | `SUM(MaintenanceTicket.actualCost)` where `createdAt` in range |
| Estimated NOI | `Total Collected - Total Maintenance Expenses` |

```
estimatedNOI = totalCollected - totalMaintenanceExpenses
```

Notes:

- Rent due is a charge figure; collected is cash received. They are reported
  separately and are not netted into NOI.
- `actualCost` is nullable in the schema; null is treated as zero.
- All money uses `Prisma.Decimal`; no floating-point arithmetic.
- The service is pure (no writes) and property-scoped; callers must enforce
  authorization before invoking it.

## Invariants

1. A notice cannot violate the lease's minimum notice period.
2. Notice status transitions are explicit and auditable.
3. Reconciliation is derived and never persisted.
4. Property isolation applies to both notices and reconciliation.

## Open items

- Who may approve/reject notices (role matrix, ADR-004).
- Whether an approved notice auto-terminates the lease.
- Notice overlap / duplicate-notice handling.
- Reconciliation date basis for maintenance (createdAt vs resolvedAt).
- Currency/rounding presentation rules for reports.