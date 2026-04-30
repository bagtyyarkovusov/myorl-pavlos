# ADR-007: Use Hybrid Tailwind v4 + CSS Modules for Component Styling

**Status:** Accepted

**Date:** 2026-04-30

**Deciders:** @bagtyyarkovusov

## Context

The Next.js 16 frontend styles components through two mechanisms: Tailwind v4 utility classes (layout, spacing, typography, interactive states) and CSS Modules (complex grid/flex patterns, pseudo-elements, keyframe animations, backdrop-filter glass effects). Both are used in production across ~30 components.

Four architectural questions needed explicit answers to prevent drift:

1. **When should styles live in Tailwind classes vs. CSS Modules?** Without a rule, components oscillate between approaches, creating inconsistent patterns for the same kind of styling decision.

2. **How should class names be composed when combining Module CSS with conditional styles?** The codebase had two patterns: `cn()` (used by `ButtonLink` and `PageSection`) and string concatenation (used by `MediaFrame`).

3. **Where should shared layout styles live?** Identical `.card-list`, `.content-card`, and `.gallery-grid` rules appeared in two CSS Modules — no explicit policy on CSS deduplication.

4. **Should CSS Modules be co-located with their component or centralized?** `SiteHeaderClient.module.css` bundled 840 lines for seven sub-components; other modules were co-located.

## Decision

### 1. Tailwind vs. CSS Modules: The Boundary

| Use Tailwind utilities for | Use CSS Modules for |
|---|---|
| Layout (flex, grid, positioning) | Multi-axis grid templates (e.g., `grid-template-columns: repeat(auto-fit, minmax(...))`) |
| Spacing (padding, margin, gap) | Pseudo-elements (`::before`, `::after`) |
| Typography (font, size, weight, line-height) | Keyframe animations (`@keyframes`) |
| Colors (text, background, border) | `backdrop-filter` and glass-morphism layers |
| Interactive states (`hover:`, `focus-visible:`) | Complex responsive breakpoint logic (>2 conditions) |
| Simple conditional classes | Styles that span 5+ properties as a unit (e.g., `.page-hero` grid) |

**Rule of thumb**: If it can be expressed in 1-3 Tailwind utilities, use Tailwind. If it requires a pseudo-element, keyframe, backdrop-filter, or a grid layout with `repeat(auto-fit, minmax(...))`, use a CSS Module.

### 2. Canonical Class Composition: `cn()`

The `cn()` utility (`clsx` + `tailwind-merge`) is the **only** class-composition interface for components. String concatenation (`+`, template literals) is disallowed for class name construction.

```ts
// Allowed
const className = cn(styles.base, styles[variant], { [styles.conditional]: condition });

// Disallowed
const className = `${styles.base} ${styles[variant]} ${condition ? styles.conditional : ""}`;
```

Rationale: `cn()` handles conditional classes, deduplicates Tailwind utilities, merges consumer `className` overrides cleanly, and provides a single recognizable interface across the codebase.

### 3. Shared CSS: One Module, Imported by Multiple Components

When two or more components need identical CSS rules (e.g., `.card-list`, `.gallery-grid`), those rules live in a single shared CSS Module. Components import that module; they never define duplicate rules locally.

When a component needs a variation of a shared style, it composes with `cn()`:

```ts
import shared from "@/components/shared-layout.module.css";
const classes = cn(shared["card-list"], styles["card-list--compact"]);
```

### 4. CSS Module Co-location

Each CSS Module lives in the same directory as its primary consumer `.tsx` file. Sub-components get their own co-located CSS Module rather than sharing a parent-level stylesheet.

```
components/site-header/internal/
├── DesktopNav.tsx
├── DesktopNav.module.css       ← co-located
├── MobileDrawer.tsx
├── MobileDrawer.module.css     ← co-located
├── MegaMenu.tsx
└── MegaMenu.module.css         ← co-located
```

Shared layout styles (used by multiple unrelated components) live in a top-level `components/shared-layout.module.css`.

### 5. Design Token Architecture

Two-tier token system:

- **Tier 1 — `@theme` block in `globals.css`**: Registers design tokens as Tailwind utility classes (e.g., `--color-bone` → `bg-bone`, `--font-display` → `font-display`).
- **Tier 2 — `:root` custom properties**: Semantic aliases for the theme tokens (`--accent: var(--color-trust)`, `--surface-glass: rgba(...)`). Components reference semantic names, not raw color values.

When adding a new color or font, register it in `@theme` first (for utility class generation), then add a semantic alias in `:root` if it represents a reusable design concept.

### 6. No Third-Party Component Library

All design system primitives (`ButtonLink`, `MediaFrame`, `SectionHeading`, `PageSection`) are custom-built. No Radix UI, shadcn/ui, or equivalent library is used. This is a deliberate choice to minimize dependency surface and maintain full control over the visual language.

## Consequences

### Positive

- A single rule-boundary answers "Tailwind or CSS Module?" consistently, removing the decision cost for each new component.
- `cn()` as the sole class-composition interface makes class construction predictable and grep-able.
- Single-source-of-truth for shared layout styles eliminates CSS drift between modules.
- Co-located CSS Modules match the co-located test pattern already established (`*.test.tsx` next to `*.tsx`).
- The design token tier system separates "what values exist" (`@theme`) from "how they're used" (`:root`).

### Negative / Trade-offs

- The hybrid approach requires developers to know both Tailwind and CSS Modules syntax. However, the boundary rules make the choice mechanical rather than judgmental.
- Extracting shared CSS Modules adds one import per consumer — negligible overhead.
- Two-tier tokens add indirection (e.g., `--accent` → `var(--color-trust)` → `#2563a8`). Mitigated by the fact that components only reference tier-2 semantic names.

## Alternatives Considered

- **Pure Tailwind (no CSS Modules)**: Rejected because `backdrop-filter`, `@keyframes`, and complex grid templates have no Tailwind utility equivalents. Pushing these into inline `<style>` or `style={{}}` would scatter visual concerns.
- **Pure CSS Modules (no Tailwind)**: Rejected because Tailwind's utility classes dramatically reduce the volume of CSS written for layout, spacing, and typography — the majority of styling decisions.
- **CSS-in-JS (styled-components, Panda CSS)**: Rejected because the project already has a working Tailwind + CSS Modules setup and introducing a third styling mechanism would increase complexity without clear benefit.

## References

- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs) — CSS-first `@theme` configuration
- [Next.js CSS Modules Documentation](https://nextjs.org/docs/app/building-your-application/styling/css-modules) — co-located `.module.css` files
- [ADR-001](./ADR-001-nextjs-semantic-dto-boundary.md) — Semantic DTO Boundary (design tokens mirror the DTO philosophy of a single stable contract)
- [ADR-006](./ADR-006-dynamiczone-single-section-container.md) — DynamicZone migration (SectionRenderer split aligns with this ADR)
- `frontend/src/app/globals.css` — current `@theme` and `:root` token definitions
- `frontend/src/lib/utils.ts` — `cn()` implementation
