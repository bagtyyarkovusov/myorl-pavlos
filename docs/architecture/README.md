# Architecture Overview (myorl-pavlos)

> Maps where decisions and boundaries live. **ADRs are canonical;** this note only links to them.

## Architecture decision records (ADRs)

- [ADR-001 — Semantic DTO boundary (Next.js ↔ Strapi)](../adr/ADR-001-nextjs-semantic-dto-boundary.md)
- [ADR-002 — Contact and system pages (v1)](../adr/ADR-002-nextjs-v1-contact-and-system-pages.md)
- [ADR-003 — PostgreSQL readiness / indexes](../adr/ADR-003-postgres-readiness-indexes.md)
- [ADR-004 — Flat locale routes and localized navigation labels](../adr/ADR-004-flat-locale-routes-and-localized-navigation-labels.md)
- [ADR-005 — Repair source/parent integrity before PostgreSQL cutover](../adr/ADR-005-repair-source-parent-integrity-before-postgres-cutover.md)
- [ADR-006 — DynamicZone as single section container](../adr/ADR-006-dynamiczone-single-section-container.md)
- [ADR-007 — Hybrid Tailwind v4 + CSS Modules styling](../adr/ADR-007-hybrid-tailwind-css-modules-styling.md)
- [ADR-008 — Dev Postgres is canonical Strapi state store](../adr/ADR-008-dev-postgres-is-canonical-strapi-state-store.md)
- [ADR-009 — Clinic maps on Next.js contact pages](../adr/ADR-009-nextjs-contact-pages-use-clinic-map.md)
- [ADR-010 — Related Topics replace legacy Popular Articles](../adr/ADR-010-related-topics-replace-popular-articles.md)

## Code boundaries (enforced in practice)

- **CMS / Strapi contract:** [../../frontend/src/lib/cms/](../../frontend/src/lib/cms/) — only DTOs and client code here; no raw Strapi shapes in page components (see ADR-001).
- **Backend (Strapi):** [../../backend/](../../backend/)
- **Tools / scripts:** [../../tools/](../../tools/)
- **Docker infrastructure:** 2 compose files (dev + prod), 2 Dockerfiles, Caddy reverse proxy

## Architecture docs

| Doc | Content |
| --- | --- |
| [overview.md](overview.md) | High-level system architecture |
| [frontend.md](frontend.md) | Next.js App Router, CMS DTO layer, components |
| [backend.md](backend.md) | Strapi CMS API, schema, configuration |
| [data-flow.md](data-flow.md) | CMS → DTO → Page component pipeline |
| [deployment.md](deployment.md) | Docker, environments, CI/CD overview |
| [ci-cd-and-workflow.md](../runbooks/ci-cd-and-workflow.md) | Full CI/CD pipeline & workflow reference |
| [adr-alignment.md](adr-alignment.md) | ADR-to-codebase alignment report |

## Deep dives

| Doc | Content |
| --- | --- |
| [docker-deep-dive.md](docker-deep-dive.md) | Docker architecture |
| [backend-api-deep-dive.md](backend-api-deep-dive.md) | Strapi API collections |
| [strapi-components-deep-dive.md](strapi-components-deep-dive.md) | 22 component schemas |
| [site-header-deep-dive.md](site-header-deep-dive.md) | Navigation header internals |
| [home-sections-deep-dive.md](home-sections-deep-dive.md) | Homepage section components |
| [testing-strategy-deep-dive.md](testing-strategy-deep-dive.md) | Test inventory and conventions |

## Migration and ops

- [slug-migration.md](slug-migration.md) — MODX slug parity history and redirect coverage
- [../runbooks/](../runbooks/) — PostgreSQL backup/rehearsal, production deployment
- [../../artifacts/reports/](../../artifacts/reports/) — generated reports

## Infrastructure

- [../../docker-compose.dev.yml](../../docker-compose.dev.yml) — Dev: postgres + strapi + nextjs (hot reload)
- [../../docker-compose.rehearsal.yml](../../docker-compose.rehearsal.yml) — Rehearsal: disposable postgres for migration validation
- [../../docker-compose.prod.yml](../../docker-compose.prod.yml) — Prod: +caddy with auto TLS
- [docker-deep-dive.md](docker-deep-dive.md) — Docker architecture deep dive

**Frontend detail:** [frontend-moc.md](frontend-moc.md)  
**Backend detail:** [backend-moc.md](backend-moc.md)  
**Tools and scripts:** [tools-moc.md](tools-moc.md)
