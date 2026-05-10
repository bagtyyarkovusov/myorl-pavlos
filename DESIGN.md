# DESIGN.md — myORL

> Visual design system for the myORL Next.js frontend. Source of truth for colors, typography, elevation, spacing, and component primitives.

## Color Strategy

**Restrained** — tinted neutrals + one accent ≤10% surface. Medical product default. No pure black or pure white.

### Palette

| Name | Hex | Usage |
|------|-----|-------|
| `bone` | `#f6f8fb` | Page background |
| `bone-50` | `#fbfcfe` | Surface cards, glass layers |
| `bone-100` | `#f6f8fb` | Alternate section background |
| `bone-200` | `#eaeef5` | Soft surfaces, map placeholder |
| `bone-300` | `#d7dfeb` | Borders, dividers (with stone-line) |
| `ink` | `#0f2a4a` | Primary text, headings |
| `ink-soft` | `#1b3a63` | Secondary headings, hover states |
| `stone` | `#5a6b7e` | Secondary / muted text |
| `stone-soft` | `#8594a6` | Tertiary text, labels, meta |
| `stone-line` | `#d7dfeb` | Hairline borders, grid lines |
| `trust` | `#2563a8` | Primary accent — CTAs, links, focus rings |
| `trust-soft` | `#e4edf8` | Accent surfaces, hover tints |
| `trust-ink` | `#17406f` | Accent text on soft surfaces |
| `teal` | `#0e7c7b` | Secondary accent (reserved) |
| `teal-soft` | `#e0f1f1` | Secondary accent surface |

### Semantic Aliases

```css
--background: var(--color-bone);
--foreground: var(--color-ink);
--muted: var(--color-stone);
--line: var(--color-stone-line);
--accent: var(--color-trust);
--accent-soft: var(--color-trust-soft);
--accent-ink: var(--color-trust-ink);
--surface: var(--color-bone-50);
--surface-soft: var(--color-bone-200);
```

Use semantic aliases in CSS Modules. Use palette names (`--color-*`) only when the literal value matters.

### Theme

Light only. Physical scene: patients and family members browse on phones and laptops in various conditions — at home, in waiting rooms, under office lighting. A light surface maximizes readability and signals clinical cleanliness.

## Typography

### Font Families

| Role | Font | Fallback |
|------|------|----------|
| Display | Instrument Serif | Georgia, serif |
| Body | Source Sans | ui-sans-serif, system-ui, sans-serif |
| Mono | JetBrains Mono | ui-monospace, monospace |

### Type Scale

| Token | Size | Weight | Line-height | Letter-spacing | Usage |
|-------|------|--------|-------------|----------------|-------|
| Display XL | `5.2rem` | 400 | 0.94 | — | Hero title (desktop ≥1024px) |
| Display L | `3.9rem` | 400 | 1.0 | — | Hero title (tablet ≥720px) |
| Display M | `3.3rem` | 400 | 1.0 | — | Hero title (≥560px) |
| Display S | `2.62rem` | 400 | 1.0 | — | Hero title (mobile) |
| H2 | `clamp(2.25rem, 5vw, 3.75rem)` | 400 | tight | — | Section headings |
| H3 | `clamp(0.72rem, 2.8vw, 1.36rem)` | 500 | 1.18 | -0.005em | Card titles |
| Body | `1rem` | 400 | 1.65 | — | Paragraphs, descriptions |
| Body L | `1.16rem` | 400 | 1.65 | — | Hero lead (desktop) |
| Body M | `1.04rem` | 400 | 1.65 | — | Hero lead (mobile) |
| Kicker | `0.72rem` | 500 | 1.25 | uppercase | Hero eyebrow, meta labels |
| Caption | `0.86–0.92rem` | 400 | 1.42–1.55 | — | Card descriptions, captions |
| Label | `clamp(0.65rem, 1.6vw, 0.72rem)` | 500 | 1.25 | 0.06em uppercase | Meta labels (address, hours) |

### Rules
- Body line length: cap at ~65ch where possible
- Hierarchy via scale + weight contrast, not color alone
- `text-wrap: balance` on headings; `text-wrap: pretty` on body
- Overflow strategy: `overflow-wrap: break-word` (not `anywhere`) + `hyphens: auto` with correct `lang` attributes
- CMS provides shorter labels for very long medical terms where editorially feasible

## Spacing

### Section Rhythm

| Token | Mobile | Desktop (≥768px) | Usage |
|-------|--------|------------------|-------|
| `hero` | `60px–120px` top, `54px–96px` bottom | same clamp | Hero section |
| `standard` | `80px` | `128px` | Default page section |
| `compact` | `48px` | `64px` | Tighter sections (testimonials, video) |
| `contact` | `80px–160px` | same clamp | Contact page sections |

### Container Widths

