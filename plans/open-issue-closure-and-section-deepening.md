# Plan: Open Issue Closure and Section Deepening

> Source PRDs: GitHub issues #92, #103, and #113.
> Related open issues at planning time: #104, #106, #107, #108, #110, #111, #112.

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: Keep the existing flat locale-prefixed Next.js route structure. This plan does not introduce new routes.
- **Schema**: Keep Strapi `Page` as the source content model, with `pageSections` as the single DynamicZone section container.
- **Key models**: Preserve `Page`, `PageDTO`, `SectionDTO`, `NavigationNodeDTO`, `GlobalSettingsDTO`, and shared literal unions generated from Strapi schemas.
- **CMS seam**: Raw Strapi payload details stay behind the semantic DTO seam. Rendering code consumes semantic DTOs.
- **Styling seam**: Continue the accepted Tailwind v4 plus CSS Modules split from ADR-007. This plan is not a visual redesign.
- **Contact maps**: Follow ADR-009. Contact pages intentionally render clinic maps when usable clinic location data exists, with deterministic no-map fallback.
- **Map provider scope**: Keep the current simple embedded map behavior. A full map SDK, real pin panning, clustering, and provider abstraction are out of scope.
- **Issue closure rule**: Close parent PRDs only after their child acceptance criteria have command evidence, test evidence, and manual verification evidence where required.
- **Verification split**: Automated gates can be completed by an agent. Manual keyboard, reduced-motion, accessibility, and screen-reader spot checks require human help before #112 closes.
- **New maintainability track**: #113 improves DynamicZone and Contact locality. It should not block closing the older design-system parent PRDs unless its work overlaps directly with a closure blocker.

---

## Phase 1: Build Contract Recovery

**User stories**: #104; #111 partial; #113 stories 5, 6, 22, 24, 26.

### What to build

Recover the build-health baseline for the design-system closure path by proving the shared type contract, semantic DTO preservation, and design-system audit seed behavior end to end. This slice should leave the repository in a state where the frontend can import the shared design-system fields, the DTO seam carries the expected fields, and the Strapi audit seed is safe to run repeatedly.

### Acceptance criteria

- [ ] Shared types expose the footer category contract used by frontend code.
- [ ] Page DTO normalization preserves footer category and SEO schema type.
- [ ] The design-system audit page seed is type-safe, idempotent, and safe to run repeatedly.
- [ ] Focused tests cover shared type imports, DTO preservation, and audit seed idempotency/type safety.
- [ ] Frontend typecheck passes.
- [ ] Backend build passes.
- [ ] Issue #104 receives a closure comment with command and test evidence.
- [ ] Issue #104 is closed only after all criteria above pass.

---

## Phase 2: CMS Footer Flow

**User stories**: #106; #111 partial.

### What to build

Prove the full CMS-owned footer flow through the real semantic path: Strapi page data becomes page DTO/navigation data, site context provides it to global chrome, and the footer renders localized, stable groups without reading raw CMS payloads.

### Acceptance criteria

- [ ] Pages assigned to footer categories flow through the semantic DTO boundary into site context.
- [ ] Footer rendering uses CMS-driven columns from semantic navigation data.
- [ ] Footer links remain sorted, stable, and localized.
- [ ] Fallback/static footer behavior remains intact when CMS footer category data is absent.
- [ ] Tests validate the site-context-to-footer render path, not only isolated link grouping.
- [ ] Relevant frontend tests and typecheck pass.
- [ ] Issue #106 receives a closure comment with command and test evidence.
- [ ] Issue #106 is closed only after all criteria above pass.

---

## Phase 3: Unknown DynamicZone End-to-End

**User stories**: #107; #108 prerequisite; #113 stories 18, 25, 29, 30.

### What to build

Make unsupported DynamicZone content visible from the real normalized page path. Unknown or future section data should preserve enough semantic information to render the existing intentional placeholder with normal page rhythm instead of disappearing before rendering.

### Acceptance criteria

