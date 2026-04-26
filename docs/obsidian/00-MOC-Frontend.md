# MOC: Frontend (Next.js App Router)

> Quick entry points for routes, content loading, and localization. For decisions, use [00-MOC-Architecture](00-MOC-Architecture.md) and ADRs.

## CMS and DTO layer (read Strapi only here)

- [../../frontend/src/lib/cms/client.ts](../../frontend/src/lib/cms/client.ts) — API client
- [../../frontend/src/lib/cms/dto.ts](../../frontend/src/lib/cms/dto.ts) — DTOs
- [../../frontend/src/lib/cms/page-normalizer.ts](../../frontend/src/lib/cms/page-normalizer.ts)
- [../../frontend/src/lib/cms/sections.ts](../../frontend/src/lib/cms/sections.ts) + [../../frontend/src/lib/cms/section-normalizers.ts](../../frontend/src/lib/cms/section-normalizers.ts)
- [../../frontend/src/lib/cms/navigation.ts](../../frontend/src/lib/cms/navigation.ts)

## App structure

- [../../frontend/src/app/](../../frontend/src/app/) — App Router: layouts, `loading.tsx`, `error.tsx`, locale segments
- [../../frontend/src/components/](../../frontend/src/components/) — shared UI, page layouts, sections

## i18n

- [../../frontend/src/lib/i18n/](../../frontend/src/lib/i18n/) — e.g. `home` copy helpers
- ADR-004: [../adr/ADR-004-flat-locale-routes-and-localized-navigation-labels.md](../adr/ADR-004-flat-locale-routes-and-localized-navigation-labels.md)

## Product / CMS contract reminder

- Flat locale routes: `/{locale}/{slug}` (see [../../frontend/README.md](../../frontend/README.md) and ADR-004).
- [../../frontend/STRAPI_HOME_CHECKLIST.md](../../frontend/STRAPI_HOME_CHECKLIST.md) — Strapi home checklist (if still in use for content QA)

**Related docs:** [../nextjs-content-readiness.md](../nextjs-content-readiness.md), [../NEXTJS_SLUG_REDIRECTS_REMINDER.md](../NEXTJS_SLUG_REDIRECTS_REMINDER.md)
