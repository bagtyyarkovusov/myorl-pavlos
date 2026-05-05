# Domain Glossary

This document defines the canonical vocabulary for architecture discussions in the gemini-export project. Use these terms exactly — do not drift into synonyms.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| CMS | Strapi | 5.42.1 |
| Frontend | Next.js | 15.3+ (App Router, Turbopack) |
| Database | PostgreSQL | 16 |
| Container | Docker Compose | v3 |
| Languages | TypeScript, Python 3.11+ |
| Testing | Vitest, Playwright |
| CSS | Tailwind CSS, SASS |

---

## Rehearsal Environment

A **disposable, isolated PostgreSQL database** used to validate query plans, data strictness, and migration correctness before production deployment. The rehearsal environment uses a fixed host port (`55532`) and a dedicated Docker container (`gemini-pg-rehearsal`) to prevent collisions with native PostgreSQL (`5432`) and dev Docker (`55432`).

The rehearsal environment is provisioned declaratively via `docker-compose.rehearsal.yml` and orchestrated by `tools/orchestrate_rehearsal.py`.

## Canonical Export Adapter

The **unified module** for migrating full Strapi state between databases. It supports two deployment paths:

1. **Shell-access path**: `strapi export` → `strapi import` via tarball
2. **Platform-managed path**: `pg_dump` → `pg_restore` via SQL

The adapter chooses the correct transport based on target capabilities. The interface is a single command; the implementation hides the complexity of export formats, connection strings, and schema compatibility checks.

## Port Guard

The **preflight validation module** that checks port availability, container conflicts, source database existence, and environment configuration before any database operation begins. The port guard fails fast with actionable errors, preventing the class of port-conflict data-loss failures.

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

## SQLite Rehearsal Store

The **local SQLite database** (`backend/.tmp/data.db`) used for fast development without Docker. It is not suitable for production or shared environments. All content changes are rehearsed against PostgreSQL before production cutover.

## Strapi State

The **complete data owned by Strapi**, including:
- Content (pages, tags, components)
- Navigation items
- Media Library references
- Users and permissions
- Plugin configuration

A canonical migration must transfer the full Strapi state, not just pages and tags.

## Port Allocation Contract

The **fixed port mapping** that prevents collisions:

| Port | Owner |
|------|-------|
| `3000` | Next.js frontend (dev hot reload via HMR) |
| `1337` | Strapi CMS backend (dev hot reload) |
| `5432` | Native/system PostgreSQL (`auto.tm` project) |
| `55432` | Dev Docker PostgreSQL (`gemini-pg`, `pgdata_dev` volume) |
| `55532` | Rehearsal Docker PostgreSQL (`gemini-pg-rehearsal`, `pgdata-rehearsal` volume) |
| `5433` | Production Docker PostgreSQL (`gemini-pg-prod` on deployed server) |

This contract is enforced by the Port Guard module.

## Dev Environment (Docker)

The **canonical dev stack** runs in Docker Compose with hot reload on all services:

| Service | Container | Image | Volume mount |
|---------|-----------|-------|-------------|
| PostgreSQL 16 | `gemini-pg` | `postgres:16` | `pgdata_dev` (persistent) |
| Strapi 5 | `gemini-strapi-dev` | `node:20-alpine` | `./backend:/app` (hot reload), `strapi_node_modules` (named) |
| Next.js 15 | `gemini-nextjs-dev` | `node:24-slim` | `./frontend:/app` (hot reload), `nextjs_node_modules` (named) |

**Key behaviors:**
- Code changes trigger auto-reload — no rebuild needed
- `node_modules` persist in named volumes across restarts
- `npm install` in running container (`docker exec gemini-strapi-dev npm install <pkg>`), or remove `node_modules/.package-lock.json` sentinel + restart
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
