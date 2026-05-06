# MOC: Architecture (gemini-export)

> Maps where decisions and boundaries live. **ADRs are canonical;** this note only links to them.

## Architecture decision records (ADRs)

- [ADR-001 — Semantic DTO boundary (Next.js ↔ Strapi)](../adr/ADR-001-nextjs-semantic-dto-boundary.md)
- [ADR-002 — Contact and system pages (v1)](../adr/ADR-002-nextjs-v1-contact-and-system-pages.md)
- [ADR-003 — PostgreSQL readiness / indexes](../adr/ADR-003-postgres-readiness-indexes.md)
- [ADR-004 — Flat locale routes and localized navigation labels](../adr/ADR-004-flat-locale-routes-and-localized-navigation-labels.md)
- [ADR-005 — Repair source/parent integrity before PostgreSQL cutover](../adr/ADR-005-repair-source-parent-integrity-before-postgres-cutover.md)

## Code boundaries (enforced in practice)

- **CMS / Strapi contract:** [../../frontend/src/lib/cms/](../../frontend/src/lib/cms/) — only DTOs and client code here; no raw Strapi shapes in page components (see ADR-001).
- **Backend (Strapi):** [../../backend/](../../backend/)
- **Tools / scripts:** [../../tools/](../../tools/)
- **Docker infrastructure:** 2 compose files (dev + prod), 2 Dockerfiles, Caddy reverse proxy

## Graph-derived architecture docs

| Doc | Content |
| --- | --- |
| [[00-MOC-CodeIntelligence]] | Index of all module + process wikis |
| [[audits/audit-2026-05-01]] | Current audit: module landscape, process landscape, API surface |
| [[gitnexus-state]] | Index state: 2,702 nodes, 73 communities, 121 flows |
| [[../ai-context.md]] | AI context strategy: ADRs > code > MOCs > GitNexus |

## Migration and ops

- [../migration/](../migration/) — import policy, Strapi schema notes, i18n strategy
- [../runbooks/](../runbooks/) — PostgreSQL backup/rehearsal, production deployment
- [../../artifacts/reports/](../../artifacts/reports/) — generated reports

## Infrastructure

- [../../docker-compose.dev.yml](../../docker-compose.dev.yml) — Dev: postgres + strapi + nextjs (hot reload)
- [../../docker-compose.rehearsal.yml](../../docker-compose.rehearsal.yml) — Rehearsal: disposable postgres for migration validation
- [../../docker-compose.prod.yml](../../docker-compose.prod.yml) — Prod: +caddy with auto TLS
- [[deep-dives/docker]] — Docker architecture deep dive

**Frontend detail:** [[00-MOC-Frontend]]
**Backend detail:** [[00-MOC-Backend]]
**Tools and scripts:** [[00-MOC-Tools]]
