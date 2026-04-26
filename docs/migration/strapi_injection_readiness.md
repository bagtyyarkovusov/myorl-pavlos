# Strapi Injection Readiness and Zero-Loss Check

> Historical note: this document captures the pre-injection readiness audit and the zero-loss migration constraints for the earlier empty-target rehearsal state. For the current populated Strapi system and the active Next.js contract recommendation, use [../strapi-nextjs-audit.md](../strapi-nextjs-audit.md).

## Status

- Overall decision: `NO-GO` for full localized content injection.
- Ready areas: Strapi runtime boot, locales, base `Page`/`Tag` schemas, asset map generation, HTML modernization.
- Blocking areas: strict localization pairing, source-field coverage, MIGX normalization, tag strategy, importer implementation, migration safety controls.

This document is the current source of truth for readiness. It consolidates the repository analysis, live Strapi runtime inspection, and strict Babel validation into one place so injection planning does not rely on stale assumptions.

## Source of Truth

- Primary readiness command: `python3 injection_readiness.py` (writes `injection_readiness.json`, exits non-zero on any blocker gate).
- Locale pairing source of truth: `babel_normalization.json`. The importer never reads `babelLanguageLinks` directly.
- Policy source of truth: `import_policy.md` (pragmatic-drop rules and SEO precedence).
- Tag source of truth: `tag_mapping.yaml` compiled into `tag_plan.json` by `build_tag_plan.py`.
- `full_ready_check.py` remains only for historical pair-drift stats; it is no longer consulted for go/no-go.

## Coverage Report

### Artifacts analyzed

- Source resources: `326`
- Source locales: `183` `web`, `143` `rus`
- Non-empty template variables: `35`
- Strapi content types reviewed: `2`
- Strapi components reviewed: `12`
- Migration/reference documents reviewed: `6`
- Analysis scripts reviewed: `8`
- Live Strapi database inspected: `backend/.tmp/data.db`
- Asset mappings present: `118`

### Coverage scope

This review classified every migration-relevant source field into one of four states:

- `Direct`: a current Strapi field can hold the source value without lossy reshaping.
- `Transform`: the schema can hold the value, but deterministic preprocessing is still required.
- `Partial`: a target exists, but the current shape or localization behavior is not safe enough yet.
- `Unmapped`: no safe target exists today, so injecting now would lose data or collapse meaning.

## Readiness Scorecard

| Area | Status | Evidence | Why it matters |
| --- | --- | --- | --- |
| Strapi runtime | Pass | Strapi is running on `:1337`, DB exists, locales `el` and `ru` exist, `pages` and `tags` tables are empty | Clean rehearsal target exists |
| Page/Tag schema boot | Pass | `Page` and `Tag` are present and localized | Base content types can accept localized entries |
| Asset migration | Pass | `asset_map.json` contains `118` entries | Media IDs and URLs exist for mapped files |
| HTML transformation | Pass | `verify_transformation.py` reports zero remaining inline styles, legacy tags, or known unresolved URLs | Rich text cleanup is ready |
| Template and boolean validation | Pass | `verify_modx_data.py` passes, no invalid template enum usage detected | Core schema mapping is internally consistent |
| Strict localization pairing | Fail | Only `123` self-consistent Greek/Russian pairs | Document linking is not deterministic yet |
| Schema coverage | Fail | `longtitle`, `menutitle`, `metaKeywords`, `migxResources`, Russian affiliate fields, and others are not safely represented | Injection would lose source data |
| MIGX normalization | Fail | Multiple MIGX TVs fail plain JSON parsing and several others do not fit current component shapes | Blocks cannot be imported safely |
| Tag strategy | Fail | Locale vocabularies diverge and paired pages already disagree structurally | Relations will fragment or drift |
| Import execution path | Fail | Final page/document injector is still a plan, not implemented code | No controlled import run exists |
| Migration safety controls | Fail | SQLite default target, hardcoded tokens, no rollback/expand-contract procedure | Unsafe for production migration |

## Strict Localization Findings

### What the dataset actually supports today

- Self-consistent Greek/Russian pairs: `123`
- Greek pages with no Russian target in Babel: `50`
- Greek pages whose Babel `rus` target is missing from the dataset: `9`
- Malformed Greek Babel rows: `1`
- Strict orphan Russian pages: `20`

### Why this matters

Earlier locale summaries in the repo counted any Babel `web` reference as a valid link. That overstates readiness. For injection, a Greek page is only safely pairable when:

