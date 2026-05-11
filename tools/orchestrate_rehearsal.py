#!/usr/bin/env python3
"""Rehearsal lifecycle orchestrator.

Runs the full rehearsal pipeline end-to-end:
  1. Preflight (environment guard)
  2. Export full Strapi state from dev Postgres (canonical store, see ADR-008)
  3. Start rehearsal PostgreSQL container
  4. Wait for database health
  5. Import Strapi state into PostgreSQL
  6. Apply forward-only index migrations
  7. Run EXPLAIN ANALYZE validation
  8. Generate report
  9. Cleanup (unless --keep-running)

Interface:
  python3 tools/orchestrate_rehearsal.py [--keep-running]

Requires the dev Postgres container (`myorl-pg`) to be running. Start it
with `npm run dev:db` (or `npm run dev` for the full stack) before invoking
the orchestrator. The implementation fails fast if it is not running.
"""

from __future__ import annotations

import argparse
import datetime
import json
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from cms_audit import REPORTS_DIR, ROOT
from environments import ENVIRONMENTS

# Configuration — rehearsal-specific values come from the Environment Manifest
_REHEARSAL = ENVIRONMENTS["rehearsal"]
_DEV = ENVIRONMENTS["dev"]

BACKEND_DIR = ROOT / "backend"
REHEARSAL_COMPOSE = ROOT / _REHEARSAL["compose_file"]
EXPORT_PATH = ROOT / "artifacts" / "rehearsal-export.tar.gz"
# Strapi appends .tar.gz automatically, so the base path we pass should not include it
EXPORT_BASE = EXPORT_PATH.with_suffix("").with_suffix("")  # removes .tar.gz -> rehearsal-export
REPORT_PATH = REPORTS_DIR / "postgres_rehearsal_explain_report.json"
CONTAINER = _REHEARSAL["container"]
PG_USER = _REHEARSAL["db_user"]
PG_DB = _REHEARSAL["db_name"]
PG_PORT = str(_REHEARSAL["host_port"])

# Source for rehearsal exports — the dev Postgres database (canonical Strapi State store)
DEV_CONTAINER = _DEV["container"]
DEV_HOST_PORT = str(_DEV["host_port"])
DEV_DB = _DEV["db_name"]
DEV_USER = _DEV["db_user"]
DEV_PASSWORD = "strapi"  # Local-only default

# Hot-path EXPLAIN ANALYZE queries (from ADR-003 and runbook)
QUERIES: list[dict[str, str]] = [
    {
        "name": "route-lookup",
        "expected_index": "idx_pages_published_locale_slug",
        "sql": (
            "SELECT id FROM pages "
            "WHERE locale = 'el' AND slug = 'epikoinonia' "
            "AND published_at IS NOT NULL"
        ),
    },
    {
        "name": "navigation-listing",
        "expected_index": "idx_pages_published_locale_menu_slug",
        "sql": (
            "SELECT id, locale, slug, menu_index FROM pages "
            "WHERE published_at IS NOT NULL "
            "ORDER BY locale ASC, menu_index ASC NULLS LAST, slug ASC"
        ),
    },
    {
        "name": "type-layout-listing",
        "expected_index": "idx_pages_published_locale_type_layout_menu_slug",
        "sql": (
            "SELECT id, slug, menu_index FROM pages "
            "WHERE locale = 'el' AND page_type = 'content' "
            "AND layout_variant = 'section-index' "
            "AND published_at IS NOT NULL "
            "ORDER BY menu_index ASC NULLS LAST, slug ASC"
        ),
    },
    {
        "name": "tag-lookup",
        "expected_index": "idx_tags_locale_slug",
        "sql": "SELECT id FROM tags WHERE locale = 'el' AND slug = 'ear'",
    },
]


@dataclass
class Step:
    name: str


def log_step(step: Step, message: str) -> None:
    timestamp = datetime.datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] [{step.name}] {message}")


def run_command(
    cmd: list[str],
    *,
    cwd: Path | None = None,
    env: dict[str, str] | None = None,
    check: bool = True,
    capture: bool = True,
    timeout: int | None = 300,
) -> subprocess.CompletedProcess[str]:
    """Run a subprocess command with unified error handling."""
    merged_env = {**dict(subprocess.os.environ), **(env or {})}
    result = subprocess.run(
        cmd,
        cwd=cwd,
        env=merged_env,
        capture_output=capture,
        text=True,
        check=False,
        timeout=timeout,
    )
    if check and result.returncode != 0:
        stderr = result.stderr.strip() if result.stderr else "(no stderr)"
        stdout = result.stdout.strip() if result.stdout else "(no stdout)"
        raise RuntimeError(
            f"Command failed (exit {result.returncode}): {' '.join(cmd)}\n"
            f"stdout: {stdout[:500]}\n"
            f"stderr: {stderr[:500]}"
        )
    return result


