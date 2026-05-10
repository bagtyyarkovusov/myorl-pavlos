# PRD: Railway Production Reliability — Indexing, Rendering, and Content Completeness

## Problem Statement

The production deployment on Railway (`celebrated-abundance` project, `production` environment) passes CI and deploys successfully, but three underlying failures degrade reliability: (1) Strapi migration errors on PostgreSQL during startup produce 40+ "relation does not exist" failures when renaming indexes, (2) the Next.js frontend serves `DYNAMIC_SERVER_USAGE` errors on production requests, and (3) the `/api/global` endpoint returns 404 because the Global content-type singleton has no entries in production.

These issues collectively mean the production environment runs with a broken migration history, a frontend that returns uncaught server-render errors to users, and a missing Strapi content singleton that silently falls back to hardcoded data.

## Solution

1. **Eliminate Strapi auto-migration index rename noise.** Intercept Strapi's built-in migration system so that non-existent index renames do not flood PostgreSQL logs with errors. The canonical forward-only migration system (`tools/migration_runner.py`) already owns production index management (per ADR-003); Strapi's built-in migration should not compete with it.

2. **Resolve Next.js DYNAMIC_SERVER_USAGE errors.** Ensure every Server Component that touches request-scoped data (`searchParams`, `cookies`, `headers`) is correctly wrapped in Suspense boundaries and explicitly opts into dynamic rendering where needed. The locale layout (`[locale]/layout.tsx`) fetches CMS data at request time and must declare its dynamic intent.

3. **Seed the Global content type in production.** Create the Global singleton entry for all configured locales (`el`, `ru`) so `GET /api/global` returns 200 with CMS-managed data instead of a 404 that forces the frontend to use `buildFallbackSettings()`.

## User Stories

1. As a **site visitor**, I want all pages to render without Next.js server errors, so that I see complete, styled content instead of error boundaries.

2. As a **site visitor**, I want the site header and footer to display CMS-managed address, phone, and hours information, so that the contact details are always accurate and localised.

3. As a **content editor**, I want the Global singleton content type to be editable in the Strapi admin for each locale, so that I can update site-wide chrome without code changes.

4. As a **developer reviewing PostgreSQL logs**, I want clean logs without spurious "relation does not exist" errors from index renames, so that genuine database issues are not drowned in noise.

5. As a **developer deploying to production**, I want the CI/CD pipeline to detect and reject deployments that would introduce database migration drift, so that staging and rehearsal environments remain consistent with production.

6. As a **developer running the rehearsal pipeline**, I want the rehearsal environment to validate that Strapi's built-in migrations do not produce errors against a fresh production-level schema, so that migration issues are caught before production deployment.

7. As a **platform operator**, I want the Railway production environment to have a clean migration history with no failed index renames, so that PostgreSQL performance (index usage, query planning) matches what was validated in the rehearsal environment.

8. As a **developer debugging a 500-level error**, I want Next.js server-render errors to include actionable digest information (not just `DYNAMIC_SERVER_USAGE`), so that I can pinpoint the exact Server Component that needs fixing.

## Implementation Decisions

### Decision 1: Suppress Strapi built-in index renames on Postgres

**Rationale.** The project already has a canonical forward-only migration system (`tools/migration_runner.py`) that manages PostgreSQL indexes per ADR-003. Strapi 5's built-in migration tries to rename indexes from an old naming convention (`_index` suffix) to a new one (`_idx` suffix), but on a fresh database (or one that was already migrated by the forward-only runner), these indexes do not exist under their old names.

**Approach.** Add a Strapi bootstrap hook or lifecycle plugin that checks whether the target database has the old naming convention before attempting renames. If the old indexes do not exist, skip the rename block. This is idempotent and safe to run on every startup.

**Alternative considered.** Pre-insert rows into Strapi's `strapi_migrations` table to mark the rename migrations as applied. Rejected because Strapi may change its migration tracking mechanism between versions, making this fragile.