1. the row is actually in `context_key = web`,
2. `babelLanguageLinks.web` equals that same Greek row ID,
3. a `babelLanguageLinks.rus` target exists, and
4. that Russian target row exists in the dataset.

Anything weaker risks attaching the wrong `documentId`, creating orphaned locale documents, or silently skipping translations.

### Additional pair drift inside the `123` strict pairs

- Template mismatches: `16`
- Parent mismatches: `10`
- TV key mismatches: `104`
- Field presence mismatch events: `70`
  - `description`: `43`
  - `introtext`: `14`
  - `menutitle`: `11`
  - `content`: `2`

### Interpretation

Even when a pair exists, it often does not have the same structural shape in both locales. That means the importer cannot assume:

- same template,
- same parent translation,
- same dynamic-zone blocks,
- same SEO field availability,
- same tag model.

## Field Disposition

### Directly representable localized fields

| Source field | Target | `web` | `rus` | Status | Notes |
| --- | --- | ---: | ---: | --- | --- |
| `pagetitle` | `title` | `183` | `143` | Direct | Safe string mapping |
| `alias` | `slug` | `183` | `143` | Direct | Locale-local UID, but still requires duplicate handling |
| `content` | `content` | `159` | `117` | Direct | Rich text already transformed |
| `introtext` | `excerpt` | `122` | `90` | Direct | Optional localized excerpt |
| `metaTitle` | `seo.metaTitle` | `139` | `110` | Direct | Safe localized SEO field |
| `metaDescription` | `seo.metaDescription` | `73` | `30` | Direct | Safe only after precedence rule vs core `description` |
| `image` | `featuredImage` | `163` | `126` | Direct | Requires asset-map ID lookup |
| `imageCenter` | `imageCenter` | `52` | `47` | Direct | Requires asset-map ID lookup |
| `infoBlockBottom` | `infoBlockBottom` | `22` | `11` | Direct | Localized rich text |
| `url` | `externalUrl` | `11` | `6` | Direct | String/URL mapping |
| `isfolder` | `isFolder` | `183` | `143` | Direct | Current schema localizes it |
| `hidemenu` | `hideFromMenu` | `183` | `143` | Direct | Current schema localizes it |
| `menuindex` | `menuIndex` | `183` | `143` | Direct | Current schema localizes it |
| `articleAuthor` | `articleAuthor` | `131` | `5` | Direct | Heavy locale asymmetry |
| `sources` | `sources` | `127` | `2` | Direct | Heavy locale asymmetry |
| `popUpClose` | `popUpClose` | `1` | `1` | Direct | Homepage-style localized rich text |

### Requires deterministic transform before injection

| Source field | Target | `web` | `rus` | Status | Notes |
| --- | --- | ---: | ---: | --- | --- |
| `tags` | `tags` relation | `122` | `100` | Transform | Needs normalized locale-aware tag strategy |
| `migxGallery` | `pageBlocks.gallery-image` | `13` | `8` | Transform | Current component is adequate once parsed |
| `migxSocial` | `pageBlocks.social-link` | `1` | `1` | Transform | `title/url/class` must map to `name/url/icon` |
| `location` | `shared.location` or `blocks.clinic` | `12` | `7` | Transform | Raw `lat;lng` strings need parsing and explicit target choice |

### Partial or structurally unsafe today

| Source field | Target | `web` | `rus` | Status | Why it is unsafe now |
| --- | --- | ---: | ---: | --- | --- |
| `description` | `seo.metaDescription` | `155` | `91` | Partial | Collides semantically with TV `metaDescription` |
| `migxAccordion` | `pageBlocks.accordion-item` | `11` | `7` | Partial | Payload fails plain JSON parsing due to escaped HTML |
| `migxPromoSlider` | `pageBlocks.promo-slide` | `1` | `1` | Partial | One source item expands into up to six slides |
| `migxContacts` | `pageBlocks.contact-detail` | `1` | `1` | Partial | Source uses `title/description`, target expects `type/value` |
| `migxLocation` | `shared.location` or `blocks.clinic` | `1` | `1` | Partial | Escaped HTML plus mixed address/route content |
| `migxFaq` | `pageBlocks.faq-item` | `1` | `1` | Partial | Payload fails plain JSON parsing |
| `migxVideo` | `pageBlocks.video` | `1` | `1` | Partial | Source is `videoid/url/vtags`, target expects media files |
| `videoMp4` | video block or top-level custom logic | `1` | `1` | Partial | Only safe if homepage-specific importer logic exists |
| `videoWebm` | video block or top-level custom logic | `1` | `1` | Partial | Same issue as `videoMp4` |
| `imageVideo` | video block thumbnail or top-level custom logic | `1` | `1` | Partial | Needs homepage-specific mapping |
| `videoTags` | video block `videoTags` or `Tag` relation | `1` | `1` | Partial | Strategy not fixed |
| `migxTabs` | `pageBlocks.tab-item` | `1` | `1` | Partial | Payload fails plain JSON parsing |
| `migxTabsLink` | tab links | `1` | `1` | Partial | Source `doclink` model does not match current tab schema |

