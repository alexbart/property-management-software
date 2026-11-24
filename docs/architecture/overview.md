# Architecture Overview

## Style

Modular monolith (see ADR-001). A single deployable backend with
clearly separated business modules, plus an independent frontend.

## Applications

- `apps/web`: React + TypeScript + Vite + Tailwind CSS single page app.
- `apps/api`: Express + TypeScript modular monolith backend.
- `packages/contracts`: shared TypeScript types and constants.

The frontend and backend are independent. They communicate only over
the versioned HTTP API under `/api/v1`. The frontend never accesses
PostgreSQL directly.

## Backend layout

```
apps/api/src
├── app.ts          Express application wiring and health routes
├── server.ts       HTTP server bootstrap and graceful shutdown
├── config/         Environment loading and validation (Zod)
├── database/       Prisma client singleton
├── common/         Cross-cutting concerns (errors, logging)
├── middleware/     Express middleware (auth, validation, errors)
└── modules/        Business modules (routes, controllers, services,
                    repositories, validation, types, tests)
```

Business modules are added under `src/modules/<name>` and follow
controller/service/repository separation as described in
`apps/api/AGENTS.md`. No business modules exist yet.

## Request flow

`HTTP request -> middleware -> route -> controller -> service ->
repository -> Prisma -> PostgreSQL`

Controllers stay thin. Business rules live in services and are unit
tested independently of HTTP.

## Data layer

PostgreSQL is the source of truth (see ADR-002) accessed through
Prisma 6. The foundation schema intentionally contains no business
entities. All schema changes go through reviewed migrations; money is
stored using exact decimal or integer minor-unit representations, and
financial records are append-only and traceable (see ADR-003).

## API surface (foundation)

- `GET /api/v1/health` - service liveness.
- `GET /api/v1/health/database` - database readiness (503 when
  unavailable).

## Configuration

All configuration is validated at startup with Zod. See
`docs/architecture/environment.md`.