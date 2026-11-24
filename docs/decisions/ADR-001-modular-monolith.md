# ADR-001: Modular Monolith Architecture

Status: Accepted

## Context

The platform manages properties, tenants, payments,
maintenance, penalties and reporting.

The initial portfolio is approximately 50-100 properties.

## Decision

Use a modular monolith with a separate React frontend
and Express backend.

## Rationale

- Lower operational complexity.
- Easier financial transaction management.
- Clear business module boundaries.
- Easier initial deployment.
- Ability to extract independent services later.

## Consequences

Modules must have clear responsibilities.
Cross-module dependencies must be controlled.
Financial operations must use explicit database transactions.