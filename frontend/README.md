# MyORL Next.js Frontend

This is the App Router frontend scaffold for the Strapi-backed MyORL content migration.

## Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` to `.env.local` and set:

- `STRAPI_URL`
- `STRAPI_TOKEN`
- `NEXT_PUBLIC_SITE_URL`
- `STRAPI_REVALIDATE_SECRET`

## CMS Contract

The frontend reads Strapi only through `src/lib/cms/*`. Page renderers consume normalized DTOs and must not import raw Strapi payload shapes directly.

- URLs are flat locale routes: `/{locale}/{slug}`.
- Navigation uses `Page.slug`, not Strapi navigation `path`.
- `pageBlocks`, `templateId`, and migration fields are internal-only.
- `404`, `search-results`, `sitemap`, and robots are frontend-native.

Run `npm run build` before promoting frontend changes.
