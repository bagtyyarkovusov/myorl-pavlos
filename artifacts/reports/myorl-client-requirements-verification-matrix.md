# MYORL Client Requirements Verification Matrix

Source PDF: `~/Downloads/MYORL.pdf` (22 numbered Russian client comments)

Created: 2026-06-03

**This matrix supersedes `myorl-client-requirements-gap.md`** as the canonical verification baseline for the Client Requirements PRD. It maps every client comment to specific routes, categorizes the gap type, identifies the legacy evidence source, records current status, assigns an owner workstream, and defines verification steps. Future child implementation issues should use this matrix as their acceptance reference.

## Related PRDs

- **PRD #185** — Homepage editability from Strapi using MODX content spec
- **PRD #186** — Parent PRD: Client requirements remediation and content parity (22 client comments)
- This issue: **#187** — Build verification matrix (this document)

## Issue Categories

| Category | Description |
|---|---|
| **Content parity** | Missing or mismatched patient-facing text, media, facts compared to Legacy Site Baseline |
| **CMS editability** | Content exists but is hard-coded in frontend; not editable from Strapi admin |
| **Routing / page presence** | Page, URL, or navigation entry missing compared to legacy site |
| **Behavior** | Interactive behavior differs from client expectation (appointment flow, map, CTAs) |
| **Readability / design** | Layout, typography, or visual treatment harms readability, accessibility, or task completion |

## Owner Workstreams (from PRD #186)

