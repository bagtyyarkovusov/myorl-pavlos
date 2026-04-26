# MOC: Tools and Scripts

> Python tooling for migration, content hygiene, and production readiness gates.

## Core import pipeline

- [../../strapi_importer.py](../../strapi_importer.py) — Main Strapi data importer
- [../../strapi_client.py](../../strapi_client.py) — Strapi REST API client
- [../../tools/parse.py](../../tools/parse.py) — MODX source data parser
- [../../tools/transform_data.py](../../tools/transform_data.py) — Data transformation
- [../../tools/normalize_migx.py](../../tools/normalize_migx.py) — MIGX field normalization
- [../../tools/migrate_page_model.py](../../tools/migrate_page_model.py) — Page model migration
- [../../tools/migrate_assets.py](../../tools/migrate_assets.py) — Asset migration
- [../../tools/migrate_files_assets.py](../../tools/migrate_files_assets.py) — File asset migration

## Quality and audit

- [../../tools/audit_nextjs_content_hygiene.py](../../tools/audit_nextjs_content_hygiene.py) — Content quality checks
- [../../tools/nextjs_content_readiness.py](../../tools/nextjs_content_readiness.py) — Content readiness report
- [../../tools/injection_readiness.py](../../tools/injection_readiness.py) — Pre-import validation
- [../../tools/slug_parity_analyze.py](../../tools/slug_parity_analyze.py) — Slug consistency
- [../../tools/slug_parity_apply.py](../../tools/slug_parity_apply.py) — Slug repair
- [../../tools/audit_locale_pairs.py](../../tools/audit_locale_pairs.py) — Locale pair audit
- [../../tools/full_ready_check.py](../../tools/full_ready_check.py) — Full readiness gate
- [../../tools/production_readiness_gate.py](../../tools/production_readiness_gate.py) — Production gate

## PostgreSQL rehearsal

- [../../tools/run_postgres_rehearsal.py](../../tools/run_postgres_rehearsal.py)
- [../../tools/audit_postgres_strictness.py](../../tools/audit_postgres_strictness.py)
- [../../tools/check_postgres_rehearsal_report.py](../../tools/check_postgres_rehearsal_report.py)

## Navigation and link repair

- [../../tools/sync_navigation_from_pages.py](../../tools/sync_navigation_from_pages.py)
- [../../tools/internal_link_rewrite.py](../../tools/internal_link_rewrite.py)
- [../../tools/apply_nextjs_link_repair_manifest.py](../../tools/apply_nextjs_link_repair_manifest.py)
- [../../tools/recover_homepage_links.py](../../tools/recover_homepage_links.py)
- [../../tools/emit_slug_redirects.py](../../tools/emit_slug_redirects.py)

## Ad-hoc / support

- [../../tools/html_cleanup.py](../../tools/html_cleanup.py)
- [../../tools/backfill_page_content.py](../../tools/backfill_page_content.py)
- [../../tools/backfill_tag_slugs.py](../../tools/backfill_tag_slugs.py)
- [../../tools/setup_strapi_revalidation_webhook.py](../../tools/setup_strapi_revalidation_webhook.py)
- [../../tools/cms_audit/](../../tools/cms_audit/) — CMS audit module (`db.py`, `io.py`, `paths.py`)

## New tools (root level)

- [../../append_home_css.py](../../append_home_css.py)
- [../../apply_ui_changes.py](../../apply_ui_changes.py)

## Related

- [00-MOC-Architecture](00-MOC-Architecture.md) — ADRs, migration docs
- [00-MOC-Backend](00-MOC-Backend.md) — Strapi API and schema
- [00-MOC-Frontend](00-MOC-Frontend.md) — Next.js, CMS DTO contract
