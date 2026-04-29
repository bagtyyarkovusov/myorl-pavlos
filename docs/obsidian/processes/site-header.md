---
process: SiteHeader
type: cross_community
source: gitnexus_cypher + context (process="SiteHeaderClient → _build_url")
---

# Process: SiteHeader — navigation rendering

> Site header rendering from server component through client hydration to mega menu. Navigation tree built from Strapi global singleton.

## Entry points

| Symbol | File | Role |
| --- | --- | --- |
| `SiteHeader` | `frontend/src/components/SiteHeader.tsx` | Server component — renders navigation tree from `getSite` |
| `SiteHeaderClient` | `frontend/src/components/SiteHeaderClient.tsx` | Client component — hydration shell with drawer/menu state |
| `MegaMenu` | `frontend/src/components/site-header/internal/MegaMenu.tsx` | Desktop mega-dropdown with two-level navigation |

## Indexed flows

| Process | Steps | Type |
| --- | --- | --- |
| `SiteHeaderClient → _build_url` | 5 | cross_community |
| `Check_navigation_render → _build_url` | 4 | cross_community |
| `BuildNavigationTree → _build_url` | 4 | cross_community |

## Rendering chain

```
SiteHeader (server)
  → getSite(fields: ["navigation"])
    → buildNavigationTree (frontend/src/lib/cms/navigation.ts)
      → hrefForPage (URL builder)
  → SiteHeaderClient (client boundary)
    → MegaMenu (desktop: two-level dropdown)
    → MobileDrawer (mobile: slide-out drawer)
      → useDrawer (open/close state)
      → useNavigationState (scroll-spy active section)
      → usePill (active indicator)
```

## Key dependencies

- `getSite` → `createCmsGateway` → `getCmsConfig` (the chokepoint)
- `buildNavigationTree` — recursive tree builder with cycle detection
- `findAppointmentHref` / `findInTree` — tree-walking URL resolver
- All `use*` hooks in `site-header/internal/`

## Test coverage

All sub-components and hooks have co-located tests (14 test files). See [[../testing-strategy]].

## Related

- [[../modules/internal]] — module overview (MegaMenu, hooks)
- [[../modules/cms]] — gateway layer
- [[page-rendering]] — page content flows
- [[00-MOC-Frontend]]
