# Design Audit: Homepage Components

**Branch:** `design-audit`  
**Date:** 2026-05-10  
**Scope:** `frontend/src/components/home/*`, `frontend/src/components/page-layouts/HomePage.tsx`, `frontend/src/app/page.tsx`  
**Register:** Product (medical clinic UI — design serves the product)  
**Tooling:** `impeccable detect` returned `[]` (no regex-level anti-patterns); this audit is manual heuristic review.

---

## Preflight

| Gate | State | Notes |
|---|---|---|
| Context | **pass** | Loaded from `CONTEXT.md`, `README.md`, `frontend/src/app/globals.css`. |
| Product | **fail** | `PRODUCT.md` and `DESIGN.md` do not exist. Synthesized product facts from context: bilingual (el/ru) ENT clinic site; light theme; Restrained color strategy (tinted neutrals + trust blue accent ≤10%); serif display + sans body typography. |
| Command | **pass** | `audit` reference loaded from skill definition. |
| Craft | **not required** | Evaluation command; no shape brief needed. |
| Image | **skipped** | Technical audit; no visual probes required. |
| Mutation | **blocked** | Read-only audit. Findings below; no files edited. |

---

## Executive Summary

The homepage components show **strong craft in several areas**: thoughtful `prefers-reduced-motion` handling, well-structured responsive image `sizes`, semantic list markup with `role="list"`, and good i18n string extraction. However, there are **accessibility violations, design-system friction, and responsive typography issues** that should be addressed before this surface is considered production-hardened.

**Critical:** 2  
**Warning:** 6  
**Note:** 5

---

## Component Findings

### `HomeHero`

**Note — LCP-first motion strategy**  
`initial={false}` on the `motion.div` disables entrance animation on first render. This is a defensible performance choice (text and image paint immediately, aiding LCP), but the staggered variants are effectively dead code for the initial view. Consider documenting this choice or replacing with a CSS `@keyframes` reveal that does not block the main thread and cannot hydrate mismatch.

**Warning — Aggressive text constriction on mobile**  
`.hero-title` sets `max-width: 18rem` at base breakpoint with `font-size: 2.62rem` (~42 px). At a root size of 16 px, 18 rem = 288 px, yielding roughly 9–11 glyphs per line for Greek/Russian text. Combined with `overflow-wrap: anywhere`, this forces extreme word-breaking. The title becomes a tall, fragmented stack. **Recommendation:** raise base `max-width` to at least `14rem` or remove the mobile `max-width` and let `text-wrap: balance` handle line breaks with `padding-inline` containment.

**Note — `overflow-wrap: anywhere` on headings**  
`overflow-wrap: anywhere` on `.hero-title` and `.hero-lead` will break words at any point if needed. For a medical site where terms like "Ωτορινολαρυγγολόγος" appear, this can destroy readability. Prefer `overflow-wrap: break-word` (breaks only when content would otherwise overflow) or rely on `hyphens: auto` with a correct `lang` attribute.

---

### `HomeAdvantagesSection`

**Warning — Silent content truncation**  
`const items = section.items.slice(0, 4);` silently drops any CMS items beyond the fourth. A content editor can add a fifth advantage and never see it. **Recommendation:** either render all items (grid will wrap naturally) or surface a CMS validation rule / console warning when `items.length > 4`.

**Note — Fragile React keys**  
`key={\`${item.title ?? "a"}-${index}\`}` produces duplicate keys if two items lack titles. Use the CMS document ID or slug if available.

**Note — Empty state gap**  
If `items.length === 0` the component returns `null`. The section vanishes without trace. In a CMS-driven page this is acceptable, but consider whether a skeleton or placeholder should appear during ISR/revalidation to prevent layout shift.

---

### `MenuAccessGrid`

**Critical — Nested interactive elements in `HomeVideoTheater` (also relevant here as pattern)**  
*(See `HomeVideoTheater` below for the primary violation.)* `MenuAccessGrid` itself is clean: each card is a single `<Link>` with non-interactive children.

**Warning — Focus indicator may fail WCAG 2.2**  
`.menu-access-card:focus-visible` sets `outline: none` and replaces it with `background: rgba(228, 237, 248, 0.26)`. Against a transparent/`#fff` background, this tint is roughly a 1.05:1 contrast change — far below the 3:1 required for a focus indicator (2.4.13, 2.4.7). **Recommendation:** add a 2 px outline or ring with `--accent` on focus-visible, or at minimum a visible box-shadow.

**Warning — Layout property animation**  
`.menu-access-card:hover, .menu-access-card:focus-visible { padding-left: 22px; }` with `transition: padding-left 200ms ease` animates a layout property. The shift is small (6 px), but it still triggers layout recalc on the compositor. **Recommendation:** replace with `transform: translateX(6px)` on the copy or arrow block.

