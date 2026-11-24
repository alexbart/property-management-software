# Milestone 003 — Tenant & Lease Lifecycle

Purpose: model who is renting a unit, the lease terms, and the invariant
that a unit has **at most one ACTIVE lease** at any time. This is the
prerequisite for the rent/penalty tracker, maintenance requests and M-Pesa
reconciliation.

## Scope

- Tenant identity and the foundation of the Tenant Risk Register.
- Lease records linking a Tenant to a Unit (with denormalised Property for
  safe composite foreign keys).
- Database-enforced single-active-lease invariant.

Out of scope (later milestones): rent charges, payments, allocations,
penalties, M-Pesa, maintenance, notices, reporting.

## Tenant

Core identity plus risk-register foundation:

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| first_name | varchar | |
| last_name | varchar | |
| phone | varchar | M-Pesa payer identity |
| email | varchar null | optional contact |
| id_number | varchar unique | Kenyan national ID |
| risk_score | integer | default `0` |
| risk_flags | text[] | default `[]` |
| created_at / updated_at | timestamptz | |

`risk_score` and `risk_flags` are the **foundation** of the Tenant Risk
Register. The scoring/ranking method is a later milestone and is not
invented here.

## Lease

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| tenant_id | uuid fk tenants | |
| unit_id | uuid fk units | |
| property_id | uuid fk properties | denormalised for isolation/composite FKs |
| start_date | timestamptz | |
| end_date | timestamptz | |
| notice_period_days | integer | default `30` (one month) |
| rent_amount | numeric(12,2) | KES |
| deposit_amount | numeric(12,2) | KES |
| status | enum | `DRAFT`,`ACTIVE`,`TERMINATED`,`EXPIRED` |
| terminated_at | timestamptz null | set when terminated |
| created_at / updated_at | timestamptz | |

### Lease state machine

```
DRAFT ──▶ ACTIVE ──▶ TERMINATED
                 └──▶ EXPIRED
```

- `DRAFT` — being prepared; not yet in force.
- `ACTIVE` — current, billable tenancy.
- `TERMINATED` — ended early (notice/eviction); `terminated_at` set.
- `EXPIRED` — reached `end_date` without renewal.

Only `ACTIVE` leases count against the single-active-lease invariant.

## Critical constraint — one ACTIVE lease per unit

A **partial unique index** enforces at most one `ACTIVE` lease per `unit_id`:

```sql
CREATE UNIQUE INDEX leases_one_active_per_unit
    ON leases (unit_id)
    WHERE status = 'ACTIVE';
```

This is added via raw SQL in the migration (Prisma cannot express partial
unique indexes). A full `@@unique([tenantId, status])` is **not** used: it
would wrongly forbid a tenant from having multiple historical
`TERMINATED`/`EXPIRED` leases.

## Notice period

`notice_period_days` defaults to **30** (one month), matching the business
rule for tenant vacating notice. It is stored per lease so historical terms
remain reproducible if the default changes later.

## Invariants

1. A unit has at most one `ACTIVE` lease (DB partial unique index).
2. `property_id` on a lease must match the unit's property (composite FK).
3. Lease status transitions follow the state machine above.
4. Tenant identity (`id_number`) is unique.
5. Financial fields use `numeric(12,2)` via `Prisma.Decimal`; never JS float.

## Open items

- Risk scoring/ranking method (later milestone).
- Whether `email` and `id_number` are mandatory for all tenants (data
  protection / retention — see ADR-004).
- Renewal flow (`EXPIRED` → new `DRAFT`/`ACTIVE`) and notice handling.