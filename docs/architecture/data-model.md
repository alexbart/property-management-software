# Data Model

Physical persistence design. PostgreSQL is the source of truth; Prisma is
the ORM. All schema changes go through reviewed migrations (see
`../decisions/ADR-002-postgresql.md`). This document is a design
reference — it is **not** an applied migration.

## Conventions

- Primary keys: `id` (UUID or cuid, assigned by the application).
- Timestamps: `created_at`, `updated_at` on all tables.
- Money: see "Money representation" below.
- Financial rows are never hard-deleted; corrections append rows.
- Ownership columns (`landlord_id`, `property_id`, `tenant_id`) drive
  authorization and tenant isolation.

## Money representation

- Store money in PostgreSQL as `numeric(12,2)` (exact) and access it via
  `Prisma.Decimal`. **Never** use JavaScript `number` for money.
- Minor-unit integers (`bigint` cents) are an acceptable alternative if
  the team prefers; pick one standard before implementation (ADR-005).
- All amounts are KES.

## Core Tables

### users
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| email | text unique | login identifier |
| password_hash | text | salted hash (argon2/bcrypt) |
| role | enum | `ADMIN`,`LANDLORD`,`PROPERTY_MANAGER`,`TENANT` |
| status | enum | `ACTIVE`,`INVITED`,`DISABLED` |
| created_at / updated_at | timestamptz | |

### landlords
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| kind | enum | `INDIVIDUAL`,`CORPORATE` |
| name | text | person or company name |
| user_id | uuid fk users | primary contact (nullable for corporate) |

### properties
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| landlord_id | uuid fk landlords | primary owner (isolation) |
| name | text | |
| address | jsonb/text | |
| latitude | numeric(9,6) null | optional GPS |
| longitude | numeric(9,6) null | optional GPS |
| created_at / updated_at | timestamptz | |

Co-ownership is modelled separately in `ownership_shares` so a property
can have multiple owners with percentage shares while retaining a
primary `landlord_id` for isolation queries.

### ownership_shares
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| property_id | uuid fk properties | |
| landlord_id | uuid fk landlords | co-owner |
| share_percent | numeric(5,2) | 0–100 |
| created_at / updated_at | timestamptz | |

### buildings
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| property_id | uuid fk properties | |
| name | text | e.g. "Block A" |
| created_at / updated_at | timestamptz | |

Optional: a property with no buildings attaches units directly to the
property. A unit belongs to exactly one container (property or building).

### units
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| property_id | uuid fk properties | denormalized for isolation queries |
| building_id | uuid fk buildings null | null = unit sits directly on property |
| label | text | e.g. "A1" |
| type | text | e.g. "1-bedroom" |
| bedrooms | int null | optional; only where meaningful |
| bathrooms | int null | optional; only where meaningful |
| standard_rent | numeric(12,2) | KES |
| status | enum | `VACANT`,`OCCUPIED`,`MAINTENANCE` |

### amenities
> **Superseded by the Milestone 002B catalogue model below.** Retained for
> historical context only.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| name | text unique | e.g. "Borehole", "Lift" |
| created_at / updated_at | timestamptz | |

### amenity_assignments
> **Superseded by the Milestone 002B catalogue model below.**

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| amenity_id | uuid fk amenities | |
| level | enum | `PROPERTY`,`BUILDING`,`UNIT` |
| property_id | uuid fk properties null | set per level |
| building_id | uuid fk buildings null | |
| unit_id | uuid fk units null | |
| created_at | timestamptz | |

Reusable amenities assigned at any level; a CHECK constraint ensures the
id matching `level` is populated.

### accommodation_policies
> **Superseded by the Milestone 002B policy catalogue below.** The
> structured-column design is formally withdrawn.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| level | enum | `PROPERTY`,`BUILDING`,`UNIT` |
| property_id / building_id / unit_id | uuid fk null | per level |
| gender_policy | enum/text | e.g. `ANY`,`MALE`,`FEMALE` (see open Q) |
| students_allowed | boolean null | |
| families_allowed | boolean null | |
| children_allowed | boolean null | |
| pets_allowed | boolean null | |
| smoking_allowed | boolean null | |
| visitors_policy | text null | |
| shared_allowed | boolean null | |
| max_occupants | int null | |
| created_at / updated_at | timestamptz | |

Flexible attributes rather than fixed yes/no columns on the unit; more
specific assignment augments (does not delete) less-specific policy.

### property_images
> **Superseded by the Milestone 002B `inventory_images` model below.**

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| level | enum | `PROPERTY`,`BUILDING`,`UNIT` |
| property_id / building_id / unit_id | uuid fk null | per level |
| storage_key | text | external object storage reference |
| caption | text null | |
| is_primary | boolean | at most one per level (see constraints) |
| sort_order | int | display order |
| uploaded_at | timestamptz | |

