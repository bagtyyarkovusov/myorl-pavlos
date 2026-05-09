# MOC: Frontend (Next.js App Router)

> Quick entry points for routes, content loading, localization, and components. For decisions, use [README.md](README.md) and ADRs.

## CMS and DTO layer (read Strapi only here)

- [../../frontend/src/lib/cms/client.ts](../../frontend/src/lib/cms/client.ts) — API client
- [../../frontend/src/lib/cms/dto.ts](../../frontend/src/lib/cms/dto.ts) — DTO re-exports
- [../../frontend/src/lib/cms/page-normalizer.ts](../../frontend/src/lib/cms/page-normalizer.ts) — Page DTO normalizer
- [../../frontend/src/lib/cms/section-normalizer.ts](../../frontend/src/lib/cms/section-normalizer.ts) — Section normalizer
- [../../frontend/src/lib/cms/navigation.ts](../../frontend/src/lib/cms/navigation.ts) — Navigation tree builder
- [../../frontend/src/lib/cms/cms-gateway.ts](../../frontend/src/lib/cms/cms-gateway.ts) — Strapi normalization pipeline

## App structure

- [../../frontend/src/app/](../../frontend/src/app/) — App Router: layouts, `loading.tsx`, `error.tsx`, locale segments
- [../../frontend/src/components/](../../frontend/src/components/) — shared UI, page layouts, sections, site header, home sections

## Components

| Area | Doc |
| --- | --- |
| CMS gateway + DTOs | [cms-module.md](cms-module.md) |
| Design system + HTML sanitization | [components-module.md](components-module.md) |
| Site header internals | [site-header-deep-dive.md](site-header-deep-dive.md) |
| Page layouts | [page-layouts-module.md](page-layouts-module.md) |
| Sections renderer | [sections-module.md](sections-module.md) |
| Home sections | [home-sections-deep-dive.md](home-sections-deep-dive.md) |
| I18n / homepage copy | [i18n-module.md](i18n-module.md) |

## Testing

- 28 test files covering components, hooks, CMS gateway, API routes
- [testing-strategy-deep-dive.md](testing-strategy-deep-dive.md)

## i18n

- [../../frontend/src/lib/i18n/](../../frontend/src/lib/i18n/) — e.g. `home`, `header` copy helpers
- ADR-004: [../adr/ADR-004-flat-locale-routes-and-localized-navigation-labels.md](../adr/ADR-004-flat-locale-routes-and-localized-navigation-labels.md)

## Product / CMS contract reminder

- Flat locale routes: `/{locale}/{slug}` (see [../../frontend/README.md](../../frontend/README.md) and ADR-004).
- [../../frontend/STRAPI_HOME_CHECKLIST.md](../../frontend/STRAPI_HOME_CHECKLIST.md) — Strapi home checklist

**Related docs:** [testing-strategy-deep-dive.md](testing-strategy-deep-dive.md), [cms-module.md](cms-module.md)
