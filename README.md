# Property Management Platform

A web-based property management application for rental operations,
landlord transparency, tenant management, M-Pesa reconciliation and
maintenance, built for a Kenyan property management business managing
approximately 50-100 properties.

## Architecture

- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: Express + TypeScript (modular monolith)
- Database: PostgreSQL
- ORM: Prisma 6
- Monorepo: pnpm workspaces

See `docs/architecture/overview.md` and `docs/decisions/` for details.

## Applications

- `apps/web`: Web application (`@property-platform/web`)
- `apps/api`: Backend API (`@property-platform/api`)
- `packages/contracts`: Shared API contracts (`@property-platform/contracts`)

## Prerequisites

- Node.js 22 (see `.nvmrc`; `>=22 <26` supported)
- pnpm 10.12.1
- PostgreSQL (only needed to exercise database-backed endpoints)

## Installation

```bash
pnpm install
```

Configure the backend environment:

```bash
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env` and provide local development credentials. The
`SESSION_SECRET` must be at least 32 characters.

Generate the Prisma client (required after every install):

```bash
pnpm --filter @property-platform/api db:generate
```

## Development

```bash
pnpm dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:4000
- API health: http://localhost:4000/api/v1/health
- Database health: http://localhost:4000/api/v1/health/database

`pnpm dev` runs the web and api dev servers in parallel.

## Common Scripts

Run from the repository root to target every workspace package, or
scope with `pnpm --filter <package> <script>`.

| Command             | Description                                  |
| ------------------- | -------------------------------------------- |
| `pnpm dev`          | Start web and api dev servers in parallel.   |
| `pnpm build`        | Build all packages.                          |
| `pnpm typecheck`    | Type-check all packages.                     |
| `pnpm lint`         | Lint all packages.                           |
| `pnpm test`         | Run all tests (Vitest).                      |
| `pnpm format`       | Format the repository with Prettier.         |
| `pnpm format:check` | Verify formatting.                           |

## Environment Variables

The backend validates configuration at startup. See
`docs/architecture/environment.md` for the full reference. Key
variables: `NODE_ENV`, `API_PORT`, `WEB_ORIGIN`, `DATABASE_URL`,
`SESSION_SECRET`.

## Repository Structure

```
.
├── apps/
│   ├── api/          Express backend
│   └── web/          React frontend
├── packages/
│   └── contracts/    Shared types
├── docs/             Requirements, architecture, decisions, status
├── .github/          CI workflows
├── pnpm-workspace.yaml
└── package.json
```

## Testing

```bash
pnpm test
```

Tests use Vitest. API endpoint tests use Supertest. Every business
module added in later milestones must include tests covering financial
calculations, payment idempotency, authorization and tenant/landlord
isolation.

## Troubleshooting

- `@prisma/client did not initialize yet`: run
  `pnpm --filter @property-platform/api db:generate` after installing.
- Port already in use: change `API_PORT` in `apps/api/.env`.
- Database health returns 503: PostgreSQL is not reachable or
  `DATABASE_URL` is incorrect.

## Development Rules

Read `AGENTS.md` (and `apps/api/AGENTS.md`, `apps/web/AGENTS.md`)
before contributing. Follow the documented architecture and business
rules. Never commit environment secrets or real tenant data.