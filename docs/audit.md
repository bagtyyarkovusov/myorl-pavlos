# System Audit — Database, Schema, and Next.js SEO Frontend Readiness

**Date:** 2026-04-25
**Scope:** consolidated audit of the current Strapi backend, the MODX → Strapi migration state, and pre-Next.js alignment work.
**Status:** this document is the current entry point for Next.js frontend planning. It cross-links — not replaces — the earlier live-state audit and readiness docs.

---

## 1. Executive Summary

### 1.1 Headline verdict

- **Overall readiness:** `CONDITIONAL GO` for a bilingual, content-first Next.js App Router launch (no map UI in v1).
- **Composite readiness score:** `92 / 100` for continuing Next.js UI coding now; the machine-generated content score remains `84 / 100`. See §9 for the stricter production rubric.
- **Migration landing:** solid. The semantic page model (`pageType` + `layoutVariant` + named sections) is populated and usable today. Legacy `pageBlocks` duplication is cleared from published pages (`0` docs, `0` localized rows), with `358` old storage rows retained internally for migration safety.
- **Primary remaining blockers** for a production SEO launch are **operational and content-freeze work**, not migration-level: Postgres rehearsal, Strapi webhook configuration, SEO editorial review, and the small content-link hygiene queue.

### 1.2 Top 5 items to close before production launch

1. **Finish SEO editorial policy** — canonical URL, OG image, robots, and sitemap controls now exist; Twitter fields and JSON-LD overrides remain optional follow-up work — §4.1, Appendix C.
2. **Rehearse Postgres and apply lookup indexes** — local SQLite full-scans key queries today; forward-only Postgres index SQL already exists under `backend/database/postgres-readiness/` — §3, Appendix B.
3. **Configure Strapi → Next.js revalidation webhooks** so the new Next `/api/revalidate` endpoint is called on publish/unpublish — §3.4, Appendix D.
4. **Resolve the 13-doc SEO review queue** where legacy `longtitle` still adds signal over the current `seo.metaTitle` — §6, §7.
5. **Close content hygiene before freeze**: review the `2` remaining legacy media hrefs from `nextjs_internal_link_repair_manifest.json`, keep the unresolved `Google Plus` row hidden/replaced, and keep sanitizing legacy HTML in the Next.js renderer.

### 1.3 Recommended launch path

Continue Next.js UI implementation inside `frontend/` against the DTO boundary (ADR-001) and flat route policy (ADR-004). In parallel, run Week 0 hardening: content-link hygiene, Postgres rehearsal, Strapi revalidation webhook configuration, and SEO editorial review.

### 1.4 Cross-links

| Source | Purpose |
|---|---|
| [`docs/strapi-nextjs-audit.md`](./strapi-nextjs-audit.md) | Live payload audit, field-strategy table, rollout plan — still current. |
| [`docs/nextjs-content-readiness.md`](./nextjs-content-readiness.md) | UI-start readiness (`92/100`) plus machine content score (`84/100`). |
| [`docs/adr/ADR-001-nextjs-semantic-dto-boundary.md`](./adr/ADR-001-nextjs-semantic-dto-boundary.md) | DTO boundary contract. |
| [`docs/adr/ADR-002-nextjs-v1-contact-and-system-pages.md`](./adr/ADR-002-nextjs-v1-contact-and-system-pages.md) | v1 contact pages (no map), system pages frontend-native. |
| [`docs/adr/ADR-003-postgres-readiness-indexes.md`](./adr/ADR-003-postgres-readiness-indexes.md) | Forward-only Postgres hardening. |
| [`docs/adr/ADR-004-flat-locale-routes-and-localized-navigation-labels.md`](./adr/ADR-004-flat-locale-routes-and-localized-navigation-labels.md) | Flat locale routes + localized `menuTitle`. |
| [`docs/adr/ADR-005-repair-source-parent-integrity-before-postgres-cutover.md`](./adr/ADR-005-repair-source-parent-integrity-before-postgres-cutover.md) | Source parent integrity before PostgreSQL cutover. |
| [`examples/next_page_dto.ts`](../examples/next_page_dto.ts) | The canonical Next.js DTO the frontend will consume. |

---

## 2. Current-State Inventory

### 2.1 Stack

| Item | Value |
|---|---|
| Backend CMS | Strapi `5.42.1` |
| Frontend | Next.js `16.2.4` App Router under `frontend/` |
| Node runtime | `>=20 <=24` |
| Live rehearsal DB | SQLite (`backend/.tmp/data.db`) |
| Production DB target | PostgreSQL (Postgres index SQL already staged) |
| REST pagination | `defaultLimit: 25`, `maxLimit: 100`, `withCount: true` |
| Locales | `el` (default, source of truth) + `ru` |
| Plugins | `@strapi/plugin-cloud`, `@strapi/plugin-users-permissions`, `strapi-plugin-navigation@^3.3.7` |
| Versioned DB migrations | None yet (`backend/database/migrations/` empty) — schema changes rely on Strapi auto-sync; production indexes are staged separately |

### 2.2 Content types