| Token | Max-width | Usage |
|-------|-----------|-------|
| `full` | `container mx-auto` | Default sections |
| `tight` | `1024px` | Testimonials, focused content |
| `prose` | `820px` | Long-form text, articles |

### Grid Gaps

- Hero grid: `34px` → `44px` → `64px` → `80px`
- Section gap (meta/info): `clamp(1.25rem, 3vw, 1.75rem)`

## Elevation

### Shadows

| Name | Value | Usage |
|------|-------|-------|
| `shadow-ink-soft` | `rgba(15, 42, 74, 0.08)` | Default button shadow |
| `shadow-accent` | `rgba(37, 99, 168, 0.2)` | Hover/active accent shadows |
| Hero media | `0 18px 44px rgba(15, 42, 74, 0.11)` | Hero image frame |
| Kicker pill | `0 1px 8px rgba(15, 42, 74, 0.05)` | Hero kicker tag |
| Button hover | `0 6px 22px var(--shadow-accent)` | Primary button hover |

### Glass Surfaces

| Name | Value | Usage |
|------|-------|-------|
| `surface-glass` | `rgba(251, 252, 254, 0.82)` | General glass panels |
| `surface-glass-header` | `rgba(251, 252, 254, 0.88)` | Sticky header |
| `surface-glass-nav` | `rgba(246, 248, 251, 0.94)` | Navigation bar |
| `surface-glass-megamenu` | `rgba(251, 252, 254, 0.96)` | Mega menu dropdown |

## Components

### ButtonLink

**Variants:**
- **Primary:** `bg-ink text-bone-50` — main CTAs
- **Secondary:** `border-ink/20 bg-transparent text-ink` — supporting actions

**Base:** `rounded-full`, `min-h-11`, `px-5`, `text-sm font-semibold`, `whitespace-nowrap`

**States:**
- Hover: `-translate-y-px` + background shift
- Focus-visible: same as hover + visible ring

**Note:** No disabled state. Navigation links are either present-and-active or absent. If a destination is temporarily unavailable, redirect to a status page rather than rendering a disabled link.

### PageSection

**Backgrounds:** `default` (transparent), `surface` (`bg-bone-50`), `ink-dark` (`bg-ink text-bone-50`)

**Rhythms:** `standard`, `hero`, `compact`, `contact`

**Container widths:** `full`, `tight`, `prose`

### MediaFrame

**Variants:** `portrait`, `wide`

**Behavior:** `object-fit: cover`, `aspect-ratio` defined per context, `border: 1px solid var(--line)`, `border-radius: 8px`

### Card (design-system)

**Densities:** `scanning`, `focused`, `theater`

- `scanning`: compact, image-forward
- `focused`: balanced image + text
- `theater`: large media, minimal text overlay

## Motion

### Timing

| Token | Duration | Usage |
|-------|----------|-------|
| `fast` | `150ms` | Hover, focus, color transitions |
| `standard` | `500ms` | Section entrance, reveals |

### Easing

- Default: `ease-out`
- Hero entrance: `cubic-bezier(0.16, 1, 0.3, 1)` — ease-out-expo
- Carousel slide: `x` + `opacity` transform (GPU-friendly)

### Rules
- Do not animate CSS layout properties (`padding`, `margin`, `width`, `height`)
- Respect `prefers-reduced-motion` — skip animations entirely when active
- No bounce, no elastic easing
- Performance over entrance animation: LCP-critical content renders immediately

## Responsive Breakpoints

| Name | Width | Notes |
|------|-------|-------|
| Base | `< 560px` | Single column, stacked layouts |
| Small | `≥ 560px` | Wider hero text, button auto-width |
| Medium | `≥ 720px` | Two-column grids, roomier padding |
| Tablet | `≥ 768px` | Menu access row tiles, map 21:9 |
| Large | `≥ 860px` | Section header spacing increase |
| Desktop | `≥ 1024px` | Hero side-by-side, centered testimonials |
| Wide | `≥ 1160px` | Menu access 3-column return |
| XL | `≥ 1280px` | Max hero grid gap |

## Grid Patterns

### Hairline Grid
Used by `HomeAdvantagesSection` and `MenuAccessGrid`:
- Container: `border-left: 1px solid var(--line)`
- Cells: `border-right: 1px solid var(--line); border-bottom: 1px solid var(--line)`
- No gaps — cells touch via shared borders
- Hover: subtle background tint (`rgba(228, 237, 248, 0.26–0.32)`)

## Accessibility Baseline

- **WCAG 2.2 AA** for all success criteria
- **Enhanced focus indicators** exceeding AA visibility:
  - Minimum `2px solid var(--accent)` outline or equivalent
  - Visible against both the component and the page background
  - `outline-offset: 2px` where possible to prevent clipping
- **Target size:** minimum `44×44 px`
- **`prefers-reduced-motion`:** respected on all motion
- **`lang` attribute:** set per locale (`el` / `ru`) on `<html>` for hyphenation and screen-reader pronunciation
