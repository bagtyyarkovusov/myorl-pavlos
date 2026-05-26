# Tools

This folder owns migration, audit, backfill, and Strapi maintenance scripts.

Run scripts from the project root, for example:

```bash
python3 tools/nextjs_readiness_gate.py --skip-live-strapi
```

## Blank CMS page repair (section-hub + MODX content)

Repairs concentrated blank pages (septum micro-site, hub shells) on Postgres dev
(`myorl-pg`) via the plan → `backend/scripts/apply-accordion-repair-plan.js` pipeline.

**Prerequisites:** Docker (`myorl-pg`, `myorl-strapi-dev`), Next.js dev server for HTTP checks,
`data/source/modx/published_resources_flat.json`.

### Recommended sequence

```bash
# 0. Backup
docker exec myorl-pg pg_dump -U strapi strapi > tools/data/manual-repairs/pre-content-repair-$(date +%Y%m%d).dump

# 1. Baseline audit
python3 tools/audit_blank_pages.py

# 2. Structural: section-hub + child nav (before content)
python3 tools/repair_section_hub_structure.py
python3 tools/repair_section_hub_structure.py --apply

# 3. Content: restore MODX HTML (content + excerpt only)
python3 tools/restore_page_content_from_modx.py
python3 tools/restore_page_content_from_modx.py --apply

# 4. Hygiene
python3 tools/repair_legacy_html_images.py --apply
python3 tools/repair_broken_cms_images.py --apply   # optional: strips file:// paste artifacts
python3 tools/backfill_page_listing_media.py --apply

# 4.5 Legacy MODX markup (tab-content, inline styles, fixed dimensions)
python3 tools/audit_legacy_cms_markup.py
PYTHONPATH=tools python3 tools/repair_legacy_cms_markup.py --scan-all
PYTHONPATH=tools python3 tools/repair_legacy_cms_markup.py --scan-all --apply
python3 tools/audit_legacy_cms_markup.py   # expect flaggedPageCount=0

# 5. Verify
python3 tools/audit_blank_pages.py
python3 tools/audit_site_assets.py
curl -s -H 'Cache-Control: no-cache' -o /dev/null -w '%{http_code} %{redirect_url}\n' \
  http://localhost:3000/el/skoliosi-rinikou-diafragmatos-stravo-dafragma
cd frontend && npm test -- -t "SectionHubPage|tab-bar|related-topics"
python3 tests/test_cms_html_cleanup.py
```

### Scripts

| Script | Purpose |
|--------|---------|
| `audit_blank_pages.py` | Classify published pages with zero visible reader text |
| `repair_section_hub_structure.py` | Hub `section-hub` + septum/RU folder child nav fields |
| `restore_page_content_from_modx.py` | Content-only restore from MODX flat export |
| `repair_legacy_html_images.py` | Rewrite `/files/…` img paths via `asset_map.json` |
| `repair_broken_cms_images.py` | Strip broken `file://` / msohtmlclip img tags |
| `audit_legacy_cms_markup.py` | Regression audit for MODX-era HTML patterns in page fields |
| `repair_legacy_cms_markup.py` | Normalize legacy markup in Strapi (`content`, `excerpt`, etc.) |
| `backfill_page_listing_media.py` | Link `featuredImage` for directory thumbnails |
| `audit_site_assets.py` | Site-wide media/thumbnail audit |
| `audit_external_links.py` | HEAD-check every outbound link, classify (ok/broken/flaky/allowlisted), write markdown report, enforce launch gate |
| `snapshot_gsc_baseline.py` | Pull pre-launch GSC ranking baseline snapshot |
| `audit_slug_quality.py` | Flag broken, duplicate, and garbage slugs (5 criteria) |
| `seed_slug_renames_to_url_mappings.py` | Convert approved rename list → URL Mapping JSON |

### External link audit

```bash
# From a prior content hygiene JSON report:
python3 tools/audit_external_links.py --json-report artifacts/reports/nextjs_content_readiness.json

# Run content extraction internally (needs Strapi SQLite DB):
python3 tools/audit_external_links.py --db data/strapi.db

# Launch gate (non-zero exit if broken > threshold):
python3 tools/audit_external_links.py --max-broken-external-links 20
```

Report written to `artifacts/reports/external-link-audit.md`, grouped by status × page.

Plan/result artifacts land in `tools/data/manual-repairs/`.

Temporary root compatibility wrappers remain for:

