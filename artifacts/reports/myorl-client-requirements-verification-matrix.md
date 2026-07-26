# MYORL client requirements verification matrix

Audit date: 2026-07-26

Canonical client input: `artifacts/client-input/MYORL.docx`

Audited deployment: `https://nextjs-frontend-production-afcd.up.railway.app`

Audited code: committed `main` at `a42c83c` (local uncommitted work excluded from completion claims)

## Status rules

- **Verified complete** — observed on the deployed site with requirement-specific evidence.
- **Implemented awaiting browser/CMS verification** — the implementation exists, but the production data or acceptance evidence is incomplete.
- **Partial** — meaningful treatment exists, but at least one part of the requirement still fails.
- **Open** — the reported problem remains reproducible or required production configuration is absent.
- **Needs client clarification** — the source does not define a testable expected result.

The source document contains repeated numbers and one screenshot-only item. The IDs below are stable audit IDs; the “source label” column preserves the client document’s original numbering/context.

| ID | Source label | Requirement | Status | Production/code evidence and remaining action |
|---|---|---|---|---|
| R01 | 1 | Repair video/content-card layout so titles and descriptions do not collide with images. | **Partial** | The video directory is restored, but `/ru/video` still has dense, clipped rows and malformed taxonomy labels at 390/320 px. Rework responsive card geometry and editorial tags, then re-test. |
| R02 | 2 | Restore the Russian video library. | **Partial** | `/ru/video` exists and returns entries. The directory is not client-ready: the hero/media state is inconsistent and visible labels include untranslated/concatenated slug-like text. Complete RU editorial cleanup and parity check. |
| R03 | 3 | Stop broken word wrapping/splitting in the Russian homepage/slider. | **Partial** | Desktop is substantially improved and no document-level horizontal overflow was detected. At 390/320 px, text and controls are visibly clipped while overflow is suppressed; several CSS surfaces still allow automatic hyphenation. |
| R04 | 4 | Show the clinic location marker on the map. | **Partial** | Clicking “Показать карту” creates an in-page Google Maps iframe. In production the iframe resolves to a world view without a visible clinic marker, so the core requirement fails. Use coordinates or a reliably geocodable query and verify the marker. |
| R05 | 5 | Remove unfinished EL homepage “Menu” copy and the unexplained blank pill/button. | **Open** | `/el` still displays the literal H1 `Menu` and a blank dark CTA pill; `/ru` shows the equivalent `Меню` and blank pill. CMS content and empty-link rendering guards must be corrected. |
| R06 | 6 | Complete `/el/iaso-paidwn`: correct address, uncropped branding/media, and clinic photographs. | **Partial** | The route and address content exist, but the clinic logo is severely cropped/oversized on 390 px and full gallery parity was not demonstrated. Correct media fit and validate the required photo set against legacy. |
| R07 | 7 | Make appointment/contact form delivery work on `/el/rantevou` and `/el/epikoinonia`. | **Open** | Form UI and server code exist, but production Railway has no configured `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, or `CONTACT_FROM_EMAIL`. Real delivery cannot succeed until secrets/sender/recipient are configured and a consented end-to-end test is performed. |
| R08 | 8 | Remove photos from pages where the legacy page had none (including RU privacy and EL clinics context). | **Open** | `/ru/politike-aporretou` still renders an unrelated otoplasty hero image. `/el/klinikes` renders a large hero plus clinic logos; each media item needs semantic comparison with the legacy page. |
| R09 | 9 | Restore the missing phrase/byline on `/el/kreatakia-egxeirisi`. | **Partial** | The medical body is largely present, but the legacy top-of-page author line and medical-advice notice are absent from the new page. Restore or explicitly approve their replacement; client wording remains the acceptance source. |
| R10 | 10 | Improve site speed/performance. | **Implemented awaiting browser/CMS verification** | ISR, image handling, dynamic imports, and web-vitals instrumentation exist. No p75 field dataset was available during the audit and PageSpeed API was rate-limited. Do not claim completion until p75 LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1. |
| R11 | 11 | Correct the cropped image on `/el/iatreio`. | **Implemented awaiting browser/CMS verification** | Controlled media/gallery rendering is present, but the exact client-highlighted image was not conclusively matched at all target widths. Re-check at 1440, 390, and 320 px against the source screenshot. |
| R12 | 12 | Repair header/navigation layout and dropdown behavior. | **Partial** | Desktop mega-navigation is populated and usable. On 390/320 px the header/appointment control is visibly clipped and the narrow layout masks overflow. Finish responsive header QA and long-label stress tests. |
| R13 | 13 | Improve search overlay suggestions/results presentation. | **Partial** | The overlay, filters, grouped results, keyboard semantics, and links work. Cold production search took roughly ten seconds to populate; result excerpts visibly expose escaped `<em>` tags. Fix highlight rendering and validate cold/warm latency. |
| R14 | 14 | Make the query `уздечка языка` return the relevant content. | **Verified complete** | Production search returned `Короткая уздечка языка у ребенка` as result 1 of 4. No unrelated result appeared above it. Broader lower-ranked matches remain a relevance-tuning opportunity, not a failure of the agreed gate. |
| R15 | 15 | Restore a legacy-like messenger/floating contact affordance. | **Partial** | A floating mobile action dock exposes phone and email. It does not provide WhatsApp/Viber or another actual messenger. Client must confirm whether the requirement means the legacy phone/contact dock or specific messenger services. |
| R16 | 16 | Restore information missing on mobile. | **Partial** | Mobile content and action controls exist, but the requirement is vague and current 390/320 screenshots show extensive right-side clipping. Ask the client to name the missing fields/sections, then verify each explicitly. |
| R17 | 17 | Restore missing photographs on `/ru/iatreio`. | **Partial** | The route renders office media and gallery assets, but the 390 px view is clipped and twelve gallery controls have no accessible label. Confirm the Alexandras/Koukaki legacy photo sets and correct gallery accessibility/layout. |
| R18 | 18 (screenshot only) | Resolve the clinic/gallery issue shown without explanatory text. | **Needs client clarification** | The screenshot does not define which asset, crop, order, or behavior is wrong. Link it to a named route and expected image set before claiming completion. |
| R19 | repeated 3 | Remove forced hyphenation/broken words across the interface. | **Partial** | Major desktop overflow is reduced, but narrow screenshots still crop text/controls and some styles retain automatic hyphenation. Add bilingual long-string/zoom tests and eliminate hidden clipping. |
| R20 | repeated 17 | Make biography content readable and correct the locale/content comparison. | **Partial** | Both biography routes exist and dense content is structured. `/ru/viografiko` still uses a dominant cropped/blurred hero and needs a client review of locale-specific content parity. |
| R21 | repeated 18 | On RU homepage, show a dark map facade first; after click load the clinic map/location in place. | **Partial** | The dark consent facade and in-place click transition work. The loaded map shows the world rather than the clinic marker; the secondary external Maps link also needs an explicit nearby presentation. |
| R22 | 19 | Expand menu choices/discoverability. | **Verified complete** | Production desktop navigation exposes the major sections and the expanded directory shows 8 top-level themes with nested topic counts/links. Mobile discoverability should remain part of regression QA. |
| R23 | 20 | Remove the unexpected element and restore missing legacy content on `/el/afairesi-amygdalwn`. | **Partial** | The long-form article and sources are present, but legacy author/medical-notice content and multiple video positions are absent; the new top tags are not a direct legacy equivalent. Editorial approval or restoration is required. |
| R24 | 21 | Repair the chaotic `/ru/iatreio` page. | **Partial** | A dedicated office layout, doctor block, media, and galleries are implemented. The 390/320 view clips content and unlabeled gallery buttons remain, so the page is improved but not complete. |
| R25 | 22 | Repair the chaotic `/ru/pathiseis` page. | **Partial** | A section index with tags and article rows is implemented. At 390/320 px filter controls and article text are visibly cut off, so responsive layout acceptance still fails. |

## Cross-cutting production conclusions

1. No single completion percentage is defensible: only R14 and R22 met their requirement-specific deployed acceptance gates.
2. The most urgent production blocker is form delivery configuration (R07).
3. The map interaction is implemented but the marker/location result is wrong (R04/R21).
4. The dominant remaining UI defect is narrow-width clipping masked by `overflow` behavior (R01/R03/R12/R16/R17/R19/R24/R25).
5. Editorial parity remains a separate workstream: media choice, bylines/notices, video labels, and legacy video positions cannot be inferred from component tests alone.

## Evidence inventory

- Preserved input: `artifacts/client-input/MYORL.docx` (SHA-256 `1a99ae00967923a5dcba03eb215a71adfea73d76b223348dcadff79c9de51009`).
- Browser captures: `artifacts/reports/myorl-audit-evidence/`.
- Production environment check: Railway `production`, frontend service `nextjs-frontend`, inspected without exposing secret values.
- Automated verification: frontend 1360/1362 tests passed (two date-sensitive failures); backend 47/47 passed; typecheck passed; lint completed with 16 warnings; selected homepage-backfill tests 4/4 passed.
