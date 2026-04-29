---
module: Internal
symbols: 10
cohesion: 94%
source: gitnexus://repo/gemini-export/cluster/Internal
---

# Module: Internal — site-header internals

> The mega-menu, drawer, and presentation hooks that live behind `SiteHeader`. Highest cohesion in the codebase (94%) — almost no leakage outside the cluster.

## Code location

- [../../../frontend/src/components/site-header/internal/](../../../frontend/src/components/site-header/internal/)
- [../../../frontend/src/components/SiteHeaderClient.tsx](../../../frontend/src/components/SiteHeaderClient.tsx) — top-level client wrapper
- [../../../frontend/src/lib/i18n/header.ts](../../../frontend/src/lib/i18n/header.ts) — header strings

## Members (10)

| Symbol | File | Type |
| --- | --- | --- |
| `SiteHeaderClient` | `SiteHeaderClient.tsx` | Top-level client component |
| `MegaMenu` | `internal/MegaMenu.tsx` | Desktop mega-menu |
| `CTAButton`, `isExternal` | `internal/CTAButton.tsx` | Header CTA |
| `NavigationAnchor` | `internal/NavigationAnchor.tsx` | (in `Components` module per indexer) |
| `useDrawer` | `internal/useDrawer.ts` | Mobile drawer state hook |
| `usePill` | `internal/usePill.ts` | Active-tab pill animation hook |
| `useNavigationState` | `internal/useNavigationState.ts` | Shared navigation state hook |
| `leafMetaLabel`, `topicsLabel` | `internal/leafMetaLabel.ts` (+ `.test.ts`) | Label utilities |
| `getHeaderStrings` | `lib/i18n/header.ts` | Localized strings |

## Why cohesion is 94%

The internal/ directory is intentionally walled off — only `SiteHeader` (in [[navigation]]) and `SiteHeaderClient` import from it. Test files reference internals directly, which is fine.

## Active risk (2026-04-30)

`MegaMenu`, `SiteHeaderClient`, `MegaMenu.test.tsx`'s `itemWithAltTitle` are touched. The recent commits (`e5da5d6`, `03c4339`) already adjusted mega-menu visuals and mobile drawer; the current diff is iterating on those.

Process flows touched: `MegaMenu → TopicsLabel`, `SiteHeaderClient → Set`.

## Related

- [[navigation]] — the public side of the header
- [[components]] — design-system primitives (`ButtonLink`, `cn`) used here
- [[../audits/audit-2026-04-30]]
