# Permissions Matrix

Authorization model for the platform. Frontend checks are **presentation
only**; the **backend enforces** every permission (BR-AUTH-001). Most
permissions are **scoped**: a user may only act on resources they own or
are assigned to (prevents IDOR and cross-landlord leakage —
BR-AUTH-003/005).

## Roles

| Role | Description |
| --- | --- |
| `ADMIN` | Platform administrator. Full configuration and user management. |
| `LANDLORD` | Property owner. Sees/manages their own portfolio. |
| `PROPERTY_MANAGER` | Operates assigned properties on behalf of landlords. |
| `TENANT` | Occupant. Sees only their own tenancy data. |

## Scoping

- **Own** – the authenticated user's own record(s).
- **Assigned** – properties/units/leases explicitly assigned to the user
  (property manager) or owned by the user's landlord account.
- **All** – unrestricted (ADMIN only, and only where noted).

## Matrix

Legend: ✅ allowed · 🔒 allowed only when **scoped** to the caller ·
— not allowed.

| Permission | ADMIN | LANDLORD | PROPERTY_MANAGER | TENANT |
| --- | --- | --- | --- | --- |
| user:create / invite | ✅ | — | — | — |
| user:deactivate | ✅ | — | — | — |
| user:read | ✅ | 🔒 own | 🔒 own | 🔒 own |
| landlord:manage | ✅ | 🔒 own | — | — |
| property:read | ✅ | 🔒 own | 🔒 assigned | — |
| property:write | ✅ | 🔒 own | 🔒 assigned | — |
| unit:read | ✅ | 🔒 own | 🔒 assigned | 🔒 own unit |
| unit:write | ✅ | 🔒 own | 🔒 assigned | — |
| tenant:read | ✅ | 🔒 own | 🔒 assigned | 🔒 own |
| tenant:write | ✅ | 🔒 own | 🔒 assigned | — |
| lease:read | ✅ | 🔒 own | 🔒 assigned | 🔒 own |
| lease:write | ✅ | 🔒 own | 🔒 assigned | — |
| rent_charge:read | ✅ | 🔒 own | 🔒 assigned | 🔒 own |
| rent_charge:generate | ✅ | 🔒 own | 🔒 assigned | — |
| payment:read | ✅ | 🔒 own | 🔒 assigned | 🔒 own |
| payment:record | ✅ | 🔒 own | 🔒 assigned | — |
| payment:allocate | ✅ | 🔒 own | 🔒 assigned | — |
| payment:refund | ✅ | 🔒 own | — | — |
| penalty:apply | ✅ | 🔒 own | 🔒 assigned | — |
| penalty:read | ✅ | 🔒 own | 🔒 assigned | 🔒 own |
| maintenance:read | ✅ | 🔒 own | 🔒 assigned | 🔒 own |
| maintenance:write | ✅ | 🔒 own | 🔒 assigned | 🔒 own (request) |
| vacation_notice:write | ✅ | 🔒 own | 🔒 assigned | 🔒 own |
| vacancy:read | ✅ | 🔒 own | 🔒 assigned | — |
| report:read | ✅ | 🔒 own | 🔒 assigned | 🔒 own |
| audit_log:read | ✅ | — | — | — |
| config:manage | ✅ | — | — | — |

## Enforcement Rules

1. Every protected endpoint runs through **authentication** then an
   **authorization** guard that checks role **and** scope.
2. Resource identifiers (IDs in URLs/bodies) are validated against the
   caller's scope on **every** request — never trust client-supplied
   ownership.
3. Landlord scoping: a landlord user may only reference resources whose
   `landlord_id` matches their landlord account.
4. Property manager scoping: limited to assigned properties/units.
5. Tenant scoping: limited to the tenant's own lease/unit/payment
   records.
6. Administrative and financial-correction actions are written to
   `audit_logs` (FR-AUDIT-001, BR-DATA-003).

## Property Inventory & Maintenance Visibility

- Buildings, units, amenities, accommodation policies and property
  images are **sub-resources of a property** and inherit the property's
  scope: `LANDLORD`/`PROPERTY_MANAGER` act only on their owned/assigned
  properties; `TENANT` sees only their own unit's details.
- `maintenance:write` for `TENANT` is limited to **raising a request**
  for their own unit; they may **read** only their own requests.
- `PROPERTY_MANAGER` may read/write maintenance for assigned units.
- Whether tenants should see broader property/amenity details, and
  whether a dedicated `ACCOUNTANT`/`STAFF` role is needed, is
  **Pending** (see Open Questions and the decision/risk register).

## Open Questions (affect this matrix)

- Corporate landlord **multi-user** model: which roles within a company
  can see which properties? (Pending)
- Whether a dedicated `ACCOUNTANT` (or `STAFF`) role is required. (Pending)
- Tenant maintenance visibility scope (own requests only vs broader).
- Authentication mechanics (sessions/tokens) — see
  `../decisions/ADR-004-authentication-and-authorization.md` (Proposed).