# Business Requirements

## 1. Purpose

Define the business goals, stakeholders and scope of the Property
Management & Landlord Transparency Platform. This document is the
authoritative business-level reference; functional detail lives in
`functional-requirements.md` and enforceable rules in
`business-rules.md`.

## 2. Business Context

- The platform serves a Kenyan property management business managing
  approximately **50–100 properties**.
- Rent is denominated in **Kenyan Shillings (KES)**.
- Rent collection and reconciliation rely on **M-Pesa** payments.
- The business needs **landlord transparency**: landlords must be able
  to see the performance of their properties and the handling of their
  funds.

## 3. Stakeholders / Personas

| Persona | Description | Primary concerns |
| --- | --- | --- |
| Individual landlord | Owns one or more properties directly. | Rent received, arrears, expenses, statements. |
| Corporate landlord | Registered company owning property. | Portfolio oversight, multi-user access, reporting. |
| Property manager | Operates properties on behalf of landlords. | Day-to-day operations, tenants, maintenance, collection. |
| Tenant | Occupies a unit under a lease. | Rent obligations, payment history, notices, maintenance. |
| Platform administrator | Internal operator of the system. | User/role administration, configuration, audit. |

## 4. Business Goals

1. **Transparency** – give landlords a clear, trustworthy view of rent
   collection, arrears and property performance.
2. **Reliable rent collection & reconciliation** – record every payment
   traceably and reconcile it against rent charges.
3. **Arrears & penalty tracking** – surface outstanding balances and
   apply penalties only according to approved rules.
4. **Tenant payment behaviour insight** – track punctuality and history
   per tenant.
5. **Maintenance management** – manage internal maintenance requests.
6. **Vacancy management** – issue vacation notices and track vacancies.
7. **Financial & operational reporting** – produce statements and
   portfolio reports.
8. **M-Pesa integration** – accept and reconcile M-Pesa payments.

## 5. Key Capabilities (summary)

- Property, unit and tenancy management.
- Landlord and corporate account management.
- Tenant onboarding and lease lifecycle.
- Recurring rent charge generation.
- M-Pesa payment collection and allocation.
- Arrears detection and penalty application (approved rules only).
- Maintenance request handling.
- Vacation notices and vacancy tracking.
- Financial and operational reporting.

## 6. Assumptions & Constraints

- Single-tenant deployment for one property management business.
- The portfolio size (≤100 properties) does not require microservices.
- M-Pesa Daraja (or equivalent) is the payment provider; exact API
  capability is **to be confirmed** (see Open Questions).
- All monetary values are handled with exact arithmetic (no floating
  point) — see `architecture/data-model.md` and ADR-005.

## 7. Out of Scope (this milestone and near term)

- Full accounting/ERP replacement.
- Multi-currency support.
- Native mobile applications.
- Public marketing website.

## 8. Success Metrics (initial)

- 100% of rent payments traceable to a recorded transaction.
- Zero duplicate payment allocations.
- Landlords can retrieve a property/owner statement on demand.
- Overdue accounts are visible without manual spreadsheet work.

## 9. Open Questions (require approval before implementation)

These affect money, security or tenancy behaviour and **must not be
assumed**:

1. **Authentication & authorization strategy** — see
   `decisions/ADR-004-authentication-and-authorization.md` (Proposed).
2. **Penalty calculation formula** — no formula is approved; see
   `decisions/ADR-006-penalty-calculation.md` (Proposed).
3. **Payment allocation order** across rent charges/fees — pending
   approval.
4. **M-Pesa integration capability** (STK Push, callbacks, refunds).
5. **Corporate landlord multi-user model** (who can see what).

See `../project-status.md` for milestone status.