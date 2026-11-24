
# Property Management Platform

## Project Mission

Build a secure, maintainable property management platform
for a Kenyan property management business managing
approximately 50-100 properties.

The platform provides:
- Property management
- Landlord portals
- Tenant portals
- Rent collection and reconciliation
- M-Pesa payment integration
- Rent arrears and penalties
- Tenant payment behaviour tracking
- Internal maintenance management
- Vacation notices and vacancy management
- Financial and operational reporting

## Technology

- Node.js 22
- pnpm 10
- React + TypeScript
- Vite
- Tailwind CSS
- Express
- PostgreSQL
- Prisma 6
- Zod
- Swagger / OpenAPI
- Vitest
- Supertest

## Architecture

Use a modular monolith.

Applications:
- apps/web: frontend
- apps/api: backend
- packages/contracts: shared API contracts

Rules:
- Keep modules logically separated.
- Use controller/service/repository separation.
- Keep controllers thin.
- Do not place business logic in React components.
- Do not couple unrelated modules.
- Prefer explicit dependencies.
- Avoid premature abstractions.
- Avoid microservices at this stage.

## TypeScript

- Enable strict mode.
- Avoid any.
- Avoid unnecessary type assertions.
- Use shared contracts where appropriate.
- Validate external data at runtime.
- Never assume API responses are valid without validation.

## Database

- PostgreSQL is the source of truth.
- Prisma is the ORM.
- All schema changes require migrations.
- Never modify an existing deployed migration.
- Use database constraints where appropriate.
- Use transactions for multi-record operations.
- Store money using exact decimal or integer minor-unit representations.
- Never use JavaScript floating-point arithmetic for money.
- Preserve historical tenancy and financial records.

## Financial Integrity

This is a financial management application.

- Payment records must be traceable.
- Payment processing must be idempotent.
- Prevent duplicate payment allocation.
- Separate rent charges, payments, allocations and penalties.
- Never silently delete financial transactions.
- Corrections must be auditable.
- Never invent penalty formulas.
- Never automatically compound penalties without an approved rule.
- Keep financial business rules documented and tested.

## Security

- Enforce authorization on the backend.
- Do not rely on frontend role checks.
- Prevent IDOR and cross-landlord data leakage.
- Validate all incoming requests.
- Never commit secrets.
- Protect payment callbacks.
- Use secure password hashing.
- Restrict access to private tenant documents.
- Record sensitive administrative actions.
- Follow applicable Kenyan data protection requirements.

## Testing

Every business module must have tests.

Prioritize:
- Financial calculation tests.
- Payment idempotency.
- Authorization tests.
- Tenant isolation.
- Landlord property isolation.
- Database integration tests.
- End-to-end business workflows.

Never claim a test passed unless it was executed.

## AI Development Workflow

Before implementing a task:

1. Read this file.
2. Read relevant application instructions.
3. Inspect existing code.
4. Read relevant requirements and ADRs.
5. Identify affected modules.
6. Prepare an implementation plan.
7. Identify unresolved business rules.

During implementation:

- Work in small increments.
- Avoid unrelated changes.
- Reuse established conventions.
- Add tests.
- Update relevant documentation.

After implementation:

- Run tests.
- Run type checking.
- Run linting.
- Run builds.
- Report modified files.
- Report test results.
- Report unresolved issues.

## Git

- Never commit directly to main.
- Work on feature branches.
- Use Conventional Commits.
- Never force-push without explicit approval.
- Never overwrite uncommitted changes.
- Never commit environment secrets.

## Documentation

Read and maintain:
- docs/requirements/
- docs/architecture/
- docs/workflows/
- docs/decisions/
- docs/project-status.md

Update documentation whenever an approved business rule,
architecture decision or feature implementation changes.

## General AI Rules

- Do not invent requirements.
- Ask questions when ambiguity affects money,
  security or tenancy behaviour.
- Do not perform broad refactors without approval.
- Do not silently introduce new dependencies.
- Do not claim incomplete features are complete.
- Explain significant architectural decisions.
