---
name: myORL
description: Bilingual ENT clinic website — calm authority through clinical restraint
colors:
  bone: "#f6f8fb"
  bone-50: "#fbfcfe"
  bone-100: "#f6f8fb"
  bone-200: "#eaeef5"
  bone-300: "#d7dfeb"
  ink: "#0f2a4a"
  ink-soft: "#1b3a63"
  stone: "#5a6b7e"
  stone-soft: "#8594a6"
  stone-line: "#d7dfeb"
  trust: "#2563a8"
  trust-soft: "#e4edf8"
  trust-ink: "#17406f"
  teal: "#0e7c7b"
  teal-soft: "#e0f1f1"
typography:
  display:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontWeight: 400
    lineHeight: 1
  body:
    fontFamily: "Source Sans 3, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.72rem"
    fontWeight: 500
    lineHeight: 1.25
    textTransform: uppercase
rounded:
  sm: "4px"
  md: "8px"
  full: "999px"
motion:
  duration-fast: "150ms"
  duration-default: "200ms"
  duration-standard: "500ms"
  ease-default: ease
  ease-out: ease-out
spacing:
  section-scanning: "48px"
  section-focused: "64px"
  section-theater: "96px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bone-50}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.trust}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.trust-soft}"
    textColor: "{colors.trust-ink}"
---

# Design System: myORL

## 1. Overview

**Creative North Star: "The Calm Clinic"**

A well-appointed consulting room: clean surfaces, intentional objects, nothing that doesn't serve the patient. The myORL design system prioritizes clarity as a form of care. Every element is placed to reduce cognitive load for anxious patients researching ENT symptoms — the interface should feel like a reassuring hand on the shoulder, not a medical textbook.

The system is light-only by design. Patients and family members browse on phones and laptops at home, in waiting rooms, under office lighting. A light surface maximizes readability and signals clinical cleanliness. The palette is restrained: tinted blue-grey neutrals carrying a single blue accent at ≤10% surface coverage. Instrument Serif adds warmth and personal authority at display sizes; Source Sans 3 carries body text in both Greek and Russian with equal confidence.

This system explicitly rejects SaaS-cream card farms, hospital-corporate sterility, Mediterranean-tourism warmth, and crypto-dark aggressive styling. It is neither playful nor severe. It is calm, and the calm is earned by the doctor's credentials.

**Key Characteristics:**
- Restrained color strategy: one accent (trust blue) ≤10% of any screen
- Light-only theme tuned for clinical readability
- Serif display + sans body: warmth through typography, not decoration
- Density system (scanning / focused / theater) controls spacing and type scale globally
- Flat-by-default elevation: shadows appear only on state change
- Hairline grid patterns for structured content sections
- WCAG 2.2 AA with enhanced focus indicators exceeding AA visibility
- Bilingual parity: Greek and Russian locales are equally complete, no cross-locale fallback

## 2. Colors

The palette is built around tinted blue-grey neutrals and a single restrained blue accent. Every neutral carries a subtle blue undertone — no pure black or white appears anywhere. Colors are defined as Tailwind v4 `@theme` tokens in `globals.css` and surfaced as both CSS custom properties (`--color-*`) and Tailwind utilities.

### Primary
- **Trust** (`#2563a8`): The sole accent. CTAs, links, focus rings, and selection highlights. Used sparingly across ≤10% of any screen. Its rarity is the point.

