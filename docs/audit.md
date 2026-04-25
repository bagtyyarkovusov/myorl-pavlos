# System Audit — Database, Schema, and Next.js SEO Frontend Readiness

**Date:** 2026-04-24
**Scope:** consolidated audit of the current Strapi backend, the MODX → Strapi migration state, and pre-Next.js alignment work.
**Status:** this document is the current entry point for Next.js frontend planning. It cross-links — not replaces — the earlier live-state audit and readiness docs.

---

## 1. Executive Summary

### 1.1 Headline verdict

- **Overall readiness:** `CONDITIONAL GO` for a bilingual, content-first Next.js App Router launch (no map UI in v1).
- **Composite readiness score:** `81 / 100` (baseline before the last pass was `78`). See §9 for the re-scored rubric.
- **Migration landing:** solid. The semantic page model (`pageType` + `layoutVariant` + named sections) is populated and usable today. Legacy `pageBlocks` duplication is cleared (`0` docs, `0` localized rows).
- **Primary remaining blockers** for a production SEO launch are **schema-level**, not migration-level: the `shared.seo` component is too thin to support modern SEO, and `Tag.slug` has no uniqueness contract.

### 1.2 Top 5 items to close before Next.js scaffolding begins

1. **Extend `shared.seo`** to cover canonical URL, Open Graph, Twitter, robots, and structured data (JSON-LD) — §4.1, Appendix C.
2. **Lock `Tag.slug` uniqueness and i18n semantics** — currently `type: string`, required but not unique and not localized; this is a direct SEO risk for taxonomy pages — §4.2, Appendix E.
3. **Decide the Postgres migration window** — local SQLite full-scans key queries today; forward-only index SQL already exists under `backend/database/postgres-readiness/` — §3, Appendix B.
4. **Wire a Strapi → Next.js revalidation webhook** before the frontend starts, so ISR on-demand revalidation can be written against a contract that actually exists — §3.4, Appendix D.
5. **Resolve the 13-doc SEO review queue** where legacy `longtitle` still adds signal over the current `seo.metaTitle` — §6, §7.

### 1.3 Recommended launch path

Week 0 — close the P0 schema list (§4). Week 1–2 — Postgres rehearsal and revalidation webhook (§3, §8). Week 2–3 — Next.js scaffolds against the DTO (ADR-001) + the rendering matrix (§5). Week 3+ — SEO polish (sitemap.xml, robots.txt, JSON-LD per `pageType`) — §6.

### 1.4 Cross-links

| Source | Purpose |
|---|---|
| [`docs/strapi-nextjs-audit.md`](./strapi-nextjs-audit.md) | Live payload audit, field-strategy table, rollout plan — still current. |
| [`docs/nextjs-content-readiness.md`](./nextjs-content-readiness.md) | Machine-scored readiness breakdown — still current (`81/100`). |
| [`docs/adr/ADR-001-nextjs-semantic-dto-boundary.md`](./adr/ADR-001-nextjs-semantic-dto-boundary.md) | DTO boundary contract. |
| [`docs/adr/ADR-002-nextjs-v1-contact-and-system-pages.md`](./adr/ADR-002-nextjs-v1-contact-and-system-pages.md) | v1 contact pages (no map), system pages frontend-native. |
| [`docs/adr/ADR-003-postgres-readiness-indexes.md`](./adr/ADR-003-postgres-readiness-indexes.md) | Forward-only Postgres hardening. |
| [`docs/adr/ADR-004-flat-locale-routes-and-localized-navigation-labels.md`](./adr/ADR-004-flat-locale-routes-and-localized-navigation-labels.md) | Flat locale routes + localized `menuTitle`. |
| [`examples/next_page_dto.ts`](../examples/next_page_dto.ts) | The canonical Next.js DTO the frontend will consume. |

---

## 2. Current-State Inventory

### 2.1 Stack

