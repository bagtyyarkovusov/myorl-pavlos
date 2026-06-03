# MYORL Client Requirements Gap

Source PDF: `/Users/bagtyyar/Downloads/MYORL.pdf`

Extraction date: 2026-06-03

The PDF contains 22 numbered Russian client comments comparing the new Railway site with legacy `myorl.gr`.

## Status Summary

- Done / mostly done in code: 5
- Partially done, needs CMS data or visual QA: 7
- Remaining implementation/content work: 10

## Gap Matrix

| # | Client comment | Status | Notes / remaining work |
|---|---|---|---|
| 1 | Homepage visual parity / first hero impression | Partial | New home section architecture exists, but local CMS still shows old content until homepage backfill is applied. |
| 2 | Use Roboto Condensed everywhere | Done | `next/font/google` loads `Roboto_Condensed`; global font tokens point to it. |
| 3 | Words break with hyphens / layout looks crooked | Partial | Needs visual QA across long Greek/Russian titles and CSS fixes where text still wraps badly. |
| 4 | Address should be a link, metro missing, working hours not needed in that surface | Partial | Global/contact data is centralized, but specific footer/home/contact surfaces need final content QA against legacy. |
| 5 | Home/admin text cannot be found in Strapi | Mostly done | Home hero/testimonials/notice schemas and renderer are implemented. Remaining: run backfill with valid Strapi token and verify in Strapi admin. |
| 6 | Missing text on homepage | Mostly done | Same as #5: code supports CMS-owned home copy; content still needs backfill/apply. |
| 7 | Lost testimonials and not all operations/services shown | Partial | Home testimonials teaser is CMS-driven now. Operations/services depend on CMS page/navigation completeness and quick-access excerpts. |
| 8 | “Where is this information from?” footer/contact facts | Partial | Global Settings owns footer tagline/contact/social now. Need staging CMS verification and remove hard-coded fallbacks later. |
| 9 | “Where edit this?” home promo/teaser copy not findable in menu | Mostly done | Home-specific sections added; needs CMS backfill and editor verification. |
| 10 | Other homepage texts come from frontend hard-code | Mostly done | Patient-facing home fallback copy was removed from key home sections. Remaining: apply CMS data and audit any leftover frontend marketing copy. |
| 11 | Doctor name/specialty should be immediately visible | Open | Need biography/header/home design/content adjustment so name and specialty are clear in first-view areas. |
| 12 | Appointment page should match old form; remove unnecessary fields; add 30-minute time picker with requested hours | Partial | Appointment form/picker exists, but schedule is currently too broad. Set exact bands: Monday/Friday 09:00-14:00, Tuesday/Thursday 14:00-20:00, 30-minute steps; confirm other weekdays disabled. |
| 13 | Clinic pages disappeared: `/klinikes/`, `/iaso-paidwn/` | Partial | Clinic gallery repair tooling exists. Need verify internal clinic index/gallery pages are populated and routed in both locales. |
| 14 | Blank/unspecified screenshot item | Open | Needs manual review from PDF page 8/9 context during visual QA. |
| 15 | Price list page formatting, no publication date | Open | `ru/timokatalogos` needs layout/content styling review; hide reader-facing publication date where client rejects it. |
| 16 | Privacy page has random photos | Open | Remove irrelevant hero/gallery imagery from privacy/policy pages; likely set system/legal layout without decorative medical photos. |
| 17 | Biography layout unreadable / wrong locale link comparison | Open | Fix `viografiko` content/layout, ensure RU/EL routing points to correct localized biography page, and unhide as required by navigation audit. |
| 18 | Home map should be dimmed and click-to-load because Google blocks it | Done in code | `LiteMap` exists and home/contact map labels exist. Needs browser QA after CMS data. |
| 19 | Menu only shows a few variants; hard to choose needed option | Open | Header mega menu / mobile menu density and discoverability need UX review against legacy full menu. |
| 20 | Article page has unexpected source text and missing block | Open | Need content parity audit for `/el/afairesi-amygdalwn` against legacy page, including missing legacy block/section. |
| 21 | `/ru/iatreio` chaos | Partial | Clinic gallery page work exists, but needs page-specific visual/content QA after CMS repair. |
| 22 | `/ru/pathiseis` chaos | Open | Section hub/index layout and content ordering need visual QA and likely styling/content cleanup. |

## Highest-Priority Remaining Work

1. Get a valid Strapi token and run `python3 tools/homepage_backfill.py --plan artifacts/reports/homepage_backfill_plan.json`, review conflicts, then apply approved changes.
2. Tighten appointment slot schedule to the exact client hours and re-run appointment tests.
3. Browser QA the PDF URLs one by one against local/staging: home, appointment, clinics, price list, privacy, biography, article, `iatreio`, `pathiseis`.
4. Fix legal/privacy pages to avoid irrelevant medical photos and publication-date style metadata where rejected.
5. Finish CMS content parity for clinic pages, home services/operations lists, and article missing blocks.

