---
process: Page rendering
type: cross_community
source: gitnexus_cypher + context (CmsPage, LocaleHomePage)
---

# Process: Page rendering — `CmsPage` and `LocaleHomePage`

> Two entry points for fetching and rendering CMS content into page components. Both follow identical patterns but serve different route segments.

## Entry points

| Symbol | File | Route |
| --- | --- | --- |
| `CmsPage` | `frontend/src/app/[locale]/[slug]/page.tsx` | `/[locale]/{slug}` — dynamic CMS pages |
| `LocaleHomePage` | `frontend/src/app/[locale]/page.tsx` | `/[locale]` — homepage |

## Steps (`CmsPage → One` / `LocaleHomePage → One`)

| Step | Symbol | Role |
| --- | --- | --- |
| 1 | `CmsPage` or `LocaleHomePage` | Entry — Next.js page component |
| 2 | `getGateway` | Obtains CMS gateway instance |
| 3 | `getPage` or `getSite` | High-level fetch |
| 4 | `one` (gateway) | Single-entity fetch via Strapi REST |

## Indexed flows

| Flow | Steps | Type |
| --- | --- | --- |
| `CmsPage → GetGateway` | 4 | cross_community |
| `CmsPage → One` | 4 | cross_community |
| `CmsPage → ToCmsPageError` | 4 | cross_community |
| `LocaleHomePage → GetGateway` | 4 | cross_community |
| `LocaleHomePage → One` | 4 | cross_community |
| `LocaleHomePage → ToCmsPageError` | 4 | cross_community |

## Rendering pipeline

```
Page component (CmsPage / LocaleHomePage)
  → getGateway() or getPageResult(slug, locale)
    → getPage(slug, locale)
      → one(locale, slug, "page", populate)
        → fetchOneImpl
          → unwrapStrapiData → normalizeEntity → deepUnwrapStrapiRelations → flattenAttributes
    → toPageDTO(raw) → PageDTO
  → Map sections to components:
    → SectionRenderer (dispatcher)
      → renderSectionBody / renderSectionBodyHome
        → Home sections (hero, promo, ledger, etc.) or standard sections
  → Wrap in PageRenderer (loading + error boundaries)
```

## Error handling

Both page components handle CMS errors via `toCmsPageError` which maps gateway failures to typed `CmsError` instances. The `error.tsx` boundaries in `[locale]/` and root catch these and render `LocaleErrorPage` or `ErrorPage`, with special handling for timeout errors.

## Dependencies

- `createCmsGateway` → `getCmsConfig` (CRITICAL chokepoint)
- `getPage`, `getSite`, `getSitemapPages` (CMS API)
- `toPageDTO`, `toSectionDTO`, `toContactDTO` (DTO layer)
- `SectionRenderer` (dynamic dispatcher)
- `PageRenderer` (error/loading wrapper)
- All page-layout components (`HomePage`, `StandardPage`, etc.)

## Related

- [[cms-gateway-pipeline]] — normalization chain
- [[generate-metadata]] — metadata generation (runs in parallel)
- [[locale-layout]] — parent layout
- [[../modules/cms]] — module overview
- [[../modules/page-layouts]] — page shape components
