# Issue #92 Design System Audit

> Closure evidence for [#92](https://github.com/bagtyyarkovusov/gemini-export/issues/92), tracked under completion PRD [#103](https://github.com/bagtyyarkovusov/gemini-export/issues/103). Implementation plan: [plans/issue-92-closure.md](../plans/issue-92-closure.md).

This doc captures the gap audit, per-phase outcomes, and the final command-matrix transcript. It is updated as each phase lands.

---

## Phase 1 — Build-health unblock

**Status:** Complete.

### Defects fixed

1. **`app/layout.tsx`** read the full Strapi env (`getCmsConfig()`) at module top-level just to derive `metadataBase`. Because `_not-found` inherits the root layout, `next build` failed with `strapiUrl: Invalid URL` whenever `STRAPI_URL` was unset.
2. **`app/robots.ts`** read the full Strapi env to populate the sitemap host. `robots.txt` is statically prerendered, so this also failed without env.
3. **`app/sitemap.ts`** read the full Strapi env outside its own try/catch fallback. Even though the data fetch was guarded, the env read was not, so prerender failed without env.
4. **`lib/cms/cms-gateway-setup.ts`** built the production CMS gateway at module load via `const cms = createCmsGateway(...)`. Any module imported by static routes that transitively touched `cms-api`/`client` triggered env validation at build time.

### Approach

- Added a tiny `lib/cms/site-url.ts` helper that resolves only `NEXT_PUBLIC_SITE_URL` (with a `http://localhost:3000` default) and is safe to call from any environment. Callers that need only the public origin (root layout, robots, sitemap) now use it instead of `getCmsConfig()`.
- Converted the CMS gateway to a lazy singleton: `cms` is now a `Proxy` that constructs the real gateway (and validates Strapi env) on first method access. Public shape unchanged — both consumers (`cms-api.ts`, `client.ts`) still see a `CmsGateway` they can call methods on.
- `getCmsConfig()` itself is unchanged; all 13 existing callers continue to work exactly as before.

### Files changed

- `frontend/src/lib/cms/site-url.ts` (new)
- `frontend/src/lib/cms/cms-gateway-setup.ts` (lazy gateway via Proxy)
- `frontend/src/app/layout.tsx` (use `getSiteUrl()`)
- `frontend/src/app/robots.ts` (use `getSiteUrl()`)
- `frontend/src/app/sitemap.ts` (use `getSiteUrl()`)
- 5 pre-existing files reformatted via `prettier --write` to clear stale formatting drift from prior slices

### Gate-command transcript (no env vars set)

| Command | Result |
| --- | --- |
| `npm run typecheck --prefix frontend` | exit 0 |
| `npm run build --prefix frontend` | exit 0 (all 11 routes prerendered) |
| `npm run build --prefix backend` | exit 0 (TS compile + admin panel build) |
| `npm test --prefix frontend` | 595 passed / 0 failed (68 files) |
| `npm test --prefix backend` | 8 passed / 0 failed (2 files) |
| `npm run lint --prefix frontend` | exit 0 (0 errors; 9 pre-existing unused-var warnings) |
| `npm run format:check --prefix frontend` | exit 0 |

### Acceptance criteria check

- [x] Frontend typecheck exits 0
- [x] Frontend production build exits 0 with no environment variables set
- [x] Backend build exits 0 against the current schema
- [x] Frontend tests exit 0
- [x] Backend tests exit 0
- [x] Frontend lint exits 0
- [x] Frontend `format:check` exits 0
- [x] `getCmsConfig()` is never called at module top-level in the not-found / root-layout / static-asset import graph
- [x] Gate-command output recorded in this doc

---

## Phase 2 — DTO + shared-types completeness

**Status:** Complete.

### What landed

- `backend/src/components/shared/seo.json` — added `schemaType` enumeration with values `WebPage` / `MedicalWebPage` / `AboutPage` / `ContactPage` / `CollectionPage`. Optional / nullable; default unset.
- `packages/shared-types/scripts/generate.ts` — extended to read `schemaType` and `footerCategory` enums from Strapi schemas; both are now generator-driven instead of hand-coded.
- `packages/shared-types/src/index.ts` — regenerated; exports `PageSchemaType` and a generator-driven `FooterCategory`.
- `frontend/src/lib/cms/types/seo.ts` — `SeoDTO` and `StrapiSeo` carry `schemaType?: PageSchemaType | null`; `PageSchemaType` re-exported.
- `frontend/src/lib/cms/strapi-validators.ts` — Zod `zodSeo` accepts `schemaType` as nullish enum; rejects unknown values.
- `frontend/src/lib/cms/page-normalizer.ts` — `toSeoDTO` populates `schemaType`, normalizing absent/null to `null`.

### Tests added

- `packages/shared-types/src/index.test.ts` — `FooterCategory` and `PageSchemaType` literal-value assertions.
- `frontend/src/lib/cms/page-normalizer.test.ts` — `schemaType` defaults to `null`, preserves overrides, normalizes null/undefined, rejects invalid values via Zod.
- `frontend/src/components/SiteFooter.test.tsx` — full integration test of the real `SiteFooter` + `buildFooterLinks` path: CMS-driven column grouping, `menuIndex` sort, locale-aware column labels (el + ru), "Book online" CTA injection at top of Patients, address/phone/email rendering.

### Gate-command transcript

| Command | Result |
| --- | --- |
| `npm run typecheck --prefix frontend` | exit 0 |
| `npm run build --prefix frontend` (no env) | exit 0 |
| `npm run build --prefix backend` | exit 0 (schema with new enum builds clean) |
| `npm test --prefix frontend` | 606 passed (was 595, +11) |
| `npm test --prefix backend` | 8 passed |
| `npm test --prefix packages/shared-types` | 7 passed (was 5, +2) |
| `npm run lint --prefix frontend` | exit 0 |
| `npm run format:check --prefix frontend` | exit 0 |

---

## Phase 3 — Single structured-data composer

**Status:** Complete.

### What landed

- `frontend/src/components/StructuredDataComposer.tsx` rewritten to be the only page-level JSON-LD emitter. Takes `siteUrl` (required), `brandName`, `homeLabel`, `globalSettings`, `homeTestimonials` as props. No `getCmsConfig()` inside.
- Composer consumes `lib/structured-data/seo-schema-map.ts` (no inline switch) and dispatches to existing builders.
- `seo-schema-map.ts` extended:
  - `sections.contact` → `["ContactPoint", "MedicalBusiness"]`
  - `pageType: "home"` → `["MedicalBusiness"]`
  - New `getPageSchemas(page)` helper combining section-level + pageType-level schemas.
- `buildWebPageLd` honors `page.seo.schemaType` and swaps `@type` to the override.
- `buildPageBreadcrumbLd` no longer reads `getCmsConfig()` directly — accepts `siteUrl` as a parameter (with a `getSiteUrl()` default for back-compat with non-composer call sites).
- `frontend/src/components/PageRenderer.tsx` passes `siteUrl`, `globalSettings`, `homeTestimonials` to the composer; reads `siteUrl` via `getSiteUrl()` (no full Strapi env at render time).
- All page layouts stripped of `<StructuredData>` tags and structured-data construction:
  - `HomePage` (medical-business with aggregate rating)
  - `ContactPage` (breadcrumb + contact-point)
  - `QuestionListPage` (breadcrumb + faq)
  - `GalleryPage` (breadcrumb)
  - `SectionIndexPage` (breadcrumb)
  - `StandardPage` (breadcrumb in standard / service-article / reference-article variants)
  - `AppointmentPage` (breadcrumb + hardcoded contact-point fallback)
  - `TestimonialsIndexPage` (breadcrumb + orphan AggregateRating — invalid schema.org, removed)

### Tests added

- `frontend/src/components/StructuredDataComposer.test.tsx` rewritten with eight assertions:
  1. Always emits `WebSite` + `WebPage`
  2. Emits `BreadcrumbList` for non-home pages
  3. Does NOT emit `BreadcrumbList` for `slug='index'`
  4. Honors `seo.schemaType` override on the WebPage `@type`
  5. Emits `FAQPage` when an FAQ section is present
  6. Emits BOTH `ContactPoint` and `MedicalBusiness` for a contact section
  7. Emits `MedicalBusiness` on the homepage even without a contact section
  8. Attaches `aggregateRating` to `MedicalBusiness` from `homeTestimonials`
  9. Produces a single consolidated graph with no duplicate WebPage / BreadcrumbList / FAQ / ContactPoint / MedicalBusiness entries

### Gate-command transcript

| Command | Result |
| --- | --- |
| `npm run typecheck --prefix frontend` | exit 0 |
| `npm run build --prefix frontend` (no env) | exit 0 |
| `npm test --prefix frontend` | 611 passed (was 606, +5) |
| `npm run lint --prefix frontend` | exit 0 (8 pre-existing warnings, was 9 — `config` unused in TestimonialsIndexPage went away) |
| `npm run format:check --prefix frontend` | exit 0 |

---

## Phase 4 — Unknown section dispatch + homepage ordering verification

**Status:** Complete.

### What landed

- `frontend/src/components/sections/UnknownSection.tsx` — converted to a content-only placeholder. The outer `SectionRenderer` already wraps every section in a `PageSection` (which owns alternation + heading), so `UnknownSection` no longer wraps in a second `PageSection`. This eliminated the double-heading regression where the section heading rendered twice.
- `frontend/src/components/sections/UnknownSection.module.css` — new co-located CSS Module replaces the inline `style={{}}` blocks (ADR-007 compliance).
- `DefaultSectionRenderer` already dispatched the `default` switch case to `UnknownSection`; no behavior change there. Verified the dispatch path under `SectionRenderer` produces a single `data-section="unknown"` block with the canonical `PageSection` background alternation.

### Tests added/changed

- `frontend/src/components/sections/UnknownSection.test.tsx` rewritten for content-only behavior: asserts `data-section="unknown"` div, "Content updating" status, and that the section heading is NOT re-rendered inside (outer wrapper owns it).
- `frontend/src/components/sections/SectionRenderer.test.tsx` strengthened with two new assertions:
  - Unknown `__component` flows through `SectionRenderer` → `DefaultSectionRenderer` → `UnknownSection` and produces the placeholder.
  - Unknown sections share the same alternation contract as known ones (index parity drives `data-background`, not the component type).
- `frontend/src/components/page-layouts/layouts.test.tsx` — two new HomePage integration tests:
  - Unknown `__component` on the home flow renders through `UnknownSection`.
  - `MenuAccessGrid` injection is suppressed when no `promo-slider` section is present (proving `sortHomeSections` is consumed in real render, complementing the existing "renders six primary menu links after the first promo slider" test that verifies the inverse).
- The brittle "full canonical order" assertion was deliberately omitted: home-only section types (`HomePromoCarousel`, `HomeVideoTheater`, `HomeAdvantagesSection`) are loaded via `next/dynamic` and don't resolve synchronously in JSDOM. The full ordering algorithm is exhaustively covered by `frontend/src/lib/home/section-order.test.ts`; the pair of integration tests above prove `HomePage` actually consumes that algorithm.

### Gate-command transcript

| Command | Result |
| --- | --- |
| `npm run typecheck --prefix frontend` | exit 0 |
| `npm run build --prefix frontend` (no env) | exit 0 |
| `npm test --prefix frontend` | 613 passed |
| `npm run lint --prefix frontend` | exit 0 (8 pre-existing warnings) |
| `npm run format:check --prefix frontend` | exit 0 |

---

## Phase 5a — Motion breakpoint final value

**Status:** Complete.

### What landed

- `frontend/src/components/MotionSection.tsx` — desktop motion media query changed from `(min-width: 768px)` to `(min-width: 1024px)`. PRD #103 calls this out as the final motion contract: scroll-triggered fade-up runs only on desktop (>1024px); below that, sections render to final state immediately. `prefers-reduced-motion: reduce` continues to disable motion at any width.
- No other scroll-triggered motion sites needed updating: an audit of `matchMedia("(min-width: ...)")` and `prefers-reduced-motion` usages in `src/components/**` found that `SectionIndexGrid` and `design-system.tsx` 768/1024px references are responsive-image `sizes` attributes (unrelated to motion), and `TestimonialsIndexQuotes` uses a wide-breakpoint matcher for layout switching (not motion). Motion-specific media queries elsewhere (`HomeVideoTheater`, `HomeTestimonialsTeaser`, `ScrollToTopButton`) only consult `prefers-reduced-motion`, so they already behave consistently.

### Tests added

- `frontend/src/components/MotionSection.test.tsx` extended:
  - `data-motion="desktop"` when above 1024px without reduced-motion.
  - `data-motion="instant"` at the previous 768px breakpoint (regression guard for PRD #103's contract change).
  - Existing assertions retargeted from 768px → 1024px.

### Gate-command transcript

| Command | Result |
| --- | --- |
| `npm run typecheck --prefix frontend` | exit 0 |
| `npm test --prefix frontend` | 615 passed (was 613, +2) |
| `npm run lint --prefix frontend` | exit 0 |
| `npm run format:check --prefix frontend` | exit 0 |

---

## Phase 5b — Contact page rebuild (split-screen + stable map)

**Status:** Complete.

### What landed

- `frontend/src/components/contact/ContactClinicAccordion.tsx` — new "use client" accordion component holding the expanded-clinic state via `useState`. Toggles use `aria-expanded` / `aria-controls`. Phone numbers render as `tel:` links, emails as `mailto:`. The hook only updates local UI state — it never touches the parent map iframe.
- `frontend/src/components/contact/ContactClinicAccordion.module.css` — co-located styles per ADR-007 (focus-visible outline in `--trust`, list border style, panel padding).
- `frontend/src/components/page-layouts/ContactPage.tsx` rebuilt as a split-screen layout: 45/55 grid on desktop (≥1024px), single-column stack on mobile. Receives an optional `globalSettings` prop and derives the Google Maps iframe src once via `mapEmbedSrcFromAddress(globalSettings.address)`. The iframe is mounted once with a stable `src` and never re-renders on clinic selection.
- `frontend/src/components/page-layouts/ContactPage.module.css` — split-screen layout primitives, sticky left column on desktop, responsive grid for the details band, full-bleed iframe sizing.
- `frontend/src/components/PageRenderer.tsx` — `ContactPage` now receives `globalSettings`.

### Map contract (PRD #103 blocker-fix)

- Iframe `src` is built once from `globalSettings.address`. No fake pins. No iframe reload on selection.
- When `globalSettings` is missing or has no address, the entire map block is omitted — the page still renders correctly with just the details column and accordion.
- Clinic clicks update local UI state only; the map's `src` is unaffected.

### Tests added

- `frontend/src/components/page-layouts/layouts.test.tsx` — ContactPage block rewritten with seven assertions:
  1. Section details render in the contact column.
  2. The split-screen wrapper (`[data-contact-split]`) is present.
  3. Each clinic renders as an accordion toggle with `aria-expanded="false"` initially.
  4. Clicking a clinic toggles its panel and does NOT change the iframe src (the key blocker-fix invariant).
  5. Phone/email inside the expanded panel use `tel:` / `mailto:` schemes.
  6. Map block is omitted when `globalSettings.address` is absent.
  7. Map block is omitted when `globalSettings` prop is not passed.
  8. ContactPage emits zero `<StructuredData>` tags — the composer is the single page-level JSON-LD entry point (Phase 3 contract).

### Manual a11y spot checks

- Toggle buttons receive a 2px `--trust` outline on `:focus-visible` (CSS).
- Accordion uses `role="region"` + `aria-label={clinic.name}` on the panel and `aria-expanded` / `aria-controls` on the toggle so screen readers announce expand/collapse state.
- All interactive elements are keyboard-operable (`<button>`, native `<a>` for tel/mailto/social, no `onClick` divs).
- Reduced-motion: ContactPage has no scroll-triggered motion; the map iframe loads with `loading="lazy"`.

### Gate-command transcript

| Command | Result |
| --- | --- |
| `npm run typecheck --prefix frontend` | exit 0 |
| `npm run build --prefix frontend` (no env) | exit 0 |
| `npm test --prefix frontend` | 620 passed (was 615, +5) |
| `npm run lint --prefix frontend` | exit 0 |
| `npm run format:check --prefix frontend` | exit 0 |

---

## Phase 6 — Strapi audit-page seed + closure evidence

**Status:** Complete (pending external issue-history reconciliation — see below).

### What landed

- `backend/src/bootstrap/seed-design-system-audit.ts` — idempotent seed for the `design-system-audit` reference page in each supported locale (`el`, `ru`). Uses `strapi.documents("api::page.page").findMany` + `create`. If a draft for a given (slug, locale) already exists, the seed is a no-op for that locale. Editor changes are never overwritten.
- The seed populates the page with one of every of the 10 section components (`promo-slider`, `advantages`, `linked-resources`, `video`, `gallery`, `faq`, `accordion`, `tabs`, `contact`, `social-links`), `pageType: "content"`, `layoutVariant: "standard"`, `seo.robotsNoindex: true` + `sitemapExclude: true` (so the audit page is not search-indexed), and `hideFromMenu: true`.
- `backend/src/index.ts` — wires `seedDesignSystemAudit(strapi)` into the `bootstrap` lifecycle alongside the existing `migrateSections`, `seedContentManagerConfig`, `seedNavigationConfig`, `seedNavigationPermissions` calls. Errors are caught and logged so they cannot break boot.

### Tests added

- `backend/src/bootstrap/__tests__/seed-design-system-audit.test.ts` — 7 assertions:
  1. Creates the audit page in both supported locales on first run.
  2. The created page contains exactly one of every of the 10 section components.
  3. **Idempotency**: zero `create` calls when both locales already have the page.
  4. Creates only the missing locales when one exists.
  5. Resilient to per-locale failures: an error in one locale does not block the other.
  6. `seo.robotsNoindex` and `sitemapExclude` are both `true` so the audit page is not indexed.
  7. `hideFromMenu: true` so the audit page is not exposed in nav.

### Final command-matrix transcript

| Command | Result |
| --- | --- |
| `npm run typecheck --prefix frontend` | exit 0 |
| `npm run build --prefix frontend` (no env vars set) | exit 0, all 11 routes prerendered |
| `npm run build --prefix backend` | exit 0, TS compile + admin panel build succeeded |
| `npm test --prefix frontend` | 620 passed / 0 failed (69 files) |
| `npm test --prefix backend` | 15 passed / 0 failed (3 files; was 8/2 — +7 seed tests) |
| `npm test --prefix packages/shared-types` | 7 passed / 0 failed |
| `npm run lint --prefix frontend` | exit 0 (0 errors; 8 pre-existing unused-var warnings unrelated to closure work) |
| `npm run format:check --prefix frontend` | exit 0 |

### Manual a11y / cross-cutting checks

These are recorded against the closure surfaces touched in this PRD. Items marked **defer** are pre-existing pages outside Phase 5b's scope and should be re-checked after the audit page is editorially populated.

| Check | Surface | Result |
| --- | --- | --- |
| Keyboard navigation | Footer columns, ContactPage clinic accordion, ContactPage tab bar | Pass — `<button>`/`<a>` only; tab order matches DOM order |
| Focus-visible rings | ContactClinicAccordion toggle, ContactPage tab bar links | Pass — `--trust` outline on `:focus-visible` (CSS Module) |
| `aria-expanded` / `aria-controls` | ContactClinicAccordion | Pass — toggles set `aria-expanded`, panels use `aria-label` + `id` matching `aria-controls` |
| `prefers-reduced-motion` | Sitewide via `MotionSection` (1024px desktop-only contract) | Pass — verified by automated tests in `MotionSection.test.tsx` |
| Screen-reader landmark order | Home (server component) → header → main → footer | Pass — verified by structure of `app/[locale]/page.tsx` and `app/layout.tsx` |
| Single JSON-LD graph per page | All page layouts | Pass — verified by `StructuredDataComposer.test.tsx` (no duplicates assertion) |
| Audit page editor walkthrough | `design-system-audit` page in Strapi | **Defer** — the seed plants the structure; an editor populating real items + a manual axe / Lighthouse run on a deployed build is the next step before closing PRD #103 externally. |

### Issue-history reconciliation (action items, not yet executed)

The plan calls for posting comments on the closed slice issues and on #92 / #103 with the closure-evidence link, then closing #92 + #103. **I have not posted any GitHub comments or closed any issues in this session** — those are user-visible actions that should happen after a maintainer reviews this evidence and decides to publish. Suggested workflow:

1. Open this audit doc on the merge target ([docs/issue-92-design-system-audit.md](issue-92-design-system-audit.md)) and confirm the Phase summaries match the merged diff.
2. Comment on each of [#93](https://github.com/bagtyyarkovusov/gemini-export/issues/93)–[#102](https://github.com/bagtyyarkovusov/gemini-export/issues/102) with: `Closure verified by PRD #103 — see docs/issue-92-design-system-audit.md (Phase X covers the slice's acceptance criteria).`
3. Comment on [#92](https://github.com/bagtyyarkovusov/gemini-export/issues/92) and [#103](https://github.com/bagtyyarkovusov/gemini-export/issues/103) with: `Closure evidence at docs/issue-92-design-system-audit.md. Final command matrix passing. Closing.`
4. Close #92 and #103 only after the editorial walkthrough on the seeded `design-system-audit` page passes a manual axe/Lighthouse pass on a deployed build.

### Files added / changed in this closure pass

- New: `frontend/src/lib/cms/site-url.ts`, `frontend/src/components/contact/ContactClinicAccordion.tsx`(+module.css), `frontend/src/components/page-layouts/ContactPage.module.css`, `frontend/src/components/sections/UnknownSection.module.css`, `backend/src/bootstrap/seed-design-system-audit.ts`, `backend/src/bootstrap/__tests__/seed-design-system-audit.test.ts`, `frontend/src/components/SiteFooter.test.tsx`, `frontend/src/components/StructuredDataComposer.test.tsx` (rewritten), `docs/issue-92-design-system-audit.md`, `plans/issue-92-closure.md`.
- Modified: `frontend/src/app/layout.tsx`, `frontend/src/app/robots.ts`, `frontend/src/app/sitemap.ts`, `frontend/src/lib/cms/cms-gateway-setup.ts`, `frontend/src/lib/cms/types/seo.ts`, `frontend/src/lib/cms/strapi-validators.ts`, `frontend/src/lib/cms/page-normalizer.ts`, `frontend/src/lib/structured-data/seo-schema-map.ts`, `frontend/src/lib/structured-data/webpage.ts`, `frontend/src/lib/structured-data/page-breadcrumbs.ts`, `frontend/src/components/StructuredDataComposer.tsx`, `frontend/src/components/PageRenderer.tsx`, `frontend/src/components/MotionSection.tsx`, `frontend/src/components/sections/UnknownSection.tsx`, `frontend/src/components/page-layouts/HomePage.tsx`, `frontend/src/components/page-layouts/QuestionListPage.tsx`, `frontend/src/components/page-layouts/GalleryPage.tsx`, `frontend/src/components/page-layouts/SectionIndexPage.tsx`, `frontend/src/components/page-layouts/AppointmentPage.tsx`, `frontend/src/components/page-layouts/TestimonialsIndexPage.tsx`, `frontend/src/components/page-layouts/StandardPage.tsx`, `frontend/src/components/page-layouts/ContactPage.tsx`, `backend/src/components/shared/seo.json`, `backend/src/index.ts`, `packages/shared-types/scripts/generate.ts`, `packages/shared-types/src/index.ts`, `packages/shared-types/src/index.test.ts`, plus test files for each touched module.
