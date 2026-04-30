# ADR-006: Use DynamicZone as Single Section Container for All Page Types

**Status:** Proposed

**Date:** 2026-04-30

**Deciders:** @bagtyyarkovusov

## Context

The `page` content-type stores section content through two parallel mechanisms: a DynamicZone (`pageSections`, visible only for `pageType === "home"`) and five dedicated component fields (`faqSection`, `accordionSection`, `tabsSection`, `gallerySection`, `contactSection`, each visible only for its namesake `pageType`).

This dual representation creates friction at three levels:

1. **Normalizer complexity** — the frontend DTO layer (`toSemanticSections()` in `page-normalizer.ts`) merges both API shapes, injecting `__component` discriminators via `pushIfPresent` for dedicated fields that lack them natively. The normalizer is shallow: its interface is nearly as complex as its implementation, existing only to compensate for the schema split.
2. **Editorial constraint** — non-home pages are limited to exactly one section of their designated type. A faq page cannot also have a gallery. This limit is imposed by the schema, not by product intent.
3. **API shape divergence** — the same component schemas (`sections.accordion`, `sections.tabs`, `sections.gallery`, `sections.contact`) produce different Strapi REST response shapes depending on whether they occupy a DynamicZone entry (`{ __component: "sections.xxx", ... }` in an array) or a dedicated field (`{ accordionSection: {...} }` as a nested object). This complicates ADR-001's DTO boundary.

## Decision

- Remove the five dedicated component fields (`faqSection`, `accordionSection`, `tabsSection`, `gallerySection`, `contactSection`) from the `page` content-type schema.
- Remove the `pageType` visibility condition on `pageSections` — the DynamicZone is now visible for all page types.
- Add `sections.faq` to the DynamicZone's allowed components (it was previously exclusive to the `faqSection` dedicated field).
- Migrate existing page section data from dedicated fields into `pageSections` entries via a one-time Strapi bootstrap script that runs idempotently on deploy.
- The frontend normalizer reads only `page.pageSections` — the dual-pathway merge logic (`pushIfPresent`, `pageType` gating, `__component` fallback injection) is deleted.

After migration, every page — regardless of `pageType` — stores its sections in a single DynamicZone array. The API response shape is consistently `[{ __component: "sections.xxx", ... }, ...]`.

## Consequences

### Positive

- Section content has a single, consistent API response shape for all page types.
- Content authors can stack multiple section types on any page (e.g., a faq page with an accordion and a gallery), increasing editorial leverage.
- The frontend normalizer collapses to a direct map — `pushIfPresent` and merge logic are deleted, deepening the module.
- ADR-001's DTO boundary becomes simpler: no more `__component` injection or shape-dependent branching.
- `SectionRenderer` can become the single dispatch point for all page layouts without conditional pathways.

### Negative / trade-offs

- A one-time data migration is required for existing non-home pages that currently store section data in dedicated fields. Lost or partial migration would result in missing section content.
- Strapi admin UX changes: content authors who previously saw a single typed field for their page type will now see a DynamicZone builder. This is more powerful but introduces an extra click to add a section component on pages that previously had one auto-present.

## Alternatives considered

- **Remove DynamicZone, keep dedicated fields, and split home page into separate pages per section type.** Rejected because it degrades the home page's ability to stack arbitrary sections in editorial order, and requires content authors to manage multiple pages for what is conceptually one page.
- **Keep both mechanisms, add more gating logic to the normalizer and SectionRenderer.** Rejected because it adds complexity without solving the editorial flexibility constraint or the API shape divergence.
- **Use a repeatable component field instead of DynamicZone.** Rejected because repeatable components lack the `__component` discriminator in Strapi v4 REST responses, requiring the same fallback injection the dedicated fields already suffer from.

## References

- [ADR-001](./ADR-001-nextjs-semantic-dto-boundary.md) — Semantic DTO Boundary (this decision aligns the Strapi schema with the section model the DTO already exposes)
- `backend/src/api/page/content-types/page/schema.json` — current dual-pathway schema
- `frontend/src/lib/cms/page-normalizer.ts` — `toSemanticSections()` (dual-pathway merge logic)
