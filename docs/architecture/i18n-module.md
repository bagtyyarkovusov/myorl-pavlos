# Module: I18n — homepage layout + localized copy

> Small cluster bridging homepage rendering and locale-specific copy strings. Home section dispatch lives in `SectionRenderer.tsx`.

## Code location

| File | Purpose |
| --- | --- |
| `frontend/src/components/page-layouts/HomePage.tsx` | Homepage layout component |
| `frontend/src/lib/i18n/home.ts` | Locale-specific homepage copy strings (`getHomeStrings`) |

## Members

| Symbol | Kind | File |
| --- | --- | --- |
| `HomePage` | Function | `frontend/src/components/page-layouts/HomePage.tsx` |
| `getHomeStrings` | Function | `frontend/src/lib/i18n/home.ts` |

`getHomeStrings` is also consumed by `renderSectionBodyHome` in `SectionRenderer.tsx` to provide i18n strings for home-specific section variants.

## Related

- [page-layouts-module.md](page-layouts-module.md) — sibling page-shape components (Standard, Contact, Gallery, etc.)
- [cms-module.md](cms-module.md) — gateway layer that feeds data into `HomePage`
- [sections-module.md](sections-module.md) — SectionRenderer dispatches home sections and uses `getHomeStrings`
- [frontend-moc.md](frontend-moc.md) — frontend entry points
