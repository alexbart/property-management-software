# Web Application

React + TypeScript + Vite + Tailwind CSS frontend for the
Property Management Platform.

## Structure

- `src/App.tsx`: application root shell.
- `src/main.tsx`: React entry point.
- `src/index.css`: global styles and Tailwind entry.
- `src/App.test.tsx`: smoke test.

Feature pages, shared components and services will be added in
later milestones following `AGENTS.md`.

## Commands

```bash
pnpm dev        # start the Vite dev server
pnpm build      # type-check and build for production
pnpm lint       # run ESLint
pnpm typecheck  # TypeScript project references check
pnpm test       # run Vitest
```

Run these from the repository root to target every workspace package,
or with `pnpm --filter @property-platform/web <script>`.