def preflight() -> None:
    step = Step("preflight")
    log_step(step, "Running environment guard...")

    guard_script = ROOT / "tools" / "check_environment.py"
    if not guard_script.exists():
        raise RuntimeError(f"Guard script not found: {guard_script}")

    result = run_command(
        [sys.executable, str(guard_script), "--target", "rehearsal"],
        check=False,
        capture=True,
    )

    if result.returncode != 0:
        print(result.stdout)
        print(result.stderr)
        raise RuntimeError("Preflight checks failed. Fix the issues above and retry.")

    log_step(step, "All preflight checks passed.")


def _check_dev_postgres_running() -> None:
    """Fail fast if the dev Postgres container is not running.

    Per ADR-008, dev Postgres is the canonical source for the rehearsal
    pipeline. We do not auto-start it — the developer must bring it up first
    with `npm run dev:db` (or the full dev stack).
    """
    result = subprocess.run(
        ["docker", "ps", "--format", "{{.Names}}"],
        capture_output=True,
        text=True,
        check=False,
        timeout=5,
    )
    running = {line.strip() for line in result.stdout.splitlines() if line.strip()}
    if DEV_CONTAINER not in running:
        raise RuntimeError(
            f"Dev Postgres container '{DEV_CONTAINER}' is not running. "
            "Rehearsal exports its source from dev Postgres. "
            "Start it first: `npm run dev:db` (or `npm run dev` for the full stack)."
        )


def export_from_dev_postgres() -> Path:
    step = Step("export")
    log_step(step, f"Exporting Strapi state from dev Postgres ({DEV_CONTAINER})...")

    _check_dev_postgres_running()

    EXPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    if EXPORT_BASE.exists():
        EXPORT_BASE.unlink()
    if EXPORT_PATH.exists():
        EXPORT_PATH.unlink()

    # Strapi CLI exports from whatever DATABASE_CLIENT/connection it sees in env.
    # Point it at dev Postgres on its host port — the canonical Strapi State store.
    env = {
        "DATABASE_CLIENT": "postgres",
        "DATABASE_HOST": "127.0.0.1",
        "DATABASE_PORT": DEV_HOST_PORT,
        "DATABASE_NAME": DEV_DB,
        "DATABASE_USERNAME": DEV_USER,
        "DATABASE_PASSWORD": DEV_PASSWORD,
        "DATABASE_SSL": "false",
        "DATABASE_SCHEMA": "public",
    }

    run_command(
        ["npx", "strapi", "export", "--file", str(EXPORT_BASE), "--no-encrypt", "--exclude", "files"],
        cwd=BACKEND_DIR,
        env=env,
        timeout=300,
    )

    # Strapi adds .tar.gz to the filename automatically
    actual_export = Path(str(EXPORT_BASE) + ".tar.gz")
    if actual_export.exists():
        size = actual_export.stat().st_size
        log_step(step, f"Export complete: {actual_export.name} ({size:,} bytes)")
        return actual_export
    raise RuntimeError("Export completed but tarball was not created.")


def start_rehearsal_db() -> None:
    step = Step("start-db")
    log_step(step, "Starting rehearsal PostgreSQL container...")

    if not REHEARSAL_COMPOSE.exists():
        raise RuntimeError(f"Compose file not found: {REHEARSAL_COMPOSE}")

    run_command(
        ["docker", "compose", "-f", str(REHEARSAL_COMPOSE), "up", "-d"],
        cwd=ROOT,
        timeout=60,
    )

    log_step(step, "Container started. Waiting for health...")

    # Poll pg_isready until healthy (max 60 seconds)
    for attempt in range(60):
        result = subprocess.run(
            [
                "docker", "exec", CONTAINER,
                "pg_isready", "-U", PG_USER, "-d", PG_DB,
            ],
            capture_output=True,
            text=True,
            check=False,
            timeout=5,
        )
        if result.returncode == 0:
            log_step(step, "PostgreSQL is healthy.")
            return
        time.sleep(1)

    raise RuntimeError("PostgreSQL did not become healthy within 60 seconds.")


