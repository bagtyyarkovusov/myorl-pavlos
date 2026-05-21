# ADR-010: Replace Legacy Popular Articles with Contextual Related Topics

## Status
Accepted

## Context
The legacy MODX site rendered a global **Popular Articles** block (for example, «Популярные статьи») near the bottom of many pages: a horizontal image carousel of editorial picks, often identical across pages.

The modern stack already has overlapping but incomplete mechanisms:

- **`relatedPages`** on `api::page.page` — described in Strapi as cross-links shown alongside a page, but not yet rendered by Next.js.
- **`sections.linked-resources`** — used today on some article pages; `PageBody` extracts these into sidebar text links under “Related topics” while hiding the section from the main column.
- **`Related Article`** on **Video Entry** — a separate one-video → one-article contract already documented in `CONTEXT.md`.
- **Home editorial grids** — `sections.linked-resources` and `sections.promo-slider` remain valid home-only discovery patterns.

Rebuilding the MODX carousel sitewide would restore identical promo noise on every page and conflict with the reference-article reading model (TOC + contextual continuation in the sidebar). The empty desktop sidebar on many encyclopedia articles is a separate UX problem that contextual cross-links can solve without bringing back global “popular” promo.

## Decision
Do **not** restore the legacy global Popular Articles carousel.

Instead, introduce **Related Topics**: contextual cross-links on long-form medical article pages.

### Reader-facing behavior
- Show **Related Topics** on `encyclopedia-article`, `specialized-article`, and `service-article` layouts only.
- Do **not** show Related Topics on FAQ, accordion, tab, contact, directory index, or other task/navigation pages.
- **Desktop:** render in the article sidebar below the table of contents (reference articles) or below in-page section navigation (`service-article`).
- **Mobile:** the sidebar is hidden; render Related Topics in a collapsible panel using the same mobile-panel pattern as the reference TOC.
- Use **text links** only — no image carousel.
- When zero links resolve, **hide the panel entirely** (no empty heading).

### Curation model (hybrid)
- **Primary source:** editor-managed **`relatedPages`** on the current page.
- When `relatedPages` is non-empty, it **replaces** auto-suggest entirely.
- When `relatedPages` is empty, auto-suggest up to **six** links using:
  1. other published pages in the same locale with the most shared **tags**, then
  2. sibling pages under the same **parent section** to fill remaining slots.

### Auto-suggest filters
Auto-suggested candidates must:
- be in the same locale as the current page
- use a long-form article layout variant (`encyclopedia-article`, `specialized-article`, or `service-article`)
- not be the current page
- not be parent hub/index pages
- not be menu-hidden pages

### CMS cleanup on article pages
- **`sections.linked-resources`** remains valid for **home** editorial grids (focus grid, article row).
- On **article pages**, retire `sections.linked-resources` after a one-time migration of existing items into **`relatedPages`**.
- After migration, article renderers resolve Related Topics from `relatedPages` + auto-suggest only — not from `linked-resources` sections in `pageSections`.

### Terminology
- **Related Topics** — contextual article cross-links (this ADR).
- **Related Pages** — the Strapi relation field that stores editor overrides.
- **Related Article** — the Video Entry → page relation; unchanged.

Canonical vocabulary lives in `CONTEXT.md`.

## Alternatives Considered

- **Restore the MODX Popular Articles carousel sitewide.**
  Rejected: identical promo on every page trains readers to ignore it and duplicates home/index discovery patterns.

- **Global discovery on high-traffic pages only (home + section indexes).**
  Rejected as the primary replacement: useful for editorial promo, but it does not solve contextual continuation on leaf medical articles.

- **Manual curation only via `relatedPages`.**
  Rejected: does not scale across hundreds of migrated articles before tag cleanup is complete.

- **Automatic curation only (tags or siblings).**
  Rejected: medical cross-links need editorial judgment; automation alone produces misleading “related” pairs.

- **Keep `sections.linked-resources` as the article source of truth.**
  Rejected: duplicates `relatedPages`, burdens editors with section headings/intros for simple cross-links, and splits home vs article semantics awkwardly.

- **End-of-article image card carousel with `featuredImage`.**
  Rejected for v1: higher implementation and content-maintenance cost; many articles lack reliable hero imagery; sidebar text links fit the reference reading model.

## Consequences
- Positive: Related Topics support contextual wayfinding instead of sitewide promo repetition.
- Positive: Fills the empty reference-article sidebar when links exist, without breaking the TOC-first layout.
- Positive: Reuses the existing `relatedPages` schema field and Strapi editor affordance.
- Positive: Home editorial patterns (`linked-resources`, promo slider) stay unchanged.
- Negative: Requires frontend work to populate and render `relatedPages`, plus auto-suggest logic in the DTO/query layer.
- Negative: Requires a one-time migration from article `linked-resources` sections before retiring that pathway.
- Negative: Auto-suggest quality depends on tag completeness and parent integrity in Strapi.

## Trade-offs
We accept server-side suggestion logic and a migration script in exchange for a single article cross-link model (`relatedPages`), better editor ergonomics, and a UX that matches long-form medical reading instead of legacy MODX template filler.

## Implementation Notes

Implemented in the frontend CMS layer:

- `relatedPages` is populated via `PAGE_POPULATE` and normalized in `toPageDTO()`.
- `withRelatedTopics()` / `resolveRelatedTopics()` attach `relatedTopics` at the `[locale]/[slug]` request boundary using `directoryNavigation`.
- `PageBody` renders sidebar links on desktop and a collapsible mobile panel for reference and service articles.
- `tools/migrate_article_linked_resources_to_related_pages.py` provides an idempotent dry-run/apply path for any future article `linked-resources` blocks (current dev DB: 0 published article pages affected).

## Related
- [ADR-001](./ADR-001-nextjs-semantic-dto-boundary.md) — Semantic DTO boundary
- [ADR-006](./ADR-006-dynamiczone-single-section-container.md) — `pageSections` DynamicZone source
- [`CONTEXT.md`](../../CONTEXT.md) — Related Topics, Related Pages, Related Article glossary
