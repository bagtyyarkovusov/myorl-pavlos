---
module: Internal
symbols: 8 (5 + 3)
cohesion: 89%–100%
source: gitnexus_cypher (cluster="Internal")
---

# Module: Internal — site-header internals

> MegaMenu, drawer, scroll-state hooks, and i18n header strings. Tightly self-contained with high cohesion.

## Code location

| Directory | Contents |
| --- | --- |
| `frontend/src/components/site-header/internal/` | MegaMenu, hooks, leaf meta label |
| `frontend/src/components/SiteHeaderClient.tsx` | Client-side shell (container) |
| `frontend/src/lib/i18n/header.ts` | Header-specific locale strings |

## Members (8)

| Symbol | File | Purpose |
| --- | --- | --- |
| `SiteHeaderClient` | `frontend/src/components/SiteHeaderClient.tsx` | Client shell: hydration wrapper around server-rendered header |
| `MegaMenu` | `frontend/src/components/site-header/internal/MegaMenu.tsx` | Desktop mega-dropdown with two-level navigation |
| `useDrawer` | `frontend/src/components/site-header/internal/useDrawer.ts` | Mobile drawer open/close state + animation |
| `useNavigationState` | `frontend/src/components/site-header/internal/useNavigationState.ts` | Active section tracking for scroll-spy |
| `usePill` | `frontend/src/components/site-header/internal/usePill.ts` | Active-pill indicator for navigation |
| `leafMetaLabel` | `frontend/src/components/site-header/internal/leafMetaLabel.ts` | Derives label text for leaf nav items |
| `topicsLabel` | `frontend/src/components/site-header/internal/leafMetaLabel.test.ts` | Test helper (clustered by coincidence) |
| `getHeaderStrings` | `frontend/src/lib/i18n/header.ts` | Locale-specific header copy |

## Test coverage

Every component and hook has a co-located test file (14 tests). See [[../testing-strategy]].

## Cohesion: 89–94%

The strong cohesion comes from the tight coupling between `SiteHeaderClient` ↔ `MegaMenu` ↔ hooks. The only leak is `getHeaderStrings` in `lib/i18n/header.ts`, which imports from outside the component tree.

## Related

- [[cms]] — parent community (absorbed the old `Navigation` cluster)
- [[navigation]] — historical cluster, now merged
- [[components]] — design-system primitives used by header components
- [[../processes/site-header]] — rendering flow
- [[00-MOC-Frontend]] — frontend entry points