**Alternative considered.** Accept the errors as cosmetic. Rejected because: (a) the errors clutter PostgreSQL logs, making genuine issues harder to spot; (b) the `ON_FAILURE` restart policy on Railway services means excessive error log volume could mask service-level failures.

### Decision 2: Explicit dynamic rendering in the locale layout

**Rationale.** `frontend/src/app/[locale]/layout.tsx` calls `getSite()` at request time to fetch navigation data from Strapi. This function uses `fetch()` with `cache: "no-store"` and is inherently dynamic. However, the layout does not declare `dynamic = "force-dynamic"`, leaving Next.js to auto-detect the dynamic boundary — which can result in the `DYNAMIC_SERVER_USAGE` error when the auto-detection misidentifies a render path.

**Approach.** Add `export const dynamic = "force-dynamic"` to the locale layout. This is a one-line, zero-cost change that makes the dynamic intent explicit. For the CMS page component (`[locale]/[slug]/page.tsx`), which already declares `dynamic = "force-dynamic"`, wrap `searchParams` consumption in a `Suspense` boundary to decouple the streaming render from the static parts of the page.

**No new modules.** These are targeted edits to existing files.

### Decision 3: Seed the Global singleton via a one-shot Strapi bootstrap script

**Rationale.** The `global` content type schema exists (`backend/src/api/global/`) and is registered with Strapi's content-type registry. The collection `globals` exists in the database. No entries have ever been created for any locale, causing `GET /api/global?locale=el&status=published` to return 404. The frontend gracefully handles this via `Promise.allSettled` and `buildFallbackSettings(locale)`, but the fallback data is hardcoded and not CMS-managed.

**Approach.** Create a one-shot seed script that inserts a row into the `globals` table for each locale (`el`, `ru`) using Strapi's `entityService` or direct SQL. Run this script once during a Railway deployment (as a build-time step or post-deploy hook) to ensure the entry exists. The script must be idempotent (no-op if the entry already exists).

The script will live at `backend/src/bootstrap/seed-global.ts` and follow the same pattern as the existing `backend/src/bootstrap/migrate-sections.ts` (which uses a Strapi plugin-store marker to prevent re-runs).

### Decision 4: Add migration rehearsal step to the CI/CD pipeline

**Rationale.** ADR-003 mandates that forward-only PostgreSQL migrations are rehearsed on a disposable database before production application. Currently the CI/CD pipeline runs `ci.yml` (lint, typecheck, build) and then deploys directly with no rehearsal step. The rehearsal is only available as a local manual command (`python3 tools/orchestrate_rehearsal.py`).

**Approach.** Add an optional `rehearse-migrations` job to `deploy-railway.yml` that runs between the CI gate and the backend deploy. This job will:
1. Pull the current production database backup via `tools/backup_runner.py backup`
2. Restore it into a Railway-managed ephemeral Postgres service (or a local Docker PostgreSQL)
3. Run `tools/migration_runner.py up` and collect the result
4. Fail the pipeline if any migration error is detected

For now, implement a lighter-weight version: run `tools/migration_runner.py status` against the production database to detect drift before deploying.

**Mark as post-MVP** — the full rehearsal step in CI requires an ephemeral database service, which may need Railway plan changes.

## Testing Decisions

### What makes a good test

Tests must verify external behavior, not implementation details. For this work:
- **Migration suppression:** Test that Strapi startup against a fresh PostgreSQL 18 database produces zero `ALTER INDEX RENAME` error log entries.
- **Dynamic rendering:** Test that requesting any CMS page route returns HTTP 200 with valid HTML, not an error boundary. Use Playwright page tests with `toHaveScreenshot()` to detect visual regression.
- **Global content:** Test that `GET /api/global?locale=el` returns HTTP 200 with `{ data: { attributes: { address, phoneTel, phoneDisplay, hours } } }` structure. Test that the frontend renders the CMS-provided values, not the fallback.

