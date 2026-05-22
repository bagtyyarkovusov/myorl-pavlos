# Domain Glossary

This document defines the canonical vocabulary for architecture discussions in the myorl-pavlos project. Use these terms exactly — do not drift into synonyms.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| CMS | Strapi | 5.42.1 |
| Frontend | Next.js | 16.2+ (App Router, Turbopack) |
| Database | PostgreSQL | 18 |
| Container | Docker Compose | v3 |
| Languages | TypeScript, Python 3.11+ |
| Testing | Vitest, Playwright |
| CSS | Tailwind CSS v4, CSS Modules |

## Content Library

**Video Entry**:
A standalone medical video managed as a CMS catalog item, optionally connected to a related article for deeper reading.
_Avoid_: video block, embed, media file

**Related Article**:
The article a **Video Entry** points readers to when the video has a deeper explanation or procedure page.
_Avoid_: button link, corresponding page, more link

**Video Directory**:
A localized library page that lets readers browse and play **Video Entries**.
_Avoid_: video page, YouTube page, video block list

**Video Category**:
A local browsing label for grouping **Video Entries** within a **Video Directory**.
_Avoid_: site tag, article taxonomy, global category

**Accordion Page**:
A medical article whose body is a collapsible question-and-answer list rendered from a `sections.accordion` block in `pageSections`.
_Avoid_: FAQ page (when items use accordion item shape), tab page, flat article

**FAQ Page**:
A services or information page whose structured Q&A list lives in `sections.faq` within `pageSections`, often alongside prose in `page.content`.
_Avoid_: accordion page (when items use title/content accordion shape), flat article without disclosures

**Related Topics**:
Contextual cross-links shown alongside an article to help readers continue within the same medical subject — not a site-wide “popular articles” promo block.
_Avoid_: popular articles, global carousel, recommended posts
_See_: [ADR-010](../docs/adr/ADR-010-related-topics-replace-popular-articles.md)

**Related Pages**:
The editor-managed `relatedPages` relation on a **Page** that defines its **Related Topics** when manual curation is needed.
_Avoid_: linked-resources section (for article cross-links), popular articles list

## Relationships

- A **Video Entry** may point to zero or one **Related Article**.
- Localized **Video Entries** may represent the same underlying video while preserving per-locale title, tags, visibility, and **Related Article**.
- A **Related Article** must be an internal page relation before the Video Directory shows a reader-facing link; `legacyArticleUrl` is migration evidence only and is not converted into runtime URLs.
- A **Video Directory** plays **Video Entries** inline and remains the first restoration target before article-page embeds.
- A **Video Category** belongs to the video library and should not be treated as the site-wide article taxonomy.
- The first **Video Directory** restoration should migrate the historical video set, with unresolved **Related Articles** treated as cleanup work rather than migration blockers.
- **Related Topics** replace the legacy MODX global “popular articles” pattern: links must be contextual to the page the reader is on, not identical sitewide discovery.
- **Related Topics** are distinct from a **Related Article** on a **Video Entry** (one video → one deeper page) and from home-only editorial promo blocks.
- **Related Topics** use a hybrid curation model: auto-suggest from shared tags and parent section, with editors overriding via **Related Pages** when needed.
- **Related Topics** render in the article sidebar on desktop and in a mobile-friendly panel when the sidebar is hidden — not as a sitewide bottom carousel.
- **Related Topics** appear on long-form medical article layouts: `encyclopedia-article`, `specialized-article`, and `service-article` — not on FAQ, accordion, contact, or directory index pages.
- When **Related Pages** is empty, **Related Topics** auto-suggest from shared tags first, then fill remaining slots from sibling pages under the same parent section, up to six links. Editor-curated **Related Pages** replace auto-suggest entirely when present.
- On article pages, **`sections.linked-resources`** is retired after a one-time migration into **Related Pages**; the section remains for home editorial grids only.
- Auto-suggested **Related Topics** exclude the current page, parent hub/index pages, menu-hidden pages, and non-article layout variants — only other long-form medical articles qualify.
- When no **Related Topics** resolve, hide the panel entirely — do not render an empty heading on desktop or mobile.
- Encyclopedia-style prose stored entirely in **`page.content`** with **`service-article`** layout and **empty** **`pageSections`** is an editorial mismatch when the cinematic service shell is unwanted: **`encyclopedia-article`** is the canonical long-form article layout — HTML normalization and optional layout normalization run through [`tools/repair_service_article_blob_pages.py`](tools/repair_service_article_blob_pages.py) (dry-run by default).

---

## Rehearsal Environment

A **disposable, isolated PostgreSQL database** used to validate query plans, data strictness, and migration correctness before production deployment. The rehearsal environment uses a fixed host port (`55532`) and a dedicated Docker container (`myorl-pg-rehearsal`) to prevent collisions with native PostgreSQL (`5432`) and dev Docker (`55432`).

The rehearsal environment is provisioned declaratively via `docker-compose.rehearsal.yml` and orchestrated by `tools/orchestrate_rehearsal.py`.

## Canonical Export Adapter

The **unified module** for migrating full Strapi state between databases. It supports two deployment paths:

1. **Shell-access path**: `strapi export` → `strapi import` via tarball
2. **Platform-managed path**: `pg_dump` → `pg_restore` via SQL

The adapter chooses the correct transport based on target capabilities. The interface is a single command; the implementation hides the complexity of export formats, connection strings, and schema compatibility checks.

## Port Guard

The **preflight validation module** that checks port availability, container conflicts, source database existence, and environment configuration before any database operation begins. The port guard fails fast with actionable errors, preventing the class of port-conflict data-loss failures. It reads target identity from the Environment Manifest.

