# Issue #92 Design System Audit

Audit date: 2026-05-08

Source PRD: GitHub issue #92, "PRD: Unified Context-Aware Design System for Strapi-Aligned Frontend"

Related slice issues: #93-#102. All slice issues were closed, but the parent issue #92 remains open and still has `needs-triage`.

## Summary

The issue #92 work is not fully complete. Several slices contain useful implementation, tests, and architectural groundwork, but the closed-slice state does not match the current repository state: frontend typecheck fails, frontend production build fails, backend build fails, and multiple acceptance criteria are either unwired or contradicted by the implementation.

Verdict: Request Changes.

## Evidence Reviewed

GitHub state:

- #92 is open, labeled `needs-triage`, with no comments.
- #93-#102 are closed and still labeled `needs-triage`.
- No pull requests were found for the issue/slice range.

Referenced implementation commits:

- `7643163` - `feat(frontend): add design system foundation slice`
- `66ad388` - `Complete design system service article slice`
- `c9b0e2f` - `feat(frontend): complete reference article layouts`
- `3d9ed4d` - `Implement dense index page variants`
- `1388ddc` - `Complete gallery lightbox and directory routing slices`
- `5e01438` - `feat: complete disclosure page interactions`
- `aa9a7c5` - `fix(design-system): resolve blockers for #99 #101 #102 merge`

Local verification:

- `npx gitnexus status` reported the index up to date at `aa9a7c5`.
- `npm test --prefix frontend` passed: 66 files, 595 tests.
- `npm run lint --prefix frontend` passed with 10 warnings.
- `npm test --prefix backend` passed: 2 files, 8 tests.
- `npm run typecheck --prefix frontend` failed.
- `npm run build --prefix frontend` failed.
- `npm run build --prefix backend` failed.
- `npm run format:check --prefix frontend` failed on `frontend/e2e/pages/testimonials-teaser.spec.ts` (reported as pre-existing in slice comments).

## Critical Issues

### 1. Frontend typecheck fails because `FooterCategory` is not exported

Files:

- `packages/shared-types/src/index.ts`
- `frontend/src/lib/cms/types/page.ts`

`frontend/src/lib/cms/types/page.ts` imports and re-exports `FooterCategory`, but `packages/shared-types/src/index.ts` does not define it. This blocks `npm run typecheck --prefix frontend`.

Command evidence:

```text
src/lib/cms/types/page.ts(1,15): error TS2305: Module '"@gemini/shared-types"' has no exported member 'FooterCategory'.
```

Impact:

- Slice #99 cannot be considered complete.
- The shared type contract was not regenerated or extended after adding `footerCategory`.
- Frontend CI would fail on typecheck.

### 2. Frontend production build fails because a client component imports `server-only`

Files:

- `frontend/src/components/page-layouts/ContactPage.tsx`
- `frontend/src/lib/cms/env.ts`

`ContactPage.tsx` is a client component and imports `getCmsConfig()` from `frontend/src/lib/cms/env.ts`, which imports `server-only`. Next.js rejects this in production build.

Command evidence:

```text
'server-only' cannot be imported from a Client Component module
Import traces:
  Client Component Browser:
    ./src/lib/cms/env.ts
    ./src/components/page-layouts/ContactPage.tsx
```

Impact:

- The app cannot build.
- Slice #95 and the overall PRD cannot be closed.

### 3. Backend build fails on the audit page seed data

File:

- `backend/src/bootstrap/seed-audit-page.ts`

`AUDIT_SECTIONS` is inferred with `__component: string`, so assigning it to `pageSections` fails Strapi's generated component union type during `strapi build`.

Command evidence:

```text
src/bootstrap/seed-audit-page.ts:44:9 - error TS2322
Type '{ __component: string; ... }[]' is not assignable to type ...
Types of property '__component' are incompatible.
Type 'string' is not assignable to type '"sections.video"'.
```

Impact:

- Backend build is broken.
- Slice #102's reference audit page acceptance criterion is not safely implemented.

### 4. Footer auto-generation does not receive `footerCategory` data

Files:

- `frontend/src/lib/cms/page-normalizer.ts`
- `frontend/src/lib/footer/build-footer-links.ts`

