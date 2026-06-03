# Frontend Token Contract

The frontend uses Tailwind v4 theme tokens as the canonical styling vocabulary for component markup and CSS custom properties as the bridge for CSS Modules, global styles, and CMS prose.

## Canonical tokens

Palette tokens live in `frontend/src/app/globals.css` inside `@theme`.

| Intent          | Tailwind utility examples              | CSS variable                           |
| --------------- | -------------------------------------- | -------------------------------------- |
| Page background | `bg-bone`, `bg-bone-50`                | `--color-bone`, `--color-bone-50`      |
| Soft surfaces   | `bg-bone-100`, `bg-bone-200`           | `--color-bone-100`, `--color-bone-200` |
| Primary text    | `text-ink`, `bg-ink`                   | `--color-ink`                          |
| Secondary text  | `text-stone`, `text-stone-soft`        | `--color-stone`, `--color-stone-soft`  |
| Lines           | `border-stone-line`                    | `--color-stone-line`                   |
| Accent          | `text-trust`, `bg-trust`               | `--color-trust`                        |
| Accent surface  | `bg-trust-soft`, `shadow-trust-soft`   | `--color-trust-soft`                   |
| Accent text     | `text-trust-ink`                       | `--color-trust-ink`                    |
| Teal accent     | `text-teal`, `bg-teal`, `bg-teal-soft` | `--color-teal`, `--color-teal-soft`    |

Semantic aliases live in `:root` and are reserved for CSS Modules, global styles, and CMS prose:

- `--background`, `--foreground`, `--muted`, `--line`
- `--accent`, `--accent-soft`, `--accent-ink`
- `--surface`, `--surface-soft`
- `--surface-glass`, `--surface-glass-header`, `--surface-glass-nav`, `--surface-glass-megamenu`
- `--overlay-backdrop`, `--shadow-accent`, `--shadow-ink-soft`
- `--highlight-glass`, `--line-glass`
- `--grid-line`, `--grid-line-soft`
- `--media-frame-label-border`
- `--stripe-alt`
- `--hero-glow`

## Ownership rules

- Use Tailwind utilities in JSX for simple layout, spacing, color, typography, borders, shadows, and responsive states.
- Use CSS Modules for selector-heavy, responsive, animated, or stateful component styling, especially header, navigation, drawers, media frames, and CMS-adjacent section bodies.
- Use global CSS only for Tailwind import, theme tokens, semantic aliases, base/reset styles, shared layout helpers, responsive visibility helpers, and CMS prose.
- Use semantic aliases in CSS Modules when a value represents a role. Use `--color-*` variables only when the literal palette value matters.
- Use `cn()` from `frontend/src/lib/utils.ts` whenever caller-provided classes must merge with default variants.

## Replacement map

The following informal variables are not canonical and should not be introduced in new markup.

| Do not use          | Use instead                                                              |
| ------------------- | ------------------------------------------------------------------------ |
| `var(--ink)`        | `text-ink`, `bg-ink`, `border-ink`, or `var(--foreground)` in CSS        |
| `var(--ink-soft)`   | `text-ink-soft`, `bg-ink-soft`, or `var(--color-ink-soft)` in CSS        |
| `var(--bone)`       | `bg-bone` or `var(--background)` in CSS                                  |
| `var(--bone-50)`    | `text-bone-50`, `bg-bone-50`, or `var(--surface)` in CSS                 |
| `var(--bone-100)`   | `text-bone-100`, `bg-bone-100`, or `var(--color-bone-100)` in CSS        |
| `var(--bone-300)`   | `border-bone-300` or `var(--color-bone-300)` in CSS                      |
| `var(--stone)`      | `text-stone`, `bg-stone`, or `var(--muted)` in CSS                       |
| `var(--stone-soft)` | `text-stone-soft` or `var(--color-stone-soft)` in CSS                    |
| `var(--stone-line)` | `border-stone-line`, `shadow-stone-line`, or `var(--line)` in CSS        |
| `var(--trust-soft)` | `bg-trust-soft`, `shadow-trust-soft`, or `var(--accent-soft)` in CSS     |
| `var(--teal-soft)`  | `text-teal-soft`, `border-teal-soft`, or `var(--color-teal-soft)` in CSS |

## Typography

Typography role tokens live in `:root` and use fixed `rem`-based values. They replace ad-hoc hardcoded sizes and viewport-driven `clamp()` in product/content surfaces.