### Modules to test

| Module | Test type | Prior art |
|--------|-----------|-----------|
| Strapi bootstrap (index rename suppression) | Integration: spin up Strapi against fresh Postgres, assert no ALTER INDEX errors in Postgres logs | `tests/test_migration_runner.py` for migration validation pattern |
| `[locale]/layout.tsx` (dynamic declaration) | Playwright E2E: visit `/el` and `/ru` root pages, assert HTTP 200, assert no error digest in response | `e2e/pages/home.spec.ts` for page-level screenshot tests |
| `[locale]/[slug]/page.tsx` (Suspense boundary) | Playwright E2E: visit `/el/<known-slug>`, assert content renders | `e2e/` directory for Playwright conventions |
| Global seed script | Unit: run script twice, assert idempotent (second run is no-op). Integration: query `/api/global` after seed, assert 200 | `tools/backup_runner.py` pattern for `--force` flag style |
| Migration rehearsal in CI | DSL unit test: validate `migration_runner.py status` output format. Integration: run against rehearsal PostgreSQL, assert zero pending | `tests/test_migration_runner.py` for runner-level tests |

### Testing approach

- **Backend (strapi):** Integration tests against the rehearsal Docker PostgreSQL (`gemini-pg-rehearsal` on port `55532`). Spin up a Strapi instance via `docker-compose.rehearsal.yml` with the seed script injected, then query `/api/global` and check logs.
- **Frontend (next.js):** Use existing Playwright infrastructure in `frontend/e2e/`. Add assertions for status codes and check that CMS-provided content appears instead of the fallback.
- **Migration runner:** Extend `tests/test_migration_runner.py` with test cases for the new `status` check against a remote database.

## Out of Scope

- **Full migration rehearsal in CI (with ephemeral database).** This PRD includes a lightweight `status` check; a full rehearsal with an ephemeral Postgres service is deferred to a follow-up.
- **Strapi plugin-based migration override.** The approach uses a bootstrap hook, not a Strapi plugin. A plugin is overengineered for a one-time index rename suppression.
- **Auto-population of all Strapi content types from seed.** Only the Global singleton is in scope. Other content types (pages, tags, components) are populated via the Strapi admin and are out of scope.
- **Next.js ISR or partial prerendering configuration.** The fix is explicit `force-dynamic` in layouts that need it, not a rearchitecture of the Next.js rendering strategy.
- **Railway environment variable drift.** The env vars on Railway were audited and aligned during the previous deployment session. Drift is not in scope.

## Further Notes

- The Strapi `ALTER INDEX RENAME` errors correlate with Strapi version upgrades. If the project upgrades Strapi from 5.42.x to a future 5.x release, re-run the rehearsal pipeline to verify no new auto-migration errors are introduced.
- The Global content type uses `draftAndPublish: false`, meaning entries are immediately live on save. Editors must create exactly one entry per locale — creating duplicates would cause Strapi to return a list instead of a singleton, which the frontend schema does not expect.
- The rehearsal environment (`docker-compose.rehearsal.yml`, port `55532`) is the canonical target for validating migration changes before production. All migration-related changes in this PRD should be rehearsed via `python3 tools/orchestrate_rehearsal.py` before deploying to Railway.
- Railway's `ON_FAILURE` restart policy (configured in `backend/railway.toml` and `frontend/railway.toml`) means services will restart on error. Reducing spurious errors in Strapi startup and Next.js rendering will reduce unnecessary restart cycles and improve deployment stability.
- The `_migrations` tracking table (established by `tools/migration_runner.py`) only covers custom forward-only migrations in `backend/database/postgres-migrations/`. It does not track Strapi's built-in migrations (which use Strapi's internal `strapi_migrations` table). The bootstrap hook approach in Decision 1 bridges this gap without introducing a parallel tracking mechanism.
