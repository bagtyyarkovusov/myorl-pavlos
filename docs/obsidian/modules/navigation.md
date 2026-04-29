---
module: Navigation
symbols: <5 (merged into Cms cluster)
cohesion: N/A (subsumed by Cms)
source: gitnexus_cypher (cluster="Navigation" — no results ≥5)
---

# Module: Navigation — page entry points + site header

> **Note (2026-04-30):** The `Navigation` cluster has been absorbed into the `Cms` community after re-indexing. Route entry points (`generateMetadata`, `LocaleHomePage`, `CmsPage`, `sitemap`, `robots`, `SiteHeader`) now live in the `Cms` cluster alongside the gateway and DTO layer.

## What was here (pre-cleanup)

The cluster previously contained 10 symbols spanning pages, lib, and components:

| Symbol | File | Current cluster |
| --- | --- | --- |
| `CmsPage` | `frontend/src/app/[locale]/[slug]/page.tsx` | [[cms]] |
| `generateMetadata` | `frontend/src/app/[locale]/[slug]/page.tsx` | [[cms]] |
| `generateStaticParams` | `frontend/src/app/[locale]/[slug]/page.tsx` | [[cms]] |
| `LocaleLayout` | `frontend/src/app/[locale]/layout.tsx` | [[cms]] |
| `LocaleHomePage` | `frontend/src/app/[locale]/page.tsx` | [[cms]] |
| `generateMetadata` | `frontend/src/app/[locale]/page.tsx` | [[cms]] |
| `sitemap` | `frontend/src/app/sitemap.ts` | [[cms]] |
| `robots` | `frontend/src/app/robots.ts` | [[cms]] |
| `GET` | `frontend/src/app/api/health/route.ts` | [[cms]] |
| `SiteHeader` | `frontend/src/components/SiteHeader.tsx` | [[cms]] |

## Why they merged into Cms

After removing `_archived` and `artifacts/design-references/` noise from the index, the community detector restructured the graph. These symbols now share enough `CALLS`/`IMPORTS` edges with the CMS gateway (`getPage`, `getSite`, `createCmsGateway`) that they form a single large community.

## Processes that originate here

| Process | Steps | See |
| --- | --- | --- |
| `LocaleLayout → _build_url` | 7 | [[../processes/locale-layout]] |
| `LocaleLayout → NormalizeOptionalText` | 5 | [[../processes/locale-layout]] |
| `LocaleLayout → HrefForLocaleSlug` | 5 | [[../processes/locale-layout]] |
| `LocaleHomePage → GetGateway` | 4 | [[../processes/page-rendering]] |
| `CmsPage → GetGateway` | 4 | [[../processes/page-rendering]] |
| `GenerateMetadata → *` | 4 (×12) | [[../processes/generate-metadata]] |
| `SiteHeaderClient → _build_url` | 5 | [[../processes/site-header]] |

## Related

- [[cms]] — parent cluster
- [[internal]] — site-header internals (MegaMenu, hooks)
- [[page-layouts]] — page shape components
- [[00-MOC-Frontend]] — frontend entry points