| Item | Value |
|---|---|
| Backend CMS | Strapi `5.42.1` |
| Node runtime | `>=20 <=24` |
| Live rehearsal DB | SQLite (`backend/.tmp/data.db`) |
| Production DB target | PostgreSQL (Postgres index SQL already staged) |
| REST pagination | `defaultLimit: 25`, `maxLimit: 100`, `withCount: true` |
| Locales | `el` (default, source of truth) + `ru` |
| Plugins | `@strapi/plugin-cloud`, `@strapi/plugin-users-permissions`, `strapi-plugin-navigation@^3.3.7` |
| Versioned DB migrations | None yet (`backend/database/migrations/` empty) — schema changes rely on Strapi auto-sync |

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
| `menuTitle` backfill | 21 applied / 0 pending |
| SEO review queue (legacy `longtitle` adds signal) | 13 |

Source: `nextjs_content_readiness.json` (re-verified today).

### 2.5 Relation map

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
| [`backend/database/postgres-readiness/002_tag_slug_indexes.sql`](../backend/database/postgres-readiness/002_tag_slug_indexes.sql) | `tags (slug)` (Option A) or `tags (locale, slug)` (Option B) |

Option A / Option B in `002_tag_slug_indexes.sql` is load-bearing — it is the same decision surfaced again in §4.2 (tag i18n model). **Pick once, index once.**

### 3.3 Query hot paths to verify after Postgres cutover

1. **Route resolution** — `WHERE locale = ? AND slug = ? AND published_at IS NOT NULL` → uses `idx_pages_locale_slug_published_at`.
2. **Listing by type + layout** — e.g. article index pages querying siblings with the same `pageType + layoutVariant` → uses `idx_pages_locale_type_layout_published_menu`.
3. **Tag filter** — `WHERE slug = ?` (or `WHERE locale = ? AND slug = ?` with Option B) on the taxonomy route → uses `idx_tags_slug` (or `idx_tags_locale_slug`).

Document expected query plans (EXPLAIN ANALYZE) once the rehearsal Postgres DB is warmed.

### 3.4 Revalidation / ISR gap

Strapi is configured with only the default middlewares (`backend/config/middlewares.ts`) and **no webhooks or lifecycle hooks** that trigger Next.js on-demand revalidation on publish/unpublish. This is a silent blocker: Next.js ISR assumes the CMS can ping a revalidation endpoint, and that contract does not exist yet. See Appendix D for the recommended wiring.

### 3.5 CORS

Default `strapi::cors` middleware only. For a Next.js frontend running on a different origin, CORS must be explicitly pinned to the production domain set before the frontend goes live. Not a blocker today (local dev passes) but should be in the Week-0 checklist.

---

## 4. Strapi Schema Improvements (prioritized)

Every recommendation cites the file to edit and includes a before/after JSON diff in the appendix. Items are ordered so P0 unblocks a **Next.js scaffolding start**, P1 unblocks a **v1 ship**, and P2 is deferrable.

### P0 — block Next.js start

#### 4.1 Extend `shared.seo`

**File:** `backend/src/components/shared/seo.json`

**Current shape (verified today):** two fields — `metaTitle: string` and `metaDescription: text`. Nothing else.

**Gap for a modern SEO frontend:**

| Missing field | Why it matters |
|---|---|
| `canonicalUrl` | Required whenever the same content is reachable from multiple URLs (hreflang alternates, legacy redirect targets, tag/category cross-links). |
| `robots` | Per-page `noindex,nofollow` control — editors need it for system pages, thin content, appointment forms. |
| `ogTitle`, `ogDescription`, `ogImage`, `ogType` | Open Graph is separate from `metaTitle/metaDescription` in practice; editors curate social previews independently. |
| `twitterCard`, `twitterImage` | Same reason for Twitter/X. |
| `keywords` | MODX `metaKeywords` was present on 272 legacy pages and is currently dropped by the importer. Adding an explicit field recovers that signal. |
| `structuredData` (`json`) | Per-page JSON-LD override (Article, FAQPage, LocalBusiness, BreadcrumbList). Next.js will generate a default from `pageType`, but editors must be able to override. |

