# Legacy CMS markup repair summary

**Date:** 2026-05-23  
**Environment:** Local Postgres `myorl-pg`, Strapi `myorl-strapi-dev`

## What changed

Site-wide normalization of MODX-era HTML stored in Strapi page fields (`content`, `excerpt`, `infoBlockBottom`, `sources`):

- Unwrapped `tab-content` and editor widget `div` shells
- Removed legacy presentation attrs (`style`, `align`, fixed `width`/`height`, etc.)
- Split multi-image paragraphs; normalized YouTube iframe URLs to `https://`
- Converted prose `<pre>` blocks to `<p>`; removed dead `<video>` tags
- Stripped broken Word paste images and empty spacer paragraphs

Shared logic: [`tools/cms_html_cleanup.py`](../../cms_html_cleanup.py) → `normalize_legacy_modx_markup()`.

## Results

| Metric | Before | After |
|--------|--------|-------|
| Pages flagged by `audit_legacy_cms_markup.py` | 231 / 325 | **0 / 325** |
| `audit_blank_pages.py` zero-visible-text | 0 | **0** (unchanged) |
| Repair apply (`legacy-cms-markup-repair-result.json`) | — | **245 / 245 OK** |

### Septum pilot (8 pages)

Applied first on 4 slugs × el/ru before site-wide run. Example: `/ru/skoliosi-rinikou-diafragmatos-stravo-diafragma-1` no longer stores `tab-content`, `align=`, or inline `style=` in CMS HTML.

## Artifacts

| File | Purpose |
|------|---------|
| `legacy-cms-markup-audit.json` | Post-repair audit (0 flagged) |
| `legacy-cms-markup-repair-plan.json` | Last dry-run plan (245 pages) |
| `legacy-cms-markup-repair-result.json` | Strapi apply result |

## Commands

```bash
python3 tools/audit_legacy_cms_markup.py
PYTHONPATH=tools python3 tools/repair_legacy_cms_markup.py --scan-all
PYTHONPATH=tools python3 tools/repair_legacy_cms_markup.py --scan-all --apply
python3 tests/test_cms_html_cleanup.py
```

## Residual notes

- Pages remain long when editorial content includes many images/videos; cleanup fixes markup hygiene, not information architecture.
- RU translations may still be shorter than EL counterparts (content parity is separate work).
- Frontend [`frontend/src/lib/html.ts`](../../../frontend/src/lib/html.ts) sanitizer remains as defense-in-depth.
