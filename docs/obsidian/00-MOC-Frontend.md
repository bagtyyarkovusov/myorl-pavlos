# MOC: Frontend (Next.js App Router)

> Quick entry points for routes, content loading, localization, and components. For decisions, use [00-MOC-Architecture](00-MOC-Architecture.md) and ADRs.

## CMS and DTO layer (read Strapi only here)

- [../../frontend/src/lib/cms/client.ts](../../frontend/src/lib/cms/client.ts) — API client
- [../../frontend/src/lib/cms/dto.ts](../../frontend/src/lib/cms/dto.ts) — DTOs
- [../../frontend/src/lib/cms/page-normalizer.ts](../../frontend/src/lib/cms/page-normalizer.ts)
- [../../frontend/src/lib/cms/sections.ts](../../frontend/src/lib/cms/sections.ts) + [../../frontend/src/lib/cms/section-normalizers.ts](../../frontend/src/lib/cms/section-normalizers.ts)
- [../../frontend/src/lib/cms/navigation.ts](../../frontend/src/lib/cms/navigation.ts)
- [../../frontend/src/lib/cms/cms-gateway.ts](../../frontend/src/lib/cms/cms-gateway.ts) — Strapi normalization pipeline

## App structure

- [../../frontend/src/app/](../../frontend/src/app/) — App Router: layouts, `loading.tsx`, `error.tsx`, locale segments
- [../../frontend/src/components/](../../frontend/src/components/) — shared UI, page layouts, sections, site header, home sections

## Components

| Area | Doc |
| --- | --- |
| CMS gateway + DTOs | [[modules/cms]] |
| Design system + HTML sanitization | [[modules/components]] |
| Site header internals | [[modules/internal]], [[deep-dives/site-header-internals]] |
| Page layouts | [[modules/page-layouts]] |
| Sections renderer | [[modules/sections]] |
| Home sections | [[deep-dives/home-sections]] |
| I18n / homepage copy | [[modules/i18n]] |
| Revalidation webhook | [[modules/revalidate]] |

## Key processes

| Process | Doc |
| --- | --- |
| `LocaleLayout` (layout wrapper) | [[processes/locale-layout]] |
| `CmsPage` / `LocaleHomePage` (page rendering) | [[processes/page-rendering]] |
| CMS normalization pipeline | [[processes/cms-gateway-pipeline]] |
| `generateMetadata` (SEO) | [[processes/generate-metadata]] |
| Site header rendering | [[processes/site-header]] |
| `POST /api/revalidate` | [[processes/revalidate-webhook]] |

## Testing

- 28 test files covering components, hooks, CMS gateway, API routes
- [[deep-dives/testing-strategy]]

## i18n

- [../../frontend/src/lib/i18n/](../../frontend/src/lib/i18n/) — e.g. `home`, `header` copy helpers
- ADR-004: [../adr/ADR-004-flat-locale-routes-and-localized-navigation-labels.md](../adr/ADR-004-flat-locale-routes-and-localized-navigation-labels.md)

## Product / CMS contract reminder

- Flat locale routes: `/{locale}/{slug}` (see [../../frontend/README.md](../../frontend/README.md) and ADR-004).
- [../../frontend/STRAPI_HOME_CHECKLIST.md](../../frontend/STRAPI_HOME_CHECKLIST.md) — Strapi home checklist

**Related docs:** [../nextjs-content-readiness.md](../nextjs-content-readiness.md), [../NEXTJS_SLUG_REDIRECTS_REMINDER.md](../NEXTJS_SLUG_REDIRECTS_REMINDER.md)
