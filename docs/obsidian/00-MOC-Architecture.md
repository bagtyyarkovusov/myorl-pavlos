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

## Migration and ops

- [../migration/](../migration/) — import policy, Strapi schema notes, i18n strategy
- [../runbooks/](../runbooks/) — e.g. PostgreSQL rehearsal
- [../../artifacts/reports/](../../artifacts/reports/) — generated reports (see repo `.gitignore` for what is tracked)

## Non-code context

- [../ai-context.md](../ai-context.md) — **GitNexus** repo name `gemini-export` and re-indexing

**Frontend detail:** [00-MOC-Frontend](00-MOC-Frontend.md)