| Content type | File | i18n | Draft/Publish | Attribute count |
|---|---|---:|---:|---:|
| `api::page.page` | `backend/src/api/page/content-types/page/schema.json` | yes | yes | 30 |
| `api::tag.tag` | `backend/src/api/tag/content-types/tag/schema.json` | yes | no | 3 |

### 2.3 Components — 33 total

| Category | Count | Purpose |
|---|---:|---|
| `shared/` | 2 | `shared.seo`, `shared.location` |
| `sections/` | 10 | One per semantic section type (promo-slider, linked-resources, social-links, video, advantages, accordion, tabs, gallery, contact, faq) |
| `items/` | 11 | Repeatable row items consumed inside `sections/*` |
| `blocks/` | 10 | Private legacy block variants (only referenced from the `private` `pageBlocks` dynamic zone) |

The `blocks/` set is now functionally dormant — `pageBlocks` is a `private: true` dynamic zone on `Page`, and the legacy duplication count is `0 / 0` as of the last cleanup pass (see `nextjs_content_readiness.json`). `blocks/*` are kept for migration-safety but do not appear in any public REST payload.

### 2.4 Scale

| Metric | Value |
|---|---:|
| Published localized page rows | 325 |
| Canonical page documents | 189 |
| Bilingual canonical documents | 136 |
| Greek-only documents | 46 |
| Russian-only documents | 7 |
| Strict source pairs (from MODX/Babel audit) | 123 |
| Published tag rows | 31 |
| Canonical tag documents | 16 (15 bilingual + 1 ru-only) |
| Published slug collisions | 0 |
| Clinics missing coordinates (v1 out-of-scope per ADR-002) | 6 / 6 |
| Unresolved social platforms (Google Plus) | 1 |
| Legacy `pageBlocks` duplication | 0 docs, 0 rows |
| Internal `pageBlocks` storage leftovers | 358 rows, 0 attached to published pages |
| `menuTitle` backfill | 21 applied / 0 pending |
| SEO review queue (legacy `longtitle` adds signal) | 13 |
| Potential internal broken links | 2 |
| Legacy HTML-marker sources | 259 |

Source: `nextjs_content_readiness.json` (re-verified today).

### 2.5 Content hygiene snapshot

Source: `python3 audit_nextjs_content_hygiene.py` against the local Strapi SQLite DB and live navigation render endpoint.

| Metric | Value |
|---|---:|
| Extracted links from page/component text | 1,422 |
| Internal links | 830 |
| External links | 561 |
| Potential internal broken references | 2 |
| Legacy HTML-marker sources | 259 |
| `<font>` sources | 78 |
| Inline `style=` sources | 174 |
| `<iframe>` sources | 122 |
| Unsafe script/event-handler findings | 0 |
| Empty content leaf pages | 0 |
| Strapi navigation render roots | el=7, ru=8 |

The reviewed page-link rewrites from `nextjs_internal_link_repair_manifest.json` were applied through a dry-run/snapshot/data-migration pass. The 2 remaining findings are legacy media paths and should not be rewritten until the target upload/media asset is confirmed.

### 2.6 Relation map

```
Page ──parentPage──▶ Page          (manyToOne, self, localized)
Page ◀─childrenPages─ Page         (oneToMany inverse)
Page ◀─manyToMany─▶ Page           (relatedPages — internal only; excluded from v1 contract)
Page ◀─manyToMany─▶ Tag            (tags / pages)
items.linked-resource ─manyToOne─▶ Page   (targetPage, nullable)
items.promo-slide     ─manyToOne─▶ Page   (targetPage, nullable)
```

---

## 3. Database Architecture Analysis

### 3.1 Driver

Rehearsal runs on SQLite. Production target is PostgreSQL. The switch is non-trivial for two reasons:

- **No versioned migrations.** The `backend/database/migrations/` folder is empty; Strapi has been syncing `schema.json` on boot. For production this means a cutover migration plan is required (see ADR-003) — not a simple `npm run build && start`.
- **Index coverage diverges across drivers.** SQLite does not benefit from the Postgres `CREATE INDEX CONCURRENTLY` patterns prepared under `backend/database/postgres-readiness/`. Until the switch, route lookup (`/:locale/:slug`) and listing queries (`pageType` + `layoutVariant`) full-scan the page table. At 325 rows this is invisible; at the real write/read mix of a live SEO frontend it is not.

### 3.2 Indexes already staged

| File | Indexes |
|---|---|
| [`backend/database/postgres-readiness/001_pages_lookup_indexes.sql`](../backend/database/postgres-readiness/001_pages_lookup_indexes.sql) | `pages (locale, slug, published_at)`, `pages (locale, page_type, layout_variant, published_at, menu_index)` |
| [`backend/database/postgres-readiness/002_tag_slug_indexes.sql`](../backend/database/postgres-readiness/002_tag_slug_indexes.sql) | `tags (locale, slug)` |

The tag index is locale-scoped because live tag rows are localized and reuse canonical slugs across `el` and `ru`.

### 3.3 Query hot paths to verify after Postgres cutover

1. **Route resolution** — `WHERE locale = ? AND slug = ? AND published_at IS NOT NULL` → uses `idx_pages_locale_slug_published_at`.
2. **Listing by type + layout** — e.g. article index pages querying siblings with the same `pageType + layoutVariant` → uses `idx_pages_locale_type_layout_published_menu`.
3. **Tag filter** — `WHERE locale = ? AND slug = ?` on the taxonomy route → uses `idx_tags_locale_slug`.

