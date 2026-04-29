---
module: Navigation
symbols: 10
cohesion: 81%
source: gitnexus://repo/gemini-export/cluster/Navigation
---

# Module: Navigation — page entry points + site header

> The thin shell between Next.js routing and the CMS gateway. Holds `generateMetadata`, page entry components, and the navigation tree helpers.

## Members (10)

| Symbol | File |
| --- | --- |
| `LocaleHomePage` | `frontend/src/app/[locale]/page.tsx` |
| `CmsPage` | `frontend/src/app/[locale]/[slug]/page.tsx` |
| `generateMetadata` (locale) | `frontend/src/app/[locale]/page.tsx` |
| `generateMetadata` (slug) | `frontend/src/app/[locale]/[slug]/page.tsx` |
| `toPageMetadata` | `frontend/src/lib/cms/metadata.ts` |
| `getPage` | `frontend/src/lib/cms/cms-api.ts` |
| `findAppointmentHref` | `frontend/src/lib/navigation/appointment-href.ts` |
| `findInTree` | `frontend/src/lib/navigation/appointment-href.ts` |
| `SiteHeader` | `frontend/src/components/SiteHeader.tsx` |
| `isLocale` | `frontend/src/lib/cms/types/common.ts` |

## Why the cluster spans pages + lib + components

Three things ended up in the same community because the call edges between them are dense:

1. **Page entry points** (`LocaleHomePage`, `CmsPage`) call into…
2. **CMS reads** (`getPage`) and **metadata builders** (`toPageMetadata`, `generateMetadata`) which call…
3. **Navigation helpers** (`findAppointmentHref`, `findInTree`) and the **header** (`SiteHeader`) which the layout renders.

The underlying truth: **navigation state is computed once per request and threaded through both the page and the header.**

## Processes that originate here

Many of the most-affected flows in the [[../audits/audit-2026-04-30|audit]] start at this module's symbols:

- `LocaleHomePage → *` (4 flows): `→ GetGateway`, `→ One`, `→ ToCmsPageError`, `→ FindInTree`
- `CmsPage → *` (3 flows): `→ GetGateway`, `→ One`, `→ ToCmsPageError`
- `GenerateMetadata → *` (12 flows across both routes)
- `SiteHeader → FindInTree`

See [[../processes/page-rendering]] for the canonical entry trace.

## Cohesion: 81%

Healthy. Leaks are mostly edges to `Cms` (data fetch) — expected given this module is the consumer side of the CMS contract.

## Active risk (2026-04-30)

Every entry symbol in this module is touched in the working tree:
- `LocaleHomePage`, `CmsPage`, both `generateMetadata`, `SiteHeader`

Combined with the `getCmsConfig` change in [[cms]], any cross-cutting change to env or DTO shape ripples through every page render.

## Related

- [[cms]] — the gateway this module consumes
- [[internal]] — site-header internals (MegaMenu, drawer, hooks)
- [[../processes/page-rendering]]
- [[../audits/audit-2026-04-30]]