No image binaries are stored in PostgreSQL; only references.

### tenants
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| name | text | |
| phone | text | M-Pesa payer identity |
| national_id | text | sensitive, restricted |
| user_id | uuid fk users | nullable (portal access) |

### leases
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| unit_id | uuid fk units | |
| tenant_id | uuid fk tenants | |
| start_date | date | |
| end_date | date null | null = ongoing |
| rent_amount | numeric(12,2) | KES (current term) |
| deposit_amount | numeric(12,2) null | KES |
| status | enum | `ACTIVE`,`ENDED` |
| created_at / updated_at | timestamptz | |

Rent/deposit term changes append a `lease_terms` history row (period
range + amount) rather than overwriting; historical charges remain
reproducible.

### rent_charges
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| lease_id | uuid fk leases | |
| period | text | e.g. `2026-04` |
| amount | numeric(12,2) | KES |
| due_date | date | |
| status | enum | `OPEN`,`ALLOCATED`,`PAID` (derived) |
| created_at | timestamptz | |

### payments
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| payer_tenant_id | uuid fk tenants null | |
| amount | numeric(12,2) | KES |
| method | enum | `MPESA`,`CASH`,`BANK`,`OTHER` |
| external_ref | text | M-Pesa receipt / reference |
| received_at | timestamptz | |
| status | enum | `PENDING`,`COMPLETED`,`FAILED`,`REVERSED` |
| created_at | timestamptz | |

### payment_allocations
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| payment_id | uuid fk payments | |
| charge_type | enum | `RENT`,`FEE`,`PENALTY` |
| charge_id | uuid | rent_charges/penalties id |
| amount | numeric(12,2) | KES |
| created_at | timestamptz | |

### penalties
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| lease_id | uuid fk leases | |
| rule_version | text | approved rule identifier |
| amount | numeric(12,2) | KES |
| reason | text | |
| created_at | timestamptz | |

### maintenance_requests
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| unit_id | uuid fk units | |
| description | text | |
| status | enum | `OPEN`,`IN_PROGRESS`,`DONE` |
| created_at / updated_at | timestamptz | |

### vacation_notices
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| lease_id | uuid fk leases | |
| start_date / end_date | date | |
| created_at | timestamptz | |

### vacancies
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| unit_id | uuid fk units | |
| start_date / end_date | date | |

### audit_logs
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| actor_user_id | uuid fk users | |
| action | text | e.g. "payment.correct" |
| entity_type / entity_id | text/uuid | |
| metadata | jsonb | before/after summaries |
| created_at | timestamptz | append-only |

## Milestone 002B — Catalogue & Assignment Model (approved)

Approved design (see `domain-model-review.md` and the decision register
D16–D21). This section **supersedes** the `amenities`,
`amenity_assignments`, `accommodation_policies` and `property_images`
sketches above.

### Catalogue tables

#### amenities
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| key | varchar(64) unique | stable machine key, e.g. `borehole` |
| name | varchar(120) | display name |
| category | enum | `FEATURE`,`AMENITY`,`UTILITY` |
| active | boolean | `false` = deactivated (never hard-deleted while assigned) |
| deleted_at | timestamptz null | soft-delete marker |
| created_at / updated_at | timestamptz | |

#### policy_definitions
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| key | varchar(64) unique | e.g. `pets_allowed` |
| name | varchar(120) | display name |
| value_type | enum | `BOOLEAN`,`ENUM`,`INTEGER`,`TEXT` |
| enum_values | text[] | permitted values when `value_type = ENUM` |
| active | boolean | `false` = deactivated |
| deleted_at | timestamptz null | soft-delete marker |
| created_at / updated_at | timestamptz | |

`UNIQUE (id, value_type)` supports the assignment composite FK.

### Assignment tables (shared shape)

`amenity_assignments`, `policy_assignments` and `inventory_images` share a
target shape:

| Column | Type | Notes |
| --- | --- | --- |
| level | enum | `PROPERTY`,`BUILDING`,`UNIT` |
| property_id | uuid fk properties | always set (isolation anchor) |
| building_id | uuid fk buildings null | set for `BUILDING` and building `UNIT` |
| unit_id | uuid fk units null | set for `UNIT` |
| target_id | text generated | `CASE level … END`, stored |

`target_id` is a **stored generated column** (`COALESCE`-style `CASE`) added
via raw SQL; Prisma cannot express it. A CHECK enforces that the id column
matching `level` is populated and the others are null.

#### amenity_assignments (additional)
| Column | Type | Notes |
| --- | --- | --- |
| amenity_id | uuid fk amenities | |
| mode | enum | `INCLUDE`,`EXCLUDE` |

