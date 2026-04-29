---
process: Strapi response normalization
type: intra_community
source: gitnexus_query + cypher (process="FetchAllImpl → FlattenAttributes")
---

# Process: CMS gateway normalization pipeline

> The shared 5-step chain that every Strapi read goes through to produce a clean DTO. Lives entirely inside `frontend/src/lib/cms/cms-gateway.ts`.

## Steps (`FetchAllImpl → FlattenAttributes`)

| Step | Symbol | Role |
| --- | --- | --- |
| 1 | `fetchAllImpl` | Entry — fetches a list from Strapi REST |
| 2 | `unwrapStrapiData` | Strips top-level `{data, meta}` envelope |
| 3 | `normalizeEntity` | Per-entity shaping |
| 4 | `deepUnwrapStrapiRelations` | Recursively unwraps `{data: ...}` relation wrappers |
| 5 | `flattenAttributes` | Flattens `{id, attributes: {...}}` → `{id, ...attrs}` |

All five symbols are in `frontend/src/lib/cms/cms-gateway.ts`.

## Sibling flows

The same tail (steps 2–5) is reused by two more indexed processes:

- `FetchOneImpl → FlattenAttributes` — single-entity fetch (used by [[page-rendering]] step 4)
- `CreateCmsGateway → FlattenAttributes` — gateway construction triggers eager normalization on a probe response

## Why this matters

This pipeline is the **single contract translator** between Strapi v4's nested response shape and the rest of the Next.js app. The DTO layer (`page-normalizer.ts`, `metadata.ts`, `social.ts`) consumes the output of step 5 and assumes flat attributes.

Breaking any one of these steps:
- Breaks every `getPage`, `getSite`, `getPageResult` call
- Cascades into `generateMetadata`, `sitemap`, `robots`, every page render
- Cannot be caught by TypeScript alone — most edges run on `any`-shaped Strapi data

## Active risk (2026-04-30)

**All four downstream symbols** (`unwrapStrapiData`, `normalizeEntity`, `deepUnwrapStrapiRelations`, `flattenAttributes`) are simultaneously touched in the working tree. This is the single most dangerous part of the WIP — see [[../audits/audit-2026-04-30#1 Uncommitted change risk CRITICAL]] and the `flattenAttributes` impact note in [[../audits/audit-2026-04-30#High-impact symbols]].

Recommendation: write a fixture-based integration test (real Strapi response → expected DTO) that locks the input/output before merging.

## Related

- [[page-rendering]] — upstream caller
- [[revalidate-webhook]] — also depends on the gateway
- [[../modules/cms]] — module overview