Document expected query plans (EXPLAIN ANALYZE) once the rehearsal Postgres DB is warmed.

### 3.4 Revalidation / ISR gap

Next.js now exposes `POST /api/revalidate` with `STRAPI_REVALIDATE_SECRET` and tag-based invalidation for pages, navigation, tags, and sitemap. Strapi still needs webhook configuration on publish/unpublish so the CMS calls that endpoint automatically. See Appendix D for the recommended wiring.

### 3.5 CORS

`strapi::cors` is now configured from `STRAPI_CORS_ORIGINS` with local Next.js origins as the development fallback. Production still needs the final frontend domains set in environment.

---

## 4. Strapi Schema Improvements (prioritized)

Every recommendation cites the file to edit and includes a before/after JSON diff in the appendix. Items are ordered so P0 unblocks a **Next.js scaffolding start**, P1 unblocks a **v1 ship**, and P2 is deferrable.

### P0 — block Next.js start

#### 4.1 Extend `shared.seo`

**File:** `backend/src/components/shared/seo.json`

**Current shape:** `metaTitle`, `metaDescription`, `canonicalUrl`, `ogImage`, `robotsNoindex`, `robotsNofollow`, `sitemapExclude`, `sitemapPriority`, and `sitemapChangeFrequency`.

**Gap for a modern SEO frontend:**

| Missing field | Why it matters |
|---|---|
| Optional Twitter fields | Useful if editors need Twitter/X previews separate from Open Graph. |
| `structuredData` (`json`) | Per-page JSON-LD override can be added later if generated defaults are not enough. |

Because `shared.seo` is already attached to every localized page (via `Page.seo`), these fields inherit i18n automatically — no extra wiring.

**Migration implication:** adding optional fields to a component is additive and does not require a data migration. Run the Strapi schema sync; existing rows will have the new fields as `null`.

#### 4.2 Lock `Tag.slug` contract

**File:** `backend/src/api/tag/content-types/tag/schema.json`

**Current shape (verified today):**

```json
"slug": {
  "type": "string",
  "required": true,
  "pluginOptions": { "i18n": { "localized": false } }
}
```

**Gaps:**

1. **No uniqueness constraint.** Two tags can share the same `slug` today; the only thing preventing collisions is the `backfill_tag_slugs.py` script's external collision check.
2. **Non-localized slug with localized rows** means the same slug appears once per locale in the database. The production lookup/index shape must therefore include `locale`.

**Recommendation:** keep the current required string field for v1, route/filter tags by `(locale, slug)`, and enforce collision checks through import/backfill verification plus the PostgreSQL `tags(locale, slug)` index. Concrete notes in Appendix E.

Canonical slugs are still useful, but the live Strapi storage model has localized rows. A global `slug` uniqueness assumption would reject valid translated tag rows.

#### 4.3 `Page.slug` — clarify, not change

**File:** `backend/src/api/page/content-types/page/schema.json`

`Page.slug` is `type: uid, targetField: title`, localized, and now `required: true`. Strapi's `uid` type is unique per locale at the DB layer; the live `publishedSlugCollisionCount` is `0`, so frontend routing can rely on `/{locale}/{slug}`.

#### 4.4 hreflang — no schema change; derive in DTO

Strapi's REST API already returns `localizations` on every localized entity. The Next.js DTO should map that to `<link rel="alternate" hreflang="...">` tags per-page; no schema field needed. Called out here because several teams instinctively reach for a new field. See `examples/next_page_dto.ts` for where the mapping should land.

### P1 — block v1 ship quality

#### 4.5 Sitemap metadata on `Page`

**File:** `backend/src/api/page/content-types/page/schema.json`

Sitemap behavior now lives on `shared.seo`: `sitemapPriority`, `sitemapChangeFrequency`, and `sitemapExclude`. Next.js reads those fields in `frontend/src/app/sitemap.ts`.

#### 4.6 Retire or quarantine `blocks/` components

**File:** all of `backend/src/components/blocks/*.json` + `Page.pageBlocks`

`pageBlocks` duplication is now `0 / 0`. The dynamic zone is already `private: true`. The `blocks/*` components are only referenced from that dynamic zone. Recommendation: keep them until after the first Next.js production release (migration safety), then either:

- delete them + the `pageBlocks` field in a versioned Postgres migration, or
- if audit trail matters, freeze them by removing from the allowed-components list so no new blocks can be written.

Not P0: they are invisible to the public API today.

#### 4.7 Block vs. items richtext asymmetry

`blocks.faq-item.answer` is `text`; `items.faq-item.answer` is `richtext`. Same for `blocks.contact-detail.value` vs `items.contact-detail.value`. These asymmetries are harmless while `blocks/` is private, but worth flagging before the retirement pass in §4.6 so the diff review is trivial.

### P2 — nice-to-have