### Neutral
- **Bone** (`#f6f8fb`): Page background. The lightest warm-grey with a blue undertone.
- **Bone 50** (`#fbfcfe`): Surface cards, glass layers. One step lighter than the page background.
- **Bone 100** (`#f6f8fb`): Alternate section background. Same hex as Bone; defined as a separate token so alternating section rhythms can reference distinct roles.
- **Bone 200** (`#eaeef5`): Soft surfaces, map placeholders, media frame backgrounds.
- **Bone 300** (`#d7dfeb`): Borders, dividers. Also surfaced as the `stone-line` semantic alias.
- **Ink** (`#0f2a4a`): Primary text, headings, dark section backgrounds. A deep navy that reads as near-black without the harshness of `#000`.
- **Ink Soft** (`#1b3a63`): Secondary headings, hover state intermediates between Ink and Trust.
- **Stone** (`#5a6b7e`): Secondary and muted text. Cool grey with enough contrast for body copy.
- **Stone Soft** (`#8594a6`): Tertiary text, labels, meta information. Lowest contrast still meeting AA at its type size.
- **Stone Line** (`#d7dfeb`): Hairline borders, grid lines, dividers. Same hex as Bone 300; the separate token communicates "this is a line, not a surface."

### Secondary
- **Teal** (`#0e7c7b`): Reserved secondary accent. Used in blockquote borders and callout backgrounds. Not a navigation or CTA color.
- **Teal Soft** (`#e0f1f1`): Teal-tinted surface for callouts and blockquotes.

### Semantic Aliases
CSS Modules use role-based aliases rather than palette names directly:
- `--background` → Bone (page)
- `--foreground` → Ink (text)
- `--muted` → Stone (secondary text)
- `--line` → Stone Line (borders)
- `--accent` → Trust (primary accent)
- `--accent-soft` → Trust Soft (accent surfaces)
- `--accent-ink` → Trust Ink (text on accent surfaces)
- `--surface` → Bone 50 (cards)
- `--surface-soft` → Bone 200 (soft surfaces)

### Named Rules
**The Restrained Rule.** Trust blue covers ≤10% of any given screen. It appears on CTAs, links, and focus rings — and on nothing else. The accent's authority comes from its scarcity.

**The No-Pure-Black Rule.** Every neutral carries a blue undertone (chroma ~0.005–0.01 in OKLCH). `#000` and `#fff` are forbidden. Ink (`#0f2a4a`) is the darkest color; Bone 50 (`#fbfcfe`) is the lightest.

**The Glass Transparency Rule.** Glass surfaces (header, nav, megamenu) use RGBA values derived from Bone 50, not arbitrary colors. Each variant corresponds to a specific opacity calibrated to its context: general panels 82%, sticky header 88%, nav bar 94%, megamenu dropdown 96%.

## 3. Typography

**Display Font:** Instrument Serif (with Georgia fallback)
**Body Font:** Source Sans 3 (with ui-sans-serif, system-ui, sans-serif fallback)
**Label/Mono Font:** JetBrains Mono (with ui-monospace, monospace fallback)

**Character:** A warm serif display paired with a clean, highly readable sans body. Instrument Serif brings personal, humanist warmth at large sizes — it signals "doctor's name on the door" rather than "hospital department signage." Source Sans 3 carries the information load across Greek and Cyrillic with excellent readability at all sizes. JetBrains Mono appears only at label size for meta information, kickers, and captions.

### Hierarchy
- **Display** (400 weight, clamp between 2.62rem and 5.2rem, line-height 0.94–1.0): Hero titles only. Appears once per page. Tight line-height is intentional — the serif face holds structure at this density without feeling cramped.
- **Headline** (400 weight, clamp(2.4rem, 13vw, 4.6rem), line-height 1.0): Section headings. Display font, capped at 680px width. Defined in the SectionHeading component.
- **Title** (400 weight, 1.25rem–2.25rem depending on density, line-height 1.12): Card titles. Display font, size controlled by the density system (`--density-h2-*`).
- **Body** (400 weight, 1rem, line-height 1.65): Paragraphs, descriptions, UI text. Capped at ~65ch. CMS rich text uses 1.05rem / 1.76 line-height via the `.cms-html` class.
- **Label** (500 weight, 0.72rem, line-height 1.25, uppercase): Kickers, eyebrow text, meta labels, media frame labels. Mono font. No letter-spacing beyond the font's natural width.

