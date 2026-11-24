# ADR-004: Monorepo Tooling and Quality Baseline

Status: Accepted

## Context

The platform is a modular monolith split across a React frontend,
an Express backend and a shared contracts package. Consistent
tooling, type safety, linting, formatting and testing are required
from the first commit so that quality gates do not drift as modules
are added.

## Decision

- Use pnpm workspaces as the single package manager and task runner.
  Workspace packages live under `apps/*` and `packages/*`.
- Use TypeScript in strict mode across all packages.
- Use ESLint with the flat config format. Each package owns an
  `eslint.config.js` so linting is self-contained and independent of
  the current working directory.
- Use Prettier for formatting with a single root `.prettierrc.json`
  and a `.prettierignore` that excludes build output and lockfiles.
- Use Vitest for unit and integration tests, with Supertest for API
  endpoint tests in the backend.
- Pin TypeScript to a version supported by `typescript-eslint`
  (6.0.x) to avoid peer-dependency conflicts.
- Keep the frontend and backend fully independent. The contracts
  package is available for shared types but is not imported by the
  applications during the foundation, preserving independence.

## Consequences

- A single root `pnpm-lock.yaml` governs the whole workspace.
- CI runs install, Prisma generate, typecheck, lint, test and build
  for every package via `pnpm -r`.
- Adding a package requires no new tooling decisions; it inherits
  the shared conventions.
- Dependency build scripts (esbuild, Prisma) are explicitly allowed
  in `pnpm-workspace.yaml` via `onlyBuiltDependencies` because pnpm 10
  blocks unapproved build scripts by default.