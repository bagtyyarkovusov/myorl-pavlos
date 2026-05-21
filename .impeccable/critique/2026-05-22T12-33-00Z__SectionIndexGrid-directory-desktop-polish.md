---
target: "SectionIndexGrid index-list--directory-list (desktop ≥1024px)"
slug: sectionindexgrid-directory-desktop-polish
timestamp: 2026-05-22T12-33-00Z
prior: "2026-05-21T12-35-57Z__localhost-el-diagnosi.md"
---

## Polish applied (technical)

- **Hover cascade:** Replaced global `padding-left: 8px` on `.index-list--directory-list` hover with `@media (max-width: 1023px)` so desktop cards stay flush.
- **Focus:** `:focus-visible` uses `outline: 2px solid var(--accent); outline-offset: -2px` (MenuAccessGrid parity).
- **Hover surface:** Tint via `color-mix(in oklch, var(--accent-soft) …, var(--surface))` instead of raw rgba full-card fill.
- **Layout:** Directory grid uses `repeat(2, …)` from 1024–1279px and `repeat(3, …)` from 1280px; cards use `min-height: clamp(...)` for rhythm.
- **Motion:** Directory desktop disables image zoom; shared link `transform` easing uses `--motion-ease-out`.
- **Text-only tiles:** Always `index-row-link--directory`; placeholder span with `data-media-placeholder` + `aria-hidden`, tinted `--surface-soft`.

## Verification

- Vitest: `src/components/SectionIndexGrid.test.tsx` (includes text-only placeholder case).
