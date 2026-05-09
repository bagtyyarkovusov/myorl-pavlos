# Backend Architecture

> Strapi 5.42.1 headless CMS with three content types, 22 reusable components, and PostgreSQL storage.

## Content Types

### `page` — CMS Pages

Collection type with draft-and-publish, full i18n, and a DynamicZone for sections.

**Key fields:**

| Field | Type | Localized | Purpose |
|-------|------|-----------|---------|
| `title` | string | ✅ | Page title |
| `menuTitle` | string | ✅ | Shorter nav label (ADR-004) |
| `slug` | uid | ✅ | URL slug |
| `content` | richtext | ✅ | Main body content |
| `excerpt` | text | ✅ | Short description |
| `seo` | component(shared.seo) | ✅ | SEO metadata |
| `parentPage` | relation | ✅ | Navigation hierarchy |
| `tags` | relation | ✅ | Taxonomy |
| `pageType` | enumeration | ✅ | `home`, `content`, `faq`, `accordion`, `tabs`, `gallery`, `contact`, `system` |
| `layoutVariant` | enumeration | ✅ | Visual layout selector (20 variants) |
| `featuredImage` | media | ✅ | Hero image |
| `pageSections` | dynamiczone | ✅ | Section content (ADR-006) |
| `footerCategory` | enumeration | ❌ | `services`, `patients`, `company`, `none` |

**DynamicZone components (`pageSections`):**
- `sections.promo-slider`
- `sections.linked-resources`
- `sections.social-links`
- `sections.video`
- `sections.advantages`
- `sections.accordion`
- `sections.faq`
- `sections.tabs`
- `sections.gallery`
- `sections.contact`

### `global` — Site Singleton

Single-record content type for site-wide config:
- Navigation structure
- Footer content
- Default SEO settings
- Site-wide social links

### `tag` — Taxonomy

Lightweight taxonomy for grouping pages:
- `slug` (uid)
- `name` (string)
- `locale` (i18n)

## Component Schemas

22 reusable components in `backend/src/components/`:

### Items (11) — repeatable child components

`items.accordion-item`, `items.advantage`, `items.clinic`, `items.contact-detail`, `items.faq-item`, `items.gallery-item`, `items.linked-resource`, `items.promo-slide`, `items.social-link`, `items.tab-item`, `items.video`

### Sections (10) — top-level DynamicZone components

`sections.accordion`, `sections.advantages`, `sections.contact`, `sections.faq`, `sections.gallery`, `sections.linked-resources`, `sections.promo-slider`, `sections.social-links`, `sections.tabs`, `sections.video`

### Shared (1) — cross-cutting

`shared.seo` — reused by `page` and `global`

See [strapi-components-deep-dive.md](strapi-components-deep-dive.md) for full schema details.

## API Layer

All collections use Strapi factory-generated CRUD:

```typescript
// backend/src/api/page/controllers/page.ts
export default factories.createCoreController('api::page.page');
```

**REST endpoints:**
- `GET /api/pages` — list pages
- `GET /api/pages/:id` — single page
- `GET /api/global` — site config
- `GET /api/tags` — list tags

The frontend consumes these through `frontend/src/lib/cms/cms-gateway.ts` with deep population queries.

## Configuration

| File | Purpose |
|------|---------|
| `backend/config/database.ts` | PostgreSQL connection (env-driven) |
| `backend/config/server.ts` | Host, port, proxy settings |
| `backend/config/admin.ts` | Admin panel config |
| `backend/config/plugins.ts` | Navigation plugin, users-permissions |
| `backend/config/middlewares.ts` | CORS, security, compression |

## Plugins

- `@strapi/plugin-users-permissions` — Authentication & authorization
- `@strapi/plugin-cloud` — Strapi Cloud integration
- `strapi-plugin-navigation` — Structured navigation trees

## Bootstrap Lifecycle

Three seed scripts run on `strapi develop`/`start`:

1. `content-manager-config.ts` — Content Manager plugin layout defaults
2. `navigation-config.ts` — Navigation plugin structure
3. `navigation-permissions.ts` — Role permissions for navigation

## Database

- **Primary**: PostgreSQL 16 (dev, rehearsal, production)
- **Fallback**: SQLite (`backend/.tmp/data.db`) for no-Docker local dev only (ADR-008)
- **Migrations**: Forward-only SQL migrations in `backend/database/postgres-migrations/` (ADR-003)

## Related

- [backend-api-deep-dive.md](backend-api-deep-dive.md) — Full API architecture
- [strapi-components-deep-dive.md](strapi-components-deep-dive.md) — 22 component schemas
- [cms-module.md](cms-module.md) — Frontend DTO layer that consumes this API