| Token                   | Value      | Intent                                  |
| ----------------------- | ---------- | --------------------------------------- |
| `--type-scale-base`     | `1rem`     | Reference baseline                      |
| `--type-prose`          | `1rem`     | Long-form body copy                     |
| `--type-prose-compact`  | `0.9375rem`| Dense reading (encyclopedia, tables)    |
| `--type-prose-dense`    | `0.875rem` | Footers, footnotes, fine annotations    |
| `--type-heading-1`      | `2rem`     | Page hero / primary heading             |
| `--type-heading-2`      | `1.5rem`   | Section heading                         |
| `--type-heading-3`      | `1.25rem`  | Sub-section heading                     |
| `--type-heading-4`      | `1.125rem` | Minor heading                           |
| `--type-heading-5`      | `1rem`     | Inline heading                          |
| `--type-heading-6`      | `0.9375rem`| Micro heading (muted)                   |
| `--type-label`          | `0.75rem`  | Mono labels, filters, index section heads|
| `--type-label-large`    | `0.8125rem`| Larger label / action text              |
| `--type-caption`        | `0.8125rem`| Captions, metadata                      |
| `--type-nav`            | `0.9375rem`| Primary navigation                       |
| `--type-nav-compact`    | `0.875rem` | Sidebar nav, related-topics links       |
| `--type-nav-label`      | `0.75rem`  | Nav group headings                      |
| `--type-card-title`     | `1.25rem`  | Card / index row headings               |
| `--type-card-body`      | `0.9375rem`| Card excerpts, descriptions              |
| `--type-table-header`   | `0.875rem` | Table column headers                    |
| `--type-table-cell`     | `0.875rem` | Table body cells                        |
| `--type-table-caption`  | `0.75rem`  | Table captions                          |

### Line-height tokens

| Token                     | Value | Intent                          |
| ------------------------- | ----- | ------------------------------- |
| `--type-leading-tight`    | `1.1`  | Display headings                |
| `--type-leading-snug`     | `1.3`  | Compact headings (h4–h6)        |
| `--type-leading-normal`   | `1.55` | Body copy, CMS prose            |
| `--type-leading-relaxed`  | `1.65` | Spacious body (prose-luxury)    |

### Font-weight tokens

| Token                      | Value | Intent              |
| -------------------------- | ----- | ------------------- |
| `--type-weight-normal`     | `400` | Body, headings      |
| `--type-weight-medium`     | `500` | Slightly emphasized |
| `--type-weight-semibold`    | `600` | Strong, links, CTA  |
| `--type-weight-bold`       | `700` | Labels, buttons     |

### Prose measure tokens

| Token                     | Value | Intent                          |
| ------------------------- | ----- | ------------------------------- |
| `--type-measure-prose`    | `72ch`| Long-form reading width         |
| `--type-measure-compact`  | `68ch`| Dense reading width             |

### Ownership rules for typography

- Use the role token in CSS Modules and global styles when a value represents a semantic typography role (label, prose, heading, nav, card, table).
- Use `var(--type-*)` inside `font-size` and `line-height` declarations. Do not redefine the token value inline.
- CMS prose (`globals.css`) must use fixed `rem` tokens. Do not use `clamp()`, `vw`, or `calc()` for font-size in `.cms-html` rules.
- Marketing surfaces (home hero, video theater, promo carousels) and structural chrome (header utility bar, locale switcher) may still use responsive `clamp()`, but should reference tokens where practical.
- Roboto Condensed remains the canonical public UI typeface via `--font-display`, `--font-sans`, and `--font-mono`.

### Replacement map for typography

| Do not use                                | Use instead                         |
| ----------------------------------------- | ----------------------------------- |
| `font-size: 0.72rem` in mono labels       | `var(--type-label)`                 |
| `font-size: 1.0625rem` in prose           | `var(--type-prose)`                 |
| `font-size: clamp(…, …, …)` in `.cms-html`| `var(--type-heading-N)`             |
| `font-size: 3rem` override on desktop h2  | `var(--type-heading-2)` (no override needed) |
| `max-width: min(880px, 76ch)`             | `var(--type-measure-prose)`         |
| `line-height: 1.7` in prose               | `var(--type-leading-normal)`        |

Local custom properties used for component behavior, such as `--stagger-index`, are not design tokens and may remain local to the component that owns them.
