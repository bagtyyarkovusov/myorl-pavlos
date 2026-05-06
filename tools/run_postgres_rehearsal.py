#!/usr/bin/env python3
"""End-to-end PostgreSQL rehearsal harness.

Runs the four hot-path EXPLAIN ANALYZE queries from
``docs/runbooks/postgres-rehearsal.md`` against both the planner's default
choice and a forced index-only choice
(``SET enable_seqscan = off``). Writes a single JSON report under
``artifacts/reports/`` that records row counts, the indexes present on
``pages``/``tags``, and the per-query plans + index pick.

Assumptions made by this script:

- A disposable PG container named ``gemini-pg-rehearsal`` is already running
  with database ``strapi_rehearsal`` and user ``strapi``. Provision per the
  runbook before invoking this script.
- Strapi has been booted once against that PG so the schema is materialized.

Per ADR-008, dev Postgres is the canonical Strapi State store and the
canonical source for the rehearsal pipeline (orchestrate_rehearsal.py). This
script's ``direct-copy`` mode reads from ``backend/.tmp/data.db`` (the SQLite
fallback) for index-plan debugging only — when canonical Strapi import
tooling is unavailable. Use ``--load-source existing-postgres`` after a
canonical Strapi import has populated the rehearsal database.
"""

from __future__ import annotations

import argparse
import csv
import datetime
import io
import json
import sqlite3
import subprocess
import sys
from pathlib import Path
from typing import Any

from cms_audit import REPORTS_DIR, ROOT
from audit_postgres_strictness import POSTGRES_TEXT_LIMIT, audit as audit_postgres_strictness
from environments import ENVIRONMENTS, SQLITE_FALLBACK_PATH

# Rehearsal target identity comes from the Environment Manifest
_REHEARSAL = ENVIRONMENTS["rehearsal"]
CONTAINER = _REHEARSAL["container"]
PG_USER = _REHEARSAL["db_user"]
PG_DB = _REHEARSAL["db_name"]
# SQLite is the direct-copy debugging fallback; the canonical rehearsal source
# is dev Postgres (see ADR-008 and tools/orchestrate_rehearsal.py).
SQLITE_PATH = ROOT / SQLITE_FALLBACK_PATH
REPORT_PATH = REPORTS_DIR / "postgres_rehearsal_explain_report.json"

PAGE_COLUMNS = [
    "id", "document_id", "title", "menu_title", "slug", "content", "excerpt",
    "template_id", "page_type", "layout_variant", "info_block_bottom",
    "external_url", "is_folder", "hide_from_menu", "menu_index",
    "article_author", "sources", "pop_up_close",
    "created_at", "updated_at", "published_at",
    "created_by_id", "updated_by_id", "locale",
]

TAG_COLUMNS = [
    "id", "document_id", "name", "slug",
    "created_at", "updated_at", "published_at",
    "created_by_id", "updated_by_id", "locale",
]

BOOLEAN_PAGE_FIELDS = {"is_folder", "hide_from_menu"}
TIMESTAMP_FIELDS = {"created_at", "updated_at", "published_at"}
# Strip FK references on load — admin_users in PG is not 1:1 with the SQLite source,
# and both columns are nullable with ON DELETE SET NULL so this is harmless for
# the lookup queries we are about to EXPLAIN.
NULLABLE_FK_FIELDS = {"created_by_id", "updated_by_id"}


def ms_epoch_to_iso(value: Any) -> str:
    """Strapi v5 stores datetimes in SQLite as INT64 ms-since-epoch. Convert to
    an ISO-8601 string PG can parse into ``timestamp without time zone``."""
    return datetime.datetime.fromtimestamp(
        int(value) / 1000.0, tz=datetime.timezone.utc
    ).strftime("%Y-%m-%d %H:%M:%S.%f")

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


def docker_psql(sql: str, *, stdin: str | None = None, args: tuple[str, ...] = ("-At",)) -> str:
    cmd = ["docker", "exec", "-i", CONTAINER,
           "psql", "-U", PG_USER, "-d", PG_DB, *args, "-c", sql]
    proc = subprocess.run(cmd, input=stdin, capture_output=True, text=True, check=False)
    if proc.returncode != 0:
        raise RuntimeError(f"psql failed ({proc.returncode}): {proc.stderr}\nSQL: {sql[:200]}")
    return proc.stdout


