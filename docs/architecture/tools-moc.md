# MOC: Tools and Scripts

> Python tooling for migration, content hygiene, and production readiness gates.

## Core import pipeline

- [../../strapi_client.py](../../strapi_client.py) — Strapi REST API client
- [../../tools/parse.py](../../tools/parse.py) — MODX source data parser
- [../../tools/transform_data.py](../../tools/transform_data.py) — Data transformation
- [../../tools/normalize_migx.py](../../tools/normalize_migx.py) — MIGX field normalization
- [../../tools/migrate_page_model.py](../../tools/migrate_page_model.py) — Page model migration
- [../../tools/migrate_assets.py](../../tools/migrate_assets.py) — Asset migration
- [../../tools/migrate_files_assets.py](../../tools/migrate_files_assets.py) — File asset migration

## Quality and audit

- [../../tools/audit_nextjs_content_hygiene.py](../../tools/audit_nextjs_content_hygiene.py) — Content quality checks
- [../../tools/nextjs_readiness_gate.py](../../tools/nextjs_readiness_gate.py) — Content readiness report
- [../../tools/injection_readiness.py](../../tools/injection_readiness.py) — Pre-import validation
- [../../tools/slug_uid_utils.py](../../tools/slug_uid_utils.py) — Slug UID utilities
- [../../tools/full_ready_check.py](../../tools/full_ready_check.py) — Full readiness gate
- [../../tools/production_readiness_gate.py](../../tools/production_readiness_gate.py) — Production gate
- [../../tools/report_nav_locale_coverage.py](../../tools/report_nav_locale_coverage.py) — Nav locale coverage
- [../../tools/env-validate.py](../../tools/env-validate.py) — Environment validation

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

## Webhook and CMS

- [../../tools/setup_strapi_revalidation_webhook.py](../../tools/setup_strapi_revalidation_webhook.py)
- [../../tools/cms_audit/](../../tools/cms_audit/) — CMS audit module (`db.py`, `io.py`, `paths.py`)

## Archived

`tools/_archived/` contains 40 legacy MODX → Strapi migration scripts. Kept on disk for historical reference only.

## Related

- [README.md](README.md) — ADRs, migration docs
- [backend-moc.md](backend-moc.md) — Strapi API and schema
- [frontend-moc.md](frontend-moc.md) — Next.js, CMS DTO contract
