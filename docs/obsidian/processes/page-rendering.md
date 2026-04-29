---
process: CmsPage entry trace
type: cross_community
source: gitnexus_query + cypher
---

# Process: page rendering — `CmsPage → One`

> Canonical entry trace for a content page request. From the App Router page component down to the Strapi gateway.

## Steps

| Step | Symbol | File | Role |
| --- | --- | --- | --- |
| 1 | `CmsPage` | `frontend/src/app/[locale]/[slug]/page.tsx` | Server component for `/{locale}/{slug}` |
| 2 | `getPage` | `frontend/src/lib/cms/cms-api.ts` | High-level CMS read by slug |
| 3 | `getPageResult` | `frontend/src/lib/cms/cms-api.ts` | Wraps result + error handling |
| 4 | `one` | `frontend/src/lib/cms/cms-gateway.ts` | Single-entity Strapi fetch |

## Sibling flows from the same entry

`CmsPage` originates 3 indexed flows:
- `CmsPage → GetGateway`
- `CmsPage → One` (this one)
- `CmsPage → ToCmsPageError`

After step 4 (`one`), execution continues into the [[cms-gateway-pipeline|normalization pipeline]] (`unwrapStrapiData → normalizeEntity → deepUnwrapStrapiRelations → flattenAttributes`). GitNexus splits this into a separate process because it crosses an internal helper boundary.

## Locale-home variant

The locale homepage uses a parallel chain rooted at `LocaleHomePage` (`frontend/src/app/[locale]/page.tsx`):

- `LocaleHomePage → GetGateway`
- `LocaleHomePage → One`
- `LocaleHomePage → ToCmsPageError`
- `LocaleHomePage → FindInTree` (navigation tree lookup)

## Metadata variant

`generateMetadata` runs in parallel with `CmsPage` for the same request and originates 6 flows of its own (and 6 more for the `[locale]` variant) — `→ GetGateway`, `→ One`, `→ ToCmsPageError`, `→ NormalizeOrigin`, `→ NormalizeOptionalText`, `→ HrefForLocaleSlug`.

## Active risk (2026-04-30)

Step 1 (`CmsPage`, `LocaleHomePage`, both `generateMetadata`) is touched. See [[../audits/audit-2026-04-30#1 Uncommitted change risk CRITICAL]].

## Related

- [[cms-gateway-pipeline]] — what happens after step 4
- [[../modules/navigation]] — page entry symbols
- [[../modules/cms]] — gateway internals