| Workstream | Scope |
|---|---|
| **Homepage editability (PRD #185)** | Home hero, testimonials, notice, promo slider, resource groups, quick access cards, backfill |
| **Typography Token System** | Sitewide type scale, role tokens, prose widths, table typography, responsive rules |
| **Appointment schedule parity** | Slot picker schedule, 30-min steps, disabled days, CTAs |
| **Clinic / office / gallery parity** | Clinic index, gallery pages, office page (`iatreio`) content and layout |
| **Section indexes / tags / media** | Section index layout, curated tags, article/index image cleanup |
| **Biography / price / legal dense layouts** | Biography CV, price list table, privacy/legal text-first pages |
| **Sources / dates / content quality** | Article sources, reader-facing dates, Related Topics |
| **Doctor identity / header** | Header doctor name/specialty, navigation separation |
| **Map behavior** | Dimmed facade, external Google Maps activation |
| **Navigation UX** | Mega menu density, discoverability |
| **Visual QA (PDF review)** | Manual review of unspecified PDF screenshots |
| **Final Russian client report** | Client-facing remediation PDF after implementation |

## Verification Status

| Status | Meaning |
|---|---|
| Not checked | Not yet verified against local/staging |
| Passed | Verified and matches acceptance criteria |
| Failed | Verified and does NOT match — needs implementation work |
| Blocked | Cannot verify (needs Strapi token, data, or other dependency) |

---

## Route-by-Route Verification Matrix

| # | Client comment summary | Category | Affected routes | Legacy Evidence | Current status | Owner workstream | Verification status | Verification steps |
|---|---|---|---|---|---|---|---|---|
| 1 | Homepage visual parity / first hero impression | Readability / design | `/el`, `/ru` | Live `myorl.gr` homepage; MODX `pagetitle`/`longtitle`; PDF page 1-2 | Partial — Home section architecture exists; CMS still shows old content until backfill applied | Homepage editability (PRD #185) | Not checked | 1. Run `npm run dev` and open `/el` and `/ru` in browser (desktop + mobile). 2. Compare hero message, CTA, and media against live `myorl.gr`. 3. Verify hero copy renders from Strapi sections, not hard-coded fallbacks. 4. Check against ADR-016 home content ownership rules. |
| 2 | Use Roboto Condensed everywhere | Design | All routes | Legacy `myorl.gr` CSS font stack; client PDF comment | Done — `next/font/google` loads `Roboto_Condensed`; global font tokens point to it | Typography Token System | Passed | 1. Open browser DevTools → Computed styles. 2. Spot-check `/el`, `/ru`, `/el/viografiko`, `/el/timokatalogos`. 3. Verify font-family resolves to `Roboto Condensed` on body text and headings. |
| 3 | Words break with hyphens / layout looks crooked | Readability / design | All routes (esp. long Greek/Russian titles on cards, headings) | Client PDF screenshots; live legacy page layout for comparison | Partial — Needs visual QA across long Greek/Russian titles and CSS fixes where text wraps badly | Typography Token System | Not checked | 1. Browser QA: `/el/pathiseis`, `/ru/pathiseis` on mobile (375px). 2. Check article headings with long Greek/Russian words. 3. Verify no awkward hyphenation breaks in card titles, nav labels, or hero text. 4. Run `npm run build` to check prod CSS output. |
| 4 | Address as link, metro missing, working hours surface | Content parity | `/el`, `/ru` (footer, home visit map); `/el/contact`, `/ru/contact` | Live `myorl.gr` footer/contact; MODX contact fields; legacy `.htaccess` | Partial — Global/contact data centralized; needs final content QA against legacy | Homepage editability (PRD #185) + Global Settings | Not checked | 1. Verify `Global Settings` → Primary Contact address is linkable. 2. Verify metro/transit info availability in contact surfaces. 3. Check footer, home visit map, and contact page hours rendering. 4. Compare address format against live `myorl.gr`. |
| 5 | Home/admin text cannot be found in Strapi | CMS editability | `/el`, `/ru` | MODX home content fields; live `myorl.gr` home copy; PDF page 3-4 | Mostly done — Home hero/testimonials/notice schemas and renderer implemented; needs backfill with valid Strapi token | Homepage editability (PRD #185) | Blocked | 1. Run `python3 tools/homepage_backfill.py --plan artifacts/reports/homepage_backfill_plan.json --dry-run`. 2. Review plan for hero, testimonials, notice sections. 3. Verify editable in Strapi admin after apply (needs valid `STRAPI_API_TOKEN`). |
| 6 | Missing text on homepage | Content parity | `/el`, `/ru` | MODX home `content` and section blocks; live `myorl.gr` visible text | Mostly done — Code supports CMS-owned home copy; content still needs backfill/apply | Homepage editability (PRD #185) | Blocked | Same as #5 — blocked on backfill run with valid Strapi token. |
| 7 | Lost testimonials and not all operations/services shown | Content parity + CMS editability | `/el`, `/ru` | Legacy home testimonials block; MODX linked-resources for ops/services; live `myorl.gr` home sections | Partial — Testimonials teaser CMS-driven; ops/services depend on page completeness and quick-access excerpts | Homepage editability (PRD #185) | Not checked | 1. Verify testimonials teaser renders from Strapi (not hard-coded). 2. Check Home Resource Groups: ops heading Επεμβάσεις/ЛОР Операции and services heading Υπηρεσίες/Услуги match legacy. 3. Verify all legacy home service items have corresponding Strapi pages with excerpts. |
| 8 | "Where is this information from?" footer/contact facts | Content parity | All routes (footer); `/el`, `/ru` (home visit map); `/el/rantevou`, `/ru/zapis` (appointment contact info) | Live `myorl.gr` footer; MODX Global/contact fields; clinic phone/email records | Partial — Global Settings owns footer tagline/contact/social; needs staging CMS verification; hard-coded fallbacks still present | Homepage editability (PRD #185) + Global Settings | Not checked | 1. Verify footer tagline, address, hours, email, phones render from Global Settings. 2. Check no hard-coded `+30 210 6427 000` placeholder. 3. Cross-reference Primary Contact phone pairs against legacy: landline `211-01 94 618`, mobile `6945 77 30 77`. |
| 9 | "Where edit this?" home promo/teaser copy not in menu | CMS editability | `/el`, `/ru` | MODX home sections; PDF page 5 | Mostly done — Home-specific sections added to Strapi; needs CMS backfill and editor verification | Homepage editability (PRD #185) | Blocked | 1. Verify Home Promo Slider, Home Testimonials Teaser, Home Notice Section are available in Strapi Page Sections for `index` page. 2. Needs Strapi admin access to confirm editor can find and edit. |
| 10 | Homepage texts from frontend hard-code | CMS editability | `/el`, `/ru` | MODX home content; live `myorl.gr` visible copy; current Strapi `index` page data | Mostly done — Patient-facing home fallback copy removed from key sections; needs CMS data apply and audit of remaining fallbacks | Homepage editability (PRD #185) | Not checked | 1. Grep frontend for remaining hard-coded patient-facing homepage strings. 2. Verify Quick Access Card descriptions derive from target page excerpts (not frontend fallbacks). 3. Check missing excerpts remain visibly missing (not replaced by marketing copy). |
| 11 | Doctor name/specialty immediately visible | Readability / design | All routes (header); `/el/viografiko`, `/ru/viografiko` | Live `myorl.gr` header brand area; MODX physician profile | Open — Needs biography/header/home design/content adjustment so name and specialty are clear in first-view areas | Doctor identity / header + Biography | Not checked | 1. Open `/el` on desktop (1920px) and verify doctor name stays on one line in header brand area. 2. Verify specialty text visible. 3. Check navigation remains visually separate from doctor identity. 4. Check mobile viewport (375px) for readable doctor identity. |
| 12 | Appointment page: match old form, remove unnecessary fields, 30-min time picker with requested hours | Behavior | `/el/rantevou`, `/ru/zapis` | Legacy MODX appointment form; client PDF schedule requirements; live `myorl.gr` booking flow | Partial — Picker exists but schedule too broad; needs exact bands: Mon/Fri 09:00-14:00, Tue/Thu 14:00-20:00, 30-min steps, other days disabled | Appointment schedule parity | Not checked | 1. Run `npm run test -- src/lib/i18n/appointment.test.ts` to verify slot schedule logic. 2. Browser QA: open `/el/rantevou` and walk through date → hour → minute picker. 3. Verify only Mon/Fri 09:00-14:00 and Tue/Thu 14:00-20:00 slots available. 4. Confirm sitewide appointment CTAs (`Ζαπисаться`/`Κλείσε ραντεβού`) route to appointment page, not contact. |
| 13 | Clinic pages disappeared: `/klinikes/`, `/iaso-paidwn/` | Routing / page presence + Content parity | `/el/klinikes`, `/ru/klinikes`; clinic gallery pages (e.g., `/el/iaso-paidwn`, `/ru/iaso-paidwn`) | Live `myorl.gr` clinic pages; MODX clinic content and migxGallery; legacy URL inventory | Partial — Clinic gallery repair tooling exists; need verify internal clinic index/gallery pages populated and routed in both locales | Clinic / office / gallery parity | Not checked | 1. Run `npm run dev` and open `/el/klinikes` and `/ru/klinikes`. 2. Verify clinic index cards link to internal Clinic Gallery Pages first (not external hospital URLs). 3. Check at least 3 clinic gallery pages exist and render gallery images from Strapi. 4. Run URL audit: `python3 tools/audit_legacy_urls.py` and check clinic-related URLs. |
| 14 | Blank/unspecified screenshot item (PDF page 8-9) | TBD — Needs manual review | TBD | PDF pages 8-9; MYORL.pdf screenshot context | Open — Needs manual review from PDF page 8/9 context during visual QA | Visual QA (PDF review) | Not checked | 1. Open MYORL.pdf at pages 8-9. 2. Identify what page/surface the screenshot refers to. 3. Add specific route and category to this matrix row once identified. |
| 15 | Price list page formatting, no publication date | Readability / design | `/el/timokatalogos`, `/ru/timokatalogos` | Live `myorl.gr` price list; MODX `timokatalogos` content and table markup | Open — Needs layout/content styling review; hide reader-facing publication date where client rejects it | Biography / price / legal dense layouts | Not checked | 1. Browser QA: open `/el/timokatalogos` and `/ru/timokatalogos` on desktop + mobile. 2. Verify service/price table rows are readable with clear horizontal rules. 3. Check compact, scannable formatting suitable for dense data. 4. Verify no reader-facing publication/update date on the page. |
| 16 | Privacy page has random photos | Readability / design | `/el/privacy`, `/ru/privacy`; other legal/system pages | Live `myorl.gr` privacy/policy pages; legacy page layouts (text-first) | Open — Remove irrelevant hero/gallery imagery from privacy/policy pages; likely set system/legal layout without decorative medical photos | Biography / price / legal dense layouts | Not checked | 1. Browser QA: open `/el/privacy` and any other legal/system pages. 2. Verify no unrelated hero imagery or decorative medical photos. 3. Check page renders text-first with `pageType: system` or equivalent. 4. Confirm layout is compact and readable (not a cinematic article shell). |
| 17 | Biography layout unreadable / wrong locale link comparison | Readability / design + Routing / page presence | `/el/viografiko`, `/ru/viografiko` | Live `myorl.gr` biography; MODX physician profile/CV; legacy URL: `viografiko` | Open — Fix content/layout, ensure RU/EL routing to correct localized biography page, unhide as per navigation audit | Biography / price / legal dense layouts | Not checked | 1. Browser QA: open `/el/viografiko` and `/ru/viografiko` on desktop + mobile. 2. Verify compact, scannable layout preserving legacy CV/table content. 3. Check RU and EL routes both resolve to their respective localized biography pages. 4. Verify page is not hidden from menu (navigation audit). 5. Confirm physician JSON-LD structured data renders. |
| 18 | Home map dimmed and click-to-load (Google blocks it) | Behavior | `/el`, `/ru` (home visit map section); `/el/contact`, `/ru/contact` (contact page map) | Client PDF comment; Google Maps embedding policy | Done in code — `LiteMap` facade exists; home/contact map labels exist; needs browser QA after CMS data | Map behavior | Not checked | 1. Browser QA: open `/el` and scroll to map section. 2. Verify map shows dimmed facade (not live embedded map). 3. Click/activate the facade and verify Google Maps opens externally. 4. Check same behavior on contact page if map present. |
| 19 | Menu only shows a few variants; hard to choose needed option | Readability / design | All routes (header mega menu / mobile menu) | Live `myorl.gr` full navigation menu; legacy MODX menu structure | Open — Header mega menu / mobile menu density and discoverability need UX review against legacy full menu | Navigation UX | Not checked | 1. Browser QA: open `/el` and expand desktop mega menu. 2. Compare visible menu sections against legacy `myorl.gr` navigation. 3. Check mobile menu: verify all sections discoverable. 4. Cross-reference navigation audit items: `viografiko`, `plirofories-gia-asfalismenous-edoeap-kai-trapeza-tis-ellados`, `botulinotherapia-ru`, `ru-page`. |
| 20 | Article page has unexpected source text and missing block | Content parity | `/el/afairesi-amygdalwn`, other article pages with legacy sources | Live `myorl.gr` article pages; MODX article source fields and section blocks | Open — Need content parity audit for `/el/afairesi-amygdalwn` against legacy page, including missing legacy block/section | Sources / dates / content quality | Not checked | 1. Browser QA: open `/el/afairesi-amygdalwn` and compare against live `myorl.gr` equivalent. 2. Verify Article Sources render when present in Strapi. 3. Check no reader-facing publication/update dates. 4. Spot-check Related Topics panel: contextual links, hidden when empty, excludes current page. |
| 21 | `/ru/iatreio` chaos | Readability / design + Content parity | `/ru/iatreio`, `/el/iatreio` | Live `myorl.gr` office page; MODX `iatreio` content and images; client PDF pages 10-12 | Partial — Clinic gallery work exists; needs page-specific visual/content QA after CMS repair | Clinic / office / gallery parity | Not checked | 1. Browser QA: open `/ru/iatreio` and `/el/iatreio` on desktop + mobile. 2. Verify doctor identity, specialization, address, contact actions, map access, and office imagery clear. 3. Check correct image at controlled size (not broken or full-bleed). 4. Verify child clinic pages (`iatreio-alexandras`, `iatreio-koukaki`) redirect to correct hub anchors. |
| 22 | `/ru/pathiseis` chaos | Readability / design | `/ru/pathiseis`, `/el/pathiseis`; other section indexes | Live `myorl.gr` section index pages; MODX category browsing; client PDF pages 13-14 | Open — Section hub/index layout and content ordering need visual QA and styling/content cleanup | Section indexes / tags / media | Not checked | 1. Browser QA: open `/ru/pathiseis` and `/el/pathiseis` on desktop + mobile. 2. Verify curated patient-facing tags (5-10 per index, not all backend tags). 3. Check article/index images match legacy when legacy has clear media precedent. 4. Verify image sizes capped (no full-bleed wrong images). 5. Check content ordering makes sense for patient browsing. |

---

## Verification Checklist

Run the following commands and checks before marking any child implementation issue complete.

### Quick verification (smoke test)

```bash
# 1. Start the dev stack
npm run dev

# 2. Typecheck and lint
npm run typecheck
npm run lint

# 3. Unit tests
npm run test

# 4. Backend tests
cd backend && npm run test && cd ..

# 5. Verify matrix completeness
python3 -m unittest tests.test_verification_matrix -v
```

### Route-by-route browser verification

Open each route below in a browser (desktop 1920px + mobile 375px) and verify against the matrix criteria above.

**Home pages:**
- [ ] `/el` — Greek canonical home
- [ ] `/ru` — Russian canonical home

**Content pages:**
- [ ] `/el/rantevou` — Appointment booking (Greek)
- [ ] `/ru/zapis` — Appointment booking (Russian)
- [ ] `/el/viografiko` — Biography (Greek)
- [ ] `/ru/viografiko` — Biography (Russian)
- [ ] `/el/timokatalogos` — Price list (Greek)
- [ ] `/ru/timokatalogos` — Price list (Russian)
- [ ] `/el/iatreio` — Office page (Greek)
- [ ] `/ru/iatreio` — Office page (Russian)
- [ ] `/el/klinikes` — Clinic index (Greek)
- [ ] `/ru/klinikes` — Clinic index (Russian)
- [ ] `/el/pathiseis` — Section index (Greek)
- [ ] `/ru/pathiseis` — Section index (Russian)

**Article pages:**
- [ ] `/el/afairesi-amygdalwn` — Tonsillectomy article (sources, missing blocks)
- [ ] One additional EL article with sources
- [ ] One additional RU article with sources

**Legal/system pages:**
- [ ] `/el/privacy` or equivalent legal page (Greek)
- [ ] `/ru/privacy` or equivalent legal page (Russian)

**Special cases:**
- [ ] `/el/search-results?q=test` — Search results (Greek)
- [ ] `/el/sitemap` — Human sitemap (Greek)
- [ ] `/ru/sitemap` — Human sitemap (Russian)
- [ ] `/el/not-found` or non-existent slug — 404 page
- [ ] `/` — Root redirect to `/el` (verify 308 redirect)

### CMS verification (requires Strapi access)

- [ ] Homepage `index` page: verify Home Hero Section, Testimonials Teaser, Notice Section presence
- [ ] Global Settings: verify Primary Contact (address, hours, phones, email), Footer Tagline, Social Links populated
- [ ] Navigation Audit items: `viografiko` unhidden, insurance page reparented, `botulinotherapia-ru` unhidden, `ru-page` unpublished
- [ ] Home Resource Groups: ops and services groups assigned from legacy headings

### Data verification (requires Strapi token)

```bash
# Backfill dry-run
python3 tools/homepage_backfill.py --plan artifacts/reports/homepage_backfill_plan.json --dry-run

# Legacy URL audit
python3 tools/audit_legacy_urls.py

# Content hygiene audit
python3 tools/audit_nextjs_content_hygiene.py

# SEO meta audit
python3 tools/audit_seo_meta.py

# Blank pages audit
python3 tools/audit_blank_pages.py
```

### Pre-commit gate

Run these before every child-issue commit:
```bash
npm run typecheck
npm run lint
npm run test
python3 -m unittest tests.test_verification_matrix -v
git diff --check
```

### Workstream completion criteria

Before a child implementation issue can be marked complete, verify:

1. All matrix rows assigned to the workstream show **Passed** verification status
2. Route-by-route browser checklist items for the workstream's routes are checked off
3. Typecheck, lint, and tests pass (`npm run typecheck && npm run lint && npm run test`)
4. `python3 -m unittest tests.test_verification_matrix -v` passes
5. Any CMS data changes have a dry-run plan reviewed before apply
6. No hard-coded frontend fallback copy remains where CMS ownership now exists

---

## Workstream-to-Comment Mapping

| Workstream | Comments covered |
|---|---|
| Homepage editability (PRD #185) | #1, #4, #5, #6, #7, #8, #9, #10 |
| Typography Token System | #2, #3 |
| Appointment schedule parity | #12 |
| Clinic / office / gallery parity | #13, #21 |
| Section indexes / tags / media | #22 |
| Biography / price / legal dense layouts | #15, #16, #17 |
| Sources / dates / content quality | #20 |
| Doctor identity / header | #11 |
| Map behavior | #18 |
| Navigation UX | #19 |
| Visual QA (PDF review) | #14 |
| Final Russian client report | N/A (post-implementation) |
