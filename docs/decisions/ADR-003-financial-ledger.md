# ADR-003: Financial Ledger Architecture

Status: Proposed

## Context

The system must reconcile rent, payments, penalties
and landlord financial statements.

## Decision

Use separate records for rent charges, payments,
payment allocations and penalties.

Do not rely on an editable tenant balance field
as the financial source of truth.

## Consequences

Financial statements must be derived from traceable
ledger records.

Every financial correction must be auditable.

Penalty calculations must follow approved business rules.