`buildFooterLinks()` filters navigation nodes by `node.footerCategory`, but `toPageDTO()` does not copy `footerCategory` from the Strapi payload into the DTO. `getSite()` fetches pages, normalizes them through `toPageDTO()`, then passes those DTOs into `buildNavigationTree()`, so footer categories are dropped before the footer sees them.

Impact:

- CMS-driven footer columns will be empty except for the hard-coded appointment link.
- Slice #99 acceptance criteria for CMS-driven footer columns and sorting are not met in real data flow.

## Major Issues

### 1. Unknown sections still render nothing

Files:

- `frontend/src/components/sections/SectionRenderer.tsx`
- `frontend/src/components/sections/DefaultSectionRenderer.tsx`
- `frontend/src/components/sections/UnknownSection.tsx`

`UnknownSection` exists, but it is not used by `SectionRenderer` or `DefaultSectionRenderer`. The default renderer still returns `null` for unrecognized `__component` values, so new Strapi sections still render as blank space.

Impact:

- Parent PRD pillar 10 is not satisfied.
- Slice #101 acceptance criterion "Unknown sections render graceful placeholder with alternation respected" is not met.

### 2. Homepage fixed ordering is not implemented

File:

- `frontend/src/components/page-layouts/HomePage.tsx`

The homepage still iterates `page.sections.map(...)` in CMS order. It injects `MenuAccessGrid` after the first promo slider and always appends `HomeVisitMapSection`, but it does not re-sort sections into the PRD order.

Impact:

- Reordering homepage sections in Strapi can still alter the rendered order.
- Slice #101's primary acceptance criterion is not met.

### 3. Structured data composer is implemented but not wired into rendering

Files:

- `frontend/src/components/PageRenderer.tsx`
- `frontend/src/components/StructuredDataComposer.tsx`
- `frontend/src/lib/structured-data/seo-schema-map.ts`

`PageRenderer` still renders `PageJsonLd`, which emits separate `WebSite` and `WebPage` `<script>` tags. Layouts such as `StandardPage`, `GalleryPage`, `SectionIndexPage`, and `ContactPage` then add additional `StructuredData` scripts for breadcrumbs and contact schemas.

The new `StructuredDataComposer` is not used by `PageRenderer`, and it hardcodes a switch over section components instead of consuming `seo-schema-map.ts`. The map also lists only `ContactPoint` for `sections.contact`, not the required `ContactPoint` + `MedicalBusiness`.

Impact:

- Slice #101 acceptance criteria for a federated schema map and merged JSON-LD are not met.
- The blocker fix-up plan's "exactly one JSON-LD script per page" requirement is not met.

### 4. Contact page map interaction acceptance criteria are not implemented

File:

- `frontend/src/components/page-layouts/ContactPage.tsx`

`ClinicMap` receives `clinics` but does not render pins or interactive clinic controls. The iframe source is fixed to the first mappable clinic, and selecting a clinic only expands the list item; it does not pan the map. Clicking a map pin cannot expand a clinic because no pins are rendered.

Impact:

- Slice #95 criteria for "map renders with pins", "clicking clinic pans map", and "clicking map pin expands clinic" are not met.
- Later blocker notes intentionally stabilize the iframe source, which conflicts with the original slice acceptance criteria.

### 5. Motion breakpoint is inconsistent with the blocker plan

File:

- `frontend/src/components/MotionSection.tsx`

`useDesktopMotion()` enables scroll animation at `(min-width: 768px)`. The blocker fix-up plan says animations are disabled below the desktop breakpoint, while the PRD's responsive model treats desktop as `>1024px`.

Impact:

- Tablets between 768px and 1024px still get scroll-triggered section animations.
- Slice #102 motion acceptance is only partially satisfied depending on which breakpoint contract is authoritative.

### 6. Slice #102 HITL acceptance criteria were closed without evidence

GitHub issue #102's completion comment explicitly marks these as requiring manual QA / HITL review:

- Color contrast ratios pass WCAG AA.
- All interactive elements are keyboard accessible.
- Screen readers correctly announce page structure.
- Focus rings visible on all focusable elements.
- Core Web Vitals meet targets.

The code also contains multiple `focus-visible { outline: none; }` paths where the replacement indication is only color/background change, so the "focus rings visible" criterion should not be treated as complete without actual inspection.

