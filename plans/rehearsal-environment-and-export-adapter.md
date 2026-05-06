# Plan: Rehearsal Environment Seam and Canonical Export Adapter

> Source PRD: GitHub Issue #76 — "PRD: Rehearsal Environment Seam and Canonical Export Adapter for PostgreSQL Production Cutover"

## Architectural decisions

Durable decisions that apply across all phases:

- **Port allocation:** `5432` = native/system PostgreSQL, `55432` = dev Docker (`gemini-pg`), `55532` = rehearsal Docker (`gemini-pg-rehearsal`). Fixed ports with clear numeric separation prevent collisions.
- **Database client switching:** Strapi's `backend/config/database.ts` reads `DATABASE_CLIENT` env var (`sqlite` | `postgres`). No TypeScript changes are needed; only env file changes.
- **Migration transport:** Strapi native `strapi export` / `strapi import` CLI for same-version instances (shell-access path). `pg_dump` / `pg_restore` for platform-managed targets.
- **Index migrations:** Forward-only DDL files in `backend/database/postgres-migrations/` applied after schema materialization, per ADR-003.
- **Scope:** All Strapi state (content, navigation, media refs, users, plugin config), not just pages/tags. The archived MODX importer tools are not reused.

---

## Phase 1: Guard Module and Rehearsal Environment Definition

**User stories:** 2, 3, 7

### What to build

A standalone guard module checks port availability, container conflicts, and source database existence before any operation. A declarative Docker Compose file defines the rehearsal PostgreSQL service with an isolated volume, fixed port `55532`, and healthchecks. A dedicated `.env.rehearsal` file replaces manual commenting in `.env`.

### Acceptance criteria

- [x] `tools/check_environment.py --target=rehearsal` passes when port 55532 is free, no conflicting container exists, and SQLite source is present
- [x] `tools/check_environment.py --target=rehearsal` fails fast with a clear error when port 55532 is occupied
- [x] `docker-compose.rehearsal.yml` defines `gemini-pg-rehearsal` with port `55532:5432`, volume `pgdata-rehearsal`, and healthcheck
- [x] `backend/.env.rehearsal` contains pre-configured PostgreSQL connection values for the rehearsal target
- [x] The rehearsal container starts independently and reaches a healthy state

---

## Phase 2: Rehearsal Lifecycle Orchestrator

**User stories:** 1, 4, 5, 6

### What to build

A single-command orchestrator that runs the full rehearsal lifecycle: preflight (guard), export from dev Postgres (canonical store, see ADR-008), start rehearsal DB, wait for health, import into PostgreSQL, apply forward-only index migrations, run EXPLAIN ANALYZE queries, validate the report, and cleanup (or keep running with `--keep-running`).

### Acceptance criteria

- [x] `python3 tools/orchestrate_rehearsal.py` runs the full lifecycle end-to-end
- [x] `--keep-running` flag leaves the rehearsal container and volume intact
- [x] The orchestrator generates `artifacts/reports/postgres_rehearsal_explain_report.json`
- [x] Failure at any step produces a clear error message identifying the failing step
- [x] The existing `run_postgres_rehearsal.py` is deprecated in favor of the new orchestrator

---

## Phase 3: Canonical Export Adapter

**User stories:** 8, 9, 10

### What to build

A unified migration module that moves full Strapi state from any source to any target. The shell-access path uses `strapi export` / `strapi import` tarballs. The platform-managed path uses `pg_dump` from the rehearsal container and `pg_restore` into the target `DATABASE_URL`. Includes schema version checking.

### Acceptance criteria

- [x] `python3 tools/migrate_to_postgres.py --from=sqlite --to=rehearsal` successfully migrates all Strapi data
- [x] Row counts match between source and target after migration
- [x] `--dry-run` validates without modifying the target
- [x] Platform-managed path (`--to=production` with `DATABASE_URL`) uses `pg_dump` / `pg_restore`
- [x] Strapi version mismatch is detected and blocked before migration

---

## Phase 4: Production Cutover Safety and Documentation

**User stories:** 11, 12, 13, 14, 15, 16

### What to build

Automatic production database backup before overwrite. Strapi version mismatch detection. Production cutover runbook documenting both shell-access and platform-managed paths. Integration with the existing `production_readiness_gate.py`. Creation of `CONTEXT.md` with domain vocabulary.

### Acceptance criteria

- [x] Production cutover script backs up the existing production database before overwriting
- [x] `docs/runbooks/production-cutover.md` documents both shell-access and platform-managed paths
- [x] `CONTEXT.md` exists at project root with domain terms defined
- [x] `production_readiness_gate.py` includes the new rehearsal report validation
- [x] The existing `docs/runbooks/postgres-rehearsal.md` is updated to reference the new orchestrator
