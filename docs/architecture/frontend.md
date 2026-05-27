# Frontend Architecture

> Next.js 16 App Router frontend with a strict semantic DTO boundary to Strapi.

## App Router Structure

```
frontend/src/app/
├── [locale]/                    # Locale-scoped routes (el, ru)
│   ├── page.tsx                 # Homepage (LocaleHomePage)
│   ├── [slug]/
│   │   ├── page.tsx             # Dynamic CMS page (CmsPage)
│   │   └── layout.tsx           # Page-level layout
│   ├── layout.tsx               # LocaleLayout (font loading, metadata)
│   └── search-results/
│       └── page.tsx             # Dynamic search (force-dynamic; no loading.tsx)
├── api/
│   ├── health/
│   │   └── route.ts             # Health check endpoint
│   └── revalidate/
│       └── route.ts             # On-demand revalidation webhook
├── globals.css                  # Tailwind v4 + design tokens
├── sitemap.ts                   # XML sitemap generator
├── robots.ts                    # robots.txt
├── manifest.ts                  # PWA manifest
├── not-found.tsx                # 404 page
└── error.tsx                    # Error boundary
```

## CMS Integration Layer (`frontend/src/lib/cms/`)

The DTO boundary (ADR-001) lives entirely in this directory. No raw Strapi shapes leak into page components.

### Key modules

| File | Responsibility |
|------|---------------|
| `cms-gateway.ts` | Strapi REST client factory (`createCmsGateway`) with response normalization |
| `cms-api.ts` | High-level reads: `getPage`, `getSite`, `getSitemapPages` |
| `page-normalizer.ts` | `toPageDTO` — main DTO boundary function |
| `section-normalizer.ts` | `toSemanticSections` — flattens DynamicZone into typed section array |
| `types.ts` | TypeScript types for Strapi payloads and DTOs |
| `metadata.ts` | `toPageMetadata` — DTO → Next.js `Metadata` |
| `navigation.ts` | `buildNavigationTree`, `hrefForLocaleSlug` |
| `env.ts` | CMS config resolution from environment |
| `errors.ts` | CMS error types and handlers |

### DTO Pipeline

```
Strapi REST Response
    → unwrapStrapiData
        → normalizeEntity
            → deepUnwrapStrapiRelations
                → flattenAttributes
                    → toPageDTO
                        → sections: toSemanticSections()
                        → seo: toSeoDTO()
                        → featuredImage: toMediaDTO()
                        → tags: toTagDTO[]
                        → parentPage: toPageRefDTO()
```

## Component Architecture

### Page Layouts (`frontend/src/components/page-layouts/`)

Each `pageType`/`layoutVariant` maps to one layout component:

| Layout | Page Types | Notes |
|--------|-----------|-------|
| `HomePage` | `pageType: "home"` | Renders `HomeHero` + `SectionRenderer(context="home")` + `HomeContactFooter` |
| `StandardPage` | `pageType: "content"` | Generic rich-text page |
| `QuestionListPage` | `pageType: "faq"`, `"accordion"`, `"tabs"` | FAQ/accordion/tab list layout |
| `GalleryPage` | `pageType: "gallery"` | Image gallery layout |
| `ContactPage` | `pageType: "contact"` | Clinic cards + map (ADR-009) |
| `AppointmentPage` | `layoutVariant: "appointment-form"` | Appointment form |
| `FrontendNativePage` | `layoutVariant: "not-found"`, `"search-results"`, `"sitemap"` | System pages, no CMS fetch |

### Sections (`frontend/src/components/sections/`)

`SectionRenderer.tsx` is the single dispatch point for all 10 section types:

```tsx
// Standard context
<SectionRenderer section={section} locale={locale} />

// Home context
<SectionRenderer section={section} context="home" locale={locale} />
```

Section types: `promo-slider`, `linked-resources`, `social-links`, `video`, `advantages`, `accordion`, `faq`, `tabs`, `gallery`, `contact`.

### Site Header (`frontend/src/components/site-header/`)

Server/client split architecture:
- `SiteHeader.tsx` (RSC) — fetches `global.navigation` from Strapi, builds nav tree
- `SiteHeaderClient.tsx` (Client) — hydration boundary, handles dropdowns and mobile menu
- Internal components: `DesktopNav`, `MobileMenu`, `MegaMenu`, `MobileDrawer`, `LocaleSwitcher`
- Hooks: `useDrawer`, `useNavigationState`, `usePill`

## Styling System (ADR-007)

### Two-tier design tokens

**Tier 1 — `@theme` block in `globals.css`:**
Registers tokens as Tailwind utilities:
```css
@theme {
  --color-bone: #f6f8fb;
  --color-ink: #0f2a4a;
  --color-trust: #2563a8;
  --font-display: var(--font-instrument-serif), Georgia, serif;
}
```

**Tier 2 — `:root` custom properties:**
Semantic aliases:
```css
:root {
  --background: var(--color-bone);
  --foreground: var(--color-ink);
  --accent: var(--color-trust);
  --surface-glass: rgba(251, 252, 254, 0.82);
}
```

### Tailwind vs. CSS Modules Boundary

| Use Tailwind for | Use CSS Modules for |
|---|---|
| Layout (flex, grid, positioning) | Multi-axis grid templates |
| Spacing (padding, margin, gap) | Pseudo-elements (`::before`, `::after`) |
| Typography | Keyframe animations |
| Colors | `backdrop-filter` / glass-morphism |
| Interactive states (`hover:`, `focus-visible:`) | Complex responsive logic (>2 breakpoints) |
| Simple conditional classes | Styles spanning 5+ properties as a unit |

### Class composition

`cn()` from `frontend/src/lib/utils.ts` is the **only** class-composition interface:
```tsx
import { cn } from "@/lib/utils";
const className = cn(styles.base, styles[variant], { [styles.active]: isActive });
```

## i18n

- **Locales**: `el` (Greek), `ru` (Russian)
- **Routes**: Flat `/{locale}/{slug}` (ADR-004)
- **Content**: All Strapi fields localized; no cross-locale fallback
- **Copy strings**: `frontend/src/lib/i18n/home.ts` for homepage copy
- **Navigation**: Per-locale trees from `buildNavigationTree()`

## Testing

- **Unit/Integration**: Vitest + React Testing Library (28 files)
- **E2E**: Playwright (`frontend/e2e/`)
- **Co-location**: Tests live next to source files
- **Fixtures**: Mock Strapi responses in `frontend/src/lib/cms/__tests__/__fixtures__/`

## Related

- [cms-module.md](cms-module.md) — Detailed CMS gateway documentation
- [sections-module.md](sections-module.md) — SectionRenderer internals
- [site-header-deep-dive.md](site-header-deep-dive.md) — Header component tree
- [testing-strategy-deep-dive.md](testing-strategy-deep-dive.md) — Full test inventory