def import_into_postgres(export_path: Path) -> None:
    step = Step("import")
    log_step(step, "Importing Strapi state into rehearsal PostgreSQL...")

    # We need to point Strapi at the rehearsal PostgreSQL during import
    env = {
        "DATABASE_CLIENT": "postgres",
        "DATABASE_HOST": "127.0.0.1",
        "DATABASE_PORT": PG_PORT,
        "DATABASE_NAME": PG_DB,
        "DATABASE_USERNAME": PG_USER,
        "DATABASE_PASSWORD": "strapi",
        "DATABASE_SSL": "false",
        "DATABASE_SCHEMA": "public",
    }

    result = run_command(
        ["npx", "strapi", "import", "--file", str(export_path), "--force"],
        cwd=BACKEND_DIR,
        env=env,
        timeout=300,
    )

    log_step(step, "Import complete.")


def apply_migrations() -> None:
    step = Step("migrate")
    log_step(step, "Applying forward-only index migrations via Migration Runner...")

    runner = ROOT / "tools" / "migration_runner.py"
    result = run_command(
        [sys.executable, str(runner), "up", "--target", "rehearsal"],
        cwd=ROOT,
        check=False,
        capture=True,
        timeout=300,
    )

    if result.returncode != 0:
        stderr = result.stderr.strip() if result.stderr else ""
        stdout = result.stdout.strip() if result.stdout else ""
        raise RuntimeError(
            f"Migration Runner failed (exit {result.returncode}).\n"
            f"stdout: {stdout[:500]}\n"
            f"stderr: {stderr[:500]}"
        )

    log_step(step, "Migrations applied successfully.")


