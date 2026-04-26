#!/usr/bin/env python3
"""Validate the PostgreSQL rehearsal report used as production-readiness evidence."""

from __future__ import annotations

import argparse
import json
import sqlite3
from pathlib import Path
from typing import Any

from cms_audit import DEFAULT_SQLITE_DB_PATH

EXPECTED_INDEXES = {
    "idx_pages_published_locale_slug",
    "idx_pages_published_locale_menu_slug",
    "idx_pages_published_locale_type_layout_menu_slug",
    "idx_tags_locale_slug",
}


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def source_counts(db_path: Path) -> dict[str, Any]:
    connection = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    try:
        return {
            "pages_total": connection.execute("SELECT COUNT(*) FROM pages").fetchone()[0],
            "pages_published": connection.execute(
                "SELECT COUNT(*) FROM pages WHERE published_at IS NOT NULL"
            ).fetchone()[0],
            "tags_total": connection.execute("SELECT COUNT(*) FROM tags").fetchone()[0],
            "pages_locales": [
                row[0]
                for row in connection.execute("SELECT DISTINCT locale FROM pages ORDER BY locale")
                if row[0]
            ],
        }
    finally:
        connection.close()


def blocker_issues(report: dict[str, Any]) -> list[dict[str, Any]]:
    issues = report.get("knownDataIssues") or []
    return [
        issue
        for issue in issues
        if "blocker" in str(issue.get("severity", "")).lower()
    ]


def validate(report: dict[str, Any], baseline: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    if report.get("verdict") != "ok":
        failures.append(f"report verdict is {report.get('verdict')!r}, expected 'ok'")

    indexes = set(report.get("indexesPresent") or [])
    missing_indexes = sorted(EXPECTED_INDEXES - indexes)
    if missing_indexes:
        failures.append(f"missing expected indexes: {', '.join(missing_indexes)}")

    for issue in blocker_issues(report):
        failures.append(
            f"blocker knownDataIssue remains: {issue.get('id', '(unknown)')}"
        )

    row_counts = report.get("rowCounts") or {}
    for key, expected_value in baseline.items():
        if row_counts.get(key) != expected_value:
            failures.append(
                f"rowCounts.{key} is {row_counts.get(key)!r}, expected {expected_value!r}"
            )

    for query in report.get("queries") or []:
        if query.get("verdict") != "ok":
            failures.append(f"query {query.get('name')} verdict is {query.get('verdict')!r}")
            continue
        expected = query.get("expectedIndex")
        default_used = (query.get("default") or {}).get("indexUsed")
        forced_used = (query.get("forcedSeqscanOff") or {}).get("indexUsed")
        if expected not in {default_used, forced_used}:
            failures.append(
                f"query {query.get('name')} did not use expected index {expected}"
            )

    return failures


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("report", type=Path)
    parser.add_argument("--db", type=Path, default=DEFAULT_SQLITE_DB_PATH)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    report = load_json(args.report)
    failures = validate(report, source_counts(args.db))
    if failures:
        print("[FAIL] postgres-rehearsal-report")
        for failure in failures:
            print(f"  - {failure}")
        return 1

    print(f"[PASS] postgres-rehearsal-report: {args.report}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