- `nextjs_readiness_gate.py`
- `audit_nextjs_content_hygiene.py`
- `audit_slug_quality.py`
- `seed_slug_renames_to_url_mappings.py`
- `strapi_importer.py`
- `sync_navigation_from_pages.py`

## GSC baseline snapshot (`snapshot_gsc_baseline.py`)

Pulls a pre-launch ranking baseline from the Google Search Console API and writes
a versioned JSON snapshot to `artifacts/seo-baseline/<date>.json`. Re-run at
7d / 30d / 90d post-launch to track ranking continuity.

### Credential setup

1. Create a Google Cloud project and enable the **Google Search Console API**
2. Create a service account with **Owner** or **Full** permission on the GSC property
3. Download the service-account JSON key file (do NOT commit it)
4. In GSC, add the service account email as a **Full** user on the Domain Property

### Usage

```bash
# Default: last 90 days
python3 tools/snapshot_gsc_baseline.py \
  --credentials /secure/gsc-service-account.json \
  --property sc-domain:myorl.gr

# Custom date range and output path
python3 tools/snapshot_gsc_baseline.py \
  --credentials /secure/gsc-service-account.json \
  --property sc-domain:myorl.gr \
  --start-date 2026-01-01 \
  --end-date 2026-05-26 \
  --output artifacts/seo-baseline/launch-baseline.json
```

### Dependencies

```bash
pip install google-auth google-api-python-client
```

### Output schema

Snapshots are written to `artifacts/seo-baseline/<end-date>.json`:

- `meta` — generated_at, property, date_range, tool_version
- `top_queries` — top 100 queries by clicks (with impressions, position, CTR)
- `top_pages` — top 100 landing pages by clicks
- `by_country` — query breakdown by country
- `by_device` — query breakdown by device category (desktop, mobile, tablet)

### Tests

```bash
python3 tests/test_snapshot_gsc_baseline.py
```

Tests use mocked GSC API responses — no credentials required.

## Slug quality audit

Audit published Strapi page slugs for surgical-fix issues (PRD #152, Decision 13):

```bash
# Run the audit (reads Strapi SQLite database)
python3 tools/audit_slug_quality.py

# Print report to stdout
python3 tools/audit_slug_quality.py --stdout

# Write to a custom path
python3 tools/audit_slug_quality.py --output artifacts/reports/slug-quality-audit.md
```

The audit flags slugs across five criteria:
1. Demonstrably broken (typos — consonant-only segments, repeated chars)
2. Duplicates (exact) and near-duplicates (dash-normalized collisions)
3. Numeric collision suffixes from MODX (-2, -copy, -test, -1)
4. Locale mismatch (Cyrillic in EL, Greek in RU)
5. Garbage (single-char, special chars, all-numeric)

Output: `artifacts/reports/slug-quality-audit.md`.

To convert approved renames into URL Mapping seed rows (ADR-012):

```bash
python3 tools/seed_slug_renames_to_url_mappings.py \
  --input artifacts/reports/approved-slug-renames.json \
  --output data/manifests/url-mapping-seed-from-slug-renames.json
```

## URL Mapping seed (`seed_url_mappings.py`)

Seeds the Strapi URL Mapping collection from the audit JSON output produced by
`tools/audit_legacy_urls.py`. The script is idempotent — re-running with
identical input produces zero new rows.

Editor-curated `gone-410` rows are protected: if a legacy path already exists
with `destinationKind: gone-410`, the seed input is skipped for that path
(editor curation takes priority).

### Usage

```bash
# 1. Generate the seed file (see audit_legacy_urls.py docs)
python3 tools/audit_legacy_urls.py

# 2. Preview what would change (dry-run, default mode)
python3 tools/seed_url_mappings.py
python3 tools/seed_url_mappings.py --dry-run

# 3. Apply changes to Strapi
python3 tools/seed_url_mappings.py --apply

# 4. Verify idempotency — re-running produces zero new rows
python3 tools/seed_url_mappings.py --apply

# Custom input and Strapi connection
python3 tools/seed_url_mappings.py \
  --input custom-seed.json \
  --strapi-url https://cms.myorl.gr \
  --strapi-token <API_TOKEN> \
  --apply
```

Report written to `artifacts/reports/url-mapping-seed-result.md`.

### Environment variables

| Variable | Equivalent flag |
|----------|----------------|
| `STRAPI_URL` | `--strapi-url` |
| `STRAPI_API_TOKEN` | `--strapi-token` |

### Tests

```bash
python3 tests/test_seed_url_mappings.py
```