Concrete schema shown in Appendix C. Because `shared.seo` is already attached to every localized page (via `Page.seo`), these fields inherit i18n automatically — no extra wiring.

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
2. **Non-localized slug with a localized `name`** is workable for SEO only if the frontend treats `/tags/:slug` as a canonical cross-locale entry point. This needs to match the index choice in `002_tag_slug_indexes.sql` (Option A).

**Recommendation:** convert to `uid` + keep non-localized (pairs with `002_tag_slug_indexes.sql` Option A). Concrete diff in Appendix E.

Canonical non-localized slug is the simplest SEO path and matches how the importer already behaves (see `tag_plan.json`). Localizing the slug is only worth it if the business wants independent Greek/Russian tag URLs — not the case today.

#### 4.3 `Page.slug` — clarify, not change

**File:** `backend/src/api/page/content-types/page/schema.json`

`Page.slug` is `type: uid, targetField: title`, localized. Strapi's `uid` type is unique per locale at the DB layer; the live `publishedSlugCollisionCount` is `0`. **No schema change needed** — but document this guarantee explicitly in the audit so frontend routing can rely on it.

The one thing worth adding is `required: true` so editors cannot save a page without a slug (today Strapi auto-fills from `title` on save, but the contract is looser than the frontend needs).

#### 4.4 hreflang — no schema change; derive in DTO

Strapi's REST API already returns `localizations` on every localized entity. The Next.js DTO should map that to `<link rel="alternate" hreflang="...">` tags per-page; no schema field needed. Called out here because several teams instinctively reach for a new field. See `examples/next_page_dto.ts` for where the mapping should land.

### P1 — block v1 ship quality

#### 4.5 Sitemap metadata on `Page`

**File:** `backend/src/api/page/content-types/page/schema.json`

Today there is no way for an editor to override sitemap behavior per page — `hideFromMenu` is the closest signal but it controls navigation, not sitemap inclusion. Recommendation: add two optional fields on `Page`:

- `sitemapPriority` (`decimal`, `default: 0.5`) — 0.0…1.0
- `sitemapChangeFrequency` (`enumeration`) — `always|hourly|daily|weekly|monthly|yearly|never`
- `sitemapExclude` (`boolean`, `default: false`)

Localized (same i18n setting as the rest of `Page`) so each locale can tune independently. Concrete JSON in Appendix C.

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
- 20 Russian orphans remain unlinked — candidates either need a Greek sibling authored or a clear decision to ship as ru-only.
- Auto-linking decisions and collision analysis are in `locale_pair_audit.md`.

### 7.2 Structural drift

- 37 bilingual docs have cross-locale drift on `templateId`, `pageType`, `layoutVariant`, `parentPage`, `menuIndex`.
- Per ADR-004, 20 of those are now authenticated as **source-localized truth** (i.e., the legacy MODX content deliberately had different structure per locale).
- The remaining 17 are on an editorial review queue — not an importer bug.

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

Call this Week 0 of the Next.js project. Everything here runs on the Strapi side before a Next.js scaffold exists.

### 8.1 Must-do (blocks Next.js scaffold start)

- [ ] Apply extended `shared.seo` schema (§4.1, Appendix C).
- [ ] Apply `Tag.slug` uniqueness change (§4.2, Appendix E) and pick `002_tag_slug_indexes.sql` Option A or B consistently.
- [ ] Add `required: true` to `Page.slug` (§4.3).
- [ ] Stand up the revalidation webhook endpoint in Strapi config → Next.js (Appendix D).
- [ ] Run the Postgres rehearsal:
  - Dump SQLite to Postgres (Strapi `npm run strapi transfer`).
  - Apply `001_pages_lookup_indexes.sql` and `002_tag_slug_indexes.sql`.
  - Verify EXPLAIN ANALYZE for the three hot paths in §3.3.

### 8.2 Should-do (before v1 ship)

- [ ] Apply sitemap fields on `Page` (§4.5, Appendix C).
- [ ] Close the 13-doc SEO review queue (§6.7).
- [ ] Resolve or archive the 20 Russian orphan pages (§7.1).
- [ ] Decide whether `keywords` re-import from MODX `metaKeywords` is worth a one-off backfill (§4.1) — once the schema field exists, a 30-line script can backfill from the already-exported MODX snapshot.
- [ ] Pin CORS to the production frontend origin in `backend/config/middlewares.ts`.

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

