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

Local custom properties used for component behavior, such as `--stagger-index`, are not design tokens and may remain local to the component that owns them.
