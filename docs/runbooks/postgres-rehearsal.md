# PostgreSQL Rehearsal Runbook

Use this before any shared or production PostgreSQL cutover. SQLite remains a
local rehearsal store only.

## Quick Start (Automated)

The rehearsal lifecycle is fully automated:

```bash
python3 tools/orchestrate_rehearsal.py
```

This single command runs the entire pipeline:
1. Preflight guard (port/container/database checks)
2. Export full Strapi state from SQLite
3. Start rehearsal PostgreSQL (`gemini-pg-rehearsal` on port `55532`)
4. Import into PostgreSQL
5. Apply forward-only index migrations
6. Run EXPLAIN ANALYZE on hot paths
7. Generate report at `artifacts/reports/postgres_rehearsal_explain_report.json`
8. Clean up container and volume

To leave the container running for local Strapi development against PostgreSQL:

```bash
python3 tools/orchestrate_rehearsal.py --keep-running
```

Then switch to the rehearsal environment:

```bash
cd backend
cp .env.rehearsal .env
npm run develop
```

## Manual Steps (Advanced)

If you need to run steps individually:

### 1. Environment Guard

```bash
python3 tools/check_environment.py --target=rehearsal
```

Fails fast if port `55532` is occupied, a conflicting container exists, or the SQLite source is missing.

### 2. Export from SQLite

```bash
cd backend
DATABASE_CLIENT=sqlite npx strapi export --file ../artifacts/rehearsal-export.tar.gz --no-encrypt
```

### 3. Start Rehearsal DB

```bash
docker compose -f docker-compose.rehearsal.yml up -d
```

### 4. Import into PostgreSQL

```bash
cd backend
DATABASE_CLIENT=postgres \
  DATABASE_HOST=127.0.0.1 \
  DATABASE_PORT=55532 \
  DATABASE_NAME=strapi_rehearsal \
  DATABASE_USERNAME=strapi \
  DATABASE_PASSWORD=strapi \
  npx strapi import --file ../artifacts/rehearsal-export.tar.gz --force
```

### 5. Apply Index Migrations

```bash
psql "postgres://strapi:strapi@localhost:55532/strapi_rehearsal" \
  -f backend/database/postgres-migrations/20260425_001_pages_lookup_indexes.up.sql
psql "postgres://strapi:strapi@localhost:55532/strapi_rehearsal" \
  -f backend/database/postgres-migrations/20260425_002_tag_slug_indexes.up.sql
```

### 6. Verify Hot Paths

Run the EXPLAIN ANALYZE queries from the [Query-Plan Checks](#query-plan-checks) section below.

## Query-Plan Checks

Route lookup should use `idx_pages_published_locale_slug`:

```sql
EXPLAIN ANALYZE
SELECT id
FROM pages
WHERE locale = 'el'
  AND slug = 'epikoinonia'
  AND published_at IS NOT NULL;
```

Navigation and sitemap listing should use
`idx_pages_published_locale_menu_slug`:

```sql
EXPLAIN ANALYZE
SELECT id, locale, slug, menu_index
FROM pages
WHERE published_at IS NOT NULL
ORDER BY locale ASC, menu_index ASC NULLS LAST, slug ASC;
```

Type/layout listing should use
`idx_pages_published_locale_type_layout_menu_slug`:

```sql
EXPLAIN ANALYZE
SELECT id, slug, menu_index
FROM pages
WHERE locale = 'el'
  AND page_type = 'content'
  AND layout_variant = 'section-index'
  AND published_at IS NOT NULL
ORDER BY menu_index ASC NULLS LAST, slug ASC;
```

Tag lookup should use `idx_tags_locale_slug`:

```sql
EXPLAIN ANALYZE
SELECT id
FROM tags
WHERE locale = 'el'
  AND slug = 'ear';
```

## Rollback Policy

- Rehearsal may use the `.down.sql` files to reset a disposable database.
- Production rollback is forward-only: create a new migration that reverses the
  production decision.
- Do not edit a migration after it has run in a shared or production database.
- Keep DDL and data backfills separate.

## Capture

The Docker rehearsal database runs the same PostgreSQL major version as Railway
production. Recreate disposable rehearsal volumes after a major version bump.

The orchestrator automatically saves the report to
`artifacts/reports/postgres_rehearsal_explain_report.json`.

Link this report from `docs/audit.md` or the relevant ADR before launch.

## Production Readiness Gates

Use the static/code gate when Strapi is not running:

```bash
python3 tools/production_readiness_gate.py --skip-live-strapi
```

Use the full live gate only after Strapi is reachable at the same origin used by
the tooling:

```bash
cd backend
npm run develop
```

Then, in another shell:

```bash
export STRAPI_URL=http://localhost:1337
export STRAPI_TOKEN=replace-with-a-valid-readonly-token
python3 tools/production_readiness_gate.py
```

Local development may also use `AUTORIZATION_TOKEN` where the migration tooling
explicitly supports it. Do not commit real tokens.

## Port Allocation

| Port | Owner |
|------|-------|
| `5432` | Native/system PostgreSQL |
| `55432` | Dev Docker (`gemini-pg`) |
| `55532` | Rehearsal Docker (`gemini-pg-rehearsal`) |

Keep SQLite as the default local store unless the team explicitly decides to
switch the committed development defaults.