| Dimension | Score | Justification |
|---|---:|---|
| D1. Schema completeness | `11/20` | `Page.slug`, `Tag.slug`, `menuTitle`, and semantic sections landed. `shared.seo` is minimal and sitemap fields absent → −9. |
| D2. Contract stability | `14/15` | DTO contract exists, legacy fields private, `pageBlocks` duplication cleared. One point off for the 17 unreviewed structural drift docs that are not yet documented per-case. |
| D3. i18n correctness | `11/15` | Page i18n clean; Tag i18n model ambiguous (slug unique strategy not locked) → −2. Hreflang derivation not yet in DTO → −2. |
| D4. SEO surface completeness | `5/15` | Only `metaTitle + metaDescription` exist. Canonical, OG, Twitter, robots, structured data, keywords all missing → −10. |
| D5. Migration data quality | `13/15` | 20 authenticated drift + 0 duplication + 13 editorial SEO queue known = good. −2 for the 20 unresolved ru-only orphans. |
| D6. Operational readiness | `6/20` | Forward-only SQL staged, but no Postgres cutover, no revalidation webhook, production CORS not pinned → −14. |
| **Total** | **`60/100`** | Stricter rubric than the existing 5-dim score (81/100). |

The two scores are not inconsistent: 81/100 says "the current data and contract are usable today"; 60/100 says "the schema + ops surface a modern SEO Next.js frontend will pull against is not yet complete."

### 9.3 Projected score after P0 work (§4 P0 + §8.1)

| Dimension | Projected |
|---|---:|
| D1. Schema completeness | `18/20` (+7) |
| D2. Contract stability | `14/15` (unchanged) |
| D3. i18n correctness | `14/15` (+3) |
| D4. SEO surface completeness | `13/15` (+8) |
| D5. Migration data quality | `13/15` (unchanged) |
| D6. Operational readiness | `15/20` (+9) — post-Postgres + webhook |
| **Projected total** | **`87/100`** |

### 9.4 Projected score after P1 work (§4 P1 + §8.2)

| Dimension | Projected |
|---|---:|
| D1. Schema completeness | `20/20` (+2) — sitemap fields |
| D2. Contract stability | `15/15` (+1) |
| D3. i18n correctness | `15/15` (+1) |
| D4. SEO surface completeness | `15/15` (+2) |
| D5. Migration data quality | `14/15` (+1) — orphan decision |
| D6. Operational readiness | `18/20` (+3) — CORS pinned |
| **Projected total** | **`97/100`** |

The remaining 3 points are `blocks/*` retirement + author content type + clinic coordinates — all explicit post-v1.

---

## 10. Prioritized Roadmap

| Week | Focus | Exit criteria |
|---|---|---|
| Week 0 | Schema P0 (§4.1–4.4), revalidation webhook, Postgres rehearsal | `shared.seo` extended, `Tag.slug` locked, `/api/revalidate` wired, Postgres rehearsal DB green |
| Week 1 | Finalize DTO for extended schema; freeze rendering matrix | `examples/next_page_dto.ts` updated to read new `seo.*`; rendering matrix §5 signed off |
| Week 1–2 | Next.js scaffolding against DTO (ADR-001) | Locale router + one `ArticleTemplate` + `generateMetadata` producing all §6.1 tags |
| Week 2 | Templates per §5.1 rolled out | All 19 valid cells rendered; sitemap.ts producing output |
| Week 3 | SEO polish + schema P1 (§4.5 sitemap fields) | Structured data validated in Rich Results Test; sitemap submitted |
| Week 3+ | Editorial SEO review queue (§6.7) + Russian orphan decision (§7.1) | 13 SEO queue docs reviewed; orphan policy documented |

---

## Appendix A — File Reference Index

### Schemas

- `backend/src/api/page/content-types/page/schema.json`
- `backend/src/api/tag/content-types/tag/schema.json`
- `backend/src/components/shared/seo.json` *(to be edited, Appendix C)*
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
- `docs/nextjs-content-readiness.md` — 5-dim readiness (`81/100`).
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

