---
module: Backend API
source: code reading (backend/src/api/)
---

# Deep dive: Backend API (Strapi CMS)

> The Strapi v4 backend exposes three API collections: `page` (CMS pages), `global` (singleton site config), and `tag` (taxonomy). All use factory-generated controllers, services, and routes.

## API Collections

### `api::page.page` — CMS Pages

| Layer | File | Implementation |
| --- | --- | --- |
| Content type | `backend/src/api/page/content-types/page/schema.json` | Page schema: slug, locale, sections (dynamic zone), SEO, layout |
| Controller | `backend/src/api/page/controllers/page.ts` | `factories.createCoreController` — standard CRUD |
| Service | `backend/src/api/page/services/page.ts` | `factories.createCoreService` — standard CRUD |
| Routes | `backend/src/api/page/routes/page.ts` | `factories.createCoreRouter` — REST endpoints |

**REST endpoints:** `GET/POST/PUT/DELETE /api/pages`

The page content type uses a **dynamic zone** for sections, allowing editors to mix and match section types (accordion, contact, faq, gallery, promo-slider, etc.) in any order. Sections reference Strapi components from `backend/src/components/sections/`.

### `api::global` — Global Singleton

| Layer | File | Implementation |
| --- | --- | --- |
| Content type | `backend/src/api/global/content-types/global/schema.json` | Singleton: navigation, footer, site config, SEO defaults |
| Controller | `backend/src/api/global/controllers/global.ts` | `factories.createCoreController` |
| Service | `backend/src/api/global/services/global.ts` | `factories.createCoreService` |
| Routes | `backend/src/api/global/routes/global.ts` | `factories.createCoreRouter` |

**REST endpoint:** `GET/PUT /api/global`

The global singleton stores site-wide configuration. The frontend reads it via `getSite()` in `frontend/src/lib/cms/cms-api.ts` to render navigation, footer, and default SEO metadata.

### `api::tag` — Taxonomy Tags

| Layer | File | Implementation |
| --- | --- | --- |
| Content type | `backend/src/api/tag/content-types/tag/schema.json` | Tag schema: slug, locale, label |
| Controller | `backend/src/api/tag/controllers/tag.ts` | `factories.createCoreController` |
| Service | `backend/src/api/tag/services/tag.ts` | `factories.createCoreService` |
| Routes | `backend/src/api/tag/routes/tag.ts` | `factories.createCoreRouter` |

**REST endpoint:** `GET/POST/PUT/DELETE /api/tags`

Tags provide a lightweight taxonomy for grouping CMS pages.

## Configuration

| File | Purpose |
| --- | --- |
| `backend/config/server.ts` | Host, port, environment |
| `backend/config/database.ts` | PostgreSQL connection |
| `backend/config/admin.ts` | Admin panel configuration |
| `backend/config/plugins.ts` | Plugin configurations (navigation, etc.) |
| `backend/config/middlewares.ts` | Global middleware stack |
| `backend/config/api.ts` | API-level settings |

## Bootstrap lifecycle

Strapi runs three seed scripts on bootstrap:

1. `content-manager-config.ts` — Seeds list/edit layouts and field metadata for the content-manager plugin
2. `navigation-config.ts` — Seeds/restores the navigation plugin configuration
3. `navigation-permissions.ts` — Seeds navigation plugin role permissions

See [[../modules/bootstrap]].

## Components (22 reusable schemas)

See [[strapi-components]].

## Related

- [[../modules/cms]] — Next.js gateway layer that consumes this API
- [[../modules/bootstrap]] — Strapi seeders
- [[strapi-components]] — component schema catalog
- [[00-MOC-Backend]] — backend entry points