- [ ] Unsupported DynamicZone entries survive normalization in a safe semantic unknown-section shape.
- [ ] The section renderer dispatches unsupported sections to the unknown-section placeholder.
- [ ] Unknown-section placeholders participate in normal spacing and alternation.
- [ ] Unknown sections do not use crash/error styling and do not break page rendering.
- [ ] Tests cover unknown sections through the actual normalized page and render path.
- [ ] Future/in-progress section data can render visibly while full frontend support is pending.
- [ ] Issue #107 receives a closure comment with command and test evidence.
- [ ] Issue #107 is closed only after all criteria above pass.

---

## Phase 4: Deterministic Homepage Ordering

**User stories**: #108; #111 partial.

### What to build

Introduce a deep homepage ordering Module that accepts CMS sections and returns deterministic homepage render items, including injected home-only blocks. The homepage should no longer render raw CMS order directly, while missing, duplicate, and unknown sections remain predictable.

### Acceptance criteria

- [ ] A deep ordering Module accepts semantic homepage sections and returns ordered render items.
- [ ] Injected home-only blocks are represented in the ordered output.
- [ ] The homepage renderer consumes ordered output rather than raw CMS section order.
- [ ] CMS reordering does not change the agreed composition for known sections.
- [ ] Missing sections, duplicate known sections, and unknown sections have deterministic behavior.
- [ ] Unknown homepage sections remain visible through the unknown-section path.
- [ ] Tests cover reordered input, missing sections, duplicate known sections, and unknown sections.
- [ ] Issue #108 receives a closure comment with command and test evidence.
- [ ] Issue #108 is closed only after all criteria above pass.

---

## Phase 5: Motion Breakpoint and Focus Hardening

**User stories**: #110; #111 partial.

### What to build

Align motion behavior with the accepted desktop breakpoint and harden visible focus states on the main interactive surfaces. Motion should be desktop-only above 1024px and always respect reduced-motion preferences.

### Acceptance criteria

- [ ] Scroll-triggered section motion runs only above the desktop breakpoint greater than 1024px.
- [ ] Tablet and mobile sections render immediately without scroll-triggered motion.
- [ ] Reduced-motion preference disables motion regardless of viewport size.
- [ ] Visible focus states are present for disclosure, tab, lightbox, footer, and contact interactions.
- [ ] Styling changes follow ADR-007.
- [ ] Tests or browser checks cover desktop, tablet/mobile, reduced-motion, and focus-visible behavior.
- [ ] Issue #110 receives a closure comment with command and test evidence.
- [ ] Issue #110 is closed only after all criteria above pass.

---

## Phase 6: Automated Closure Gate

**User stories**: #111.

### What to build

Turn the repaired design-system work into a repeatable automated evidence matrix. This phase should prove that the old design-system closure path is buildable, tested, and documented before manual verification begins.

### Acceptance criteria

- [ ] Regression coverage exists for service article, reference article, gallery lightbox, disclosure pages, index pages, footer rendering, homepage ordering, contact behavior, unknown sections, and structured data.
- [ ] Tests assert user-visible behavior and emitted DTO/JSON-LD output rather than private implementation details.
- [ ] Frontend typecheck passes.
- [ ] Frontend production build passes.
- [ ] Backend build passes.
- [ ] Frontend unit tests pass.
- [ ] Backend tests pass, or any absent backend test command is explicitly documented.
- [ ] Frontend lint passes, with any remaining non-blocking warnings captured as follow-up notes.
- [ ] Frontend format check passes.
- [ ] Evidence maps repaired behavior back to #103 and the previously closed #92 child slices.
- [ ] Issue #111 receives a closure comment with the full command matrix.
- [ ] Issue #111 is closed only after all criteria above pass.

---

## Phase 7: Manual Verification Pass

**User stories**: #112.

### What to build

Complete the human verification pass required before #92 and #103 can close. This phase records manual accessibility, motion, SEO, and issue-history reconciliation evidence. The agent can prepare scripts/checklists, but the user must help perform checks that require human observation or assistive technology.

### Acceptance criteria