**Note — `hyphens: auto` without `lang`**  
`.menu-access-card__copy strong` uses `hyphens: auto`. Browser hyphenation dictionaries require a `lang` attribute on the element or ancestor `<html>`. Verify that the page sets `lang={locale}` on `<html>` (Next.js i18n routing usually does), otherwise hyphenation will not fire and `overflow-wrap: anywhere` will take over, producing ugly breaks.

---

### `HomeTestimonialsTeaser` / `HomeTestimonialsTeaserQuotes`

**Warning — Specificity warfare with `!important`**  
`.actionBtn` declares **eight** `!important` rules fighting the design-system `ButtonLink`. This is a maintenance hazard: the component now owns button styling, not the system. Any token update (border-radius, height scale) must be patched here too. **Recommendation:** extend `ButtonLink` via a dedicated `size="small"` or `density="compact"` prop in the design system, or use a local CSS module that wins via cascade layering without `!important`.

**Warning — Parent/child alignment conflict**  
`.actions` has `justify-content: center`. The child `TestimonialsRatingBar` is passed `lg:justify-start lg:text-left`, but because the parent flex container centers the child (and the child does not grow), the `justify-start` class only affects internal flex distribution, not overall positioning. The rating bar stays centered on desktop. **Recommendation:** remove `lg:justify-start lg:text-left` from the child (it's misleading) or switch the parent to `justify-start` at `lg`.

**Warning — Missing `aria-controls` on expand buttons**  
`HomeTestimonialsTeaserQuotes` expand/collapse buttons toggle text visibility but lack `aria-controls` pointing to the clamped paragraph. Screen-reader users cannot reliably infer which quote they are expanding. **Recommendation:** give each paragraph a stable `id` and reference it via `aria-controls` on the button.

**Note — Fragile overflow detection**  
Overflow detection runs inside a single `requestAnimationFrame` after mount. If fonts load slowly (FOIT/FOUT) or if the user zooms, the clamped line count changes but the overflow state does not update. **Recommendation:** use a `ResizeObserver` on the text element or re-run detection on `window.resize`.

**Note — Duplicate React keys**  
`key={\`${q.author}-${i}\`}` collides if two testimonials are from the same author. Use the review ID or a content hash.

---

### `HomeVisitMapSection`

**Note — Map iframe lacks `title` clarity for screen readers**  
The iframe has `title={t.visitMapMapTitle}` which is good, but verify the i18n string is descriptive (e.g., "Map showing clinic location" not just "Map"). Also, `allowFullScreen` without a visible full-screen control is present; ensure the iframe toolbar provides one.

**Note — `white-space: pre-line` assumes plain-text CMS output**  
`.meta-value` renders `addressBlock` and `hours` with `white-space: pre-line`. If the CMS ever returns HTML (e.g., `<br>` tags wrapped in a block), the CSS will not collapse whitespace as expected. Current implementation returns strings, so this is safe, but it is a coupling risk.

---

### `HomeVideoTheater`

**Critical — Nested interactive elements (Link > button)**  
The entire video card is wrapped in `<Link href={ctaHref}>`, but the card also contains a `<button type="button" onClick={togglePlay}>`. HTML spec prohibits interactive content inside an `<a>` element. This causes:
- Unpredictable screen-reader behavior (some announce the link, others the button).
- Event bubbling fragility: the code uses `e.preventDefault(); e.stopPropagation();`, but keyboard activation (Enter/Space) on the button may still trigger the link in some browsers/assistive-tech combos.
- Invalid DOM nesting in HTML validators.

**Recommendation:** remove the outer `<Link>`. Make the card a `<div>` and add a separate "View all videos" link/button below or beside the video. The video and its play/pause button should live in a non-link container.

**Note — Unicode play/pause glyphs**  
`"⏸"` and `"▶"` are used as button content. These render differently across OS fonts and may be invisible or confusing with certain user font overrides. **Recommendation:** replace with inline SVG icons for consistency.

---

### `HomePromoCarousel`

**Note — Autoplay without visible pause control**  
The carousel auto-advances every 6.5 s and stops after user interaction. WCAG 2.2.2 (Pause, Stop, Hide) requires a mechanism to pause auto-updating content. While drag/touch stops autoplay, keyboard users may not discover this. **Recommendation:** add an explicit pause/play button or tab list that meets the "stop" requirement.

---

## Cross-Cutting Concerns

### Accessibility (a11y)

| Criterion | Status | Detail |
|---|---|---|
| 1.1.1 Non-text Content | ✅ Pass | Images have alt text; icons use `aria-hidden`. |
| 1.3.1 Info and Relationships | ⚠️ Warning | `HomeVideoTheater` nested interactive elements break semantic model. |
| 2.1.1 Keyboard | ⚠️ Warning | `MenuAccessGrid` focus indicator too subtle. |
| 2.2.2 Pause/Stop/Hide | ⚠️ Warning | Carousel autoplay lacks explicit pause control. |
| 2.4.7 Focus Visible | ❌ Fail | `MenuAccessGrid` focus background insufficient. |
| 2.5.5 Target Size | ✅ Pass | Touch targets appear ≥44 px. |
| 4.1.2 Name/Role/Value | ⚠️ Warning | Testimonial expand buttons lack `aria-controls`. |

### Performance

- **LCP candidate:** `HomeHero` image uses `priority` + well-crafted `sizes`. Good.
- **CLS risk:** `HomeHero` `aspect-ratio` changes across breakpoints (`16/10` → `4/3` → `5/6`). If the image srcset does not load instantly, the box may shift. The `aspect-ratio` CSS property prevents layout shift once styles load, but verify the image placeholder color matches `background: var(--surface-soft)` to minimize perceived flash.
- **Animation cost:** Framer Motion `variants` on hero use `opacity` and `transform` (GPU-friendly). No layout property animation here.
- **Third-party embed:** Google Maps iframe is `loading="lazy"`. Excellent.

### Responsive

- **Mobile nav:** `MenuAccessGrid` uses a 3×2 icon grid below 768 px, switching to 2-column row tiles at 768 px, then back to 3-column at 1160 px. The 3→2→3 transition is unusual but creates better tap targets in the middle range. Acceptable, though document the rationale.
- **Typography scale:** Hero title jumps from `2.62rem` → `3.3rem` → `3.9rem` → `5.2rem`. The jump from 3.9 to 5.2 at 1024 px is aggressive (1.33×). Consider adding an intermediate step at ~1200 px.
- **Container alignment:** `HomeHero` uses a hard `max-width: 1180px` while `HomeVisitMapSection` uses `1280px`. This creates a slight misalignment between the hero block and the map section on very wide screens. Unify on a single max-width token.

### Motion

- **Reduced motion:** `HomeVideoTheater` and `HomePromoCarousel` both respect `prefers-reduced-motion`. Excellent.
- **Hero motion:** `initial={false}` skips entrance animation. Documented above.
- **Ease curves:** Hero uses `[0.16, 1, 0.3, 1]` (approx. `ease-out-expo`). Good — no bounce, no elastic.

### Design System Consistency

- **Border pattern:** Both `HomeAdvantagesSection` and `MenuAccessGrid` use a hairline grid (`border-left` on container + `border-right`/`border-bottom` on cells). This is a recurring motif, not a side-stripe accent, so it does not trigger the absolute ban. However, ensure the pattern is tokenized (it repeats hard-coded `var(--color-stone-line, #d7dfeb)`).
- **Color strategy:** Restrained. The site uses tinted neutrals (`#f6f8fb` bone, `#0f2a4a` ink) with trust blue (`#2563a8`) as the sole accent. No `#000` or `#fff` — good. The strategy fits a medical product register.
- **Typography hierarchy:** Display serif (Instrument Serif) vs. body sans (Source Sans) creates strong register contrast. Heading sizes are well-differentiated.

---

## Prioritized Recommendations

1. **[Critical]** Fix `HomeVideoTheater` nested `<Link>` + `<button>` violation. Restructure so the video card is not a link wrapper. (Accessibility, HTML validity)
2. **[Critical]** Add visible focus indicators to `MenuAccessGrid` cards — `outline: 2px solid var(--accent)` or equivalent. (Accessibility)
3. **[Warning]** Remove `!important` explosion from `HomeTestimonialsTeaser` buttons; introduce a compact button variant in the design system. (Maintainability)
4. **[Warning]** Add `aria-controls` + stable IDs to testimonial expand/collapse buttons. (Accessibility)
5. **[Warning]** Widen `HomeHero` mobile `max-width` or remove it; `18rem` at `2.62rem` font size is excessively narrow. (Responsive, i18n)
6. **[Warning]** Add explicit pause control to `HomePromoCarousel` or document that keyboard focus stops autoplay. (Accessibility)
7. **[Warning]** Replace `padding-left` transition in `MenuAccessGrid` with `transform`. (Performance)
8. **[Note]** Unify max-width tokens across homepage sections (`1180px` vs `1280px`). (Visual consistency)
9. **[Note]** Add `ResizeObserver` to testimonial overflow detection. (Robustness)
10. **[Note]** Replace Unicode play/pause glyphs with SVG icons in `HomeVideoTheater`. (Cross-platform rendering)

---

## Next Steps

1. Confirm whether this audit should be followed by `impeccable polish` (fix the critical/warning items) or `impeccable harden` (add error states, i18n edge cases, loading skeletons).
2. Initialize `PRODUCT.md` and `DESIGN.md` so subsequent impeccable passes have canonical context and do not need to synthesize from `README.md`.
