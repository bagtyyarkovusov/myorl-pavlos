# MOC: Code Intelligence (graph-derived)

> Notes generated from the **GitNexus** knowledge graph. Complementary to the link-only [[00-MOC-Architecture]] and friends — these go one level deeper into actual call relationships and execution flows.

## State of the index

- [[gitnexus-state]] — current stats, known gaps, schema cheat sheet

## Audits

- [[audits/audit-2026-04-30]] — codebase audit (CRITICAL working tree, module landscape, routes)

## Modules (from `gitnexus://repo/gemini-export/clusters`)

Frontend:
- [[modules/cms]] — Strapi gateway + DTO layer (62 symbols, 76% cohesion)
- [[modules/navigation]] — page entry points + site header (10 symbols, 81%)
- [[modules/internal]] — site-header internals: MegaMenu, drawer, hooks (10 symbols, 94%)
- [[modules/components]] — design system + HTML sanitization (9 symbols, 89%)
- [[modules/page-layouts]] — page-shape components (6 symbols clustered, 100% — but see audit)
- [[modules/revalidate]] — `/api/revalidate` route handler (9 symbols, 74%)

Backend:
- [[modules/bootstrap]] — Strapi seeders for nav permissions + content-manager config (13 symbols, 67%)
- [[modules/scripts]] — `backend/scripts/*.js` cleanup tasks (42 symbols, 86%)

Tools:
- [[modules/tools]] — Python migration / readiness gates (90 symbols, 91%)
- `_archived` (246 symbols) — dead, see [[audits/audit-2026-04-30#3 Module landscape]]
- `Claude-design` (151 symbols) — minified vendor JS noise, see audit

## Key processes (from `gitnexus://repo/gemini-export/processes`)

- [[processes/page-rendering]] — `CmsPage → getPage → getPageResult → one`
- [[processes/cms-gateway-pipeline]] — `fetchAllImpl/fetchOneImpl → unwrapStrapiData → normalizeEntity → deepUnwrapStrapiRelations → flattenAttributes`
- [[processes/revalidate-webhook]] — `POST /api/revalidate` flows

## How to use these notes

- Open the graph view in Obsidian — module/process notes link bidirectionally with each other and with the audit.
- Every code reference uses **relative markdown paths** (`../../frontend/...`) so links resolve in GitHub/IDEs too.
- Treat these as **derived artifacts**: regenerate after re-indexing if the codebase shifts. Do not hand-edit symbol counts.

## Related

- [[00-MOC-Architecture]] — ADRs, code boundaries, migration docs
- [[00-MOC-Frontend]] — Next.js entry points
- [[00-MOC-Backend]] — Strapi entry points
- [[00-MOC-Tools]] — Python tooling
- [[README]] — vault overview
