---
module: Tools
symbols: 90
cohesion: 91%
source: gitnexus://repo/gemini-export/cluster/Tools
---

# Module: Tools — Python migration + readiness gates

> Active Python tooling under `tools/`. The `_archived/` subtree (246 symbols) is excluded from this cluster — see [[../audits/audit-2026-04-30#3 Module landscape]].

## Code location

- [../../../tools/](../../../tools/) — active scripts
- [../../../tools/_archived/](../../../tools/_archived/) — legacy MODX→Strapi migration code

## Live entry points (sample)

| Symbol | File | Role |
| --- | --- | --- |
| `main` | `tools/setup_strapi_revalidation_webhook.py` | Configures Strapi → Next.js webhook |
| `upsert_sqlite`, `upsert_postgres`, `webhook_headers` | same | DB-specific upsert |
| `main`, `run_step` | `tools/production_readiness_gate.py` | Aggregate readiness gate |
| `main`, `strapi_origin` | `tools/nextjs_readiness_gate.py` | Next.js readiness gate |
| `main`, `_print_human`, `_build_report` | `tools/report_nav_locale_coverage.py` | Locale coverage report |
| `main`, `basic_contract_summary` | `tools/audit_nextjs_content_hygiene.py` | Hygiene audit |
| `main`, `ms_epoch_to_iso`, `to_csv_value`, `postgres_counts`, `source_counts` | `tools/run_postgres_rehearsal.py`, `check_postgres_rehearsal_report.py` | PG rehearsal pipeline |
| `parse_dotenv`, `normalize_url` | `tools/env-validate.py` | Env-file validator |
| `_read_dotenv_fill_empty_keys`, `post`, `get`, `load_strapi_env_from_dotenv` | `tools/strapi_client.py` | Shared Strapi client |

For the full link list including `cms_audit/` and other helpers, see the existing [[../00-MOC-Tools]].

## Cohesion: 91%

High — these scripts mostly compose around `tools/strapi_client.py` and `_read_dotenv_fill_empty_keys`. Cross-script imports are rare.

## Active risk (2026-04-30)

- `strapi_origin` in `tools/nextjs_readiness_gate.py` is touched in the working tree.
- A few helper Python files at repo root (`append_home_css.py`, `apply_ui_changes.py`, `audit_nextjs_content_hygiene.py`) are **deleted** — they were referenced from [[../00-MOC-Tools]] and that doc will break-link until updated.

## Related

- [[scripts]] — Node.js equivalent under `backend/scripts/`
- [[revalidate]] — `setup_strapi_revalidation_webhook.py` is the producer side
- [[../00-MOC-Tools]] — link-only entry index (needs refresh after current commits)