def copy_csv_into_psql(table: str, columns: list[str], csv_payload: str) -> None:
    cmd = ["docker", "exec", "-i", CONTAINER,
           "psql", "-U", PG_USER, "-d", PG_DB,
           "-c", f"\\COPY {table}({','.join(columns)}) FROM STDIN WITH (FORMAT csv, HEADER true)"]
    proc = subprocess.run(cmd, input=csv_payload, capture_output=True, text=True, check=False)
    if proc.returncode != 0:
        raise RuntimeError(f"COPY into {table} failed ({proc.returncode}): {proc.stderr}")


def to_csv_value(col: str, val: Any) -> str:
    if col in NULLABLE_FK_FIELDS:
        return ""
    if val is None:
        return ""
    if col in BOOLEAN_PAGE_FIELDS:
        return "t" if int(val) == 1 else "f"
    if col in TIMESTAMP_FIELDS:
        return ms_epoch_to_iso(val)
    return str(val)


def build_csv(rows: list[sqlite3.Row], columns: list[str]) -> str:
    buf = io.StringIO()
    writer = csv.writer(buf, quoting=csv.QUOTE_MINIMAL)
    writer.writerow(columns)
    for row in rows:
        writer.writerow([to_csv_value(c, row[c]) for c in columns])
    return buf.getvalue()


def load_pages_and_tags() -> dict[str, Any]:
    if not SQLITE_PATH.exists():
        raise SystemExit(f"SQLite source missing: {SQLITE_PATH}")
    src = sqlite3.connect(str(SQLITE_PATH))
    src.row_factory = sqlite3.Row

    docker_psql(
        "TRUNCATE pages, tags, pages_tags_lnk, pages_parent_page_lnk, "
        "pages_related_pages_lnk RESTART IDENTITY CASCADE;"
    )

    page_rows = list(src.execute(f"SELECT {','.join(PAGE_COLUMNS)} FROM pages"))
    copy_csv_into_psql("pages", PAGE_COLUMNS, build_csv(page_rows, PAGE_COLUMNS))

    tag_rows = list(src.execute(f"SELECT {','.join(TAG_COLUMNS)} FROM tags"))
    copy_csv_into_psql("tags", TAG_COLUMNS, build_csv(tag_rows, TAG_COLUMNS))

    # The serial sequences must advance past the imported max(id), otherwise a
    # future Strapi insert would collide on the primary key.
    docker_psql(
        "SELECT setval(pg_get_serial_sequence('pages', 'id'), "
        "COALESCE((SELECT MAX(id) FROM pages), 0) + 1, false);"
    )
    docker_psql(
        "SELECT setval(pg_get_serial_sequence('tags', 'id'), "
        "COALESCE((SELECT MAX(id) FROM tags), 0) + 1, false);"
    )

    return {
        "pages_total": int(docker_psql("SELECT COUNT(*) FROM pages;").strip()),
        "pages_published": int(docker_psql(
            "SELECT COUNT(*) FROM pages WHERE published_at IS NOT NULL;"
        ).strip()),
        "tags_total": int(docker_psql("SELECT COUNT(*) FROM tags;").strip()),
        "pages_locales": [
            line for line in
            docker_psql("SELECT DISTINCT locale FROM pages ORDER BY locale;").splitlines()
            if line
        ],
    }


def postgres_counts() -> dict[str, Any]:
    return {
        "pages_total": int(docker_psql("SELECT COUNT(*) FROM pages;").strip()),
        "pages_published": int(docker_psql(
            "SELECT COUNT(*) FROM pages WHERE published_at IS NOT NULL;"
        ).strip()),
        "tags_total": int(docker_psql("SELECT COUNT(*) FROM tags;").strip()),
        "pages_locales": [
            line for line in
            docker_psql("SELECT DISTINCT locale FROM pages ORDER BY locale;").splitlines()
            if line
        ],
    }


def strictness_known_issues() -> list[dict[str, Any]]:
    report = audit_postgres_strictness(SQLITE_PATH)
    issues: list[dict[str, Any]] = []
    for finding in report["findings"]:
        issues.append({
            "id": f"postgres-strictness-{finding['table']}-{finding['field']}",
            "severity": "blocker-for-strapi-import",
            "description": (
                f"{finding['table']}.{finding['field']} is declared as "
                f"{finding['type']} but has {finding['overLimitRows']} row(s) "
                f"longer than PostgreSQL varchar({POSTGRES_TEXT_LIMIT})."
            ),
            "evidence": finding,
            "remediation": (
                "Change the Strapi schema field to text/longtext or sanitize "
                "the source data before relying on canonical strapi import."
            ),
        })
    return issues


