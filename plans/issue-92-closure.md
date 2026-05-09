# Plan: Issue #92 Design System Closure

> Source PRD: [#103](https://github.com/bagtyyarkovusov/gemini-export/issues/103) — completion PRD for [#92](https://github.com/bagtyyarkovusov/gemini-export/issues/92). Slices [#93](https://github.com/bagtyyarkovusov/gemini-export/issues/93)–[#102](https://github.com/bagtyyarkovusov/gemini-export/issues/102) are closed but the design system is not actually closed; the build is broken, JSON-LD is duplicated, the contact page is a stub, and several deep modules are unwired. This plan finishes the closure pass.

## Architectural decisions

Durable decisions that apply across every phase:

- **ADR-001 — Semantic DTO boundary preserved.** `toPageDTO` remains the only place that reads raw Strapi payloads. New fields (`schemaType` override) flow through `strapi-validators.ts` → `page-normalizer.ts` → `lib/cms/types/page.ts` → `packages/shared-types/src/index.ts`. React components never branch on Strapi shape.
- **ADR-006 — `pageSections` DynamicZone is the single section container.** All section rendering reads from `pageSections` via the DTO boundary. No alternative section sources are introduced.
- **ADR-007 — Hybrid Tailwind v4 + CSS Modules styling.** Tailwind utilities for spacing/color/layout primitives; CSS Modules for responsive behavior, pseudo-elements, keyframes, and any non-trivial styling. No new inline `style={{ … }}` blocks for design intent.
- **Server/client separation.** `import "server-only"` modules (notably `getCmsConfig`) are read only inside server components or request-scoped paths. They are NEVER read at module top-level of files that are imported by the not-found / error / static-asset paths.
- **Single page-level JSON-LD entry point.** `StructuredDataComposer` is the only emitter of page-level JSON-LD. Page layouts do not render their own `<StructuredData>` tags; they pass data into the composer (or the composer reads it from the DTO + props).
- **SEO schema map is the source of truth.** Section-to-schema mapping lives in `lib/structured-data/seo-schema-map.ts`. The composer consumes the map; new section schemas are added by editing the map, not by editing JSX.
- **Contact map final behavior (blocker-fix wins).** Stable Google Maps `<iframe>` source derived from `globalSettings`. No fake pins. Iframe `src` does not change when a clinic is selected — clinic clicks update local list/UI state only. Map is hidden entirely when no clinic has coordinates.
- **Motion breakpoint = `>1024px`.** Scroll-triggered motion runs only on desktop above 1024px AND only when `prefers-reduced-motion: no-preference`. Below 1024px or with reduced-motion, sections render to final state immediately.
- **Homepage section order is code-enforced.** `sortHomeSections` deep module remains the single source of truth for ordering and injection markers. CMS reordering does not affect the live rendered order.
- **Build gates are non-negotiable.** The five commands (`typecheck`, `build` × frontend+backend, `test` × frontend+backend) must pass without ad-hoc env juggling before #92 closes.
- **Idempotent seeds only.** The Strapi audit-page seed must be safe to run on every boot — create-or-update by `(slug, locale)`, no duplicates, no destructive writes to existing content.

---

## Phase 1: Build-health unblock

**User stories:** 1, 2, 3 (maintainer build gates).

### What to build

A no-feature pass that gets every PRD #103 gate command passing in a clean checkout with no env tricks. The only known concrete defect: `frontend/src/app/layout.tsx` calls `getCmsConfig()` at module top-level, which makes the static `_not-found` page fail to build whenever `STRAPI_URL` is unset. Defer that read so the not-found path no longer requires CMS env. Verify backend build succeeds against the `footerCategory`-extended schema. If any other build/typecheck/test failure surfaces, fix the smallest possible root cause — no refactors, no scope expansion.

Pre-PRD #103 the slice work landed but no one re-ran the full matrix end-to-end against a fresh checkout. This phase rebaselines so later phases can trust the "tests pass" signal.

### Acceptance criteria

- [ ] `npm run typecheck --prefix frontend` exits 0
- [ ] `npm run build --prefix frontend` exits 0 with no environment variables set beyond `NEXT_PUBLIC_SITE_URL` defaulting
- [ ] `npm run build --prefix backend` exits 0 against the current schema
- [ ] `npm test --prefix frontend` exits 0
- [ ] `npm test --prefix backend` exits 0
- [ ] `npm run lint --prefix frontend` exits 0
- [ ] `npm run format:check --prefix frontend` exits 0
- [ ] `getCmsConfig()` is never called at module top-level of any file in the not-found / root-layout / static-asset import graph
- [ ] Recorded gate-command output committed under `docs/issue-92-design-system-audit.md` (initial section — full audit lands in Phase 6)

---

## Phase 2: DTO + shared-types completeness for `schemaType` override

**User stories:** 4, 5, 6, 14.

### What to build

Add the `schemaType` SEO override field along the full semantic DTO boundary so editors can tag a page as `MedicalWebPage`, `AboutPage`, etc., without code changes. Validate the existing `footerCategory` end-to-end flow with a real test that exercises CMS pages → site context → footer render (not just the isolated link-builder unit). No render changes yet — just data plumbing and the regression coverage that proves it.

### Acceptance criteria

- [ ] `shared.seo` (or `Page` if simpler given current schema) gains a `schemaType` enumeration with the agreed values plus `null`/unset default
- [ ] Strapi schema export round-trips through `npx strapi build` cleanly
- [ ] `strapi-validators.ts` Zod schema accepts the new field as `nullish`
- [ ] `toPageDTO` populates `seo.schemaType` (or equivalent placement) without leaking raw Strapi shape into components
- [ ] `lib/cms/types/page.ts` and `packages/shared-types/src/index.ts` export the matching union and re-export to consumers
- [ ] Normalizer parity tests cover `schemaType` defined / null / undefined / invalid (rejected)
- [ ] An integration test renders the footer from a fixture set of pages with mixed `footerCategory` values and asserts column grouping, `menuIndex` sort, locale labels, and "Book online" injection — exercising the real `SiteFooter` + `buildFooterLinks` path
- [ ] All Phase 1 gates remain green

---

## Phase 3: Single structured-data composer

**User stories:** 12, 13, 14.

### What to build

Make `StructuredDataComposer` the only page-level JSON-LD emitter. It must consume `seo-schema-map.ts` instead of carrying its own `switch`, emit both `ContactPoint` and `MedicalBusiness` for contact sections (extending the schema map accordingly), honor the `seo.schemaType` override from Phase 2 to swap `WebPage` for variants like `MedicalWebPage`, and receive `siteUrl` / `globalSettings` / `homeTestimonials` / `aggregateRating` as props rather than calling `getCmsConfig()` from inside a component. Every page-layout component (`HomePage`, `ContactPage`, `QuestionListPage`, `GalleryPage`, `SectionIndexPage`) must stop rendering its own `<StructuredData>` tags — anything they previously emitted (medicalBusiness, breadcrumbs, FAQ, contactPoint) is now produced by the composer.

### Acceptance criteria

- [ ] `StructuredDataComposer` calls `getSectionSchemas` (or equivalent) from `seo-schema-map.ts`; no per-section `switch` remains in the composer
- [ ] `seo-schema-map.ts` declares both `ContactPoint` and `MedicalBusiness` for `sections.contact`
- [ ] `seo.schemaType` override swaps the WebPage `@type` (e.g., `MedicalWebPage`) end-to-end, asserted by test
- [ ] Composer takes `siteUrl` and any other env-derived values via props; no `import "server-only"` env reads happen inside the composer
- [ ] Every page layout that previously rendered `<StructuredData>` is reduced to passing data into the composer (or relying on the composer's auto-emission). No `<StructuredData>` JSX outside the composer except the existing low-level primitive it wraps
- [ ] Integration test on a representative page (e.g., contact + FAQ + video + gallery) asserts a single consolidated graph: exactly one `WebSite`, one `WebPage`, one `BreadcrumbList`, one `MedicalBusiness`, the section schemas from the map, no duplicates
- [ ] Build/test/typecheck/lint/format all green

---

## Phase 4: Unknown section dispatch + homepage ordering verification

**User stories:** 7, 8, 9, 10, 11.

### What to build

Confirm and harden the wiring: any section whose `__component` is not in the known set must be dispatched to `UnknownSection` from `DefaultSectionRenderer`, render through `PageSection` with normal index-based background alternation, show heading + "Content updating" + dev-only badge, and avoid error styling. Replace the inline-style block in `UnknownSection` with a co-located CSS Module to satisfy ADR-007. Add an integration-style test that asserts `HomePage` renders sections in the fixed order produced by `sortHomeSections` against a deliberately reordered/missing/duplicated/unknown CMS input — proving the deep module is actually consumed in the real render path, not just unit-tested in isolation.

### Acceptance criteria

- [ ] `DefaultSectionRenderer` (or upstream dispatch) routes any unknown `__component` to `UnknownSection`; tested with a synthetic component name
- [ ] `UnknownSection` styling lives in a CSS Module; no inline `style={{}}` for visual intent. Dev-only badge controlled by `process.env.NODE_ENV` is preserved
- [ ] Background alternation cadence is verified across a sequence of known + unknown sections (asserted via rendered class / data-attribute)
- [ ] `HomePage` integration test feeds CMS sections in non-canonical order plus injected unknowns and asserts the rendered output is in the canonical sequence with correct injected blocks (`MenuAccessGrid`, `HomeTestimonialsTeaser`, `HomeVisitMapSection`)
- [ ] Build/test/typecheck/lint/format all green

---

## Phase 5a: Motion breakpoint final value

**User stories:** 18, 19.

### What to build

A surgical change to align `MotionSection` with the PRD's final motion contract: desktop motion runs only above `1024px`, and `prefers-reduced-motion: reduce` always disables it. Audit any other Framer Motion / scroll-trigger sites in the codebase (e.g., `ScrollToTopButton`, home theater components, testimonial quotes) for the same breakpoint mismatch and bring them in line. No new motion behavior, no new components.

### Acceptance criteria

- [ ] `MotionSection` uses `(min-width: 1024px)` for the desktop check
- [ ] Any other scroll-triggered motion site that hard-codes a breakpoint matches `>1024px`
- [ ] Test asserts `MotionSection` renders without animation props when `matchMedia` reports `<1024px`
- [ ] Test asserts `MotionSection` renders without animation props when reduced-motion is preferred, regardless of width
- [ ] Build/test/typecheck/lint/format all green

---

## Phase 5b: Contact page rebuild (split-screen + map)

**User stories:** 5, 15, 16, 17, 20.

### What to build

Replace the current `ContactPage` stub with the design-system layout the PRD calls for. The page renders, on desktop, a 45/55 split-screen: left column has the page header, contact band (clickable phone/email/hours), and a clinic accordion list; right column has a stable Google Maps `<iframe>` whose `src` comes from `globalSettings` and never changes after mount. On mobile the columns stack vertically (header → contact band → clinic list → collapsible map). A `useClinicSelection` hook (or equivalent) holds the currently expanded clinic in local UI state; clicking a clinic in the list expands its details and scrolls it into view, but does NOT change the map iframe source. If no clinic in the section has coordinates, the map block is hidden entirely. Tab bar, breadcrumbs, and content body remain. JSON-LD continues to come from the composer (Phase 3) — no `<StructuredData>` tags are added here. Manual a11y verification (keyboard, focus-visible, screen reader landmarks) is part of acceptance.

### Acceptance criteria

- [ ] Desktop layout is split-screen with a sticky left column up to a defined max-width; mobile layout stacks
- [ ] Map iframe is rendered with a single `src` derived from `globalSettings`, mounted once, and never reloads on clinic selection
- [ ] Clicking a clinic in the list toggles its accordion panel and scrolls into view; map state is unchanged
- [ ] Map is omitted when no clinic has coordinates; the rest of the page still renders
- [ ] Phone numbers render as `tel:` links and emails as `mailto:` links
- [ ] All interactive controls (clinic toggles, contact links, tab bar) have visible focus rings and are keyboard-operable
- [ ] No new `<StructuredData>` tags inside `ContactPage`; JSON-LD is asserted to come from the composer
- [ ] Component tests cover: clinic toggle behavior, map hidden when no coords, map src stability across selection, keyboard activation
- [ ] Manual a11y spot check recorded in the audit doc (Phase 6)
- [ ] Build/test/typecheck/lint/format all green

---

## Phase 6: Strapi audit-page seed + closure evidence

**User stories:** 21, 22, 23, 24, 25.

### What to build

Add a build-safe, idempotent backend bootstrap seed that ensures a `design-system-audit` page exists in each supported locale, populated with one of every section component so the page can serve as a visual regression baseline, an editor reference, and an a11y checklist target. The seed must create-or-update by `(slug, locale)`, never duplicate on reboot, and never overwrite editor changes to existing fields beyond the seed's intent (or, if simpler, only create when missing — document the choice). Wire the seed from `register`/`bootstrap`. Materialize the audit doc at `docs/issue-92-design-system-audit.md` so PRD #103's "source evidence" reference resolves: it captures the gap audit, per-phase outcomes, the final command-matrix output, and the manual a11y checklist results. Update issue history: comment on closed slice issues (#93–#102) where reality matches the closed status, comment on #92 and #103 with the evidence link, and close #92 + #103 only after the full command matrix is green and the a11y checks pass.

### Acceptance criteria

- [ ] `backend/src/bootstrap/seed-design-system-audit.ts` exists, exports a function called from the Strapi bootstrap entry point
- [ ] Running the backend twice in a row produces zero new pages on the second boot (idempotency proven by integration test or scripted check)
- [ ] Seed produces one `design-system-audit` page per supported locale containing one of every of the 10 section types
- [ ] `docs/issue-92-design-system-audit.md` exists with: original gap audit, per-phase outcomes, command-matrix transcript, manual a11y checklist results
- [ ] Manual checks performed and recorded for: keyboard nav, focus-visible rings, axe / Lighthouse spot-check on the audit page, reduced-motion respect, screen-reader landmark order on home + service-article + contact + audit-page surfaces
- [ ] Final command matrix recorded passing (typecheck, both builds, both test suites, lint, format:check)
- [ ] Comment on each of #93–#102 with the closure-evidence link (only where audit confirms slice intent is met)
- [ ] Comment on #92 and #103 with the closure-evidence link
- [ ] #92 and #103 closed only after every gate above is green
