---
module: Cms_audit
symbols: 2
cohesion: 100%
source: gitnexus_cypher (cluster="Cms_audit")
---

# Module: Cms_audit — JSON I/O utilities

> Shared file I/O layer consumed by the Python audit/importer toolchain.

## Code location

- `cms_audit/` — package root: `io.py`, `db.py`, `paths.py`

## Members (2)

| Symbol | File | Purpose |
| --- | --- | --- |
| `load_json` | `cms_audit/io.py` | Load and parse a JSON file |
| `load_optional_json` | `cms_audit/io.py` | Load JSON, return `None` if file is missing |

## What's not in the cluster

The full `cms_audit/` package contains three modules but only `io.py` was clustered. `db.py` (database helpers) and `paths.py` (path resolution) are either unclustered or absorbed into the `Tools` community.

## Consumers

All Python tools under `tools/` that read JSON reports or checkpoint files — this is the shared I/O foundation for:
- `tools/audit_nextjs_content_hygiene.py`
- `tools/nextjs_readiness_gate.py`
- `tools/production_readiness_gate.py`
- `tools/injection_readiness.py`

## Related

- [[tools]] — main Python tooling module
- [[00-MOC-Tools]] — tools entry points