- [ ] Manual keyboard and focus-visible checks are completed for disclosure, tab, lightbox, footer, and contact interactions.
- [ ] Axe or Lighthouse accessibility checks are completed on the main design-system surfaces.
- [ ] Reduced-motion behavior is manually spot-checked on representative desktop and mobile/tablet viewports.
- [ ] Screen-reader spot checks are completed for the main interactive surfaces where automated tests are insufficient.
- [ ] The final audit maps #93-#102, especially #95, #99, #101, and #102, to pass/fail evidence from #103 implementation work.
- [ ] A closure recommendation is prepared with links to command evidence and manual notes.
- [ ] Issue #112 receives a closure comment with manual evidence.
- [ ] Issue #112 is closed only after all criteria above pass.

### User help needed

- [ ] Confirm keyboard traversal and visible focus on the target pages.
- [ ] Run or review Lighthouse/axe results in a browser context.
- [ ] Confirm reduced-motion behavior on at least one desktop and one mobile/tablet viewport.
- [ ] Perform screen-reader spot checks or confirm the desired screen-reader tool for the agent to guide.

---

## Phase 8: Close Parent Design-System PRDs

**User stories**: #103 and #92.

### What to build

Close the old design-system parent work only after all child blockers are completed and evidence is attached. This phase should leave the issue tracker truthful: parent issues close because the repair slices, automated gates, and manual verification all passed.

### Acceptance criteria

- [ ] #104, #106, #107, #108, #110, #111, and #112 are closed with evidence.
- [ ] Closed child slices #93-#102 are reconciled against the final evidence matrix.
- [ ] #103 receives a final closure comment summarizing completed blockers, commands, warnings, and manual verification.
- [ ] #103 is closed.
- [ ] #92 receives a final closure comment summarizing the original PRD completion and linking #103 evidence.
- [ ] #92 is closed.

---

## Phase 9: Contact Module Deepening

**User stories**: #113 stories 2, 7-17, 23, 28.

### What to build

Deepen Contact behavior into a small tested Module while preserving the existing Contact page layout. The Module should own clinic extraction, primary contact actions, map query selection, map visibility, address fallback, and stable map behavior according to ADR-009.

### Acceptance criteria

- [ ] Contact page layout remains visually and structurally consistent with current behavior.
- [ ] Contact clinic data is transformed into a semantic Contact model before rendering.
- [ ] Primary phone and email action selection is deterministic and tested.
- [ ] Phone and email link formatting is deterministic and tested.
- [ ] Coordinate-first map query behavior follows ADR-009.
- [ ] Address fallback map query behavior follows ADR-009 when coordinates are absent.
- [ ] No-map fallback is deterministic when no usable query exists.
- [ ] Clinic selection updates local UI state without changing stable map behavior.
- [ ] Contact structured data remains aligned with rendered Contact content.
- [ ] Focused tests cover Contact model, map query, action links, map visibility, and page rendering.
- [ ] Issue #113 receives a progress comment linking this completed slice.

---

## Phase 10: Section Definition and Coverage Gate

**User stories**: #113 stories 1, 4-6, 18-22, 24-30.

### What to build

Create a deeper Section Definition Module and coverage gate so supported DynamicZone behavior is discoverable in one place. Section normalization, rendering, grid/density defaults, home adapters, unknown fallback, and structured-data affordances should stay aligned through a small stable Interface.

### Acceptance criteria

- [ ] A Section Definition Module records supported DynamicZone capabilities in one discoverable place.
- [ ] Section rendering dispatch uses section definitions instead of disconnected duplicate policy.
- [ ] Section density and grid defaults are tied to section definitions.
- [ ] Structured-data section mappings are tied to section definitions or checked against them.
- [ ] Home-specific section treatments are explicit adapters at a seam.
- [ ] Unsupported sections continue to render through the unknown-section path.
- [ ] Shared semantic section test fixtures reduce duplicated page object setup.
- [ ] A coverage gate fails when a supported section is missing expected normalization, rendering, or schema support.
- [ ] Shallow pass-through helpers are removed where practical without unrelated churn.
- [ ] Frontend typecheck, tests, lint, and production build pass.
- [ ] Issue #113 receives a final closure comment with command and test evidence.
- [ ] Issue #113 is closed only after all criteria above pass.
