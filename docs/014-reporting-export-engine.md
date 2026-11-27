# Milestone 014 — Reporting & Export Engine

Purpose: provide downloadable reports for landlords and managers — rent rolls,
payment receipts, and maintenance summaries — while preserving strict property
isolation and financial traceability.

## Exports

### Rent Roll (CSV)

A downloadable CSV of all active leases for a single property, including the
tenant, rent amount, and current arrears balance. Intended for landlord income
tracking and audit.

### Payment Receipt (PDF)

A generated PDF receipt for any completed payment, suitable for emailing to
tenants or downloading. Receipts are derived from immutable `Payment` records;
corrections are never applied by mutating a receipt.

### Maintenance Summary (CSV)

An export of maintenance tickets within a date range, including estimated and
actual costs, for landlord expense tracking.

## Design decisions

### Strict property scoping

All exports are strictly scoped to the authenticated user's property
memberships. A caller may only export data for a property they are authorised
to access. Cross-landlord and cross-property data leakage is prevented at the
service layer, not merely in the UI.

### Memory-efficient CSV streaming

CSV exports use `csv-stringify` so rows are streamed rather than materialised as
one large in-memory JSON array. For V1 a single property has ~50–100 units,
which is safe in memory, but the streaming pattern scales to larger datasets
without a corresponding memory spike.

### PDF generation with pdfmake

PDF receipts use `pdfmake` (pure JavaScript, no headless browser). This avoids
installing Chromium or running a headless browser, keeping the Docker/CI
environment lightweight and fast while producing reliable output.

### Content-Disposition

Export endpoints return `Content-Disposition: attachment; filename="..."` so
the browser downloads the file instead of rendering raw CSV/PDF in a tab.

### Rate limiting

PDF generation is CPU-intensive. Export endpoints are rate-limited with a simple
in-memory limiter to prevent a malicious user from spamming the endpoint and
degrading server performance.

## Git discipline

Each export lands as an atomic commit. Pre-commit validation runs typecheck and
lint. All work is performed on `feature/014-reporting-export-engine` using
Conventional Commits.