### Density System
The density system (scanning / focused / theater) adjusts type size and spacing through CSS custom properties:
- **Scanning** (compact): Body 0.9375rem, H1 2rem, H2 1.5rem, paragraph 0.875em, section padding 48px.
- **Focused** (default): Body 1rem, H1 2.5rem, H2 2rem, paragraph 1em, section padding 64px.
- **Theater** (generous): Body 1.125rem, H1 3rem, H2 2.25rem, paragraph 1.5em, section padding 96px.

### Named Rules
**The Display Authority Rule.** Instrument Serif is reserved for hero titles, section headings, and card titles. It never appears in body copy, labels, UI chrome, or at sizes below 1.25rem.

**The Bilingual Parity Rule.** All type sizes, line heights, and container widths must work in both Greek and Russian. Greek text tends to run 15–20% longer than Russian; Russian Cyrillic glyphs have different vertical metrics and ascender/descender profiles. Test every layout in both locales.

**The Balance Rule.** Headings use `text-wrap: balance`; body text uses `text-wrap: pretty`. Overflow strategy is `overflow-wrap: break-word` (never `anywhere`) with `hyphens: auto` keyed to the correct `lang` attribute (`el` or `ru`).

## 4. Elevation

The system is flat by default. Surfaces sit on the page through background color contrast (Bone → Bone 50 → Bone 200), not shadow. Shadows appear only as a response to state: hover lifts, focus rings, sticky positioning, overlay contexts. This keeps the page calm at rest — shadows are meaningful precisely because they are rare.

### Shadow Vocabulary
- **Button rest** (`box-shadow: 0 0 0 rgba(15, 42, 74, 0.08)` via `--shadow-ink-soft`): Applied to buttons at rest. Effectively invisible; exists as a transition target so hover shadows animate in rather than appearing abruptly.
- **Button hover** (`box-shadow: 0 6px 22px rgba(37, 99, 168, 0.2)` via `--shadow-accent`): Primary button hover state. A diffuse blue glow that lifts the button perceptually without calling attention to itself.
- **Hero media frame** (`box-shadow: 0 18px 44px rgba(15, 42, 74, 0.11)`): The hero image. Deep and diffuse to ground the largest visual element on the page.
- **Kicker pill** (`box-shadow: 0 1px 8px rgba(15, 42, 74, 0.05)`): The hero eyebrow tag. Subtle enough to not compete with the heading it accompanies.
- **Scroll-to-top** (`box-shadow: 0 12px 28px rgba(15, 42, 74, 0.25)`): Floating action button. Stronger shadow justified by the overlay context — it hovers above page content.
- **Megamenu** (`box-shadow: 0 16px 48px rgba(15, 42, 74, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)`): Combined ambient shadow + inner top highlight for the dropdown surface.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only as a response to state (hover, focus, sticky scroll, overlay). If a surface isn't interactive or positioned above the page, it doesn't cast a shadow.

**The Glass-Not-Gloss Rule.** Glass surfaces (nav, header, megamenu) use `backdrop-filter: blur()` to separate from page content while remaining readable. They are functional — keeping navigation accessible during scroll — not decorative. The blur value is calibrated per context: general panels and megamenu at higher blur, nav at lower blur for speed.

## 5. Components

### Buttons
- **Shape:** Fully rounded pills (999px border-radius). Minimum 44px height (meeting WCAG 2.2 target size).
- **Primary:** Ink background (`#0f2a4a`), Bone 50 text (`#fbfcfe`). Bold, confident — the clearest action on the page.
- **Primary hover/focus:** Background shifts to Trust (`#2563a8`). Translates up 1px. Shadow transitions from neutral to accent glow. 150ms ease on all properties.
- **Secondary:** Transparent background, 1px Ink border at 20% opacity, Ink text. Sits alongside primary without competing for attention.
- **Secondary hover/focus:** Border shifts to Trust, background tints to Trust Soft (`#e4edf8`), text shifts to Trust Ink (`#17406f`). Translates up 1px.
- **Focus-visible:** Same visual treatment as hover + visible 2px Trust outline with 2px offset.
- **No disabled state.** Navigation links are either present-and-active or absent. If a destination is temporarily unavailable, redirect to a status page rather than rendering a greyed-out button.

