# SEO Launch Audit — Run Report

**Run date:** 2026-05-26
**Strapi pages audited:** 325 published (181 EL + 144 RU)

## Launch gate status

| Audit | Result | Severity |
|---|---|---|
| SEO meta (titles + descriptions) | **BLOCK** — 26 missing meta descriptions, 113 titles outside 30-60 char range | High |
| Alt text coverage | **BLOCK** — 16.9% (149/883) vs 95% gate; 734 images missing alt | **Critical** |
| Slug quality | PASS-ish — 6 minor findings (4 typos, 2 near-duplicates) | Low |
| Broken anchors | **BLOCK** — 9 on one page (`rinitida-igmoritida-paidia`, #par1–#par9), threshold 5 | Medium |
| H1 hierarchy | **FALSE POSITIVE** — audit checks `page.content` only; template auto-renders `<h1>{page.title}</h1>` in `_shared.tsx:54` | N/A |
| Blank pages | PASS — 0 zero-text pages of 325 | — |
| Internal links | PASS — 830 internal links, all OK | — |
| External links (572 outbound) | **TOOL BUG** — `audit_external_links.py` crashes on first network error without recording it. Needs `try/except` around `client.head()` to record errors as findings rather than terminating the run. | Tool fix |

## What's actually blocking launch

1. **Editorial content sweep needed** — the audits surface real content quality debt:
   - 734 images need alt text (Greek + Russian, brand voice)
   - 26 pages need meta descriptions written
   - 113 titles need length tuning (shortest is 7 chars, longest is 242)
   - 9 broken anchors on `/el/rinitida-igmoritida-paidia` need missing `<a id="parN">` markers added
   - 6 slug typos to fix (with URL Mapping entries for old slugs)

2. **Audit tooling fixes**:
   - `audit_external_links.py` needs error handling so it can complete a full HEAD-check sweep of 572 URLs
   - `audit_nextjs_content_hygiene.py` needs to recognize `_shared.tsx` template-rendered H1 from `page.title` (currently flags every page as H1=0)

## What's already correct (infrastructure)

- ADR-012 URL Mapping content type wired (Strapi + Next.js build-time materialization + 410 handler)
- ADR-013 Canonical /el (308 redirects, x-default hreflang)
- ADR-014 ISR + Strapi lifecycle webhooks (5 content types)
- 13 JSON-LD schema modules (Physician, MedicalProcedure, MedicalCondition, Article, FAQ, Breadcrumb, etc.)
- Force-dynamic regression guard (ESLint)
- Core Web Vitals telemetry endpoint
- DNS cutover tools + rollback runbook
- **2026-05-27 — URL Mapping seed completed** (issue #183). Strapi now holds
  106 URL Mapping entries (35 internal-301, 71 gone-410) vs the 5 manually-
  curated rows that were the entire pre-fix state. Spot-check of 20 random
  legacy URLs (10 from inventory + 10 from .htaccess) confirms zero 404s:
  12 paths route via URL Mapping, 7 via the locale-prefix wildcard, 1 via
  wildcard + explicit redirect chain. Two `audit_legacy_urls.py` bugs were
  fixed in the same pass: (a) the loader now accepts the production CSV
  shape (explicit `locale` column, `parent_id`, no `document_id` column),
  and (b) the classifier falls back to `(locale, alias) → (locale, slug)`
  matching when `document_id` is empty. `seed_url_mappings.py` gained a
  third skip rule (`skip-301-curated`) so editor-curated internal-301
  rows cannot be silently downgraded to `gone-410` by a future audit
  pass.

## Recommended next steps

1. **Audit tool fixes** (1 day, AFK-able):
   - Fix `audit_external_links.py` error handling
   - Fix `audit_nextjs_content_hygiene.py` to recognize template H1
2. **Re-run external link audit** to find broken outbound links
3. **Editorial content sweep** (large, needs Pavlos team or content writers):
   - Alt text for 734 images
   - Meta descriptions for 26 pages
   - Title length tuning for 113 pages
4. **Single-page fixes** (AFK-able, ~1 day):
   - Fix 9 broken anchors on `rinitida-igmoritida-paidia` (add `id="parN"` to paragraphs)
   - Fix 6 slug typos + add URL Mapping entries for legacy slug pairs
5. **Issue #176 unblock** — once Pavlos team provides license/society/etc., the empty Physician JSON-LD fields fill in
6. **Issue #175 unblock** — once registrar access lands, run DNS cutover dry-run