### Unmapped or explicit loss risks

| Source field | `web` | `rus` | Risk |
| --- | ---: | ---: | --- |
| `longtitle` | `158` | `102` | No field exists in Strapi; differs from `pagetitle` on `202` rows |
| `menutitle` | `18` | `3` | No field exists in Strapi; differs from `pagetitle` on `13` rows |
| `metaKeywords` | `150` | `122` | No field or policy exists for SEO keywords |
| `class` | `7` | `7` | No preserved destination for legacy icon/class semantics |
| `migxResources` | `1` | `1` | No component or relation model exists yet |
| `migxLocation2` | `0` | `1` | Russian-only secondary location model is not represented |
| `AffiliateAddress` | `0` | `2` | Russian-only clinic fields are not represented |
| `AffiliatePhone` | `0` | `2` | Russian-only clinic fields are not represented |
| `AffiliateEmail` | `0` | `2` | Russian-only clinic fields are not represented |
| `AffiliateCoords` | `0` | `2` | Russian-only clinic fields are not represented |
| `migxAdvantages` | `0` | `1` | Russian-only homepage block shape does not match current component |

## High-Risk Data-Loss Findings

### 1. `longtitle` is missing from the target schema

- Present on `260` pages total.
- Different from `pagetitle` on `202` pages.
- Current result if injected now: long-form titles would be collapsed into `title` or dropped entirely.

### 2. `description` and TV `metaDescription` are not interchangeable

- Both are present on `90` resources.
- They differ on `78` of those resources.
- Current result if injected now: one description overwrites the other with no documented precedence.

### 3. Localization linkage is not deterministic

- Only `123` self-consistent Greek/Russian pairs are usable as-is.
- `60` Greek pages do not currently resolve to an existing Russian partner safely:
  - `50` with no `rus` target in Babel,
  - `9` pointing to missing Russian IDs,
  - `1` malformed Babel row.
- Current result if injected now: wrong or missing `documentId` attachments.

### 4. MIGX payloads are not clean enough for blind parsing

Plain `json.loads` currently fails for:

- `migxAccordion`: `18/18`
- `migxResources`: `2/2`
- `migxLocation`: `2/2`
- `migxFaq`: `2/2`
- `migxTabs`: `2/2`
- `migxTabsLink`: `1/2`

Current result if injected now: dropped blocks, malformed blocks, or import aborts.

### 5. Tag import would fragment the taxonomy

- Unique `tags` values:
  - `web`: `15`
  - `rus`: `57`
- Paired pages with mismatched tag counts: `16`
- Current result if injected now: locale relations become inconsistent or semantically split.

### 6. Slug collision already exists in Greek

- `alias = sitemap` exists twice in `web`
  - `id 11`, XML sitemap (`uri = sitemap.xml`, `template = 0`)
  - `id 80`, HTML sitemap page (`uri = sitemap`, `template = 12`)
- Current result if injected now: UID conflict or unwanted auto-mutation.

### 7. The final content importer does not exist yet

The repo currently contains:

- asset uploader,
- transformation checks,
- schema generation,
- exploratory analysis,

but not the final page/tag/document injection path that would:

- create Greek pages first,
- preserve old-to-new ID maps,
- attach Russian locale versions by `documentId`,
- reconcile parent relations,
- reconcile tags,
- verify post-import parity.

## Full Ready Check

### Preconditions

- [x] Strapi server is running.
- [x] `el` and `ru` locales are configured.
- [x] `Page` and `Tag` schemas exist and are localized.
- [x] HTML modernization is verified clean.
- [x] Asset map exists.
- [x] Source template enum mapping is valid.
- [x] Source booleans are migration-safe.

### Zero-loss gates