- **Breadcrumb override component** — most breadcrumbs derive from `parentPage`, but a small set of content pages will want an editorial override (e.g., deep-linked articles under a thematic hub). Low priority; add when the first editor asks.
- **Author as a content type** — `articleAuthor: string` is fine for v1. Promote to its own content type (with photo + bio) only when an authors index page becomes a product requirement.
- **Per-page `ogLocale` / `alternateLocale`** — once `shared.seo` has the Open Graph fields, `og:locale` can be derived from the entity's `locale` column. No schema change needed.

---

## 5. Template & Rendering Architecture — Contract-Level Matrix

Per user scope decision, this section documents **what renders what**. Folder structure, route files, and component layout are deliberately left for the Next.js scaffolding task.

### 5.1 pageType × layoutVariant matrix

Every combination below is drawn from the live enums in `backend/src/api/page/content-types/page/schema.json`. Logical template names are conventions for the frontend team — name them as you like, but keep the mapping one-to-one.

| `pageType` | `layoutVariant` | Logical template | Semantic section the renderer consumes | Notes |
|---|---|---|---|---|
| `home` | `home` | `HomeTemplate` | `pageSections` (dynamiczone) | Renders the 9 allowed `sections/*` in order |
| `content` | `standard` | `StandardTemplate` | none (uses `content` richtext) | Article-style pages without a section block |
| `content` | `service-article` | `ArticleTemplate` (service variant) | none | Same base template, service sidebar optional |
| `content` | `encyclopedia-article` | `ArticleTemplate` (encyclopedia variant) | none | Encyclopedia-specific header/footer |
| `content` | `specialized-article` | `ArticleTemplate` (specialized variant) | none | Third article variant |
| `content` | `section-index` | `IndexTemplate` (generic) | derived from `childrenPages` | Lists child pages by `menuIndex` |
| `content` | `clinic-index` | `IndexTemplate` (clinics) | derived from `childrenPages` of type `gallery` | Grid of clinic cards |
| `content` | `video-index` | `IndexTemplate` (videos) | derived from `childrenPages` with `sections.video` | Video grid |
| `content` | `encyclopedia-index` | `IndexTemplate` (encyclopedia) | derived from `childrenPages` with `layoutVariant=encyclopedia-article` | Encyclopedia topical index |
| `content` | `appointment-form` | `AppointmentFormTemplate` | none | Frontend form; no section |
| `faq` | `service-faq` | `FAQTemplate` | `faqSection` | `content` acts as intro |
| `accordion` | `service-accordion` | `AccordionTemplate` | `accordionSection` | `content` acts as intro |
| `tabs` | `service-tabs` | `TabsTemplate` | `tabsSection` | `content` acts as intro |
| `gallery` | `clinic-gallery` | `GalleryTemplate` (clinic) | `gallerySection` | Per ADR-002, no map in v1 |
| `gallery` | `office-gallery` | `GalleryTemplate` (office) | `gallerySection` | Office presentation |
| `contact` | `contact` | `ContactTemplate` | `contactSection` | Static cards only (ADR-002) |
| `system` | `not-found` | frontend-native 404 | n/a | Data-less — render Next.js `not-found.tsx` |
| `system` | `search-results` | frontend-native search | n/a | Route handled by Next.js directly |
| `system` | `sitemap` | frontend-native sitemap | n/a | Handled by Next.js `sitemap.ts` |

19 valid cells from `19 × 8 = 152` theoretical combinations — the live payload audit in [`docs/strapi-nextjs-audit.md`](./strapi-nextjs-audit.md) confirms this is the actual distribution.

### 5.2 Section-renderer matrix

Each `sections/*` component has one logical React renderer. The renderer consumes only the items the schema allows (see `backend/src/components/sections/*.json`).

| Section component | Consumes (items) | Public contract shape |
|---|---|---|
| `sections.promo-slider` | `items.promo-slide` | `title`, `image`, `targetPage` or `targetUrl` |
| `sections.linked-resources` | `items.linked-resource` | `title`, `description` (richtext), `targetPage` or `targetUrl` |
| `sections.social-links` | `items.social-link` | `name`, `url`; platform derived in DTO |
| `sections.video` | `items.video` | `title`, `videoMp4`, `videoWebm`, `thumbnail`, `videoTags` |
| `sections.advantages` | `items.advantage` | `title`, `description`, `icon` |
| `sections.accordion` | `items.accordion-item` | `title`, `content` (richtext) |
| `sections.tabs` | `items.tab-item` | `title`, `content` (richtext), optional `link` |
| `sections.gallery` | `items.gallery-item` | `image`, `caption` |
| `sections.contact` | `items.contact-detail`, `items.clinic` | details + clinic cards (no coords in v1) |
| `sections.faq` | `items.faq-item` | `question`, `answer` (richtext) |

### 5.3 Rich text rendering guidance (high level)

- HTML has already been modernized by the migration (`html_modernization_plan.md`); the strings arriving in `content`, `infoBlockBottom`, `sources`, `popUpClose`, and in item-level richtext fields are clean.
- Recommend a vetted HTML-to-React parser (e.g., `html-react-parser`) with a sanitizer (e.g., DOMPurify server-side). Do not use `dangerouslySetInnerHTML` without sanitizing, even though the migration is clean — editors will eventually paste.
- Do not do this audit's job of specifying the renderer implementation — that belongs to the scaffolding task.

