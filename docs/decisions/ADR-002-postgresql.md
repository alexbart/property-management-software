# ADR-002: PostgreSQL

Status: Accepted

## Context

The system has relational business data and financial records.

## Decision

Use PostgreSQL as the primary database.

## Rationale

- Strong relational integrity.
- Transaction support.
- Constraints and indexes.
- Reliable financial record handling.
- Suitable for reporting.

## Consequences

Database changes require reviewed migrations.