def docker_psql(sql: str, *, args: tuple[str, ...] = ("-At",)) -> str:
    """Run SQL against the rehearsal PostgreSQL container."""
    cmd = [
        "docker", "exec", "-i", CONTAINER,
        "psql", "-U", PG_USER, "-d", PG_DB, *args, "-c", sql,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(
            f"psql failed ({result.returncode}): {result.stderr}\nSQL: {sql[:200]}"
        )
    return result.stdout


def find_index_node(plan_node: dict) -> dict | None:
    """Extract index usage from EXPLAIN JSON plan."""
    node_type = plan_node.get("Node Type", "")
    if "Index" in node_type and plan_node.get("Index Name"):
        return {"node_type": node_type, "index_name": plan_node["Index Name"]}
    for child in plan_node.get("Plans", []):
        hit = find_index_node(child)
        if hit:
            return hit
    return None


def explain(query_sql: str, *, force_index: bool) -> dict:
    """Run EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) on the rehearsal DB."""
    prefix = "SET enable_seqscan = off; " if force_index else ""
    raw = docker_psql(f"{prefix}EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {query_sql};")
    start = raw.find("[")
    if start == -1:
        raise RuntimeError(f"No JSON array in EXPLAIN output: {raw[:200]}")
    plans = json.loads(raw[start:])
    return plans[0] if plans else {}


def run_explain_queries() -> list[dict]:
    """Run hot-path EXPLAIN ANALYZE queries and validate index usage."""
    step = Step("explain")
    log_step(step, "Running EXPLAIN ANALYZE on hot paths...")

    # Update statistics first
    docker_psql("ANALYZE pages; ANALYZE tags;")

    results: list[dict] = []
    for q in QUERIES:
        default_plan = explain(q["sql"], force_index=False)
        forced_plan = explain(q["sql"], force_index=True)
        d = find_index_node(default_plan.get("Plan", {}))
        f = find_index_node(forced_plan.get("Plan", {}))
        used = d["index_name"] if d else None
        forced_used = f["index_name"] if f else None
        passed = (used == q["expected_index"]) or (forced_used == q["expected_index"])

        results.append({
            "name": q["name"],
            "expectedIndex": q["expected_index"],
            "sql": q["sql"],
            "default": {"indexUsed": used, "plan": default_plan},
            "forcedSeqscanOff": {"indexUsed": forced_used, "plan": forced_plan},
            "verdict": "ok" if passed else "regression",
        })

        status = "PASS" if passed else "FAIL"
        log_step(step, f"  [{status}] {q['name']}: expected={q['expected_index']}, used={used}")

    return results


def generate_report(queries: list[dict]) -> Path:
    step = Step("report")
    log_step(step, "Generating rehearsal report...")

    # Gather metadata
    pg_version = docker_psql("SELECT version();").strip()
    indexes_present = sorted(
        line for line in docker_psql(
            "SELECT indexname FROM pg_indexes "
            "WHERE tablename IN ('pages', 'tags') ORDER BY indexname;"
        ).splitlines() if line
    )

    pages_total = int(docker_psql("SELECT COUNT(*) FROM pages;").strip())
    pages_published = int(docker_psql(
        "SELECT COUNT(*) FROM pages WHERE published_at IS NOT NULL;"
    ).strip())
    tags_total = int(docker_psql("SELECT COUNT(*) FROM tags;").strip())
    pages_locales = [
        line for line in docker_psql("SELECT DISTINCT locale FROM pages ORDER BY locale;").splitlines()
        if line
    ]

    verdict = "ok" if all(q["verdict"] == "ok" for q in queries) else "regressions"

    payload = {
        "rehearsedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "postgresVersion": pg_version,
        "container": CONTAINER,
        "rowCounts": {
            "pages_total": pages_total,
            "pages_published": pages_published,
            "tags_total": tags_total,
            "pages_locales": pages_locales,
        },
        "indexesPresent": indexes_present,
        "queries": queries,
        "verdict": verdict,
        "notes": [
            "Rehearsal orchestrated via tools/orchestrate_rehearsal.py",
            "Full Strapi export/import used (not direct CSV copy)",
            "Forced 'enable_seqscan = off' confirms index reachability",
        ],
    }

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    log_step(step, f"Report saved: {REPORT_PATH}")
    return REPORT_PATH


def cleanup(keep_running: bool) -> None:
    step = Step("cleanup")
    if keep_running:
        log_step(step, "--keep-running set: leaving container and volume intact.")
        log_step(step, f"To stop later: docker compose -f {REHEARSAL_COMPOSE.name} down -v")
        return

    log_step(step, "Stopping rehearsal container and removing volume...")
    run_command(
        ["docker", "compose", "-f", str(REHEARSAL_COMPOSE), "down", "-v"],
        cwd=ROOT,
        timeout=60,
    )
    log_step(step, "Cleanup complete.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--keep-running",
        action="store_true",
        help="Leave the rehearsal container running after validation",
    )
    parser.add_argument(
        "--skip-export",
        action="store_true",
        help="Skip export and use existing artifacts/rehearsal-export.tar.gz",
    )
    parser.add_argument(
        "--skip-import",
        action="store_true",
        help="Skip import (for when data is already in the rehearsal DB)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    start_time = time.time()

    try:
        # 1. Preflight
        preflight()

        # 2. Export from dev Postgres (canonical store, see ADR-008)
        if args.skip_export:
            if not EXPORT_PATH.exists():
                raise RuntimeError(f"--skip-export requested but {EXPORT_PATH} not found.")
            export_path = EXPORT_PATH
            print(f"Using existing export: {export_path}")
        else:
            export_path = export_from_dev_postgres()

        # 3. Start rehearsal DB
        start_rehearsal_db()

        # 4. Import into PostgreSQL
        if not args.skip_import:
            import_into_postgres(export_path)
        else:
            print("Skipping import (--skip-import)")

        # 5. Apply migrations
        apply_migrations()

        # 6. Run EXPLAIN queries
        queries = run_explain_queries()

        # 7. Generate report
        generate_report(queries)

        # 8. Cleanup
        cleanup(args.keep_running)

        elapsed = time.time() - start_time
        print(f"\nRehearsal complete in {elapsed:.1f}s. Verdict: {'PASS' if all(q['verdict'] == 'ok' for q in queries) else 'FAIL'}")
        return 0 if all(q["verdict"] == "ok" for q in queries) else 1

    except RuntimeError as e:
        print(f"\n[ERROR] Rehearsal failed: {e}", file=sys.stderr)
        if not args.keep_running:
            print("Cleaning up rehearsal container...", file=sys.stderr)
            try:
                cleanup(keep_running=False)
            except Exception:
                pass
        return 1
    except KeyboardInterrupt:
        print("\n[INTERRUPTED] Cleaning up...", file=sys.stderr)
        if not args.keep_running:
            try:
                cleanup(keep_running=False)
            except Exception:
                pass
        return 130


if __name__ == "__main__":
    sys.exit(main())
