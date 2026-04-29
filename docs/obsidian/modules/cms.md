---
module: Cms
symbols: 62
cohesion: 76%
source: gitnexus://repo/gemini-export/cluster/Cms
---

# Module: Cms — Strapi gateway + DTO layer

> The contract boundary between Next.js and Strapi. Per [[../00-MOC-Architecture|ADR-001]], no raw Strapi shapes are allowed outside this directory.

## Code location

- [../../../frontend/src/lib/cms/](../../../frontend/src/lib/cms/) — entire module lives here

## Public surface

The CMS gateway exposes a small set of named entry points consumed by the Next.js App Router and the revalidate webhook.

| Symbol | File | Purpose |
| --- | --- | --- |
| `createCmsGateway` | `cms-gateway.ts` | Factory: returns `{ one, all, fetchOne, fetchAll }` over Strapi REST |
| `getCmsConfig` | `env.ts` | Resolves Strapi origin + token from env. **Critical** — see [[../audits/audit-2026-04-30#getCmsConfig]] |
| `getPage`, `getSite`, `getPageResult` | `cms-api.ts` | High-level reads consumed by route handlers |
| `toPageDTO`, `toMediaDTO`, `toContactDTO`, `toSectionDTO` | `page-normalizer.ts` | Strapi → DTO normalization |
| `toPageMetadata` | `metadata.ts` | DTO → Next.js `Metadata` |
| `hrefForPage`, `hrefForLocaleSlug` | `navigation.ts` | URL builders |
| `deriveSocialPlatform` | `social.ts` | Social-link platform inference |
| `normalizeOrigin`, `normalizeOptionalText`, `normalizePriority` | `env.ts` / `page-normalizer.ts` | Shared sanitisers |

## Internal pipeline

The Strapi-response normalization chain is the highest-traffic flow in the module:

```
fetchAllImpl / fetchOneImpl
   → unwrapStrapiData
       → normalizeEntity
           → deepUnwrapStrapiRelations
               → flattenAttributes
```

Five steps, three indexed processes:

- `FetchAllImpl → FlattenAttributes`
- `FetchOneImpl → FlattenAttributes`
- `CreateCmsGateway → FlattenAttributes`

See [[../processes/cms-gateway-pipeline]] for the trace and current edit risk.

## Cohesion: 76%

24% of edges leak outside the module. Where they leak:
- Down to `Components` (HTML sanitization helpers consumed by DTO output)
- Up to `Navigation` (route handlers calling `getPage`, `getSite`)
- Sideways to `Bootstrap` (a couple of normalizer helpers got grouped there by the community detector — `toItemArray`, `toSectionDTO` — likely a clustering quirk; logically they belong here)

## Active risk (2026-04-30)

The entire normalization pipeline is touched in the working tree:
- `flattenAttributes`, `deepUnwrapStrapiRelations`, `normalizeEntity`, `unwrapStrapiData` — all modified
- `getCmsConfig`, `parsed` — modified

Run `gitnexus_impact` before signing off changes and add an integration test that locks the input → DTO contract. See [[../audits/audit-2026-04-30#1 Uncommitted change risk CRITICAL]].

## Related

- [[../audits/audit-2026-04-30]] — current risk level
- [[../processes/cms-gateway-pipeline]] — pipeline trace
- [[../processes/page-rendering]] — how CMS data reaches the page
- [[../modules/navigation]] — primary consumer
- [[../modules/revalidate]] — secondary consumer (`/api/revalidate`)
- [[../00-MOC-Frontend]] — link-only frontend entry points
