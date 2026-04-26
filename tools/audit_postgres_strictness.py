#!/usr/bin/env python3
"""Audit Strapi schema fields that PostgreSQL will enforce as varchar(255)."""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path
from typing import Any

from cms_audit import DEFAULT_SQLITE_DB_PATH, ROOT, write_json

LIMITED_TEXT_TYPES = {"string", "uid", "email", "enumeration", "password"}
POSTGRES_TEXT_LIMIT = 255


def schema_paths() -> list[Path]:
    components = sorted((ROOT / "backend" / "src" / "components").rglob("*.json"))
    content_types = sorted(
        (ROOT / "backend" / "src" / "api").glob("*/content-types/*/schema.json")
    )
    return components + content_types


def load_schema(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def table_columns(connection: sqlite3.Connection, table: str) -> set[str]:
    return {row[1] for row in connection.execute(f"PRAGMA table_info({quote_identifier(table)})")}


def quote_identifier(value: str) -> str:
    return '"' + value.replace('"', '""') + '"'


def limited_fields() -> list[dict[str, Any]]:
    fields: list[dict[str, Any]] = []
    for path in schema_paths():
        schema = load_schema(path)
        table = schema.get("collectionName")
        if not table:
            continue
        for field, spec in (schema.get("attributes") or {}).items():
            if not isinstance(spec, dict):
                continue
            field_type = spec.get("type")
            if field_type in LIMITED_TEXT_TYPES:
                fields.append(
                    {
                        "schemaPath": str(path.relative_to(ROOT)),
                        "table": table,
                        "field": field,
                        "type": field_type,
                    }
                )
    return fields


def sample_rows(connection: sqlite3.Connection, table: str, field: str) -> list[dict[str, Any]]:
    table_sql = quote_identifier(table)
    field_sql = quote_identifier(field)
    rows = connection.execute(
        f"""
        SELECT id, length({field_sql}) AS length, substr({field_sql}, 1, 120) AS preview
        FROM {table_sql}
        WHERE length({field_sql}) > ?
        ORDER BY length({field_sql}) DESC, id ASC
        LIMIT 5
        """,
        (POSTGRES_TEXT_LIMIT,),
    ).fetchall()
    return [
        {"id": row[0], "length": row[1], "preview": row[2]}
        for row in rows
    ]


def audit(db_path: Path) -> dict[str, Any]:
    connection = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    try:
        fields = limited_fields()
        findings: list[dict[str, Any]] = []
        skipped: list[dict[str, Any]] = []
        table_column_cache: dict[str, set[str]] = {}

        for field in fields:
            table = str(field["table"])
            column = str(field["field"])
            if table not in table_column_cache:
                table_column_cache[table] = table_columns(connection, table)
            if column not in table_column_cache[table]:
                skipped.append({**field, "reason": "column-not-in-sqlite-source"})
                continue

            table_sql = quote_identifier(table)
            column_sql = quote_identifier(column)
            over_limit, max_length = connection.execute(
                f"""
                SELECT
                  SUM(CASE WHEN length({column_sql}) > ? THEN 1 ELSE 0 END),
                  MAX(length({column_sql}))
                FROM {table_sql}
                """,
                (POSTGRES_TEXT_LIMIT,),
            ).fetchone()
            over_limit = int(over_limit or 0)
            if over_limit == 0:
                continue

            findings.append(
                {
                    **field,
                    "limit": POSTGRES_TEXT_LIMIT,
                    "overLimitRows": over_limit,
                    "maxLength": int(max_length or 0),
                    "samples": sample_rows(connection, table, column),
                }
            )

        return {
            "dbPath": str(db_path),
            "limit": POSTGRES_TEXT_LIMIT,
            "checkedFields": len(fields),
            "skippedFields": skipped,
            "findings": findings,
            "passed": not findings,
        }
    finally:
        connection.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=DEFAULT_SQLITE_DB_PATH)
    parser.add_argument("--report-json", type=Path)
    parser.add_argument("--fail-on-findings", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    report = audit(args.db)
    if args.report_json:
        write_json(args.report_json, report)

    if report["passed"]:
        print(
            f"[PASS] postgres-strictness: checked {report['checkedFields']} "
            f"varchar-like fields against {args.db}"
        )
    else:
        print(
            f"[FAIL] postgres-strictness: {len(report['findings'])} field(s) "
            f"exceed {POSTGRES_TEXT_LIMIT} characters"
        )
        print(json.dumps(report["findings"], ensure_ascii=False, indent=2))

    return 1 if args.fail_on_findings and not report["passed"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
