# ADR-008: Dev Postgres Is the Canonical Strapi State Store

## Status
Accepted

## Context
Two stores could hold `Strapi State` in the dev environment:

- **Dev Postgres** (`myorl-pg`, `pgdata_dev` volume) — what `npm run dev` writes to.
- **SQLite** (`backend/.tmp/data.db`) — what `npm run dev:local` writes to (Strapi's default), and what `tools/orchestrate_rehearsal.py` historically exported *from*.

If a developer ran `npm run dev`, edited content in the admin panel, then ran the rehearsal pipeline — the rehearsal exported stale data from SQLite, not their actual edits. The `Rehearsal Environment` was supposed to validate cutover safety; it could quietly validate the wrong dataset.

Row-count verification showed both stores held identical content at decision time (650 pages, 325 published, 31 tags, 1126 files), so cutover risk was low but the structural ambiguity remained.

## Decision
**Dev Postgres is the canonical Strapi State store for the rehearsal pipeline and all migration operations.**

SQLite (`backend/.tmp/data.db`) remains a supported **no-Docker fallback** for local development only. It is explicitly excluded from the rehearsal pipeline and must not be treated as a source of truth for any migration or cutover operation.

Concretely:
- `tools/orchestrate_rehearsal.py` exports from dev Postgres (`myorl-pg`) instead of SQLite.
- The orchestrator **fails fast** if dev Postgres is not running, with an actionable message (`npm run dev:db` to start it).
- `SQLITE_FALLBACK_PATH` lives in `tools/environments.py` for tools that need it, but no environment definition carries a `sqlite_source` field.
- `npm run dev:local` continues to work for contributors who prefer not to run Docker.

## Alternatives Considered

- **Path A — Delete SQLite entirely.**
  Rejected because Strapi's DX ships with "SQLite by default for fast onboarding"; removing it crosses the design grain and raises the barrier for casual contributors.

- **Path C — Make SQLite canonical and remove dev Postgres.**
  Rejected because it contradicts the documented Dev Environment (Docker) design, the recently-built Docker dev stack, and the PostgreSQL-first migration path already in progress.

- **Auto-start dev Postgres if missing during rehearsal.**
  Rejected because implicit infrastructure startup violates the Port Guard pattern of fail-fast, loud, recoverable errors. Auto-starting hides state and makes debugging harder.

## Consequences

- Positive: The rehearsal pipeline validates exactly what the dev environment sees.
- Positive: One clear source of truth eliminates silent data skew.
- Positive: No-Docker contributors retain a working path (`npm run dev:local`).
- Negative: Rehearsal now requires dev Postgres to be running first (one explicit command).
- Negative: `backend/.tmp/data.db` may drift from dev Postgres if a developer uses both paths; the SQLite data is not policed.

## Trade-offs
We prioritize **pipeline correctness and clarity** over **zero-friction rehearsal**. The extra step of starting dev Postgres is a small tax for eliminating an entire class of "rehearsed the wrong dataset" bugs.

## Related
- `tools/environments.py` — `SQLITE_FALLBACK_PATH`
- `tools/orchestrate_rehearsal.py` — `export_from_dev_postgres()`, `_check_dev_postgres_running()`
- `tools/run_postgres_rehearsal.py` — direct-copy mode documents its SQLite fallback status
