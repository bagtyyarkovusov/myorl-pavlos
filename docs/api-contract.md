# API Contract — Strapi ↔ Next.js DTO Boundary

> This document defines the public contract between the Strapi 5 CMS backend and the Next.js 16 frontend. It implements the boundary described in [ADR-001](./adr/ADR-001-nextjs-semantic-dto-boundary.md).

## Version

**Current:** v1.0 — Last updated 2026-05-06

## Changelog

| Version | Date | Change |
|---------|------|--------|
| v1.0 | 2026-05-06 | Initial contract documentation. Reflects post-ADR-006 DynamicZone consolidation. |

---

## Overview

The frontend **never** consumes raw Strapi REST responses directly. All data passes through a server-side DTO boundary:

```
Strapi REST API
      │
      ▼
┌─────────────────┐
│  cms-gateway.ts │  ← fetch, retry, unwrap relations, Zod validation
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   cms-api.ts    │  ← getPage, getSite, getSitemapPages, React.cache
└────────┬────────┘
         │
         ▼
┌──────────────────────┐
│   cms-populate.ts    │  ← PAGE_POPULATE, NAVIGATION_POPULATE
├──────────────────────┤
│  page-normalizer.ts  │  ← toPageDTO, toMediaDTO
├──────────────────────┤
│ section-normalizer.ts│  ← toSemanticSections, toSectionDTO
│   (DTO Boundary)     │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│     PageDTO          │  ← typed, normalized, media URLs resolved
│   SectionDTO[]       │
└──────────────────────┘
```

## Endpoints

### Pages

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/pages` | List all pages (navigation, sitemap) |
| `GET` | `/api/pages?filters[slug][$eq]={slug}` | Fetch single page by slug |

**Query parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `locale` | `string` | Yes* | Content locale: `el` or `ru`. Defaults to default locale if omitted. |
| `populate` | `string \| object` | Yes* | Deep-populate nested relations and media. Use `PAGE_POPULATE` for full page renders. |
| `filters` | `object` | No | Strapi filter syntax (e.g. `{ slug: { $eq: "about" } }`). |
| `sort` | `string \| string[]` | No | Sort fields (e.g. `["menuIndex:asc", "slug:asc"]`). |
| `status` | `string` | No | Defaults to `published`. Drafts are never served in production. |

*\* Required for `getPage`; optional for `getSitemapPages`.*

### Global Settings

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/global` | Site-wide settings (address, phone, hours) |

**Query parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `locale` | `string` | Yes | Content locale: `el` or `ru`. |

---

## The Populate Contract

`PAGE_POPULATE` in `frontend/src/lib/cms/cms-populate.ts` is the **single source of truth** for what Strapi returns. If you add a new field to a section component, you **must** add it here or the API will not return it.

```ts
export const PAGE_POPULATE = {
  seo: { populate: ["ogImage"] },
  parentPage: { fields: ["documentId", "slug", "title"] },
  localizations: { fields: ["documentId", "locale", "slug", "title"] },
  tags: { fields: ["name", "slug"] },
  featuredImage: true,
  imageCenter: true,
  pageSections: {
    on: {
      "sections.promo-slider": {
        populate: {
          slides: {
            populate: {
              image: true,
              targetPage: { fields: ["documentId", "slug", "title", "excerpt"] },
            },
          },
        },
      },
      "sections.linked-resources": {
        populate: {
          items: {
            populate: {
              targetPage: {
                fields: ["documentId", "slug", "title"],
                populate: ["imageCenter", "featuredImage"],
              },
            },
          },
        },
      },
      "sections.social-links": { populate: { links: true } },
      "sections.video": {
        populate: { videos: { populate: ["thumbnail", "videoMp4", "videoWebm"] } },
      },
      "sections.advantages": { populate: { items: true } },
      "sections.accordion": { populate: { items: true } },
      "sections.faq": { populate: { items: true } },
      "sections.tabs": { populate: { items: true } },
      "sections.gallery": { populate: { items: { populate: ["image"] } } },
      "sections.contact": { populate: { details: true, clinics: true } },
    },
  },
} as const;
```

Two lighter populate presets exist:

| Preset | Populate | Used For |
|--------|----------|----------|
| `NAVIGATION_POPULATE` | `parentPage` only | Navigation tree building |
| `SITEMAP_POPULATE` | `seo`, `parentPage`, `localizations` | XML sitemap generation |