### 5.4 Media rendering guidance (high level)

- Strapi media responses expose a `formats` object (thumbnail, small, medium, large). Map it to Next.js `<Image sizes>` and a `srcSet`.
- `Page.featuredImage` accepts `images | files | videos | audios`; the DTO should narrow at boundary time and discard non-images for `<Image>` rendering. `Page.imageCenter` is already images-only.

---

## 6. SEO-Specific Readiness

### 6.1 Required metadata per page

The Next.js `generateMetadata` for any page route must produce:

| Tag | Source (after §4.1 schema change) |
|---|---|
| `<title>` | `seo.metaTitle ?? title` |
| `<meta name="description">` | `seo.metaDescription ?? excerpt` |
| `<link rel="canonical">` | `seo.canonicalUrl ?? computed(/{locale}/{slug})` |
| `<meta name="robots">` | `seo.robots ?? 'index,follow'` |
| `<meta property="og:title">` | `seo.ogTitle ?? seo.metaTitle ?? title` |
| `<meta property="og:description">` | `seo.ogDescription ?? seo.metaDescription ?? excerpt` |
| `<meta property="og:image">` | `seo.ogImage ?? featuredImage` |
| `<meta property="og:type">` | `seo.ogType ?? derive(pageType)` |
| `<meta property="og:locale">` | derived from entity `locale` |
| `<meta name="twitter:card">` | `seo.twitterCard ?? 'summary_large_image'` |
| `<link rel="alternate" hreflang="...">` | derived from entity `localizations` array |
| `<script type="application/ld+json">` | `seo.structuredData ?? derive(pageType)` |

### 6.2 Structured data (JSON-LD) per `pageType`

Default generation when `seo.structuredData` is null:

| `pageType` | Default JSON-LD type |
|---|---|
| `home` | `WebSite` |
| `content` | `Article` (fallback: `WebPage`) |
| `faq` | `FAQPage` with `mainEntity` derived from `faqSection.items[]` |
| `accordion`, `tabs` | `WebPage` |
| `gallery` | `ImageGallery` |
| `contact` | `LocalBusiness` (per clinic in `contactSection.clinics[]`) |
| `system` | `WebPage` (or suppress for 404/search) |

Always append a `BreadcrumbList` built from `parentPage` chain + localized `menuTitle ?? title`.

### 6.3 Sitemap.xml

- Generate via Next.js `sitemap.ts` — not Strapi.
- Source: one query per locale for published pages; exclude `sitemapExclude = true` and `system` pageType.
- Include `<xhtml:link rel="alternate" hreflang="...">` for each locale a page exists in (`localizations`).
- `priority` and `changefreq` from the new §4.5 fields when set; otherwise default (0.5 / monthly).

### 6.4 Robots.txt

- Static file at Next.js level is fine for v1.
- Disallow `/admin`, `/api` (Strapi URL). Everything else allowed.
- Reference the sitemap.

### 6.5 Redirects

- `slug_redirects_next.json` already provides 300+ source → target redirects (covers Cyrillic/Greek → ASCII transliteration and legacy nested URIs).
- For Next.js: at this volume, put the list in `next.config.js` `redirects()`. Above ~1000 entries, move to middleware-based lookup against a precomputed Map to avoid config bloat.

### 6.6 Locale routing

- Per ADR-004, flat locale-prefixed routes. `el` is default, `ru` is secondary.
- `/[locale]/[...slug]` — flat, not derived from `parentPage` chains.
- `parentPage` is only for breadcrumbs and navigation, not URL composition.

### 6.7 SEO review queue (outstanding editorial work)

13 localized pages where legacy MODX `longtitle` adds signal over the current `seo.metaTitle` — see `nextjs_seo_review_manifest.json`. This is **editorial**, not technical. Should be reviewed before content freeze.

---

## 7. Legacy Data Migration Quality Review

### 7.1 Pairing

- 123 strict source pairs from the MODX/Babel audit → 136 bilingual docs live in Strapi (strict pairs + later auto-links + manually linked reviews).
- Published source-parent integrity issues are now `0`; the previous RU orphan navigation issue was repaired before PostgreSQL cutover.
- Auto-linking decisions and collision analysis are in `locale_pair_audit.md`.

### 7.2 Structural drift

- 37 bilingual docs have cross-locale drift on `templateId`, `pageType`, `layoutVariant`, `parentPage`, `menuIndex`.
- Per ADR-004 and ADR-005, all 37 are now authenticated as **source-localized truth** or valid localized IA. They should stay localized for v1.

### 7.3 Legacy fields dropped

| Legacy field | Reach | Disposition |
|---|---:|---|
| `longtitle` | 260 pages, 202 differ from `title` | Dropped; 13 have SEO signal worth recovering into `seo.metaTitle` (review queue) |
| `metaKeywords` | 272 pages | Dropped; re-add as `seo.keywords` if kept (§4.1) |
| MODX `menutitle` | 21 pages distinct | Migrated — `Page.menuTitle` backfilled 21/21 |
| Affiliate clinic fields (RU-only) | N pages | Dropped — not in scope for v1 |
| `migxAdvantages` (RU homepage) | 1 page | Dropped — not yet mapped to a section |

