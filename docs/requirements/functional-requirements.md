# Functional Requirements

Each requirement has an ID, a priority (Must / Should / Could) and a
status/dependency. Requirements marked **Pending** depend on an approved
business decision and must not be implemented until approved (see
`business-rules.md` and `../decisions/`).

## Authentication & Authorization

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-AUTH-001 | Users authenticate with email + password. | Must | Pending ADR-004 |
| FR-AUTH-002 | Passwords are stored only as salted hashes. | Must | Must |
| FR-AUTH-003 | Backend enforces role-based access control on every endpoint. | Must | Must |
| FR-AUTH-004 | Resource-level authorization prevents IDOR and cross-landlord access. | Must | Must |
| FR-AUTH-005 | Sessions expire and can be revoked. | Should | Pending ADR-004 |

## Users & Roles

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-USER-001 | Administrators can invite and deactivate users. | Must | Must |
| FR-USER-002 | Each user has exactly one primary role. | Must | Must |
| FR-USER-003 | Users see only data their role and assignments permit. | Must | Must |

## Landlords

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-LAND-001 | Support individual and corporate landlords. | Must | Must |
| FR-LAND-002 | Corporate landlords can have multiple authorized users. | Should | Pending |
| FR-LAND-003 | Landlords can view statements for their properties only. | Must | Must |

## Properties & Units

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-PROP-001 | Create/update properties with address and ownership. | Must | Must |
| FR-PROP-002 | Each property has one or more rentable units. | Must | Must |
| FR-PROP-003 | Units track type, size and standard rent. | Must | Must |
| FR-PROP-004 | Property/unit history is preserved (no destructive edits). | Must | Must |
| FR-PROP-005 | Support `Property → Building → Unit` hierarchy; a property may have zero or more buildings and may attach units directly (standalone). | Must | Proposed |
| FR-PROP-006 | Each unit belongs to exactly one container (property or building). | Must | Proposed |
| FR-PROP-007 | Support multiple owners per property via ownership shares (percentages). | Should | Proposed |
| FR-PROP-008 | Store optional property GPS location; parse common formats (e.g. `-1.2921, 36.8219`) and validate ranges. | Should | Proposed |
| FR-PROP-009 | Attach reusable amenities at property, building or unit level. | Should | Proposed |
| FR-PROP-010 | Define flexible accommodation policies (gender, students, families, children, pets, smoking, visitors, shared, max occupants) at property/building/unit level. | Should | Proposed |
| FR-PROP-011 | Units record optional bedroom/bathroom counts only where meaningful. | Could | Proposed |
| FR-PROP-012 | Attach multiple photos per level with caption, primary flag, display order and upload timestamp; binaries stored externally, references in DB. | Should | Proposed |

## Tenants & Leases

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-TEN-001 | Create tenants and link to a unit via a lease. | Must | Must |
| FR-TEN-002 | A unit has at most one active lease at a time. | Must | Must |
| FR-TEN-003 | Leases record start/end dates, rent and deposit terms (versioned). | Must | Must |
| FR-TEN-004 | Historical tenancies are retained after a lease ends. | Must | Must |
| FR-TEN-005 | Rent/deposit term changes append history; historical charges remain reproducible. | Must | Proposed |

## Tenant Payment Behaviour & Risk

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-RISK-001 | Track per-tenant payment punctuality and history from ledger records. | Should | Proposed |
| FR-RISK-002 | Provide a measurable payment-risk ranking derived from recorded behaviour. | Should | **Pending** (ranking method) |
| FR-RISK-003 | Risk scores are derived (read model), never a hand-edited field. | Must | Proposed |

## Rent Charges

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-RENT-001 | Generate recurring rent charges per lease (e.g. monthly). | Must | Must |
| FR-RENT-002 | Rent charge generation is idempotent (no duplicates per period). | Must | Must |
| FR-RENT-003 | Rent charges are separate records from payments. | Must | Must |

## Payments & M-Pesa

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-PAY-001 | Record payments received via M-Pesa. | Must | Pending M-Pesa |
| FR-PAY-002 | Payment callbacks are authenticated and idempotent. | Must | Must |
| FR-PAY-003 | Every payment is traceable to an external reference. | Must | Must |
| FR-PAY-004 | Manual/recorded payments are supported and audited. | Should | Must |

## Allocations

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-ALLOC-001 | Allocate a payment to rent charges and fees. | Must | Pending order |
| FR-ALLOC-002 | Prevent duplicate allocation of the same payment. | Must | Must |
| FR-ALLOC-003 | Allocation order across charge types is configurable per approved rule. | Should | Pending |

## Arrears

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-ARR-001 | Derive outstanding balances from charges minus allocations. | Must | Must |
| FR-ARR-002 | Surface overdue accounts and aging. | Must | Must |

## Penalties

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-PEN-001 | Apply late-payment penalties per an approved rule. | Should | **Pending ADR-006** |
| FR-PEN-002 | Penalties are separate, auditable records. | Should | Pending ADR-006 |
| FR-PEN-003 | No penalty is applied without an approved, versioned rule. | Must | Must |

## Maintenance

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-MAINT-001 | Record and track internal maintenance requests. | Should | Must |
| FR-MAINT-002 | Maintenance requests link to a unit/property. | Should | Must |

## Vacation Notices & Vacancy

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-VAC-001 | Record tenant vacation notices with dates. | Could | Must |
| FR-VAC-002 | Track vacant units and vacancy periods. | Should | Must |

## Reporting

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-REP-001 | Produce landlord/property financial statements. | Must | Must |
| FR-REP-002 | Produce arrears and collection reports. | Should | Must |
| FR-REP-003 | Reports derive from ledger records, not editable balances. | Must | Must |

## Audit

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-AUDIT-001 | Record sensitive administrative actions. | Must | Must |
| FR-AUDIT-002 | Financial corrections are auditable, never silent. | Must | Must |