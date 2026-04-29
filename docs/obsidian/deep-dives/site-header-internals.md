---
module: Site-header internals
source: code reading (frontend/src/components/site-header/)
---

# Deep dive: Site header internals

> The navigation header is the most complex component tree in the frontend. It spans 12 source files with full test coverage and uses a server/client split pattern.

## Architecture

```
SiteHeader (server, RSC)
  └─ reads global.navigation via getSite()
  └─ builds navigation tree (buildNavigationTree)
  └─ resolves appointment URL (findAppointmentHref / findInTree)
  └─ passes nav data as props to SiteHeaderClient

SiteHeaderClient ("use client")
  ├─ DesktopNav (desktop layout)
  │   ├─ MegaMenu (two-level mega dropdown)
  │   │   ├─ useNavigationState (scroll-spy active section)
  │   │   ├─ usePill (active indicator)
  │   │   └─ leafMetaLabel (derives label text)
  │   ├─ CTAButton ("Make an appointment")
  │   └─ LocaleSwitcher
  └─ MobileMenu (mobile layout)
      ├─ MobileDrawer (slide-out drawer)
      │   └─ useDrawer (open/close + animation)
      └─ UtilityBar (mobile-specific CTA + switcher)
```

## Component inventory

| Component | File | Tests | Purpose |
| --- | --- | --- | --- |
| `SiteHeader` | `components/SiteHeader.tsx` | — | Server component, reads Strapi nav |
| `SiteHeaderClient` | `components/SiteHeaderClient.tsx` | `site-header/SiteHeaderClient.test.tsx` | Client boundary, hydration shell |
| `MegaMenu` | `site-header/internal/MegaMenu.tsx` | `MegaMenu.test.tsx` | Two-level mega dropdown |
| `DesktopNav` | `site-header/internal/DesktopNav.tsx` | `DesktopNav.test.tsx` | Desktop navigation container |
| `MobileDrawer` | `site-header/internal/MobileDrawer.tsx` | `MobileDrawer.test.tsx` | Slide-out mobile drawer |
| `MobileMenu` | `site-header/internal/MobileMenu.tsx` | `MobileMenu.test.tsx` | Mobile navigation container |
| `CTAButton` | `site-header/internal/CTAButton.tsx` | `CTAButton.test.tsx` | "Make an appointment" CTA |
| `LocaleSwitcher` | `site-header/internal/LocaleSwitcher.tsx` | `LocaleSwitcher.test.tsx` | Language switcher |
| `NavigationAnchor` | `site-header/internal/NavigationAnchor.tsx` | `NavigationAnchor.test.tsx` | Styled nav link |
| `UtilityBar` | `site-header/internal/UtilityBar.tsx` | `UtilityBar.test.tsx` | Mobile utility bar |

## Hooks

| Hook | File | Tests | Purpose |
| --- | --- | --- | --- |
| `useDrawer` | `site-header/internal/useDrawer.ts` | `useDrawer.test.ts` | Drawer open/close + animation state |
| `useNavigationState` | `site-header/internal/useNavigationState.ts` | `useNavigationState.test.ts` | Scroll-spy active section |
| `usePill` | `site-header/internal/usePill.ts` | `usePill.test.ts` | Active-pill indicator position |

## Utilities

| Utility | File | Tests | Purpose |
| --- | --- | --- | --- |
| `leafMetaLabel` | `site-header/internal/leafMetaLabel.ts` | `leafMetaLabel.test.ts` | Derives label for leaf nav items |

## Why server/client split

`SiteHeader` is a React Server Component that fetches navigation data from Strapi at request time. It passes serialized props to `SiteHeaderClient`, which is the `"use client"` boundary. This avoids shipping Strapi client code to the browser while keeping the interactive dropdown/menu logic in client components.

## Related

- [[../modules/internal]] — module overview
- [[../modules/cms]] — gateway and navigation data
- [[../processes/site-header]] — rendering flow
- [[../testing-strategy]] — test coverage