- [ ] Every source field has an explicit disposition: keep, transform, archive, or intentionally drop.
- [ ] `longtitle` strategy is defined.
- [ ] `menutitle` strategy is defined.
- [ ] `metaKeywords` strategy is defined.
- [ ] `description` vs `metaDescription` precedence is defined.
- [ ] Russian-only affiliate/location variants are modeled or archived explicitly.
- [ ] MIGX cleanup step is implemented and validated against every MIGX field in use.
- [ ] Promo slider expansion rule is implemented.
- [ ] Video model strategy is implemented.
- [ ] Tag translation strategy is implemented and documented.
- [x] Strict Babel normalization is implemented. The importer reads `data/manifests/babel_normalization.json` (produced by `tools/build_babel_normalization.py` from `data/manifests/locale_pair_audit.json` + `data/manifests/reviews.yaml`) and never consults `babelLanguageLinks` directly. Current artifact: 136 linked pairs (123 strict + 3 auto + 10 manual), 47 Greek singletons, 7 Russian singletons, 16 dead Babel ids explicitly ignored.
- [ ] Parent translation reconciliation is implemented.
- [ ] UID collision policy is implemented for duplicate aliases.

### Execution gates

- [ ] Final importer exists for tags, root pages, child pages, localized document updates, and post-import reconciliation.
- [ ] Tokens are removed from source files and replaced with environment variables.
- [ ] Dry-run import is executed against an empty rehearsal database.
- [ ] Post-import counts match source counts by locale.
- [ ] Post-import strict-pair counts and orphan counts match the approved plan.
- [ ] Post-import hierarchy reconciliation returns zero unexpected mismatches.
- [ ] Post-import block/component counts match source payload counts.
- [ ] Post-import media IDs resolve for every mapped asset reference.

### Migration safety gates

- [ ] Production target database is approved; SQLite is not the production plan.
- [ ] Forward-only migration plan is written.
- [ ] Rollback/containment plan is written.
- [ ] Expand-contract steps are documented for any schema changes still pending.
- [ ] Large transforms are tested against production-sized data.

## Recommended Next Actions

1. Add or explicitly reject the missing source fields: `longtitle`, `menutitle`, `metaKeywords`, `migxResources`, `migxLocation2`, Russian affiliate fields, `migxAdvantages`.
2. Build a deterministic MIGX normalizer that repairs escaped payloads and expands composite structures such as `migxPromoSlider`.
3. Build a strict Babel normalization step and use that output, not URI heuristics, as the locale source of truth. Implemented: `data/manifests/babel_normalization.json` is now the single locale linkage artifact the importer consumes. Re-run `python3 tools/audit_locale_pairs.py && python3 tools/build_babel_normalization.py` and diff the JSON on every source change to gate injection.
4. Decide the SEO precedence rule for `description` vs `metaDescription`.
5. Define the tag model: translated `Tag` documents, locale-specific tags, or a canonical taxonomy with localized display names.
6. Implement the final importer in phases: assets and tags, Greek roots, Greek children, Russian locale versions, then relation reconciliation.
7. Re-run the full ready check and refuse production injection until every zero-loss gate passes.

## Commands

```bash
# Pair audit -> canonical normalization
python3 audit_locale_pairs.py
python3 build_babel_normalization.py

# Transform + normalize source data
python3 transform_data.py
python3 normalize_migx.py

# Tag plan
python3 build_tag_plan.py

# Readiness gate (blocks if any blocker fires)
python3 injection_readiness.py

# Import
cp backend/.tmp/data.db backend/.tmp/data.pre-import.db
python3 strapi_importer.py --dry-run      # validate payloads only
python3 strapi_importer.py                # real write against STRAPI_TARGET
```

## Production target

- Current production decision: **PostgreSQL** (to be finalised before the first non-dry-run). The rehearsal run uses the SQLite snapshot at `backend/.tmp/data.db`.
- Every script reads credentials from `.env` (see `.env.example`); no tokens live in source.
- The importer refuses to proceed unless `STRAPI_TARGET` is set to `rehearsal` or `production`. Production additionally requires an explicit `STRAPI_TARGET=production` in the environment to prevent accidental cutover.
- A pre-import DB snapshot (`cp backend/.tmp/data.db backend/.tmp/data.pre-import.db`) is taken automatically by the importer before the first write.

## Notes on Earlier Documents

- `i18n_migration_strategy.md` preserves the original migration plan, but its locale readiness summary has been superseded by this document and `full_ready_check.py`.
- Use this file for current go/no-go decisions.
