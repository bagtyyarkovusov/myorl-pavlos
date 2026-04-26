# PostgreSQL Rehearsal Runbook

Use this before any shared or production PostgreSQL cutover. SQLite remains a
local rehearsal store only.

## Inputs

- Source SQLite DB: `backend/.tmp/data.db`
- Versioned index migrations: `backend/database/postgres-migrations/*.up.sql`
- Historical staged SQL: `backend/database/postgres-readiness/*.sql`

## Rehearsal Steps

1. Start a disposable PostgreSQL database with the same Strapi version and env
   shape intended for production.
2. Transfer the current local Strapi dataset into PostgreSQL with Strapi's
   supported transfer path.
3. Apply schema changes separately from data changes.
4. Apply index migrations outside a transaction block:

```bash
psql "$DATABASE_URL" -f backend/database/postgres-migrations/20260425_001_pages_lookup_indexes.up.sql
psql "$DATABASE_URL" -f backend/database/postgres-migrations/20260425_002_tag_slug_indexes.up.sql
```

5. Verify the hot paths with `EXPLAIN ANALYZE`.

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
  AND slug = 'myorl';
```

## Rollback Policy

- Rehearsal may use the `.down.sql` files to reset a disposable database.
- Production rollback is forward-only: create a new migration that reverses the
  production decision.
- Do not edit a migration after it has run in a shared or production database.
- Keep DDL and data backfills separate.

## Capture

Save the final `EXPLAIN ANALYZE` output under `artifacts/reports/` and link it
from `docs/audit.md` or the relevant ADR before launch.

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

The `gemini-pg-rehearsal` container proves the PostgreSQL query-plan and data
strictness evidence for this cutover. Treat it as a full Strapi runtime database
only after it has been populated through the canonical Strapi import path,
including navigation and plugin-owned data.

For a local PostgreSQL-backed Strapi runtime, use environment values with this
shape:

```bash
DATABASE_CLIENT=postgres
DATABASE_URL=postgres://strapi:strapi@localhost:55432/strapi_rehearsal
```

Keep SQLite as the default local store unless the team explicitly decides to
switch the committed development defaults.