def find_index_node(plan_node: dict) -> dict | None:
    node_type = plan_node.get("Node Type", "")
    if "Index" in node_type and plan_node.get("Index Name"):
        return {"node_type": node_type, "index_name": plan_node["Index Name"]}
    for child in plan_node.get("Plans", []):
        hit = find_index_node(child)
        if hit:
            return hit
    return None


def explain(query_sql: str, *, force_index: bool) -> dict:
    prefix = "SET enable_seqscan = off; " if force_index else ""
    raw = docker_psql(f"{prefix}EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {query_sql};")
    # psql in -At mode still echoes "SET" before the EXPLAIN output when we
    # combine statements; trim everything before the first '[' so json.loads sees
    # only the EXPLAIN array.
    start = raw.find("[")
    if start == -1:
        raise RuntimeError(f"No JSON array in EXPLAIN output: {raw[:200]}")
    plans = json.loads(raw[start:])
    return plans[0] if plans else {}


def run_queries() -> list[dict]:
    out: list[dict] = []
    for q in QUERIES:
        default_plan = explain(q["sql"], force_index=False)
        forced_plan = explain(q["sql"], force_index=True)
        d = find_index_node(default_plan.get("Plan", {}))
        f = find_index_node(forced_plan.get("Plan", {}))
        used = d["index_name"] if d else None
        forced_used = f["index_name"] if f else None
        passed = (used == q["expected_index"]) or (forced_used == q["expected_index"])
        out.append({
            "name": q["name"],
            "expectedIndex": q["expected_index"],
            "sql": q["sql"],
            "default": {"indexUsed": used, "plan": default_plan},
            "forcedSeqscanOff": {"indexUsed": forced_used, "plan": forced_plan},
            "verdict": "ok" if passed else "regression",
        })
    return out


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--load-source",
        choices=("direct-copy", "existing-postgres"),
        default="direct-copy",
        help=(
            "direct-copy loads pages/tags from SQLite; existing-postgres only "
            "validates the already-populated PostgreSQL database."
        ),
    )
    parser.add_argument("--report-json", type=Path, default=REPORT_PATH)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.load_source == "direct-copy":
        print("Loading pages and tags from SQLite into PG...")
        counts = load_pages_and_tags()
    else:
        print("Using existing PostgreSQL data...")
        counts = postgres_counts()

    print(
        f"  pages: {counts['pages_total']} ({counts['pages_published']} published, "
        f"locales={counts['pages_locales']})"
    )
    print(f"  tags : {counts['tags_total']}")

    pg_version = docker_psql("SELECT version();").strip()
    indexes_present = sorted(
        line for line in docker_psql(
            "SELECT indexname FROM pg_indexes "
            "WHERE tablename IN ('pages', 'tags') ORDER BY indexname;"
        ).splitlines() if line
    )
    docker_psql("ANALYZE pages; ANALYZE tags;")

    print("Running EXPLAIN ANALYZE on hot paths...")
    queries = run_queries()
    verdict = "ok" if all(q["verdict"] == "ok" for q in queries) else "regressions"
    print(f"  verdict = {verdict}")

    payload = {
        "rehearsedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "postgresVersion": pg_version,
        "container": CONTAINER,
        "rowCounts": counts,
        "indexesPresent": indexes_present,
        "queries": queries,
        "verdict": verdict,
        "knownDataIssues": strictness_known_issues(),
        "notes": [
            f"loadSource={args.load_source}",
            "Tag query uses slug='ear' (not the runbook's placeholder 'myorl', "
            "which does not exist in the dataset). Plan shape is what matters.",
            "Forced 'enable_seqscan = off' is captured per query because at this "
            "row count (~325 published pages) the planner may legitimately pick "
            "Seq Scan; the forced plan confirms the index is reachable.",
        ],
    }
    args.report_json.parent.mkdir(parents=True, exist_ok=True)
    args.report_json.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"  wrote {args.report_json.relative_to(ROOT)}")
    return 0 if verdict == "ok" else 1


if __name__ == "__main__":
    sys.exit(main())
