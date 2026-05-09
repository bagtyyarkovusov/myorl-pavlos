# System Architecture Overview

> gemini-export is a bilingual (Greek/Russian) medical services website built as a monorepo with a Next.js 16 frontend, Strapi 5.42.1 CMS backend, and PostgreSQL 16 database.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| CMS | Strapi | 5.42.1 |
| Frontend | Next.js | 16.2+ (App Router, Turbopack) |
| Database | PostgreSQL | 16 |
| Container | Docker Compose | v3 |
| Languages | TypeScript, Python 3.11+ |
| Testing | Vitest, Playwright |
| CSS | Tailwind CSS v4, CSS Modules |

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              Next.js 16 (App Router)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Routes    │  │ Components  │  │   CMS DTO Layer     │  │
│  │ [locale]    │  │ Sections    │  │  page-normalizer    │  │
│  │ [slug]      │  │ PageLayouts │  │  section-normalizer │  │
│  │ api/health  │  │ SiteHeader  │  │  cms-gateway        │  │
│  │ api/rev...  │  │ design-sys  │  │  types/validators   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │ Strapi REST API
┌──────────────────────▼──────────────────────────────────────┐
│              Strapi 5.42.1 (CMS Backend)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Page (650+) │  │ Global (1)  │  │ Tag (taxonomy)      │  │
│  │ DynamicZone │  │ Navigation  │  │                     │  │
│  │ Sections    │  │ Footer      │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │ PostgreSQL
┌──────────────────────▼──────────────────────────────────────┐
│              PostgreSQL 16                                  │
│         (Dev / Rehearsal / Production)                      │
└─────────────────────────────────────────────────────────────┘
```

## Key Architectural Decisions

All decisions are recorded as ADRs in `docs/adr/`:

1. **ADR-001 — Semantic DTO Boundary**: The frontend never touches raw Strapi payloads. A server-side DTO layer in `frontend/src/lib/cms/` normalizes all CMS data into typed, stable shapes.
2. **ADR-006 — DynamicZone Single Section Container**: All page sections live in one `pageSections` DynamicZone array. No dedicated per-page-type fields. This gives editors flexibility to stack any section on any page.
3. **ADR-004 — Flat Locale Routes**: URLs are `/{locale}/{slug}` (e.g., `/el/about`, `/ru/about`). No nested parent-based paths. Navigation hierarchy is separate from URL structure.
4. **ADR-007 — Hybrid Tailwind + CSS Modules**: Tailwind handles layout/spacing/typography; CSS Modules handle pseudo-elements, keyframes, backdrop-filter, and complex grids.
5. **ADR-008 — Dev Postgres as Canonical Store**: The Docker dev PostgreSQL is the source of truth for all migration and rehearsal operations. SQLite is a no-Docker fallback only.

## Monorepo Layout

```
/
├── frontend/          # Next.js 16 App Router
│   ├── src/app/       # Routes, layouts, API handlers
│   ├── src/components/# Page layouts, sections, site header
│   ├── src/lib/cms/   # DTO boundary (ADR-001)
│   └── e2e/           # Playwright tests
├── backend/           # Strapi 5.42.1
│   ├── src/api/       # Page, Tag, Global content types
│   ├── src/components/# 22 reusable components
│   ├── config/        # Database, server, plugins
│   └── database/      # Migrations
├── packages/
│   └── shared-types/  # Auto-generated from Strapi schemas
├── tools/             # Python scripts for migration & ops
├── docs/
│   ├── adr/           # Architecture Decision Records
│   ├── agents/        # Agent skill configuration
│   ├── architecture/  # This directory
│   ├── migration/     # Import docs & schema notes
│   └── runbooks/      # Operational procedures
└── docker-compose.*.yml
```

## Port Allocation Contract

| Port | Owner |
|------|-------|
| `3000` | Next.js frontend (dev) |
| `1337` | Strapi CMS backend (dev) |
| `5432` | Native/system PostgreSQL (other projects) |
| `55432` | Dev Docker PostgreSQL (`gemini-pg`) |
| `55532` | Rehearsal Docker PostgreSQL (`gemini-pg-rehearsal`) |

## Environments

| Environment | Command | Database |
|-------------|---------|----------|
| Docker dev | `npm run dev` | PostgreSQL 16 (Docker) |
| Local dev | `npm run dev:local` | PostgreSQL 16 (Docker) + native Node |
| Rehearsal | `python tools/orchestrate_rehearsal.py` | Disposable PostgreSQL |
| Production | `docker-compose.prod.yml` | PostgreSQL 16 + Caddy TLS |

## Bilingual Content Model

- **Locales**: Greek (`el`) and Russian (`ru`)
- **Content**: All Strapi fields are localized except `footerCategory`
- **Routing**: Flat `/{locale}/{slug}` paths (ADR-004)
- **Navigation**: Per-locale trees built from `parentPage` relations
- **Fallback**: No automatic locale fallback; each locale is independent

## Related

- [frontend.md](frontend.md) — Frontend architecture
- [backend.md](backend.md) — Backend architecture
- [data-flow.md](data-flow.md) — CMS → Frontend data pipeline
- [deployment.md](deployment.md) — Docker, CI/CD, operations
- [adr-alignment.md](adr-alignment.md) — ADR validation report