---

## DTO Types

### PageDTO

The canonical page object consumed by all layouts.

```ts
type PageDTO = {
  documentId: string;
  locale: Locale;               // "el" | "ru"
  slug: string;
  title: string;
  menuTitle?: string | null;
  navLabel: string;             // menuTitle ?? title
  pageType: PageType;
  layoutVariant: LayoutVariant;
  renderMode: RenderMode;       // "cms" | "frontend-native"
  seo: SeoDTO;
  seoTitle: string;             // seo.metaTitle ?? title
  content?: string | null;
  excerpt?: string | null;
  featuredImage?: MediaDTO | null;
  imageCenter?: MediaDTO | null;
  externalUrl?: string | null;
  isFolder: boolean;
  hideFromMenu: boolean;
  menuIndex: number;
  parentPage?: PageRefDTO | null;
  tags: TagDTO[];
  infoBlockBottom?: string | null;
  articleAuthor?: string | null;
  sources?: string | null;
  popUpClose?: string | null;
  alternateUrls: Partial<Record<Locale, string>>;
  sections: SectionDTO[];
};
```

### SectionDTO

Discriminated union of all 10 section component types.

```ts
type SectionDTO =
  | { __component: "sections.promo-slider"; heading?: string | null; intro?: string | null; slides: PromoSlideItemDTO[] }
  | { __component: "sections.linked-resources"; heading?: string | null; intro?: string | null; items: LinkedResourceItemDTO[] }
  | { __component: "sections.social-links"; heading?: string | null; intro?: string | null; links: SocialLinkItemDTO[] }
  | { __component: "sections.video"; heading?: string | null; intro?: string | null; videos: VideoItemDTO[] }
  | { __component: "sections.advantages"; heading?: string | null; intro?: string | null; items: AdvantageItemDTO[] }
  | { __component: "sections.accordion"; heading?: string | null; intro?: string | null; items: AccordionItemDTO[] }
  | { __component: "sections.faq"; heading?: string | null; intro?: string | null; items: FaqItemDTO[] }
  | { __component: "sections.tabs"; heading?: string | null; intro?: string | null; items: TabItemDTO[] }
  | { __component: "sections.gallery"; heading?: string | null; intro?: string | null; items: GalleryItemDTO[] }
  | { __component: "sections.contact"; heading?: string | null; intro?: string | null; details: ContactDetailDTO[]; clinics: ContactClinicDTO[] };
```

### GlobalSettingsDTO

```ts
type GlobalSettingsDTO = {
  locale: Locale;
  address: string | null;
  phoneTel: string | null;
  phoneDisplay: string | null;
  hours: string | null;
};
```

### NavigationNodeDTO

```ts
type NavigationNodeDTO = {
  documentId: string;
  locale: Locale;
  slug: string;
  title: string;
  menuTitle?: string | null;
  navLabel: string;
  menuIndex: number;
  hideFromMenu: boolean;
  parentPage?: PageRefDTO | null;
  externalUrl?: string | null;
  isFolder: boolean;
  excerpt?: string | null;
  href: string;                 // "/{locale}/{slug}"
  children: NavigationNodeDTO[];
};
```

> **Note:** Navigation is **computed**, not fetched. `getSite` loads all pages with `NAVIGATION_POPULATE`, then `buildNavigationTree` constructs the hierarchy from `parentPage` references.

---

## Error Contract

All CMS errors are normalized to a `CmsPageError` discriminated union:

```ts
type CmsPageError =
  | { kind: "not_found"; locale: Locale; slug: string; message: string }
  | { kind: "network"; message: string; cause?: unknown }
  | { kind: "timeout"; message: string }
  | { kind: "server_error"; status: number; message: string }
  | { kind: "validation"; issues?: { path: (string | number)[]; message: string }[]; raw?: unknown; message: string };
```

| Kind | HTTP Status | When |
|------|-------------|------|
| `not_found` | 404 | Page slug does not exist in the given locale. |
| `network` | — | DNS failure, connection refused, or unexpected transport error. |
| `timeout` | — | Request exceeded 10s (configurable). |
| `server_error` | 5xx | Strapi returned a non-2xx status (excluding 404). |
| `validation` | 200* | Zod schema validation failed on a successful response. |

Two facade functions handle errors differently:

- **`getPage(locale, slug)`** — throws on error; `not_found` triggers Next.js `notFound()`.
- **`getPageResult(locale, slug)`** — returns `PageResult` union; never throws.

