# MOC: Code Intelligence (graph-derived)

> Notes generated from the **GitNexus** knowledge graph. Complementary to the link-only [[00-MOC-Architecture]] and friends — these go one level deeper into actual call relationships and execution flows.

## State of the index

- [[gitnexus-state]] — current stats, known gaps, index hygiene, schema cheat sheet

## Audits

- [[audits/audit-2026-05-01]] — codebase audit (fresh index, clean working tree)

## Modules (from GitNexus graph)

### Frontend

| Module | Symbols | Cohesion | Note |
| --- | --- | --- | --- |
| [[modules/cms]] | ~68 | 56–98% | Strapi gateway + DTO layer + routes. Largest module (7 sub-clusters). |
| [[modules/components]] | 10 | 86–92% | Design system (CmsHtml, PageSection, ButtonLink) + HTML sanitization |
| [[modules/internal]] | 8 | 89–100% | Site-header internals: MegaMenu, drawer hooks, i18n header strings |
| [[modules/page-layouts]] | 6 | 100% | GalleryPage, QuestionListPage, _shared (other layouts absorbed by Cms) |
| [[modules/revalidate]] | 9 | 73–86% | `/api/revalidate` route handler + auth + tag derivation |
| [[modules/i18n]] | 2 | 100% | Homepage layout + getHomeStrings |
| [[modules/sections]] | 5 | 100% | SectionRenderer + body renderers + DisclosureList + ResponsiveImage |
| [[modules/navigation]] | subsumed | N/A | Previously 10 symbols. Route entry points now live in [[modules/cms|Cms]] cluster |

### Backend

| Module | Symbols | Cohesion | Note |
| --- | --- | --- | --- |
| [[modules/bootstrap]] | 13 | 56–91% | Strapi seeders + misclassified navigation/tools symbols |
| [[modules/scripts]] | ~38 | 73–100% | `backend/scripts/*.js` one-shot cleanup + verification scripts |

### Tools

| Module | Symbols | Cohesion | Note |
| --- | --- | --- | --- |
| [[modules/tools]] | ~75 | 86–100% | Python migration + readiness gates. Largest module. |
| [[modules/cms-audit]] | 2 | 100% | Shared JSON I/O (`cms_audit/io.py`) |
| [[modules/examples]] | 14 | ~94% | Reference DTO examples + redirect loader |

## Key processes (from GitNexus graph)

| Process | Steps | Note |
| --- | --- | --- |
| [[processes/locale-layout]] | 7 max | Root layout wrapper for every `/[locale]` route |
| [[processes/page-rendering]] | 4 | `CmsPage` + `LocaleHomePage` data fetching |
| [[processes/cms-gateway-pipeline]] | 5 | Strapi normalization chain (intra_community) |
| [[processes/generate-metadata]] | 4 (×12) | SEO metadata generation (both locale variants) |
| [[processes/revalidate-webhook]] | 4 | `POST /api/revalidate` ISR invalidation |
| [[processes/site-header]] | 5 | Navigation rendering through server/client split |

## Deep dives

| Doc | Content |
| --- | --- |
| [[deep-dives/site-header-internals]] | Full component tree: MegaMenu, DesktopNav, MobileDrawer, 3 hooks, 12 files, 14 tests |
| [[deep-dives/home-sections]] | 8 homepage section components: hero, carousel, grid, ledger, video, contact |
| [[deep-dives/backend-api]] | Strapi API: 3 collections (page, global, tag), controllers, services, routes |
| [[deep-dives/strapi-components]] | 22 Strapi component schemas: 11 items, 10 sections, 1 shared |
| [[deep-dives/docker]] | Docker infrastructure: dev + prod compose, networking, volumes, env vars |
| [[deep-dives/testing-strategy]] | 28 test files, co-location pattern, fixtures, coverage gaps |

## How to use these notes

- Open the graph view in Obsidian — module/process notes link bidirectionally with each other and with the audit.
- Every code reference uses **relative markdown paths** so links resolve in GitHub/IDEs too.
- Treat these as **derived artifacts**: regenerate after re-indexing if the codebase shifts. Do not hand-edit symbol counts.

## Related

- [[00-MOC-Architecture]] — ADRs, code boundaries, migration docs
- [[00-MOC-Frontend]] — Next.js entry points
- [[00-MOC-Backend]] — Strapi entry points
- [[00-MOC-Tools]] — Python tooling
- [[README]] — vault overview
