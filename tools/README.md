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

Plan/result artifacts land in `tools/data/manual-repairs/`.

Temporary root compatibility wrappers remain for:

- `nextjs_readiness_gate.py`
- `audit_nextjs_content_hygiene.py`
- `strapi_importer.py`
- `sync_navigation_from_pages.py`
