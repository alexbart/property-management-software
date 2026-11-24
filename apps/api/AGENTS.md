
# Backend Development Instructions

Read the root AGENTS.md before making changes.

## Architecture

Use modular Express architecture.

Each business module should contain:
- Routes
- Controllers
- Services
- Repositories
- Validation schemas
- Types
- Tests

## API Standards

- REST conventions.
- Consistent HTTP status codes.
- Swagger documentation.
- Zod request validation.
- Centralized error handling.
- Pagination for collection endpoints.
- Explicit response DTOs.

Avoid redundant success wrappers.

## Database

- Prisma ORM.
- PostgreSQL.
- Migrations for schema changes.
- Transactions for related financial changes.
- Repository-level database access.
- Avoid uncontrolled raw SQL.

## Business Logic

Keep business rules in services.

Payment, rent, penalty and maintenance logic must
be testable independently of HTTP controllers.

## Security

- Authentication middleware.
- Role-based authorization.
- Resource-level authorization.
- Validate ownership on every relevant query.
- Protect against IDOR.
- Rate-limit sensitive endpoints.
- Secure payment callbacks.
- Do not expose stack traces in production.

## Testing

Test:
- Services.
- API endpoints.
- Validation.
- Authorization.
- Database operations.
- Financial calculations.
- Idempotency.
