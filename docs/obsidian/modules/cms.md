---
module: Cms
symbols: ~68 (7 sub-clusters)
cohesion: varies (56%–98% per sub-cluster)
source: gitnexus_cypher (cluster="Cms")
---

# Module: Cms — Strapi gateway + DTO layer

> The contract boundary between Next.js and Strapi. Per [[../00-MOC-Architecture|ADR-001]], no raw Strapi shapes are allowed outside this directory. This is the largest and most-connected module in the codebase (7 sub-clusters, ~68 symbols).

## Code location

- [../../../frontend/src/lib/cms/](../../../frontend/src/lib/cms/) — gateway, DTOs, normalizers, types, env, errors
- [../../../frontend/src/app/](../../../frontend/src/app/) — route handlers (`[locale]/page.tsx`, `[locale]/[slug]/page.tsx`, `layout.tsx`, `sitemap.ts`, `robots.ts`, `/api/health`)
- [../../../frontend/src/components/SiteHeader.tsx](../../../frontend/src/components/SiteHeader.tsx) — navigation header
- [../../../frontend/src/lib/navigation/](../../../frontend/src/lib/navigation/) — appointment-href resolver

## Public surface

| Symbol | File | Purpose |
| --- | --- | --- |
| `createCmsGateway` | `cms-gateway.ts` | Factory: returns `{ one, all, fetchOne, fetchAll }` over Strapi REST |
| `getCmsConfig` | `env.ts` | Resolves Strapi origin + token from env |
| `getPage`, `getSite`, `getPageResult`, `getSitemapPages` | `cms-api.ts` | High-level reads consumed by route handlers |
| `toPageDTO`, `toMediaDTO`, `toContactDTO`, `toSectionDTO`, `toSeoDTO`, `toTagDTO` | `page-normalizer.ts` | Strapi → DTO flattening |
| `toPageMetadata` | `metadata.ts` | DTO → Next.js `Metadata` |
| `hrefForPage`, `hrefForLocaleSlug` | `navigation.ts` | URL builders |
| `deriveSocialPlatform`, `toSocialLinkDTO` | `social.ts` | Social-link handling |
| `normalizeOrigin`, `normalizeOptionalText`, `normalizePriority` | `env.ts` / `page-normalizer.ts` | Shared sanitizers |
| `findAppointmentHref`, `findInTree` | `navigation/appointment-href.ts` | Tree-walking URL resolver |

## Internal pipeline

The Strapi-response normalization chain:

```
fetchAllImpl / fetchOneImpl
   → unwrapStrapiData
       → normalizeEntity
           → deepUnwrapStrapiRelations
               → flattenAttributes
```

### Indexed processes

- `FetchAllImpl → FlattenAttributes` (5 steps, intra_community)
- `FetchOneImpl → FlattenAttributes` (5 steps, intra_community)
- `CreateCmsGateway → AppendSearchParams` (5 steps)
- `CreateCmsGateway → FlattenAttributes` (5 steps)
- `CreateCmsGateway → CmsError` (4 steps)
- `CreateCmsGateway → NormalizeOrigin` (4 steps)
- `CreateCmsGateway → BuildQueryParams` (3 steps)

The gateway is also the entry point for page rendering and metadata:
- `LocaleHomePage → One/GetGateway/ToCmsPageError` (4 steps each)
- `CmsPage → One/GetGateway/ToCmsPageError` (4 steps each)
- `GenerateMetadata → *` (12 flows, 4 steps each, both locale variants)

## Cohesion patterns

| Sub-cluster | Size | Cohesion | Composition |
| --- | --- | --- | --- |
| Core gateway | 16 | 98% | `cms-gateway.ts` — normalization pipeline |
| API + routes | 12 | 83% | `cms-api.ts` + route handlers |
| DTO layer | 12 | 78% | `page-normalizer.ts` — all `to*DTO` functions |
| DTO lower | 9 | 78% | Item-level DTOs (`toAccordionItem`, etc.) |
| Navigation | 8 | 78% | URL builders + appointment-href |
| Social + i18n | 7 | 57% | `social.ts`, `navigation.ts`, `isLocale` |
| Types + errors | 5–6 | 56–62% | `types/common.ts`, `errors.ts` |

The gateway core (16 symbols) has the highest cohesion (98%) — the normalization chain is tightly woven with few external edges. The DTO layers are more porous because every `to*DTO` function imports types from `types/` and calls normalizers from `social.ts` and `metadata.ts`.

## Active state

| Metric | Value |
| --- | --- |
| Working tree | Clean (0 changes) |
| Index sync | Matches HEAD `94d7996` |

## Related

- [[../processes/cms-gateway-pipeline]] — normalization pipeline trace
- [[../processes/page-rendering]] — how CMS data reaches page components
- [[../processes/locale-layout]] — layout entry point
- [[../processes/generate-metadata]] — SEO metadata generation
- [[navigation]] — primary consumer (site header)
- [[revalidate]] — secondary consumer (`/api/revalidate`)
- [[00-MOC-Frontend]] — link-only frontend entry points