---

## Request / Response Examples

### Fetch a single page

**Request:**

```http
GET /api/pages?filters[slug][$eq]=about&locale=el&populate[seo][populate][0]=ogImage&populate[parentPage][fields][0]=documentId&populate[localizations][fields][0]=documentId HTTP/1.1
Host: localhost:1337
Authorization: Bearer {STRAPI_TOKEN}
```

**Normalized response (PageDTO):**

```json
{
  "documentId": "abc123xy",
  "locale": "el",
  "slug": "about",
  "title": "About Us",
  "menuTitle": "About",
  "navLabel": "About",
  "pageType": "content",
  "layoutVariant": "standard",
  "renderMode": "cms",
  "seo": {
    "metaTitle": "About Us | myORL",
    "metaDescription": "Learn more about our clinic.",
    "canonicalUrl": null,
    "ogImage": { "url": "/uploads/og.jpg", "alternativeText": "Clinic", "width": 1200, "height": 630 },
    "robotsNoindex": false,
    "robotsNofollow": false,
    "sitemapExclude": false,
    "sitemapPriority": 0.5,
    "sitemapChangeFrequency": "monthly"
  },
  "seoTitle": "About Us | myORL",
  "content": "<p>We are a dental clinic.</p>",
  "excerpt": "About our clinic",
  "featuredImage": { "url": "/uploads/about.jpg", "alternativeText": "Clinic", "width": 800, "height": 600 },
  "imageCenter": null,
  "externalUrl": null,
  "isFolder": false,
  "hideFromMenu": false,
  "menuIndex": 3,
  "parentPage": { "documentId": "home123", "slug": "index", "title": "Home" },
  "tags": [{ "name": "General", "slug": "general" }],
  "infoBlockBottom": null,
  "articleAuthor": null,
  "sources": null,
  "popUpClose": null,
  "alternateUrls": { "el": "/el/about", "ru": "/ru/o-nas" },
  "sections": []
}
```

### Fetch site context (navigation + settings)

**Request:**

```http
GET /api/pages?locale=el&sort[0]=menuIndex%3Aasc&populate[parentPage][fields][0]=documentId HTTP/1.1
GET /api/global?locale=el HTTP/1.1
```

**Normalized response (SiteContext):**

```json
{
  "navigation": [
    {
      "documentId": "home123",
      "slug": "index",
      "title": "Home",
      "navLabel": "Home",
      "href": "/el",
      "menuIndex": 1,
      "children": []
    }
  ],
  "settings": {
    "locale": "el",
    "address": "123 Main St, Athens",
    "phoneTel": "+302101234567",
    "phoneDisplay": "+30 210 123 4567",
    "hours": "Mon-Fri 9:00-17:00"
  }
}
```

---

## Adding a New Section Component

When adding a new section to the CMS, update **all** of the following:

1. **Strapi component schema** — `backend/src/components/sections/{name}.json`
2. **`PAGE_POPULATE`** — add the component to `pageSections.on` with its populate tree
3. **`SectionComponent` union** — `frontend/src/lib/cms/types/sections.ts`
4. **DTO shape** — add the section type to `SectionDTO`
5. **Item DTOs** — define item types if the section has a collection
6. **Normalizer** — add case to `toSectionDTO` in `section-normalizer.ts`
7. **`KNOWN_SECTION_COMPONENTS`** — runtime validation set in `section-normalizer.ts`
8. **Renderers** — add cases to `DefaultSectionRenderer.tsx` and `HomeSectionRenderer.tsx`
9. **Grid defaults** — add column default in `sections/grid-defaults.ts` (if using `SectionGrid`)

---

## Source of Truth

| Layer | Source File |
|-------|-------------|
| Gateway interface | `frontend/src/lib/cms/cms-gateway.ts` |
| API facade | `frontend/src/lib/cms/cms-api.ts` |
| DTO normalizer | `frontend/src/lib/cms/page-normalizer.ts` |
| Populate constants | `frontend/src/lib/cms/cms-populate.ts` |
| Section normalizer | `frontend/src/lib/cms/section-normalizer.ts` |
| Type definitions | `frontend/src/lib/cms/types/*.ts` |
| Backend schema | `backend/src/api/*/content-types/*/schema.json` |
| Test fixtures | `frontend/src/lib/cms/__tests__/__fixtures__/*.json` |