### 7.4 Media

- 118+ assets migrated; `asset_map.json` preserved.
- Legacy video TVs that referenced asset IDs outside the map were dropped by `_sanitize_blocks()` in `strapi_importer.py`. No dangling references in published payloads.

### 7.5 Verdict

The migration is a solid foundation. Residual drift is editorial, not structural. The dropped fields are **known** drops (importer comments + `import_policy.md`), not silent data loss — which is exactly what you want from a migration.

---

## 8. Pre-Next.js DB Alignment Checklist

Call this Week 0 of the Next.js project. Most items can run in parallel with the first Next.js UI scaffold because the frontend is already constrained to the DTO contract.

### 8.1 Must-do (blocks production launch, not initial UI scaffolding)

- [x] Apply the v1 `shared.seo` schema fields used by Next metadata (§4.1, Appendix C).
- [ ] Keep tag lookups/indexing on `(locale, slug)` and verify duplicate slugs only occur across locales (§4.2, Appendix E).
- [x] Add `required: true` to `Page.slug` (§4.3).
- [x] Stand up the Next.js revalidation endpoint (Appendix D).
- [ ] Configure Strapi webhooks to call the Next.js revalidation endpoint on publish/unpublish (Appendix D).
- [ ] Run `python3 audit_nextjs_content_hygiene.py` and keep unsafe HTML findings and empty content leaf pages at `0`.
- [x] Review and apply the page-href repair plan in `nextjs_internal_link_repair_manifest.json` through a separate dry-run/snapshot/data-migration pass.
- [ ] Resolve the 2 remaining legacy media-path findings after upload/media review.
- [ ] Run the Postgres rehearsal:
  - Dump SQLite to Postgres (Strapi `npm run strapi transfer`).
  - Apply `001_pages_lookup_indexes.sql` and `002_tag_slug_indexes.sql`.
  - Verify EXPLAIN ANALYZE for the three hot paths in §3.3.

### 8.2 Should-do (before v1 ship)

- [x] Apply sitemap controls on `shared.seo` (§4.5, Appendix C).
- [ ] Close the 13-doc SEO review queue (§6.7).
- [ ] Keep the unresolved `Google Plus` social row hidden in v1 or replace it with a supported current platform.
- [ ] Decide whether `keywords` re-import from MODX `metaKeywords` is worth a one-off backfill (§4.1) — once the schema field exists, a 30-line script can backfill from the already-exported MODX snapshot.
- [x] Pin CORS through `STRAPI_CORS_ORIGINS` in `backend/config/middlewares.ts`; set production origins in env before launch.

### 8.3 Do-later (after v1 ship)

- [ ] Retire `blocks/*` components and the `pageBlocks` dynamic zone in a versioned migration (§4.6).
- [ ] Promote `articleAuthor` to a content type if/when an authors index is a product requirement.
- [ ] Clinic coordinates backfill (only if maps become part of a later release).

---

## 9. Readiness Score — Re-Scored with a 6-Dimension Rubric

### 9.1 Rubric

The existing `nextjs_content_readiness.py` scores across 5 dimensions (Contract/API 30, Routing/Nav 20, Localization 20, Content Quality 20, Ops 10). That rubric is accurate for "can we ship the content today?" but it conflates schema completeness with contract stability, and does not isolate SEO surface completeness.

The 6-dimension rubric below inherits the same evidence but breaks **Contract/API** into **Schema completeness** + **Contract stability**, and carves out an explicit **SEO surface** dimension. It is a superset: re-running `nextjs_content_readiness.py` still produces the live score and this rubric layers on top.

| Dimension | Weight | Covers |
|---|---:|---|
| D1. Schema completeness | 20 | `shared.seo` fields, slug uniqueness, sitemap fields, `menuTitle` |
| D2. Contract stability | 15 | Legacy fields private, DTO shape, `templateId`/`pageBlocks` excluded |
| D3. i18n correctness | 15 | Locale-scoped routes, hreflang derivation, tag i18n model |
| D4. SEO surface completeness | 15 | Canonical, robots, OG/Twitter, structured data, sitemap generation |
| D5. Migration data quality | 15 | Drift authenticated, dropped fields known, media integrity |
| D6. Operational readiness | 20 | DB driver + indexes, webhooks, revalidation, CORS |

### 9.2 Current score (today)

For continuing Next.js UI coding against the DTO boundary, the practical score is now `92/100`: the machine content score of `84/100` plus implemented frontend routing/DTO, CORS, revalidation endpoint, required slugs, v1 SEO schema controls, and applied page-link repairs. The stricter production-readiness rubric below is now `74/100` because Postgres rehearsal, Strapi webhook configuration, media-path review, and SEO editorial review are still open.

