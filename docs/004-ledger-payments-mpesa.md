# Milestone 004 — Rent Ledger, Payments & M-Pesa Webhooks

Purpose: track money against leases with an immutable ledger, idempotent
payments, and a reproducible arrears calculation. This is the financial core
that later feeds statements, penalties and reconciliation.

## Scope

- Immutable ledger entries tied to a lease (and denormalised property).
- Payment records with status tracking.
- Idempotency keys for safe handling of duplicate M-Pesa callbacks.
- Pure arrears calculation.

Out of scope (later): M-Pesa Darada API client, penalty rules, statements,
reconciliation UI, refunds/reversals beyond append-only adjustments.

## Ledger entries are immutable

A `LedgerEntry` is **append-only**. Once created it is never updated or
deleted. Corrections are made by adding a reversing `ADJUSTMENT` entry, so the
history remains reproducible and auditable.

Ledger types:

| Type | Meaning |
| --- | --- |
| RENT | A rent charge for a period |
| DEPOSIT | A deposit charge |
| PENALTY | An approved penalty charge |
| ADJUSTMENT | A correction/reversal (may be negative) |

## Payments are idempotent

Every payment carries a unique `reference`. For M-Pesa this is the
`CheckoutRequestID` or `MerchantRequestID`. A duplicate callback with the same
reference must **not** credit the tenant twice: the unique constraint on
`reference` plus the `IdempotencyKey` table make retries safe.

Payment methods: `MPESA`, `CASH`, `BANK`.
Payment statuses: `PENDING`, `COMPLETED`, `FAILED`.

Only `COMPLETED` payments reduce the balance.

## Arrears calculation

```
arrears = SUM(ledger.amount WHERE type IN ('RENT','PENALTY'))
        - SUM(payment.amount WHERE status = 'COMPLETED')
```

Computed per lease. This is a **pure** read model; no mutable balance column is
stored. `DEPOSIT` and `ADJUSTMENT` entries are excluded from the arrears
formula above (adjustments are handled explicitly by the ledger rules).

## Idempotency

`IdempotencyKey` stores a unique `key`, an optional JSON `responsePayload`, and
an `expiresAt`. A repeated request with the same key returns the stored response
instead of re-processing.

## Invariants

1. Ledger entries are immutable; corrections append `ADJUSTMENT` rows.
2. `payment.reference` is unique; duplicate callbacks are rejected safely.
3. Arrears are derived, never stored.
4. Money uses `numeric(12,2)` via `Prisma.Decimal`; never JS float.
5. A payment/ledger row always belongs to one lease and one property.

## Open items

- Exact M-Pesa Daraja auth/callback verification and reconciliation (blocked).
- Penalty formula (ADR-006, blocked).
- Refund/reversal workflow and statement formatting.