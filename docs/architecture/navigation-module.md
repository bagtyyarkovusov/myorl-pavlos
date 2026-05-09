# Module: Navigation — page entry points + site header

> Route entry points, navigation data, and site header. All navigation symbols live alongside the CMS gateway and DTO layer.

## Code location

- `frontend/src/app/[locale]/layout.tsx` — LocaleLayout wrapper
- `frontend/src/app/[locale]/page.tsx` — LocaleHomePage
- `frontend/src/app/[locale]/[slug]/page.tsx` — CmsPage + generateMetadata + generateStaticParams
- `frontend/src/app/sitemap.ts` — sitemap generator
- `frontend/src/app/robots.ts` — robots.txt generator
- `frontend/src/components/SiteHeader.tsx` — server component nav fetcher
- `frontend/src/lib/navigation/` — appointment-href resolver

## Members

| Symbol | File | Purpose |
| --- | --- | --- |
| `LocaleLayout` | `frontend/src/app/[locale]/layout.tsx` | Locale wrapper, metadata, font loading |
| `CmsPage` | `frontend/src/app/[locale]/[slug]/page.tsx` | Dynamic route page component |
| `LocaleHomePage` | `frontend/src/app/[locale]/page.tsx` | Homepage route component |
| `generateMetadata` | `frontend/src/app/[locale]/[slug]/page.tsx` | SEO metadata for CMS pages |
| `generateStaticParams` | `frontend/src/app/[locale]/[slug]/page.tsx` | SSG param generation |
| `sitemap` | `frontend/src/app/sitemap.ts` | XML sitemap |
| `robots` | `frontend/src/app/robots.ts` | robots.txt |
| `SiteHeader` | `frontend/src/components/SiteHeader.tsx` | Server component, reads Strapi nav |
| `buildNavigationTree` | `frontend/src/lib/cms/navigation.ts` | Builds tree from flat pages |
| `findAppointmentHref` | `frontend/src/lib/navigation/appointment-href.ts` | Finds appointment URL in nav tree |

## Related

- [cms-module.md](cms-module.md) — gateway and navigation data
- [site-header-deep-dive.md](site-header-deep-dive.md) — header component tree
- [page-layouts-module.md](page-layouts-module.md) — page shape components
- [frontend-moc.md](frontend-moc.md) — frontend entry points
