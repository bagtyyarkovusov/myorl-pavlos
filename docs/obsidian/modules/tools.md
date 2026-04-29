---
module: Tools
symbols: ~75 (9 sub-clusters)
cohesion: 86%–100%
source: gitnexus_cypher (cluster="Tools")
---

# Module: Tools — Python migration + readiness gates

> The Python toolchain for CMS auditing, content hygiene, PostgreSQL readiness, and production deployment gates. The largest module by symbol count (~75 across 9 sub-clusters).

## Code location

| Directory | Contents |
| --- | --- |
| `tools/` | 14 active scripts |
| `cms_audit/` | Shared DB/IO/path utilities |

## Sub-clusters

| Sub-cluster | Size | Cohesion | Contents |
| --- | --- | --- | --- |
| Content audit | 13 | 96% | `audit_nextjs_content_hygiene.py` — HTML markers, internal links, pageblocks summary |
| Tools core | 12 | 97% | General-purpose tooling (shared utilities) |
| Readiness gates | 10 | 96% | Production readiness checks |
| PostgreSQL | 10 | 96% | PostgreSQL rehearsal scripts |
| Slug/link repair | 7 | 100% | Slug utilities and redirect tools |
| Strapi client | 6 | 92% | `strapi_client.py` + helpers |
| Report generation | 6 | 100% | Report paths and formatting |
| Smaller tools | 5–6 | 89–100% | Navigation sync, locale coverage, env validation |

## Live entry points (sample)

| Script | Purpose |
| --- | --- |
| `audit_nextjs_content_hygiene.py` | Full content quality audit (HTML, links, pageblocks) |
| `nextjs_readiness_gate.py` | Next.js content readiness check |
| `production_readiness_gate.py` | Full production deployment gate |
| `injection_readiness.py` | Pre-import validation |
| `run_postgres_rehearsal.py` | PostgreSQL migration rehearsal |
| `audit_postgres_strictness.py` | PostgreSQL strict-mode audit |
| `check_postgres_rehearsal_report.py` | Rehearsal report validation |
| `report_nav_locale_coverage.py` | Navigation locale coverage report |
| `setup_strapi_revalidation_webhook.py` | Strapi webhook configuration |
| `slug_uid_utils.py` | Slug UID utilities |
| `env-validate.py` | Environment variable validation |
| `strapi_client.py` | Strapi REST API client |

## Cohesion patterns

Tools have the highest overall cohesion in the codebase (86–100%). Each script is self-contained with dedicated helpers, sharing only the `cms_audit/` package for I/O and the `strapi_client.py` for API access.

## Note on `_archived`

The `tools/_archived/` directory (40 legacy migration scripts) is **excluded from the index** via `.gitnexusignore`:
```
tools/_archived/
```

These are historical MODX → Strapi migration tools that are no longer needed for active development. They remain on disk for reference but do not pollute the knowledge graph.

## Related

- [[cms-audit]] — shared I/O package consumed by tools
- [[00-MOC-Tools]] — tools entry points
- [[00-MOC-Architecture]] — ADRs and migration docs