| Dimension | Score | Justification |
|---|---:|---|
| D1. Schema completeness | `18/20` | `Page.slug`, `Tag.slug`, `menuTitle`, semantic sections, v1 `shared.seo`, and sitemap controls landed. Optional Twitter/JSON-LD fields remain → −2. |
| D2. Contract stability | `15/15` | DTO contract exists, legacy fields are private, `pageBlocks` duplication is cleared, and source-parent integrity is clean. |
| D3. i18n correctness | `13/15` | Locale routes and tag lookup are locale-scoped; alternates currently expose the current locale only until bilingual alternate lookup is added → −2. |
| D4. SEO surface completeness | `10/15` | Canonical, OG image, robots, and sitemap generation exist. Twitter fields, JSON-LD overrides, and editorial SEO review remain → −5. |
| D5. Migration data quality | `15/15` | 37 authenticated drift docs, 0 source-parent integrity issues, 0 duplication, and the 13 editorial SEO queue is known. |
| D6. Operational readiness | `3/20` | Frontend revalidation endpoint and CORS exist, but no Postgres rehearsal, no Strapi webhook configuration, and no production query-plan proof → −17. |
| **Total** | **`74/100`** | Stricter rubric than the existing 5-dim score (84/100). |

The two scores are not inconsistent: 84/100 says "the current data and contract are usable today"; 74/100 says "the schema + ops surface a modern SEO Next.js frontend will pull against is closer, but still not production hardened."

### 9.3 Projected score after remaining P0 work (§8.1)

| Dimension | Projected |
|---|---:|
| D1. Schema completeness | `18/20` |
| D2. Contract stability | `15/15` |
| D3. i18n correctness | `14/15` (+1) |
| D4. SEO surface completeness | `12/15` (+2) |
| D5. Migration data quality | `15/15` |
| D6. Operational readiness | `14/20` (+11) — post-Postgres + Strapi webhook |
| **Projected total** | **`88/100`** |

### 9.4 Projected score after P1 work (§4 P1 + §8.2)

| Dimension | Projected |
|---|---:|
| D1. Schema completeness | `19/20` (+1) — optional Twitter/JSON-LD decision |
| D2. Contract stability | `15/15` (+1) |
| D3. i18n correctness | `15/15` (+1) |
| D4. SEO surface completeness | `15/15` (+2) |
| D5. Migration data quality | `14/15` (+1) — orphan decision |
| D6. Operational readiness | `18/20` (+4) |
| **Projected total** | **`96/100`** |

The remaining 3 points are `blocks/*` retirement + author content type + clinic coordinates — all explicit post-v1.

---

## 10. Prioritized Roadmap

| Week | Focus | Exit criteria |
|---|---|---|
| Week 0 | Remaining production hardening: Strapi webhook, Postgres rehearsal, media-path review | `/api/revalidate` receives CMS events, Postgres rehearsal DB green, legacy media hrefs resolved |
| Week 1 | Finalize DTO alternates + freeze rendering matrix | `frontend/src/lib/cms/*` returns bilingual alternates where live `documentId` pairs exist; rendering matrix §5 signed off |
| Week 1–2 | Continue Next.js UI implementation against DTO (ADR-001) | Locale router + semantic templates + `generateMetadata` producing all §6.1 tags |
| Week 2 | Templates per §5.1 rolled out | All 19 valid cells rendered; sitemap.ts producing output |
| Week 3 | SEO polish + schema P1 (§4.5 sitemap fields) | Structured data validated in Rich Results Test; sitemap submitted |
| Week 3+ | Editorial SEO review queue (§6.7) + Russian orphan decision (§7.1) | 13 SEO queue docs reviewed; orphan policy documented |

---

## Appendix A — File Reference Index

### Schemas

- `backend/src/api/page/content-types/page/schema.json`
- `backend/src/api/tag/content-types/tag/schema.json`
- `backend/src/components/shared/seo.json`
- `backend/src/components/shared/location.json`
- `backend/src/components/sections/*.json` (10 files)
- `backend/src/components/items/*.json` (11 files)
- `backend/src/components/blocks/*.json` (10 files; private)

### Config

- `backend/config/database.ts`
- `backend/config/plugins.ts`
- `backend/config/middlewares.ts`
- `backend/config/api.ts`
- `backend/src/index.ts`
- `backend/src/bootstrap/content-manager-config.ts`
- `backend/src/bootstrap/navigation-config.ts`

### Generated types

- `backend/types/generated/contentTypes.d.ts`
- `backend/types/generated/components.d.ts`

### Existing audits & decisions

- `docs/strapi-nextjs-audit.md` — live-state audit.
- `docs/nextjs-content-readiness.md` — UI-start readiness (`92/100`) and machine 5-dim content score (`84/100`).
- `frontend/` — current Next.js App Router scaffold.
- `docs/adr/ADR-001-nextjs-semantic-dto-boundary.md`
- `docs/adr/ADR-002-nextjs-v1-contact-and-system-pages.md`
- `docs/adr/ADR-003-postgres-readiness-indexes.md`
- `docs/adr/ADR-004-flat-locale-routes-and-localized-navigation-labels.md`
- `docs/admin-hierarchy-ux.md`
- `docs/NEXTJS_SLUG_REDIRECTS_REMINDER.md`
- `examples/next_page_dto.ts`

### Manifests / reports

