---
process: GenerateMetadata
type: cross_community
source: gitnexus_cypher + context (process="GenerateMetadata → *")
---

# Process: GenerateMetadata — SEO metadata generation

> Two `generateMetadata` functions (homepage + CMS pages) that produce Next.js `Metadata` objects from Strapi content. Both follow the same 4-step pattern.

## Indexed flows (12 total)

The same flow runs for two entry points:

| Entry | Routes | Flows |
| --- | --- | --- |
| `generateMetadata` (homepage) | `/[locale]/page.tsx` | 6 flows: `GetGateway`, `One`, `ToCmsPageError`, `NormalizeOrigin`, `NormalizeOptionalText`, `HrefForLocaleSlug` |
| `generateMetadata` (CMS pages) | `/[locale]/[slug]/page.tsx` | 6 flows: same destinations |

## Steps (`GenerateMetadata → One`)

| Step | Symbol | File | Role |
| --- | --- | --- | --- |
| 1 | `generateMetadata` | `frontend/src/app/[locale]/page.tsx` or `[slug]/page.tsx` | Entry — Next.js metadata resolver |
| 2 | `getGateway` | `frontend/src/lib/cms/cms-api.ts` | Obtains gateway instance |
| 3 | `getPage` or `getSite` | `frontend/src/lib/cms/cms-api.ts` | Fetches CMS page or global singleton |
| 4 | `one` (gateway read) | `frontend/src/lib/cms/cms-gateway.ts` | Single-entity fetch via `fetchOneImpl` |

Additional branches:
- `GenerateMetadata → NormalizeOrigin` — media URL normalization
- `GenerateMetadata → NormalizeOptionalText` — text sanitization
- `GenerateMetadata → HrefForLocaleSlug` — URL construction for locale alternates
- `GenerateMetadata → ToCmsPageError` — error handling path

## What it produces

For a CMS page:
```ts
{
  title, description, openGraph, alternates: { canonical, languages },
  robots: { index, follow }
}
```

For the homepage: same shape but sourced from the global singleton (site title/description).

## Dependencies

- `getCmsConfig` — CMS origin + token (CRITICAL chokepoint)
- `toPageMetadata` — DTO → Next.js Metadata transform
- `hrefForLocaleSlug` — locale-alternate URL construction
- `normalizeOrigin` — media URL normalization for OG images

## Related

- [[page-rendering]] — sibling flow (data fetching for the page body)
- [[locale-layout]] — parent layout wrapping
- [[../modules/cms]] — module overview
