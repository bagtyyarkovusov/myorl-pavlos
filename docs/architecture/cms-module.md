# Module: CMS — Strapi gateway + DTO layer

> The contract boundary between Next.js and Strapi. Per ADR-001, no raw Strapi shapes are allowed outside this directory.

## Code location

- [../../../frontend/src/lib/cms/](../../../frontend/src/lib/cms/) — gateway, DTOs, normalizers, types, env, errors
- [../../../frontend/src/app/](../../../frontend/src/app/) — route handlers (`[locale]/page.tsx`, `[locale]/[slug]/page.tsx`, `layout.tsx`, `sitemap.ts`, `robots.ts`, `/api/health`)
- [../../../frontend/src/components/SiteHeader.tsx](../../../frontend/src/components/SiteHeader.tsx) — navigation header
- [../../../frontend/src/lib/navigation/](../../../frontend/src/lib/navigation/) — appointment-href resolver

## Public surface

| Symbol | File | Purpose |
| --- | --- | --- |
| `createCmsGateway` | `cms-gateway.ts` | Factory: returns `{ one, all, fetchOne, fetchAll }` over Strapi REST |
| `getCmsConfig` | `env.ts` | Resolves Strapi origin + token from env |
| `getPage`, `getSite`, `getPageResult`, `getSitemapPages` | `cms-api.ts` | High-level reads consumed by route handlers |
| `toPageDTO`, `toMediaDTO`, `toSemanticSections`, `toSeoDTO`, `toTagDTO` | `page-normalizer.ts` | Strapi → DTO flattening |
| `toPageMetadata` | `metadata.ts` | DTO → Next.js `Metadata` |
| `hrefForPage`, `hrefForLocaleSlug` | `navigation.ts` | URL builders |
| `deriveSocialPlatform`, `toSocialLinkDTO` | `social.ts` | Social-link handling |
| `normalizeOrigin`, `normalizeOptionalText`, `normalizePriority` | `env.ts` / `page-normalizer.ts` | Shared sanitizers |
| `findAppointmentHref`, `findInTree` | `navigation/appointment-href.ts` | Tree-walking URL resolver |

## Internal pipeline

The Strapi-response normalization chain:

```
fetchAllImpl / fetchOneImpl
   → unwrapStrapiData
       → normalizeEntity
           → deepUnwrapStrapiRelations
               → flattenAttributes
```

## Related

- [frontend-moc.md](frontend-moc.md) — frontend entry points
- [page-layouts-module.md](page-layouts-module.md) — page shape components
- [sections-module.md](sections-module.md) — SectionRenderer dispatcher
- [navigation-module.md](navigation-module.md) — site header navigation