Applied verbatim on the production database after the cutover. Do not run inside a transaction block (the scripts rely on `CREATE INDEX CONCURRENTLY`). Pair `002_tag_slug_indexes.sql` Option A with the non-localized Tag slug decision in §4.2.

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

**Before (current):**

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

**After (recommended):**

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
      "type": "string",
      "maxLength": 70
    },
    "metaDescription": {
      "type": "text",
      "maxLength": 180
    },
    "canonicalUrl": {
      "type": "string"
    },
    "robots": {
      "type": "enumeration",
      "enum": [
        "index,follow",
        "noindex,follow",
        "index,nofollow",
        "noindex,nofollow"
      ],
      "default": "index,follow"
    },
    "keywords": {
      "type": "text"
    },
    "ogTitle": {
      "type": "string",
      "maxLength": 70
    },
    "ogDescription": {
      "type": "text",
      "maxLength": 200
    },
    "ogImage": {
      "type": "media",
      "multiple": false,
      "allowedTypes": ["images"]
    },
    "ogType": {
      "type": "enumeration",
      "enum": ["website", "article"],
      "default": "website"
    },
    "twitterCard": {
      "type": "enumeration",
      "enum": ["summary", "summary_large_image"],
      "default": "summary_large_image"
    },
    "twitterImage": {
      "type": "media",
      "multiple": false,
      "allowedTypes": ["images"]
    },
    "structuredData": {
      "type": "json"
    }
  }
}
```

**Sitemap fields on `Page`** — add to `backend/src/api/page/content-types/page/schema.json` inside `attributes`:

```json
"sitemapPriority": {
  "type": "decimal",
  "default": 0.5,
  "min": 0,
  "max": 1,
  "pluginOptions": { "i18n": { "localized": true } }
},
"sitemapChangeFrequency": {
  "type": "enumeration",
  "enum": ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"],
  "default": "monthly",
  "pluginOptions": { "i18n": { "localized": true } }
},
"sitemapExclude": {
  "type": "boolean",
  "default": false,
  "pluginOptions": { "i18n": { "localized": true } }
}
```

---

## Appendix D — Strapi → Next.js revalidation webhook

### Strapi side

Configure a webhook in `backend/config/server.ts` (or the admin UI → Settings → Webhooks) that fires on `entry.publish` and `entry.unpublish` for `api::page.page` and `api::tag.tag`. Point it at `${NEXT_PUBLIC_SITE_URL}/api/revalidate` and include a shared secret header.

### Next.js side (reference only — outside the scope of this audit's deliverables)

`/api/revalidate` verifies the secret, reads the payload, then calls `revalidatePath('/[locale]/[...slug]', 'page')` — or `revalidateTag('pages')` if tag-based revalidation is chosen.

The detail belongs to the Next.js scaffolding task. This appendix exists so that **Strapi's side of the contract** is nailed down in Week 0 before the frontend starts.

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

**After (recommended — Option A, canonical non-localized slug):**

```json
"slug": {
  "type": "uid",
  "targetField": "name",
  "required": true,
  "pluginOptions": {
    "i18n": { "localized": false }
  }
}
```

`uid` type in Strapi v5 auto-derives from `targetField`, enforces DB-level uniqueness, and preserves the `required: true` contract. This matches `002_tag_slug_indexes.sql` Option A.

**Alternative (Option B — localized slugs per locale):**

```json
"slug": {
  "type": "uid",
  "targetField": "name",
  "required": true,
  "pluginOptions": {
    "i18n": { "localized": true }
  }
}
```

Only adopt Option B if the business wants distinct `/el/tags/...` and `/ru/tags/...` slugs. Keeps uniqueness per locale. Pair with `002_tag_slug_indexes.sql` Option B. **Recommendation: Option A.**

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
| §9 (readiness score) | extends `docs/nextjs-content-readiness.md` (`81/100`) with a 6-dim rubric |
| §10 (roadmap) | extends `docs/strapi-nextjs-audit.md` → Rollout Plan |

---

*End of audit.*
