# Plan: Collapse globals.css + Introduce PageSection

> Source PRD: [RFC #6](https://github.com/bagtyyarkovusov/gemini-export/issues/6) — Collapse globals.css monolith + introduce PageSection component

## Architectural decisions

Durable decisions that apply across all phases:

- **CSS Module for complex components, inline Tailwind for simple ones.** Header's megamenu/magnetic pill use CSS Modules; section shells/headings use inline Tailwind via `<PageSection>` and `cn()`.
- **No shared primitive component library yet.** `<PageSection>` is the tracer bullet. Primitives (Button, Card, Stack) are out of scope.
- **`cn()` (clsx + tailwind-merge) becomes the standard class composition mechanism.** Already exists at `src/lib/utils.ts`.
- **CSS custom properties remain the theming bridge.** `var(--ink)`, `var(--muted)` referenced by both Tailwind arbitrary values and CSS Module rules.
- **Co-located styles.** CSS Modules live next to their component files (e.g., `SiteHeaderClient.module.css`).
- **`<PageSection>` API:** `heading?: { eyebrow?, title, intro?, action? }`, `header?: ReactNode` (bypass), `background?: "default" | "surface" | "ink-dark"`, `rhythm?: "standard" | "hero" | "compact" | "contact"`, `containerWidth?: "full" | "tight" | "prose"`, `children: ReactNode`, `className?, label?, id?`.
- **Routes (ADR-004):** Flat locale routes `/{locale}/{slug}`, no route changes in this plan.
- **CMS DTO boundary (ADR-001):** DTO layer remains unchanged; this plan only touches the presentation layer.

---

## Phase 1: Dead BEM Removal

**User stories**: 7 (dead code removal)

### What to build

Delete ~500 lines of dead BEM CSS from `globals.css` (lines 1704–2227). These BEM blocks — `home-hero-new`, `home-advantages-new`, `home-promo-carousel`, `home-medical-ledger`, `home-video-theater`, `home-contact-footer` — are unused. The actual TSX components use inline Tailwind utilities instead.

### Acceptance criteria

- [ ] BEM blocks at lines 1704–2227 of `globals.css` are deleted
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes
- [ ] globals.css is ~1704 lines (was 2227)

---

## Phase 2: Build `<PageSection>` Component with Tests

**User stories**: 3 (boilerplate elimination), 4 (visual rhythm), 10 (heading bypass)

### What to build

Create the `<PageSection>` component — a single component that replaces the section shell + heading boilerplate pattern. Built and tested in isolation; no consumers yet.

The component absorbs: section background variants (auto-derived text colors for dark), vertical padding rhythm presets, container width options, and the heading block layout (eyebrow + h2 + intro/action in responsive flex row).

Tests using Vitest + React Testing Library, following the pattern in `layouts.test.tsx`. Cover all prop combinations.

### Acceptance criteria

- [ ] `<PageSection>` component exists at `src/components/PageSection.tsx`
- [ ] Supports `heading` prop with eyebrow, title, intro, action sub-props
- [ ] Supports `header` prop for bypassing standard heading layout
- [ ] Supports `background` prop with three variants
- [ ] Supports `rhythm` prop with four presets
- [ ] Supports `containerWidth` prop with three widths
- [ ] Explicit `className` prop merges via `cn()`
- [ ] `label` and `id` passthrough for accessibility
- [ ] Render tests cover all prop combinations
- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes

---

## Phase 3: Extract SiteHeaderClient Styles to CSS Module

**User stories**: 1 (co-located styles), 2 (tree-shaking), 6 (isolated header styles)

### What to build

Extract ~700 lines of header/nav BEM classes from `globals.css` into co-located `SiteHeaderClient.module.css`. Update `SiteHeaderClient.tsx` to import and use the CSS Module. Visual output and interactive behavior must be identical.

Classes migrated: `site-utility`, `site-header`, `brand`, `brand-logo`, `megamenu-host`, `desktop-nav`, `nav-magnetic-pill`, `nav-item`, `nav-trigger`, `nav-link`, `nav-chevron`, `megamenu-panel`, `megamenu-panel__surface`, `header-actions`, `icon-button`, `button-link`, `cta-book`, `mobile-drawer`, `mobile-drawer__backdrop`, `mobile-drawer__panel`, `mobile-drawer__head`, `mobile-drawer__body`, `mobile-drawer__foot`, `locale-switcher`, `status-dot`, `u-link`, `nav-panel__grid`, `nav-panel__feature`, `nav-panel__cta`, `nav-panel__links`, `nav-panel__link-wrapper`, `brand-meta`, `summary-plus`, `mobile-subnav`, `cta-arrow`, `desktop-only`, `mobile-only`, and all modifiers/responsive rules.

Add a structural render test for SiteHeaderClient. Do NOT delete source BEM from globals.css yet (final cleanup phase).

### Acceptance criteria

- [ ] `SiteHeaderClient.module.css` exists co-located with `SiteHeaderClient.tsx`
- [ ] All header/nav BEM CSS accurately moved (identical rules, different file)
- [ ] `SiteHeaderClient.tsx` imports and uses `styles` from the CSS Module
- [ ] All BEM class refs in JSX changed from strings to `styles[...]` access
- [ ] `[data-locale="ru"]` locale selectors preserved
- [ ] All responsive breakpoints preserved
- [ ] Magnetic pill, drawer, megamenu animations work identically
- [ ] Structural render test exists and passes
- [ ] `npm run build` passes
- [ ] `npm run typecheck` passes

---

## Phase 4: Extract Design-System Styles to CSS Module + ButtonLink Tailwind Migration

**User stories**: 1 (co-located styles), 2 (tree-shaking)

### What to build

Two changes to `design-system.tsx`:
1. Move `MediaFrame` and `SectionHeading` BEM classes from `globals.css` into a co-located `design-system.module.css`. Update component to use CSS Module.
2. Migrate `ButtonLink` from BEM to inline Tailwind utilities using `cn()`. Variants become: primary = `bg-ink text-bone-50 hover:bg-trust...`, secondary = `border border-ink/20 bg-transparent text-ink...`.

Do NOT delete source BEM from globals.css yet (final cleanup phase).

### Acceptance criteria

- [ ] `design-system.module.css` exists co-located with `design-system.tsx`
- [ ] MediaFrame BEM classes accurately moved (identical appearance)
- [ ] SectionHeading BEM classes accurately moved (identical appearance)
- [ ] ButtonLink uses inline Tailwind utilities with `cn()` for variant composition
- [ ] ButtonLink primary/secondary variants render identical to current
- [ ] `isExternalHref` logic unchanged
- [ ] `npm run build` passes
- [ ] `npm run typecheck` passes

---

## Phase 5: Refactor Home Section Components to Use `<PageSection>`

**User stories**: 3 (boilerplate), 4 (rhythm), 8 (CMS continuity)

**Blocked by**: Phase 2

### What to build

Refactor 6 home section components to use `<PageSection>` for their outer shell, eliminating boilerplate from each. The card content, animations (framer-motion), and section-specific layout stay as-is.

Components: `HomeHero` (custom header via children), `HomeAdvantagesSection`, `HomeVideoTheater`, `HomeMedicalLedger`, `HomePromoCarousel`, `HomeContactFooter`.

### Acceptance criteria

- [ ] All 6 home section components use `<PageSection>` for outer shell
- [ ] Each section's background, padding, heading layout identical to current
- [ ] Framer-motion animations unchanged
- [ ] Card grids, media frames, custom layouts unchanged
- [ ] Render tests added for each section
- [ ] `npm run build` passes
- [ ] `npm run typecheck` passes

---

## Phase 6: Refactor CMS Section Components to Use `<PageSection>`

**User stories**: 3 (boilerplate), 4 (rhythm), 8 (CMS continuity), 9 (SectionRenderer)

**Blocked by**: Phase 2

### What to build

Refactor CMS section renderers (dispatched by `SectionRenderer.tsx`) to use `<PageSection>` for their outer shell. Move remaining CMS-specific BEM styles from `globals.css` to co-located CSS Modules per section type.

`SectionRenderer` dispatch logic is not restructured — individual section components get the wrapper.

### Acceptance criteria

- [ ] All CMS section renderers use `<PageSection>` for outer shell
- [ ] CMS-specific BEM styles moved to co-located CSS Modules
- [ ] `SectionRenderer` dispatch logic unchanged
- [ ] All existing `SectionRenderer.test.tsx` tests pass
- [ ] New test cases cover sections with `<PageSection>` wrapper
- [ ] `npm run build` passes
- [ ] `npm run typecheck` passes

---

## Phase 7: Refactor Page Layout Components to Use `<PageSection>`

**User stories**: 1 (co-location), 2 (tree-shaking), 3 (boilerplate), 4 (rhythm)

**Blocked by**: Phase 2

### What to build

Refactor 6 page layout components to use `<PageSection>` for their outer shell. Move page-specific BEM blocks (`.page-shell`, `.page-hero`, etc.) from `globals.css` to co-located CSS Modules.

Components: `StandardPage`, `GalleryPage`, `ContactPage`, `AppointmentPage`, `QuestionListPage`, `FrontendNativePage`.

### Acceptance criteria

- [ ] All 6 page layout components use `<PageSection>` for outer shell
- [ ] Page-specific BEM styles moved to co-located CSS Modules
- [ ] All pages render identical visual output
- [ ] `layouts.test.tsx` updated and passing
- [ ] `npm run build` passes
- [ ] `npm run typecheck` passes

---

## Phase 8: Final globals.css Cleanup

**User stories**: 1 (co-location), 2 (tree-shaking), 7 (dead code)

**Blocked by**: Phases 1, 3, 4, 5, 6, 7

### What to build

Remove all remaining migrated BEM class blocks from `globals.css` that were extracted to co-located CSS Modules. After removal, `globals.css` should contain only:

- `@import "tailwindcss"` + `@theme` block (design tokens)
- `:root` CSS custom properties (semantic aliases)
- Base element resets
- `.container` utility class
- `.prose-luxury` CMS HTML styles
- `.desktop-only` / `.mobile-only` visibility utilities
- `@media (prefers-reduced-motion: reduce)` reset
- Any genuinely shared `@keyframes`

Target size: **~85 lines** (down from ~1704 after Phase 1).

### Acceptance criteria

- [ ] `globals.css` is ~85 lines (no component-specific BEM classes remain)
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes
- [ ] `npm run format:check` passes