- `nextjs_content_readiness.json`
- `nextjs_structural_review_manifest.json`
- `nextjs_legacy_cleanup_manifest.json`
- `nextjs_source_alignment_manifest.json`
- `nextjs_page_contract_fix_plan.json`
- `nextjs_menu_title_backfill_plan.json`
- `nextjs_seo_review_manifest.json`
- `nextjs_pageblocks_cleanup_batch_a.json`, `nextjs_pageblocks_cleanup_batch_b.json`
- `slug_redirects_next.json`
- `slug_migration_verification_audit.json`
- `sync_navigation_report.json`
- `locale_pair_audit.md`, `locale_pair_audit.json`
- `tag_plan.json`

---

## Appendix B — Recommended Postgres Indexes (already staged)

Files:

- `backend/database/postgres-readiness/001_pages_lookup_indexes.sql`
- `backend/database/postgres-readiness/002_tag_slug_indexes.sql`

Applied verbatim on the production database after the cutover. Do not run inside a transaction block (the scripts rely on `CREATE INDEX CONCURRENTLY`). The tag lookup index is `tags(locale, slug)` because localized rows duplicate canonical slugs.

Validation after application (per §3.3):

```sql
EXPLAIN ANALYZE
  SELECT id FROM pages
  WHERE locale = 'el' AND slug = 'epikoinonia' AND published_at IS NOT NULL;
-- expect: Index Scan using idx_pages_locale_slug_published_at
```

---

## Appendix C — Extended `shared.seo` component

**File:** `backend/src/components/shared/seo.json`

**Before (previous):**

```json
{
  "collectionName": "components_shared_seos",
  "info": {
    "displayName": "SEO",
    "description": ""
  },
  "options": {},
  "attributes": {
    "metaTitle": {
      "type": "string"
    },
    "metaDescription": {
      "type": "text"
    }
  }
}
```

**Current v1 schema:**

```json
{
  "collectionName": "components_shared_seos",
  "info": {
    "displayName": "SEO",
    "description": "Per-page search, social, and structured-data metadata"
  },
  "options": {},
  "attributes": {
    "metaTitle": {
      "type": "string"
    },
    "metaDescription": {
      "type": "text"
    },
    "canonicalUrl": {
      "type": "string"
    },
    "ogImage": {
      "type": "media",
      "multiple": false,
      "required": false,
      "allowedTypes": ["images"]
    },
    "robotsNoindex": {
      "type": "boolean",
      "default": false
    },
    "robotsNofollow": {
      "type": "boolean",
      "default": false
    },
    "sitemapExclude": {
      "type": "boolean",
      "default": false
    },
    "sitemapPriority": {
      "type": "decimal"
    },
    "sitemapChangeFrequency": {
      "type": "enumeration",
      "enum": ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"]
    }
  }
}
```

Optional follow-up fields if the editorial team needs them: `twitterCard`, `twitterImage`, `structuredData`, and distinct `ogTitle`/`ogDescription`.

---

## Appendix D — Strapi → Next.js revalidation webhook

### Strapi side

Configure a webhook in `backend/config/server.ts` (or the admin UI → Settings → Webhooks) that fires on `entry.publish` and `entry.unpublish` for `api::page.page` and `api::tag.tag`. Point it at `${NEXT_PUBLIC_SITE_URL}/api/revalidate` and include a shared secret header.

### Next.js side

`frontend/src/app/api/revalidate/route.ts` verifies the secret, derives tags from page/navigation/tag payloads, then calls `revalidateTag(tag, { expire: 0 })`.

The remaining task is Strapi-side webhook configuration.

---

## Appendix E — `Tag.slug` uniqueness diff

**File:** `backend/src/api/tag/content-types/tag/schema.json`

**Before (current):**

```json
"slug": {
  "type": "string",
  "required": true,
  "pluginOptions": {
    "i18n": { "localized": false }
  }
}
```

**After (v1 recommendation):** keep the schema shape above, keep `slug` required and non-localized, and make the production database lookup index locale-scoped:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tags_locale_slug
  ON tags (locale, slug);
```

This matches the current live data: translated tag rows intentionally share canonical slugs across `el` and `ru`. A later schema phase can consider `uid`, but it should not be coupled to the Next.js v1 launch.

---

## Appendix F — Cross-reference: which existing doc covers which audit section

| This audit § | Existing source |
|---|---|
| §2 (inventory) | `docs/strapi-nextjs-audit.md` (inventory table), `nextjs_content_readiness.json` (metrics) |
| §3 (DB architecture) | ADR-003 (Postgres), `backend/database/postgres-readiness/*` (SQL) |
| §4 (schema improvements) | **net-new to this audit** — no prior coverage |
| §5 (template matrix) | **net-new to this audit** — `docs/strapi-nextjs-audit.md` has field strategy, not matrix |
| §6 (SEO surface) | **net-new to this audit** — `docs/NEXTJS_SLUG_REDIRECTS_REMINDER.md` covers redirects only |
| §7 (migration quality) | `docs/strapi-nextjs-audit.md`, `locale_pair_audit.md`, `strapi_injection_readiness.md` |
| §8 (pre-Next.js checklist) | extends `docs/nextjs-content-readiness.md` → Next Plan |
| §9 (readiness score) | extends `docs/nextjs-content-readiness.md` (`92/100` UI-start, `84/100` machine) with a 6-dim production rubric |
| §10 (roadmap) | extends `docs/strapi-nextjs-audit.md` → Rollout Plan |

---

*End of audit.*