Unique `(amenity_id, level, target_id)`.

#### policy_assignments (additional)
| Column | Type | Notes |
| --- | --- | --- |
| policy_id | uuid fk policy_definitions | |
| value_type | enum | denormalised from the definition |
| mode | enum | `SET`,`EXCLUDE` |
| value_bool | boolean null | |
| value_enum | varchar(64) null | |
| value_int | integer null | |
| value_text | text null | |

- Composite FK `(policy_id, value_type) → policy_definitions(id, value_type)`.
- CHECK: `EXCLUDE` rows have all value columns null; `SET` rows have exactly
  one value column matching `value_type`.
- Unique `(policy_id, level, target_id)`.

#### inventory_images (additional)
| Column | Type | Notes |
| --- | --- | --- |
| storage_provider | varchar(40) | provider-neutral for now |
| storage_key | varchar(512) | external object reference |
| mime_type | varchar(128) | |
| file_size | integer | bytes, ≥ 0 |
| width / height | integer null | > 0 when present |
| original_filename | varchar(255) | |
| caption | varchar(500) null | |
| sort_order | integer | ≥ 0 |
| is_primary | boolean | one per target |
| deleted_at | timestamptz null | soft-delete marker |
| storage_cleanup_status | enum | `PENDING`,`DONE`,`FAILED` |

Partial unique index `(level, target_id) WHERE is_primary AND deleted_at IS
NULL`. No binaries in the database.

### Composite foreign keys

All three target tables use:

- `property_id → properties(id)`
- `(building_id, property_id) → buildings(id, property_id)`
- `(unit_id, property_id) → units(id, property_id)`

The units composite FK requires `UNIQUE (id, property_id)` on `units`,
added in the 002B migration (002A only added it for `buildings`).

### Inheritance & override rules

- Amenities: apply `PROPERTY` → `BUILDING` → `UNIT`; `INCLUDE` adds,
  `EXCLUDE` removes; most-specific wins.
- Policies: walk `UNIT` → `BUILDING` → `PROPERTY`; first `SET` wins;
  `EXCLUDE` stops inheritance. **No assignment = inherit.**
- Effective configuration is **derived at read time**, never copied into
  child rows.

## Constraints & Indexes

- **One active lease per unit**: enforce with a **partial unique index**
  `UNIQUE (unit_id) WHERE status = 'ACTIVE'`. (Prisma requires a raw
  migration for partial indexes.)
- **Idempotent rent charge**: `UNIQUE (lease_id, period)`.
- **Idempotent payment**: `UNIQUE (external_ref)` for `MPESA` payments.
- **No over-allocation**: enforce in a transaction (sum of allocations
  ≤ payment amount); optionally a DB trigger/constraint.
- Foreign keys with appropriate `ON DELETE` behaviour: financial rows
  `RESTRICT`; operational rows may `CASCADE` only if non-financial.
- Index `payments(external_ref)`, `rent_charges(lease_id, period)`,
  `payment_allocations(payment_id)`, `properties(landlord_id)`.
- Ownership columns (`landlord_id`, `tenant_id`) are indexed to support
  isolation queries.
- **One unit container**: a unit references exactly one of
  `building_id` or (implicitly) `property_id`; CHECK that a unit with a
  `building_id` has that building's `property_id` matching its own
  `property_id`.
- **At most one primary image per level**: partial unique index on
  `property_images(level, property_id, building_id, unit_id)
  WHERE is_primary`.
- **Amenity/policy level consistency**: CHECK that the id column
  matching `level` is non-null and others are null.
- **GeoPoint validation**: `latitude` in `[-90, 90]`, `longitude` in
  `[-180, 180]` via CHECK.

## Prisma Notes

- Use `Decimal` for money fields; never `Float`.
- Use transactions for multi-row financial operations (payment +
  allocations; charge generation + allocation).
- Partial unique indexes and some constraints require a custom
  migration (`prisma migrate` with `--create-only` then edit SQL).
- The foundation `schema.prisma` intentionally has no models yet;
  models are added incrementally per this design in Milestone 002.

## Open Items

- Money storage standard **resolved (proposed)** as `numeric(12,2)` +
  `Prisma.Decimal` in `../decisions/ADR-005-rent-and-payment-ledger.md`.
- Allocation order and penalty rule — see ADR-005 / ADR-006 (Pending).
- Confirm whether `latitude`/`longitude` are required or optional for
  property registration (proposed: optional).
- Confirm `gender_policy` semantics (unrestricted eligibility vs
  mixed-gender shared accommodation) — see ADR-004 / register.
- Confirm image storage provider (object storage) before implementing
  upload.