### Cards
- **Corner Style:** Sharp (no border-radius). Cards use background contrast, not shape, to define their boundary.
- **Background:** Surface (`#fbfcfe`). Hover lifts 2px with 150ms ease.
- **Internal structure:** Optional media area (16:9, overflow hidden) above a body area. Image scales 1.03x on card hover over 500ms ease.
- **Body padding by density:** Scanning 16px, Focused 24px, Theater 32px.
- **Title:** Display font, size keyed to density (`--density-h2-*`). Full-card click target via `::after` pseudo-element on the title link.
- **CTA label:** Trust Ink color, 0.9rem, 700 weight. Hidden at scanning density; visible at focused and theater.

### Media Frames
- **Shape:** 8px border-radius, 1px solid border in Stone Line.
- **Background:** Surface Soft (`#eaeef5`) — visible when no media is loaded.
- **Aspect ratios:** Wide (16:9, default), Portrait (4:5).
- **Placeholder:** Diagonal stripe pattern (135deg, alternating Bone 200 and Stripe Alt at 10px intervals) when no image URL is provided.
- **Label overlay:** Optional badge, 4px border-radius, glass surface background, 10px backdrop blur. Positioned bottom-left, 16px from edges.

### Navigation
- **Link underline:** Animated via `background-image: linear-gradient(currentColor, currentColor)` with `background-size: 100% 1px`, growing to 2px on hover. Color shifts to Trust accent. 160ms ease transition. Used on desktop nav links and in-content links.
- **Desktop nav bar:** Glass surface background (`rgba(246, 248, 251, 0.94)`), sticky positioning with backdrop blur. Hidden below 1180px.
- **Mobile nav:** Full-height overlay triggered from hamburger. Glass surface, animated entrance.
- **CTA button (header):** Trust accent background, rounded pill, Surface text. Desktop-only (hidden below 1180px). Stands apart from navigation links.

### Hairline Grid
A signature pattern used by advantages grids and menu access sections. Defined as shared CSS module classes in `shared-layout.module.css`:
- `.hairline-grid` — container class providing `border-left: 1px solid var(--color-stone-line, #d7dfeb)`. Components compose this and layer their own `grid-template-columns`.
- `.hairline-grid__cell` — cell class providing `border-right` and `border-bottom` in the same color. Components compose this and override border removal for last-row/column items via `nth-child` selectors.
- No gaps — cells touch via shared borders. Structure is conveyed through lines, not spacing.
- Hover applies a subtle Trust Soft tint (`rgba(228, 237, 248, 0.26–0.32)`) to the cell background.
- Used by: HomeAdvantagesSection, HomeMedicalGrid, MenuAccessGrid.

### Content Card (Shared Layout)
- **Shape:** 8px border-radius, 1px solid border in `--line`.
- **Background:** Glass surface (`rgba(251, 252, 254, 0.82)`).
- **Padding:** Clamp between 22px and 34px (responsive).
- **Usage:** Reusable card shell for content sections that need a bordered, glass-backed container.

### Inline Pill
- **Shape:** Fully rounded (999px), 1px solid border in `--line`.
- **Hover:** Border color shifts to Trust accent.
- **Usage:** Filter chips, tag labels, meta indicators. Not interactive by default; hover state applied only when the pill is a link or button.
- **Shared class:** `.inline-pill` in `shared-layout.module.css`. Components that need a pill (e.g., `SectionIndexGrid` `.filter-pill`) compose from this and override only the differences (cursor, active state).

### Stripe Placeholder
A diagonal stripe pattern used for empty media slots across the site:
- **Pattern:** `repeating-linear-gradient(135deg, var(--color-bone-200) 0 10px, var(--stripe-alt) 10px 20px)` over `var(--surface-soft)` background.
- **Shared class:** `.stripe-placeholder` in `shared-layout.module.css`. Also available as `.ph-stripe` in `design-system.module.css`.
- **Used by:** MediaFrame placeholder, HomePromoCarousel media-placeholder and topic-tab__placeholder.

