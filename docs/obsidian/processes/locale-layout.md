---
process: LocaleLayout
type: cross_community
source: gitnexus_cypher + context (process="LocaleLayout → *")
---

# Process: LocaleLayout — locale-aware layout rendering

> The root layout wrapper for every `/[locale]` route. Fetches global site configuration (navigation, footer) and injects locale context before rendering child pages.

## Steps (`LocaleLayout → NormalizeOptionalText`)

| Step | Symbol | File | Role |
| --- | --- | --- | --- |
| 1 | `LocaleLayout` | `frontend/src/app/[locale]/layout.tsx` | Entry — Next.js layout for `[locale]` segment |
| 2 | `getSite` | `frontend/src/lib/cms/cms-api.ts` | Fetches global singleton (navigation, footer, site config) |
| 3 | `getGateway` | `frontend/src/lib/cms/cms-api.ts` | Obtains the CMS gateway instance |
| 4 | `createCmsGateway` | `frontend/src/lib/cms/cms-gateway.ts` | Gateway factory (resolves env + builds HTTP client) |
| 5 | `normalizeOptionalText` | `frontend/src/lib/cms/page-normalizer.ts` | Sanitizes optional text fields in site config |

## Indexed flows (6 total)

| Process | Steps | Type |
| --- | --- | --- |
| `LocaleLayout → _build_url` | 7 | cross_community |
| `LocaleLayout → NormalizeOptionalText` | 5 | cross_community |
| `LocaleLayout → HrefForLocaleSlug` | 5 | cross_community |
| `LocaleLayout → GetGateway` | 3 | cross_community |
| `LocaleLayout → All` | 3 | cross_community |
| `LocaleLayout → FetchOne` | 3 | cross_community |

The 7-step variant (`→ _build_url`) is the longest active execution flow in the codebase. It traces through URL construction for navigation items, passing through `hrefForPage` → `createCmsGateway` → `buildUrl` → portal resolution.

## Consumer impact

`LocaleLayout` has **no upstream callers** — it is a framework entry point (Next.js layout component). However, it has **6 downstream Callers** via processes:
- Every page under `/[locale]/` calls this layout
- `locale/page.tsx` (homepage)
- `locale/[slug]/page.tsx` (CMS pages)
- Both `generateMetadata` variants

## What it depends on

- `getSite` → `getGateway` → `createCmsGateway` → `getCmsConfig` (chokepoint — see [[../modules/cms]])
- `isLocale` (type guard for locale validation)
- `hrefForLocaleSlug`, `hrefForPage` (URL builders for navigation)

## Related

- [[page-rendering]] — child page rendering that happens inside this layout
- [[generate-metadata]] — metadata generation that depends on the same gateway
- [[../modules/cms]] — module overview
- [[../modules/i18n]] — locale strings
