# Data Flow Architecture

> How CMS content travels from Strapi to the browser.

## Overview

```
Strapi Database
    │
    ▼
Strapi REST API (/api/pages, /api/global)
    │
    ▼
CMS Gateway (frontend/src/lib/cms/cms-gateway.ts)
    │ unwrapStrapiData → normalizeEntity → flattenAttributes
    ▼
DTO Normalizer (page-normalizer.ts)
    │ toPageDTO → toSemanticSections → toSeoDTO → toMediaDTO
    ▼
Page Component (CmsPage / LocaleHomePage)
    │
    ├─► generateMetadata → <head> SEO tags
    ├─► SiteHeader → navigation tree
    ├─► PageLayout → section iteration
    │       │
    │       ▼
    │   SectionRenderer
    │       │
    │       ├─► renderSectionBody (default context)
    │       └─► renderSectionBodyHome (home context)
    │
    └─► Footer → global footer data
```

## Step-by-Step Flow

### 1. Strapi REST Request

```typescript
// frontend/src/lib/cms/cms-api.ts
const page = await getPage({ slug, locale });
```

The gateway builds a deep-populate query:
```
GET /api/pages?filters[slug][$eq]=about&locale=el
  &populate[pageSections][populate]=*
  &populate[seo][populate][ogImage]=*
  &populate[featuredImage]=*
  &populate[parentPage]=true
  &populate[tags]=true
```

### 2. Response Normalization

Raw Strapi v5 responses have nested `data.attributes` wrappers:

```json
{
  "data": {
    "id": 1,
    "attributes": {
      "title": "About",
      "pageSections": [
        { "__component": "sections.accordion", "title": "...", "items": [...] }
      ]
    }
  }
}
```

The gateway pipeline unwraps this:
```
unwrapStrapiData(data) → { id, ...attributes }
normalizeEntity(entity) → recursively unwrap relations
deepUnwrapStrapiRelations(obj) → flatten nested data.attributes
flattenAttributes(obj) → final flat object
```

### 3. DTO Boundary

`toPageDTO()` (ADR-001) converts the flat normalized object into a typed `PageDTO`:

```typescript
export interface PageDTO {
  documentId: string;
  locale: Locale;
  slug: string;
  title: string;
  menuTitle: string | null;
  navLabel: string; // menuTitle ?? title (ADR-004)
  pageType: PageType;
  layoutVariant: LayoutVariant;
  renderMode: "cms" | "frontend-native";
  seo: SeoDTO;
  sections: SectionDTO[];
  featuredImage: MediaDTO | null;
  parentPage: PageRefDTO | null;
  tags: TagDTO[];
  // ... plus 10+ more fields
}
```

### 4. Section Normalization

`toSemanticSections()` in `section-normalizer.ts` maps the DynamicZone array:

```typescript
page.pageSections.map(section => {
  switch (section.__component) {
    case "sections.accordion": return toAccordionSection(section);
    case "sections.contact": return toContactSection(section);
    case "sections.faq": return toFaqSection(section);
    // ... 7 more section types
  }
});
```

Each section has a dedicated `to*Section()` function that normalizes items, media, and rich text.

### 5. Page Rendering

The Next.js App Router page component receives the `PageDTO`:

```tsx
// frontend/src/app/[locale]/[slug]/page.tsx
export default async function CmsPage({ params }) {
  const page = await getPageResult(params.slug, params.locale);
  const Layout = getLayoutForPage(page);
  return <Layout page={page} locale={params.locale} />;
}
```

### 6. Metadata Generation

`generateMetadata()` runs in parallel with the page render:

```tsx
export async function generateMetadata({ params }) {
  const page = await getPage(params.slug, params.locale);
  return toPageMetadata(page);
}
```

Produces: `<title>`, `<meta name="description">`, Open Graph tags, canonical URL, structured data.

### 7. Navigation Tree

`SiteHeader` (RSC) fetches `global.navigation` and builds a tree:

```typescript
const navigation = await getSite();
const tree = buildNavigationTree(navigation.pages, locale);
```

The tree respects `parentPage`, `menuIndex`, `isFolder`, and `hideFromMenu`.

## Revalidation Flow

```
Strapi Admin (content edit)
    │
    ▼
Strapi Webhook → POST /api/revalidate
    │
    ▼
Next.js API Route
    │ validate secret
    │ derive revalidate tags
    ▼
revalidateTag() / revalidatePath()
    │
    ▼
Next.js Cache Invalidation
```

## Media Handling

Strapi stores uploads locally. Next.js proxies them via `next.config.js` rewrites:

```javascript
// next.config.js
rewrites: [
  { source: '/uploads/:path*', destination: `${STRAPI_URL}/uploads/:path*` }
]
```

`toMediaDTO()` resolves relative URLs against `STRAPI_URL`.

## Related

- [cms-module.md](cms-module.md) — CMS gateway detailed documentation
- [frontend.md](frontend.md) — Frontend architecture
- [backend.md](backend.md) — Backend API
