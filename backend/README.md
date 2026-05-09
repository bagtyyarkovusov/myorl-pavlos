# myORL Backend — Strapi 5 CMS

This directory contains the Strapi 5 headless CMS for the myORL website. It serves the content API consumed by the Next.js frontend and provides the admin panel for content editors.

## Stack

- **Strapi 5.42.1** with the REST API
- **PostgreSQL 18** — canonical dev database (see ADR-008)
- **SQLite** — fallback when running without Docker (`npm run dev:local`)

## Getting Started

### With Docker Compose (recommended)

From the project root:

```bash
# Starts PostgreSQL + Strapi + Next.js
npm run dev
```

Strapi admin is available at http://localhost:1337/admin.

### Without Docker (SQLite fallback)

```bash
# From the project root
npm run dev:local
```

This starts Strapi with SQLite on port 1337 and the Next.js dev server on port 3000.

## Environment Variables

Environment variables for local development are pre-configured in `docker-compose.dev.yml`.
For production, set:

| Variable | Purpose |
|----------|---------|
| `STRAPI_URL` | URL the frontend uses to reach Strapi |
| `STRAPI_TOKEN` | API token for frontend read access |
| `STRAPI_REVALIDATE_SECRET` | Secret for Next.js on-demand revalidation |

Strapi's own secrets (App keys, JWT, API token salt) are pre-configured in `docker-compose.dev.yml` for local development only.

## Content Model

The CMS defines content types for:

- **Page** — dynamic pages with a `pageSections` DynamicZone (see ADR-006)
- **Global** — site-wide singleton (address, phone, hours)
- **Tag** — taxonomy tags for content categorization
- **Navigation** — menu structure via the Navigation plugin

All content is bilingual (Greek `el` and Russian `ru`) using Strapi's i18n plugin.

## Bootstrap & Migrations

- **Bootstrap scripts** run automatically on Strapi startup to seed initial config (permissions, navigation, content-manager layouts). They are version-gated and idempotent.
- **Migration runner** (`tools/migration_runner.py`) applies forward-only PostgreSQL schema migrations. See `docs/runbooks/postgres-rehearsal.md` for the full pipeline.
- **Content promotion** uses `strapi transfer` to push dev content to production. See `docs/runbooks/content-promotion.md`.

## Useful Commands

```bash
# Enter the running Strapi container
docker exec -it gemini-strapi-dev sh

# Run Strapi CLI commands inside the container
docker exec gemini-strapi-dev npx strapi <command>

# Generate TypeScript types from the content model
docker exec gemini-strapi-dev npx strapi ts:generate-types

# Build the admin panel (for production)
npm run build --prefix backend
```

## Patches

Custom patches in `backend/patches/` fix upstream Strapi issues. See each patch file for the bug it addresses.

## Further Reading

- **Editor cheat sheet** → [`docs/admin-hierarchy-ux.md`](../docs/admin-hierarchy-ux.md)
- **Operational runbooks** → [`docs/runbooks/`](../docs/runbooks/)
- **Architecture decisions** → [`docs/adr/`](../docs/adr/)
- **Strapi docs** → https://docs.strapi.io
