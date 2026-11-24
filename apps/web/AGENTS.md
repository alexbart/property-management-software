
# Frontend Development Instructions

Read the root AGENTS.md before making changes.

## Architecture

Use feature-oriented React architecture.

Keep:
- Pages in feature directories.
- Shared components in components/shared.
- UI primitives in components/ui.
- API communication in services.
- Reusable hooks in hooks.
- Application routing in app/router.

## UI Standards

- Mobile-first responsive design.
- Tailwind CSS.
- Accessible interfaces.
- Consistent spacing and typography.
- Reusable components.
- Avoid oversized components.
- Avoid duplicated UI logic.

## State and Data

- Keep API calls outside presentation components.
- Handle loading, error, empty and success states.
- Validate user input.
- Avoid unnecessary global state.
- Never access PostgreSQL directly from the frontend.

## Security

- Frontend permissions are for presentation only.
- Never rely on hidden buttons for authorization.
- Never expose secrets.
- Never store sensitive payment credentials in browser storage.

## Testing

- Test important UI interactions.
- Test forms and validation.
- Test loading and error states.
- Add end-to-end tests for critical workflows.
