---
process: Strapi response normalization
type: intra_community
source: gitnexus_cypher + context (process="FetchAllImpl → FlattenAttributes")
---

# Process: CMS gateway normalization pipeline

> The shared 5-step chain that every Strapi read goes through to produce a clean DTO. Lives entirely inside `frontend/src/lib/cms/cms-gateway.ts`.

## Steps (`FetchAllImpl → FlattenAttributes` / `FetchOneImpl → FlattenAttributes`)

| Step | Symbol | Role |
| --- | --- | --- |
| 1 | `fetchAllImpl` / `fetchOneImpl` | Entry — fetches list or single entity from Strapi REST |
| 2 | `unwrapStrapiData` | Strips top-level `{data, meta}` envelope |
| 3 | `normalizeEntity` | Per-entity shaping (recursive relation unwrap) |
| 4 | `deepUnwrapStrapiRelations` | Recursively unwraps `{data: ...}` relation wrappers |
| 5 | `flattenAttributes` | Flattens `{id, attributes: {...}}` → `{id, ...attrs}` |

All five symbols are in `frontend/src/lib/cms/cms-gateway.ts`.

## Indexed flows

| Process | Steps | Type |
| --- | --- | --- |
| `FetchAllImpl → FlattenAttributes` | 5 | intra_community |
| `FetchOneImpl → FlattenAttributes` | 5 | intra_community |
| `CreateCmsGateway → AppendSearchParams` | 5 | intra_community |
| `CreateCmsGateway → FlattenAttributes` | 5 | intra_community |
| `CreateCmsGateway → NormalizeOrigin` | 4 | intra_community |
| `CreateCmsGateway → CmsError` | 4 | intra_community |
| `CreateCmsGateway → BuildQueryParams` | 3 | intra_community |

## Why this matters

This pipeline is the **single contract translator** between Strapi v4's nested response shape and the rest of the Next.js app. The DTO layer (`page-normalizer.ts`, `metadata.ts`, `social.ts`) consumes the output of step 5 and assumes flat attributes.

Breaking any one of these steps:
- Breaks every `getPage`, `getSite`, `getPageResult` call
- Cascades into `generateMetadata`, `sitemap`, `robots`, every page render
- Cannot be caught by TypeScript alone — most edges run on `any`-shaped Strapi data

## Current state (HEAD `94d7996`)

Index matches HEAD. Working tree is clean — no active modifications to the normalization pipeline.

## Recommendation

Write a fixture-based integration test (real Strapi response → expected DTO) that locks the input/output contract. Fixtures exist in `frontend/src/lib/cms/__tests__/__fixtures__/` for this purpose.

## Related

- [[page-rendering]] — primary consumer
- [[generate-metadata]] — secondary consumer
- [[revalidate-webhook]] — also depends on the gateway
- [[../modules/cms]] — module overview
