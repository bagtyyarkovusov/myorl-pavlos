# Plan: Design System Blocker Fix-Up (Slices 8–10)

> Source PRD: `plans/design-system-blocker-fixup.md` — Post-Review Fix-Up for #92, #99, #101, #102

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: No new routes are introduced. Changes are confined to existing page components (contact, home, standard layouts) and global chrome (footer, tab bar, JSON-LD).
- **Schema shapes**:
  - `Page` content type already has `footerCategory` (`enum: services | patients | company | none`, default `none`).
  - `Page` SEO block will gain an optional `schemaType` string field for overriding the top-level structured-data `@type`.
  - `Clinic` already has `latitude` and `longitude` floats.
- **Key models**: `PageDTO`, `SeoDTO`, `NavigationNodeDTO`, `SectionDTO`, `FooterCategory`, `ContactClinicDTO`.
- **Third-party boundaries**: Google Maps embed iframe is the only external dependency; it must not reload on interaction and must carry a secure referrer policy.
- **Build pipeline**: `packages/shared-types` must be regenerated after any type changes so the Next.js frontend and Strapi backend share the same contract.

---

## Phase 1: ContactPage Map Hardening & Doc Cleanup

**User stories**: #3, #4, #10, #12

### What to build

The contact page renders a clinic list alongside a Google Maps embed. The map embed must be stable (no full reload when the user switches active clinics), must not mislead users with fake geographic pins, and must send a secure referrer policy. A shared plain-text extraction utility replaces the inline regex HTML stripper. Documentation deduplication removes the duplicated GitNexus block from `CLAUDE.md`.

### Acceptance criteria

- [ ] The map iframe carries `referrerPolicy="no-referrer-when-downgrade"`.
- [ ] Decorative pins that do not correspond to real lat/long coordinates are removed from the map UI.
- [ ] The iframe `src` is stable across clinic selections; external UI (highlight state, contact details) updates instead of forcing a reload.
- [ ] A shared HTML-to-plain-text utility exists and is used by the contact page for address fallback queries.
- [ ] `CLAUDE.md` contains only the `@AGENTS.md` reference; the embedded GitNexus block is removed.
- [ ] All contact-page behavior is covered by Vitest tests.

---

## Phase 2: Footer & Tab Bar Completion (Slice 8)

**User stories**: #1, #2, #7, #9

### What to build

The Strapi admin edit form for Pages shows `footerCategory` in a logically grouped field section. The frontend footer auto-populates its three link columns from the navigation tree filtered by `footerCategory`, sorted stably by `menuIndex` with slug tie-breaking. On mobile viewports the footer columns collapse into native accordion disclosures. The section tab bar is completely hidden when a page has zero or one siblings.

### Acceptance criteria

- [ ] `footerCategory` appears in the Strapi content-manager layout under a logical group (not dumped at the bottom).
- [ ] `SEED_VERSION` is bumped so the layout applies on next bootstrap.
- [ ] Footer columns on mobile render as `<details>`/`<summary>` accordion sections.
- [ ] Footer link sort is stable when two pages share the same `menuIndex`.
- [ ] `PRACTICE_SLUGS` and `PATIENTS_SLUGS` hard-coded arrays remain removed; all footer links are CMS-driven.
- [ ] Tab bar returns `null` when sibling count is `<= 1`.
- [ ] Tab bar active state uses the `trust` token for underline color.
- [ ] Mobile tab bar scrolls horizontally with a right-edge fade gradient on overflow.
- [ ] All behavior covered by Vitest tests.

---

## Phase 3: SEO Schema Refactor (Slice 9)

**User stories**: #5, #8, #13, #14

### What to build

Every page emits exactly one `<script type="application/ld+json">` tag containing a merged `@graph` array. The schema map is a pure data registry consumed by the layout composer; adding a new section-to-schema mapping requires editing only the registry, not JSX. Content editors can optionally set a `schemaType` override (e.g., `MedicalWebPage`, `AboutPage`) in the Strapi SEO tab, which replaces the default `WebPage` `@type` in the emitted JSON-LD.

### Acceptance criteria

- [ ] `seo-schema-map` registry is imported and used by the structured-data composer.
- [ ] Only one `<script type="application/ld+json">` tag is rendered per page, containing all schemas under `@graph`.
- [ ] `schemaType` override field flows through Strapi → validator → normalizer → DTO → composer.
- [ ] When `schemaType` is set, the top-level page schema uses that `@type`; otherwise it defaults to `WebPage`.
- [ ] FAQ sections contribute `FAQPage`, video sections contribute `VideoObject`, gallery sections contribute `ImageObject`, and contact sections contribute `ContactPoint` schema objects.
- [ ] Breadcrumb structured data is included for non-home pages.
- [ ] All behavior covered by Vitest tests.

---

## Phase 4: Motion Hardening & Polish (Slice 10)

**User stories**: #6, #11

### What to build

Scroll-triggered fade-up animations are gated by viewport width and `prefers-reduced-motion`, but they do not cause a React hydration mismatch on first paint. The unknown-section placeholder renders with CSS-module styles instead of inline styles. A reference audit page exists in Strapi (slug `design-system-audit`) that stacks all 10 section types for visual regression and developer onboarding.

### Acceptance criteria

- [ ] `MotionSection` initial render state matches the server-rendered markup (no hydration mismatch).
- [ ] Animations are disabled on viewports below the desktop breakpoint.
- [ ] Animations are disabled when `prefers-reduced-motion: reduce` is active.
- [ ] `UnknownSection` uses CSS-module classes and design tokens; no inline `style` props remain.
- [ ] A `design-system-audit` Strapi page is created with `pageType: "content"` and all 10 section types in its `pageSections` dynamic zone.
- [ ] All behavior covered by Vitest tests.
