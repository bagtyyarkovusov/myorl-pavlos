# PRD: SEO Launch Readiness — Same-Domain MODX → Strapi/Next.js Migration

## Problem Statement

Pavlos's clinic site is migrating from MODX (legacy `public_html/`) to Strapi 5 + Next.js 16 on the same domain `myorl.gr`. Without explicit SEO migration work, Google's re-crawl after launch will silently de-index a large share of legacy URLs and demote the site against established competitors in the Greek medical SERPs (`iatropedia.gr`, `mednews.gr`, individual-practitioner sites with mature E-A-T signals).

Concretely, six structural risks would compound on launch day if shipped as-is:

1. **Locale URL contract change.** Legacy Greek URLs lived at `myorl.gr/<slug>`; the new contract requires `myorl.gr/el/<slug>`. The current middleware (`proxy.ts`) catches bare slugs and redirects them, but emits **HTTP 307 Temporary** — Google does not reliably transfer ranking equity through 307. The 367-row **Legacy URL Inventory** in `myorl-migrate/old_url_inventory_clean.csv` enumerates the affected URLs.
2. **Slug renames and retirements have no editor-owned home.** 18 known renames live in `data/manifests/slug_redirects_next.json` (dev-only). 31 second-hop `Redirect 301` rules in legacy `.htaccess` are not reflected in the new site at all — every URL in those rules will 404 on launch unless mapped.
3. **`force-dynamic` is set on every locale page.** Every Strapi page render hits the database; crawl budget is murdered, LCP suffers, infra cost is high. The revalidation rails (`/api/revalidate`) are built but never used.
4. **JSON-LD is missing the three highest-impact medical schemas** — `Physician`, `MedicalProcedure`, `MedicalCondition`. These drive Rich Results for the queries that matter most for a single-practitioner clinic.
5. **E-A-T trust signals are absent.** No visible "Last updated" date on articles. No "Medically reviewed by" attribution. No author-bio backlink from byline to the doctor's `Physician` schema. Google's YMYL guidelines explicitly weigh these on health content.
6. **External link, anchor-link, alt-text, H1, CWV, 404, and locale-fallback surfaces are unaudited.** The internal-link audit (`audit_nextjs_content_hygiene.py`) returns 0 broken internal links — the other surfaces are unknown.

The migration is one launch away from a multi-month ranking decay if these are not addressed.

## Solution

A 16-decision launch-readiness program plus three architecture decisions (see ADR-012, ADR-013, ADR-014):