## Environment Manifest

The **single source of truth for deployment-target identity** (host port, container name, volume name, database name, database user, compose file, access kind). Lives at `tools/environments.py`. Every Python tool that touches a target — Port Guard, Canonical Export Adapter, rehearsal orchestrator — imports `ENVIRONMENTS` from the manifest instead of carrying its own copy.

Secrets, runtime tunables (pool sizes, SSL flags), and constants that don't vary across environments (Strapi 1337, Next.js 3000) deliberately do not live in the manifest. They live in `.env.<target>` files or compose YAML.

Drift between the manifest and `docker-compose.<target>.yml` is caught by `tests/test_environments.py`.

## Deep Module

A module that **encapsulates a lot of functionality in a simple, testable interface** which rarely changes. The rehearsal orchestrator is a deep module: its interface is a single command, but its implementation manages Docker lifecycle, Strapi CLI invocation, psql execution, and error handling.

## Shallow Module

A module whose **interface is nearly as complex as its implementation**. The previous `backend/.env` with commented-out database lines was a shallow module: deleting it would scatter complexity across every developer's memory.

## Seam

A **place where behavior can be altered without editing in place**. The database client configuration in `backend/config/database.ts` is a seam: switching from SQLite to PostgreSQL requires only changing an environment variable, not editing TypeScript.

## Adapter

A **concrete thing satisfying an interface at a seam**. The Strapi `export`/`import` CLI commands are the shell-access adapter. The `pg_dump`/`pg_restore` pipeline is the platform-managed adapter. Both satisfy the same canonical export adapter interface.

## Forward-Only Migration

A **database migration that cannot be rolled back** by editing the migration file after it has run. Forward-only migrations are required for production PostgreSQL because shared databases must not have their migration history altered. Rollbacks are implemented as new forward-only migrations that reverse the previous change.

## Migration Runner

The **codified enforcement module** for the Forward-Only Migration policy. Lives at `tools/migration_runner.py`. It discovers migrations in `backend/database/postgres-migrations/`, tracks applied state in a `_migrations` table with SHA-256 checksums, and enforces:

- **Edited-migration guard** — fatal error if a previously-applied `.up.sql` file changes.
- **Prod safety** — `up` requires `--force` for production; `down` is blocked entirely for production.
- **Idempotent apply** — skips already-applied migrations; applies pending ones in filename order.

## SQLite Fallback Store

The **local SQLite database** (`backend/.tmp/data.db`) used for fast development without Docker (`npm run dev:local`). It is a convenience fallback, not a source of truth. The canonical `Strapi State` store for dev and rehearsal is **dev Postgres** (`myorl-pg`). See ADR-008.

## Strapi State

The **complete data owned by Strapi**, including:
- Content (pages, tags, components)
- Navigation items
- Media Library references
- Users and permissions
- Plugin configuration

A canonical migration must transfer the full Strapi state, not just pages and tags.

## Backup Runner

The **automated backup / restore / drill module** for PostgreSQL and uploads. Lives at `tools/backup_runner.py`. It wraps `pg_dump` and `psql` with three modes:

- **backup** — full/schema-only/data-only dump, gzip-compressed, with automatic retention pruning (30 days).
- **restore** — drop/recreate/import cycle. Blocked for production without ``--force``.
- **drill** — backup → restore → verify row counts. Blocked for production entirely; intended for rehearsal.

## Port Allocation Contract

The **fixed port mapping** that prevents collisions. PostgreSQL host ports are owned by the Environment Manifest (`tools/environments.py`) — this table mirrors that for human reference; the manifest is canonical:

| Port | Owner |
|------|-------|
| `3000` | Next.js frontend (dev hot reload via HMR) |
| `1337` | Strapi CMS backend (dev hot reload) |
| `5432` | Native/system PostgreSQL (`auto.tm` project) |
| `55432` | Dev Docker PostgreSQL (`myorl-pg`, `pgdata_dev` volume) |
| `55532` | Rehearsal Docker PostgreSQL (`myorl-pg-rehearsal`, `pgdata-rehearsal` volume) |
| _internal_ | Production Docker PostgreSQL (`myorl-pg-prod`, `pgdata-prod` volume) — no host exposure |

This contract is enforced by the Port Guard module via the manifest.

## Dev Environment (Docker)

The **canonical dev stack** runs in Docker Compose with hot reload on all services:

| Service | Container | Image | Volume mount |
|---------|-----------|-------|-------------|
| PostgreSQL 18 | `myorl-pg` | `postgres:18` | `pgdata_dev` (persistent) |
| Strapi 5 | `myorl-strapi-dev` | `node:20-alpine` | `./backend:/app` (hot reload), `strapi_node_modules` (named) |
| Next.js 16 | `myorl-nextjs-dev` | `node:24-slim` | `./frontend:/app` (hot reload), `nextjs_node_modules` (named) |

**Key behaviors:**
- Code changes trigger auto-reload — no rebuild needed
- `node_modules` persist in named volumes across restarts
- `npm install` in running container (`docker exec myorl-strapi-dev npm install <pkg>`), or remove `node_modules/.package-lock.json` sentinel + restart
- Only rebuild with `--build` when `Dockerfile` changes (base image, system deps)
- Images served via Next.js `rewrites()` proxy: `/uploads/*` → Strapi (port 1337)
- Strapi connects to Next.js on `http://localhost:3000` for preview

**Commands:**
```bash
npm run dev          # Start full Docker dev stack
npm run dev:local    # Native host (Strapi + Next.js, needs Docker PostgreSQL)
npm run dev:db       # Start only PostgreSQL for local dev
npm run dev:down     # Stop Docker dev stack
```