### Design Tokens (CSS Custom Properties)
All hardcoded values have been migrated to CSS custom properties in `:root`:
- **Radius:** `--radius-sm` (4px), `--radius-md` (8px), `--radius-full` (999px). Use these instead of hardcoded `border-radius` values.
- **Motion:** `--motion-duration-fast` (150ms), `--motion-duration-default` (200ms), `--motion-duration-standard` (500ms). Paired with `--motion-ease-default` (ease) and `--motion-ease-out` (ease-out). Use these instead of hardcoded `transition` duration/easing values.
- **Semantic aliases** (`--background`, `--foreground`, `--accent`, `--line`, `--surface`, `--muted`) continue to be the primary way CSS Modules reference colors.

## 6. Do's and Don'ts

### Do:
- **Do** use the semantic aliases (`--background`, `--foreground`, `--accent`, `--line`, `--surface`, `--muted`) in CSS Modules. Reserve palette names (`--color-*`) for cases where the literal color value matters.
- **Do** use the density system (scanning / focused / theater) to control both spacing and type scale. Pick one density per section; don't mix densities within a single section.
- **Do** keep the Trust accent to ≤10% of any screen. Its authority comes from scarcity.
- **Do** use Instrument Serif only at display sizes (≥1.25rem) for hero titles, section headings, and card titles.
- **Do** test every layout in both Greek and Russian. Greek runs longer; Cyrillic has different vertical metrics. Neither locale is a second-class citizen.
- **Do** provide enhanced focus indicators: minimum 2px solid Trust outline with 2px offset, visible against both the component and the page background.
- **Do** respect `prefers-reduced-motion` — skip all animations when active (use `animation-duration: 0.01ms` with `!important`, not just slower durations).
- **Do** use the CSS custom property tokens for radius (`--radius-sm`, `--radius-md`, `--radius-full`) and motion (`--motion-duration-*`, `--motion-ease-*`) instead of hardcoded values. All legacy values have been migrated to these tokens.
- **Do** use `overflow-wrap: break-word` (never `anywhere`) with `hyphens: auto` keyed to the correct `lang` attribute (`el` or `ru`).

### Don't:
- **Don't** use `#000` or `#fff`. Ink (`#0f2a4a`) is the darkest color; Bone 50 (`#fbfcfe`) is the lightest. Every neutral carries a blue undertone.
- **Don't** use gradient text (`background-clip: text` combined with a gradient). Emphasis comes from weight, size, or color — never from decorative effects.
- **Don't** use side-stripe borders (`border-left` or `border-right` greater than 1px as a colored accent on cards, list items, or callouts). Use full borders, background tints, or leading indicators instead.
- **Don't** use glassmorphism as decoration. Glass surfaces are functional (sticky nav, overlays, megamenu) — not a visual style to apply generically.
- **Don't** use the hero-metric template (big number + small label + supporting stats + gradient accent). This is a medical practice site, not a SaaS dashboard.
- **Don't** use identical card grids (same-sized cards with icon + heading + text, repeated endlessly). Vary card density, layout, and presence of media by section.
- **Don't** use modals as the first solution. Exhaust inline expansion, accordion panels, or progressive disclosure before reaching for a modal.
- **Don't** use disabled buttons. Links are present-and-active or absent. Redirect unavailable destinations to a status page.
- **Don't** use bounce or elastic easing curves. Default to `ease-out` (simple transitions) or `cubic-bezier(0.16, 1, 0.3, 1)` (entrance animations).
- **Don't** animate CSS layout properties (`padding`, `margin`, `width`, `height`). Animate `transform` and `opacity` only.
- **Don't** use dark mode, purple gradients, neon accents, or crypto/tech aggressive styling. This is medicine — the interface reassures, it doesn't impress.