1. **Introduce the `URL Mapping` Strapi content type** as the single source of truth for legacy → canonical redirects (ADR-012). Seed it once from the **Legacy URL Inventory** + the 31 `.htaccess` rules, then hand it to editors.
2. **Replace HTTP 307 with 308 Permanent** at the two emit sites that govern legacy URL transitions (`app/page.tsx` apex redirect; `proxy.ts` wildcard). Establish `/el` as the **Canonical Home**, apex 308's to it (ADR-013).
3. **Cut over from `force-dynamic` to ISR with `revalidate=600` plus tag-based webhook revalidation** (ADR-014). Wire Strapi lifecycle hooks for Page, Video Entry, Global Settings, and Tag.
4. **Expand JSON-LD** with `Physician` (Pavlos's bio), `MedicalProcedure` (every `service-*` layout), `MedicalCondition` (every `encyclopedia-article` layout), and `Article` (every `specialized-article` layout). Phase 1 is minimal schemas from existing fields; Phase 2 adds structured medical-fact fields.
5. **Add E-A-T trust signals** — render `publishedAt`/`updatedAt` on article pages; add new Strapi fields `medicallyReviewedBy` and `lastReviewedDate`; add auto-on disclaimers for medical layouts; wire `Article` JSON-LD.
6. **Build audit tooling** for legacy URL classification (case 1/2/3), external links (HEAD-check), anchor links, slug quality, alt-text coverage, H1 hierarchy, title/meta description quality.
7. **Keep the legacy MODX site warm at `legacy.myorl.gr` for ≥90 days** as a rollback safety net.

## User Stories

1. As a **Greek patient searching Google for "ρινοπλαστική Αθήνα"**, I want to find Pavlos's site as a top result with a Rich Result card showing the procedure schema, so that I can confidently choose a local specialist.

2. As a **Greek patient who bookmarked `myorl.gr/amygdales` two years ago**, I want that URL to still take me to the same content (now at `/el/amygdales`), so that I do not lose access to information I relied on.

3. As a **Russian-speaking patient**, I want every Russian-language URL to resolve as it did on the legacy site, so that I do not lose access to translated content during the migration.

4. As a **content editor**, I want to rename a page slug in Strapi and have the old URL automatically 301-redirect to the new one without filing a developer ticket, so that editorial cadence is not gated on deploys.

5. As a **content editor**, I want to mark a retired page as "gone" so that search engines de-index it cleanly (410), instead of letting it 404 indefinitely.

6. As a **Googlebot crawler**, I want every legacy URL to resolve with a single 301 hop to its canonical destination, so that I can transfer ranking equity efficiently and quickly converge on the new index.

7. As a **first-time visitor on a slow mobile connection**, I want the LCP to be under 2.5 seconds, so that the page feels responsive and Core Web Vitals don't depress the site's ranking.

8. As an **SEO analyst comparing pre- and post-launch rankings**, I want a baseline snapshot of the top 100 queries and landing pages in GSC, so that I can measure ranking continuity objectively.

9. As a **patient comparing medical sources**, I want to see "Medically reviewed by Δρ. Παύλος Τσολαρίδης on YYYY-MM-DD" on every article, so that I can trust the content was vetted by a qualified specialist.

10. As a **Google Search ranker evaluating medical content**, I want each article to include a clear byline linked to the doctor's bio (which carries `Physician` schema with license number and credentials), so that I can confidently rank this site against content-farm competitors.

11. As a **content editor**, I want to save a page in Strapi and have the public site reflect the change within 2 seconds, so that fact-correction edits propagate fast.

12. As a **content editor**, I want a per-page toggle to override the auto-emitted disclaimer, so that procedure-cost pages and contact pages don't get an inappropriate medical disclaimer.

13. As a **patient on the apex `myorl.gr/`**, I want to land on the Greek home page immediately, so that I don't see a language picker or a placeholder.

14. As a **content editor**, I want a launch-blocker audit that flags any page with a missing meta description, multiple H1 tags, or empty alt text on content images, so that quality regressions are caught before deploy.

15. As a **content editor**, I want a one-time auto-strip pass to remove inline `style=` and deprecated `<font>` tags from 259 MODX-era text sources, so that the new design system isn't fighting legacy markup.

16. As a **content editor**, I want a slug-quality audit that surfaces only objectively-broken slugs (duplicates, typos, MODX collision suffixes, garbage like `/1`), so that we don't churn redirects on slugs that are fine as-is.

17. As a **content editor**, I want a markdown report of all 572 outbound external links classified by HTTP status, so that I can update broken citations to authoritative medical sources without manually checking each one.

18. As a **content editor**, I want every `?tag=` and `?page=` filter URL to share the canonical URL of the unfiltered directory, so that Google does not penalize me for duplicate content across faceted permutations.

19. As a **patient on `/ru/<slug>` where the page exists only in EL**, I want a clear 404 with a "View in Greek?" link to the equivalent page, so that I'm not stranded on a thin/empty page.

20. As an **SRE running the launch**, I want the legacy MODX site to keep serving at `legacy.myorl.gr` for ≥90 days post-cutover, so that if rankings drop catastrophically we can DNS-flip back to MODX without data loss.

21. As an **SRE monitoring post-launch**, I want a webhook that revalidates the Next.js page cache after `tools/orchestrate_migration.py` completes a `pg_restore`, so that bulk migrations don't leave stale pages.

22. As a **content editor populating E-A-T signals**, I want the top-20 highest-traffic pages identified (from GSC) so that I can prioritize manual byline + review-date population without backfilling 300+ pages pre-launch.

23. As a **Search Console operator**, I want the production site verified as a GSC **Domain Property** before launch, so that I can submit the new sitemap and monitor coverage immediately on cutover.

## Implementation Decisions

### Decision 1 — `URL Mapping` Strapi content type (ADR-012)

Build a new Strapi content type `url-mapping` with fields `legacyPath`, `destinationPath`, `destinationKind` (enum: `internal-301` / `external-301` / `gone-410`), `locale` (enum nullable), `notes`. Editor-owned post-seed. Per ADR-012, lookup precedence is: UrlMapping exact-match → next.config.ts wildcard → page render.

### Decision 2 — Audit script: `tools/audit_legacy_urls.py`

A new Python tool that takes the **Legacy URL Inventory** (`myorl-migrate/old_url_inventory_clean.csv`) and the current Strapi state (via the existing `cms_audit` package's SQLite client OR a direct Postgres query), and emits three lists:

- **Case 1 — slug unchanged** (~340 rows): handled by the wildcard catch-all; not seeded as URL Mapping rows.
- **Case 2 — slug renamed** (~18 known + any newly-detected): seeded as `internal-301` URL Mapping rows.
- **Case 3 — page retired** (~47 candidates from MODX `deleted=1` / `published=0` flags): seeded as `gone-410` URL Mapping rows pending editorial review.

The audit must NOT trust the existing `slug_redirects_next.json` manifest — it must re-derive case-2 by comparing each row's MODX `alias` against the current Strapi `slug` for the matched `documentId`. The manifest is a one-time seed input, not a source of truth.

Output: a markdown triage report (`artifacts/reports/legacy-url-triage.md`) for editorial review, plus a JSON seed file consumed by `tools/seed_url_mappings.py`.

### Decision 3 — `proxy.ts` wildcard moves to `next.config.ts` with 308

Remove the bare-slug fallback from `proxy.ts`. Add a wildcard rule to `next.config.ts:redirects()`:

```ts
{
  source: "/:slug((?!el|ru|api|admin|_next|uploads|sitemap.xml|robots.txt)[^/]+)",
  destination: "/el/:slug",
  permanent: true, // emits 308
}
```

`proxy.ts` retains **only** the `/` → `/<detected-locale>` Accept-Language fallback. That redirect is also upgraded to 308 (or use `permanentRedirect()` semantics).

### Decision 4 — `.htaccess` 31 redirects flatten into single-hop URL Mapping rows

The 31 second-hop `Redirect 301` rules in `public_html/.htaccess` (Cyrillic-Greek → ASCII slug) are flattened. Each Cyrillic-Greek source becomes ONE URL Mapping row pointing directly at the final new `/el/<slug>` URL. The intermediate ASCII slug also gets its own URL Mapping row only if its destination differs from the locale-prefixed canonical (i.e., Case 2 territory).

Cyrillic and other non-ASCII legacy paths are stored as decoded Unicode in `legacyPath`. A normalization test verifies that both raw and percent-encoded incoming paths resolve to the same destination.

### Decision 5 — Canonical Home is `/el` (ADR-013)

`app/page.tsx` switches from `redirect("/el")` (307) to `permanentRedirect("/el")` (308). `[locale]/[slug]/page.tsx:76`'s section-hub-folder → first-child redirect **stays 307** (mutable target). Sitemap and canonical metadata never list the bare apex.

### Decision 6 — `x-default` hreflang

Add `x-default → /el` to both `frontend/src/app/sitemap.ts` (per-URL `alternates`) and `frontend/src/lib/cms/metadata.ts` (per-page `alternates.languages`). The current code emits only `el` and `ru` keys.

### Decision 7 — ISR cutover (ADR-014)

Remove `export const dynamic = "force-dynamic"` from `[locale]/layout.tsx` and `[locale]/[slug]/page.tsx`. Add `export const revalidate = 600` to `[slug]/page.tsx`. Keep `force-dynamic` on `search-results` and `admin/search-analytics`. Wire Strapi lifecycle hooks (Page, Video Entry, Global Settings, Tag) to POST to `/api/revalidate?secret=...&tag=...`. Add a `force-dynamic` lint or audit check to prevent regression.

### Decision 8 — JSON-LD Phase 1 (minimal medical schemas)

Extend `frontend/src/lib/structured-data/seo-schema-map.ts` to drive new schemas from existing taxonomy:

| Identifier | New Schema |
|---|---|
| `slug: viografiko` (hard-coded) | `Physician` |
| `layoutVariant: service-article / service-faq / service-accordion / service-tabs` | `MedicalProcedure` |
| `layoutVariant: encyclopedia-article` | `MedicalCondition` |
| `layoutVariant: specialized-article` | `Article` |

Phase 1 emits minimal fields (`@type`, `name`, `url`, `description`, `inLanguage`, `medicalSpecialty: "Otorhinolaryngology"`). Phase 2 adds structured medical-fact fields (procedureType, bodyLocation, signOrSymptom, etc.) — these require new Strapi components and editorial population, deferred to a post-launch workstream.

### Decision 9 — External link audit: `tools/audit_external_links.py`

A new Python tool that takes the 572 external links surfaced by `audit_nextjs_content_hygiene.py`, HEAD-checks each with `httpx.AsyncClient` (concurrency=10, timeout=10s, follow_redirects=True), and emits a markdown report grouped by status × page. Status code classification: 2xx → ok, 3xx → ok, 4xx → broken, 5xx → flaky (retry once), timeout → flaky.

Allowlist for known-flaky domains (e.g., `.gov.gr` rate limiters). Launch gate: `--max-broken-external-links 20` to start (lenient), tightening over time.

### Decision 10 — Anchor link validator

Add an anchor-link check to `audit_nextjs_content_hygiene.py`: parse `<h1-h6 id="...">` from rendered Strapi content, parse `<a href="#anchor">` from the same content, flag mismatches.

### Decision 11 — Legacy HTML residue auto-strip

The audit already finds 259 text sources containing `<font`, inline `style=`, `[[snippets]]`, `&nbsp;`. Build a one-time mechanical cleanup script (`tools/strip_legacy_html_patterns.py`) that removes safe patterns (deprecated `<font>` tags, inline `style=` on non-essential elements, `[[snippets]]` artifacts) and writes a `legacy-html-residue-report.md` for ambiguous cases that need manual review.

### Decision 12 — Title + meta description audit: `tools/audit_seo_meta.py`

A new tool that flags per page:

- Title outside 30-60 char range
- Title duplicate across the site
- Missing meta description (block launch)
- Meta description outside 100-155 char range
- Meta description duplicate
- Title equals meta description
- Title is exactly `MyORL` or generic across many pages

Brand suffix convention: titles end with `| Δρ. Παύλος Τσολαρίδης` (the doctor's name, not the abbreviation). Launch gate: 100% have meta description, 90% within title length cap.

### Decision 13 — Slug quality audit: `tools/audit_slug_quality.py`

Surgical-fix strategy. Flag only slugs that meet at least one:

1. Demonstrably broken (typos like `lftynnk-prospou-2`).
2. Duplicates / near-duplicates (`/atrisia` × 3, `/brow-lift` vs `/browlift`).
3. Numeric suffix from MODX collision (`-2`, `-copy`, `-test`, `-1`).
4. Locale mismatch (Greek text on `/ru/` side, etc.).
5. Garbage content (`/1` with `pagetitle: "1"`).

Expected scope: 15-30 slug changes. Each gets a URL Mapping row.

### Decision 14 — Content/tech sweep (alt text, H1, CWV, 404, locale fallback)

| Surface | Approach | Launch gate |
|---|---|---|
| **Image alt text** | Extend `audit_site_assets.py` to flag missing alt; editorial pass for top-20 pages | 95% coverage on content images |
| **H1 hierarchy** | Add to `audit_nextjs_content_hygiene.py`; one H1 per page rule; auto-fix demote 2nd+ H1 to H2 | 0 pages with multiple H1s |
| **Core Web Vitals** | Ship `web-vitals` client lib + `/api/web-vitals` logging endpoint; baseline on staging 7d | LCP p75 < 3.0s at launch |
| **404 handling** | Verify `app/not-found.tsx` returns HTTP 404 (not 200); confirm `noindex`; ensure search box + nav on 404 page | Explicit test |
| **Locale fallback** | Strict 404 when other-locale-only; render "View in Greek?" link | Explicit test |

### Decision 15 — E-A-T pre-launch tech work

Map `publishedAt` and `updatedAt` from Strapi into PageDTO. Render "Δημοσιεύτηκε YYYY-MM-DD · Ενημερώθηκε YYYY-MM-DD" in article header (only on article layouts: `encyclopedia-article`, `service-*`, `specialized-article`). Add new Strapi Page fields `medicallyReviewedBy` (string, Phase 1) and `lastReviewedDate` (date). Add a `disclaimer` toggle on Global Settings (default-on for medical layouts; per-page override flag). Wire `Article` / `MedicalScholarlyArticle` JSON-LD with `author`, `datePublished`, `dateModified`, `reviewedBy`.

### Decision 16 — Migration operations playbook

Pre-cutover: validate new site at staging URL; run all audits; baseline GSC. Cutover: DNS A/CNAME flip at registrar. Post-cutover: legacy MODX stays warm at `legacy.myorl.gr` (or alternate IP/domain) for ≥90 days. Rollback path: DNS flip back. `tools/snapshot_gsc_baseline.py` captures top-100 queries + landing pages pre-launch; re-run at 7d / 30d / 90d post-launch.

## Testing Decisions

### What makes a good test in this PRD

Tests verify external behavior, not implementation details. For URL Mapping: a test inserts a row, hits the URL, and asserts the redirect status + destination. For canonical metadata: a test renders the page and asserts the `<link rel="canonical">` value. For audit scripts: tests use fixture CSVs and assert the case-1/2/3 partition.

### Modules to test

| Module | Tests |
|---|---|
| `tools/audit_legacy_urls.py` | Given fixture CSV with case-1/2/3 rows, assert correct partition. Edge cases: deleted+published=0 (case 3), alias differs from current slug (case 2), slug matches (case 1). |
| `tools/seed_url_mappings.py` | Given case 2/3 partition + flatten input, assert exactly N URL Mapping rows created in Strapi with correct fields. Idempotency: re-run produces zero new rows. |
| URL Mapping lookup (Next.js side) | Integration test: insert fixture URL Mapping row in Strapi, GET the legacyPath, assert 301/410 to expected destination. Test both Unicode and percent-encoded inputs. |
| `next.config.ts` wildcard | Test that `/random-slug` → 308 → `/el/random-slug`; that `/el/foo` is not caught; that `/api/foo`, `/_next/foo`, `/uploads/foo`, `/sitemap.xml`, `/robots.txt` are not caught. |
| `app/page.tsx` | E2E test: GET `myorl.gr/` returns 308 to `myorl.gr/el` (not 307). |
| ISR revalidation webhook | Integration test: POST `/api/revalidate?secret=X&tag=page-Y`, then re-fetch the page, assert new content. Also: bad secret returns 401. |
| `tools/audit_external_links.py` | Fixture URLs (mocked HTTP). Assert classification matches expected status codes. Allowlist behavior. |
| `tools/audit_seo_meta.py` | Fixture pages with various title/desc shapes; assert pass/fail per rule. |
| `tools/audit_slug_quality.py` | Fixture slugs (duplicates, typos, garbage); assert each is correctly flagged. |
| Anchor-link check | Fixture content with `<h2 id="x">` and `<a href="#x">` (match) plus `<a href="#missing">` (mismatch); assert detection. |
| JSON-LD medical schemas | Snapshot test per layout variant: assert that the emitted `@graph` contains the expected `@type` and required fields. |
| Strapi Page lifecycle hook | Unit test: hook receives Page save event, POSTs to `/api/revalidate` with correct tags. Idempotency: retried POSTs do not crash. |

### Prior art

The existing `frontend/src/lib/cms/metadata.test.ts`, `frontend/src/lib/structured-data/*.test.ts`, and `frontend/src/lib/cms/page-normalizer.test.ts` are the prior art for module-level unit tests. The existing `frontend/e2e/` Playwright suite is the prior art for redirect / 308 / canonical / metadata e2e tests. Python audit tools follow `tools/audit_nextjs_content_hygiene.py`'s read-only + fixture-CSV-input pattern.

## Out of Scope

- **JSON-LD Phase 2** (full medical-fact schemas with `procedureType`, `bodyLocation`, `signOrSymptom`, etc.) is post-launch ongoing editorial work, not part of this PRD.
- **E-A-T backfill across all 300+ pages** is post-launch quarterly editorial work. This PRD covers tech + top-20 pre-launch.
- **Translation parity** — the 39-page gap between EL (182) and RU (143) Strapi coverage is not addressed here. Treated as a separate translation workstream.
- **Domain-name change.** This PRD assumes same-domain launch on `myorl.gr`. A domain change would require the GSC Change-of-Address tool, additional 301 layers, and a different rollback strategy.
- **Subdomain SEO** (e.g., a future `blog.myorl.gr`) is out of scope.
- **Paid SEO tools** (Ahrefs, Semrush, Sistrix) are not required. GSC + GSC API is the baseline tool. Paid tools may be added later.
- **Speed optimization beyond CWV targets** (e.g., HTTP/3, Brotli compression, edge-image-resize tuning) is out of scope. Targets are the gate; deeper optimization is opportunistic.
- **AMP** (Accelerated Mobile Pages) is explicitly out — Google deprecated AMP preference in 2021.
- **The 1 missing EL page** (183 MODX → 182 Strapi) is tracked separately; this PRD does not block on identifying and migrating it.
- **`force-dynamic` on `search-results` and `admin/search-analytics`** stays as-is; these are intentionally dynamic.

## Further Notes

### Required editorial inputs (will be tracked as `needs-triage` issues)

The following data must be supplied by Pavlos's team before the corresponding work item can be completed. Each becomes a `needs-triage` GitHub issue against this PRD:

1. **Medical license number** (Greek ΠΟΥ / ΠΙΣ medical registry identifier). Required for the `Physician` schema's `identifier.value` field.
2. **Medical society memberships** (e.g., ΕΕΩΡΛ — Hellenic Society of Otorhinolaryngology). Required for `Physician.memberOf`.
3. **Medical school + board certifications + awards**. Required for `Physician.alumniOf`, `Physician.award`.
4. **GSC verification state**. Confirm whether `myorl.gr` is verified as a Domain Property (preferred), URL Prefix, or unverified.
5. **GSC ranking baseline snapshot** (or grant access to the GSC API account so the dev team can pull it programmatically). The top-100 queries and landing pages.
6. **Top-20 highest-traffic pages list** (or grant GSC access to derive). Required to prioritize the E-A-T pre-launch editorial pass.

### Standard-practice fixes shipped without explicit decision

These are bug-fix-class items the engineering team will close alongside this PRD without a per-item issue:

- Verify www → apex redirect at Railway / Caddy layer (legacy `.htaccess` did this; new Caddyfile is silent).
- Verify force-HTTPS at Railway / Caddy layer.
- Spot-check `trailingSlash: false` (Next.js default).

### Three ADRs published with this PRD

- [ADR-012 — URL Mapping content type as the source of truth for legacy redirects](../docs/adr/ADR-012-url-mapping-content-type-for-legacy-redirects.md)
- [ADR-013 — Canonical Home is `/el`, apex permanently redirects](../docs/adr/ADR-013-canonical-home-locale-prefixed.md)
- [ADR-014 — ISR + tag-based revalidation replaces `force-dynamic`](../docs/adr/ADR-014-isr-revalidation-replaces-force-dynamic.md)

### CONTEXT.md additions

The following terms were added to [CONTEXT.md](../CONTEXT.md) during the discovery that produced this PRD:

- **URL Mapping** — the Strapi content type.
- **Legacy URL Inventory** — the 367-row CSV in `myorl-migrate/`.
- **Canonical Home** — `/el` as the EL landing URL; apex 308's.

### Rollback contract

If post-launch ranking decays catastrophically (defined as: top-20 queries lose ≥30% impressions in week 1 against the pre-launch baseline), the rollback procedure is:

1. DNS A/CNAME flip at registrar from new infrastructure back to the warm-running legacy MODX at `legacy.myorl.gr` (or alternate IP).
2. The legacy MODX site remains warm at this address for ≥90 days post-cutover.
3. Once rolled back, the team retrospectives to identify which decision caused the decay (URL Mapping miss? broken JSON-LD? E-A-T gap?), fixes it on the new site, and re-attempts cutover.

The 90-day window matches Google's typical re-crawl-and-stabilize cycle for a same-domain transition. Beyond 90 days, equity loss from the rollback itself dominates and the rollback path closes.
