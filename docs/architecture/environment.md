# Environment Variables

Configuration is validated at startup by `apps/api/src/config/env.ts`
using Zod. The process refuses to start if validation fails.

## Backend (`apps/api/.env`)

Copy `apps/api/.env.example` to `apps/api/.env` for local development.
`.env` files are git-ignored and must never be committed.

| Variable        | Required | Default       | Notes                                             |
| --------------- | -------- | ------------- | ------------------------------------------------- |
| `NODE_ENV`      | no       | `development` | One of `development`, `test`, `production`.       |
| `API_PORT`      | no       | `4000`        | Port the API listens on.                          |
| `WEB_ORIGIN`    | yes      | -             | Allowed CORS origin (the frontend URL).           |
| `DATABASE_URL`  | yes      | -             | PostgreSQL connection string used by Prisma.      |
| `SESSION_SECRET`| yes      | -             | Session/signing secret, minimum 32 characters.    |

## Deferred configuration

The following are documented in the root `.env.example` but are not
validated or used during the foundation milestone:

- `STORAGE_*` - object storage (tenant documents).
- `MPESA_*` - M-Pesa Daraja integration and callback secret.

They will be introduced with the features that require them.

## CI

The GitHub Actions workflow sets test-safe values for these variables
inline and runs against a Postgres service, so no secrets are stored
in CI configuration.