Impact:

- Slice #102 should not be closed as fully accepted.
- Parent PRD accessibility and performance requirements remain open.

## Slice Completion Matrix

| Issue | Slice | Status | Notes |
| --- | --- | --- | --- |
| #93 | Foundation | Mostly complete, not independently shippable | Tokens, `PageSection`, `MotionSection`, density context, and `Card` exist. Global build failures still prevent acceptance. |
| #94 | Service article | Mostly complete | Page hero variants, service layout, sidebar, mobile CTA, and prose variant exist. Not blocked by slice-specific logic, but full app build fails. |
| #100 | Reference articles | Mostly complete | Compact/journal heroes, TOC/sidebar, prose variants, and callouts exist. Full app build still fails. |
| #95 | Contact page | Incomplete | Contact split layout exists, but map pins and bidirectional map/list interaction are missing; client/server import breaks frontend build. |
| #96 | Gallery/lightbox | Mostly complete | Lightbox keyboard, swipe, captions, focus trap, and 4:3 grid are present. Focus visibility on image trigger should still be manually checked. |
| #97 | Disclosure pages | Mostly complete | FAQ/accordion/tabs interaction and ARIA are implemented with tests. |
| #98 | Index pages | Mostly complete | Variant grids/lists, empty state, and load-more behavior exist. Focus styling should be checked. |
| #99 | Footer + tab bar | Incomplete | Schema field exists, but `FooterCategory` type export and DTO propagation are missing, so footer auto-generation cannot work in the live flow. |
| #101 | Homepage + unknown + SEO map | Incomplete | Homepage ordering is not enforced, `UnknownSection` is not wired, and `StructuredDataComposer`/schema map are not used by page rendering. |
| #102 | Motion + accessibility + polish | Incomplete | Motion exists but breakpoint is questionable; audit page seed breaks backend build; manual accessibility/performance criteria remain unverified. |

## Positive Findings

- The work added meaningful focused tests around many new units: `MotionSection`, `PageSection`, `Card`, `PageHero`, `Lightbox`, `SectionIndexGrid`, footer link grouping, schema builders, and disclosure interactions.
- The DTO boundary was extended for `schemaType`, and the `buildWebPageLd()` override path is present.
- The gallery lightbox covers keyboard navigation, swipe gestures, captions, focus trap, and return-focus behavior.
- The reference article layouts include generated heading IDs and sidebars without exposing raw Strapi section shapes directly to most layout components.

## Recommended Fix Order

1. Restore build health:
   - Export `FooterCategory` from `@gemini/shared-types` and regenerate/build shared types.
   - Move contact structured-data construction out of the client `ContactPage` or pass prebuilt data from a server component.
   - Type `AUDIT_SECTIONS` with literal `__component` values or another Strapi-compatible input type.

2. Fix real data flow:
   - Add `footerCategory` to `StrapiPagePayload`, `toPageDTO()`, and `PageDTO` or create a separate navigation DTO normalizer that preserves it.
   - Add tests that cover `getSite()` to `SiteFooter`, not only `buildFooterLinks()` in isolation.

3. Complete the missing PRD behavior:
   - Route unknown sections to `UnknownSection`.
   - Re-sort homepage sections into the fixed PRD order before rendering.
   - Replace `PageJsonLd` and layout-level JSON-LD fragments with `StructuredDataComposer`.
   - Make `seo-schema-map.ts` the registry used by the composer and include `MedicalBusiness` for contact sections.

4. Resolve spec conflicts:
   - Decide whether contact map "pan/pins" remains required or is superseded by the stable iframe hardening plan.
   - Decide whether section motion starts at 768px or 1024px.

5. Re-run full gates:
   - `npm run typecheck --prefix frontend`
   - `npm run build --prefix frontend`
   - `npm run build --prefix backend`
   - `npm test --prefix frontend`
   - `npm test --prefix backend`
   - `npm run format:check --prefix frontend`
   - Manual axe/Lighthouse/keyboard/screen-reader pass for #102.

## Final Assessment

Issue #92 should remain open. The closed child issues overstate completion, especially #95, #99, #101, and #102. The highest-risk gap is not visual polish; it is that the current repository cannot pass frontend typecheck, frontend production build, or backend build.
