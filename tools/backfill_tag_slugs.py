"""Backfill canonical tag slugs into the local Strapi SQLite database.

This is a local reconciliation helper for the current Strapi rehearsal DB.
It keeps existing localized Tag rows route-stable by applying the canonical
slug mapping from ``tag_plan.json``. Future imports should use
``strapi_importer.py`` so new tags are created with the same slug contract.
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path

from cms_audit import CHECKPOINT_SOURCE_DIR, MANIFESTS_DIR, MODX_SOURCE_DIR, REPORTS_DIR, ROOT
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = ROOT / "backend" / ".tmp" / "data.db"
TAG_PLAN_PATH = MANIFESTS_DIR / "tag_plan.json"


def _load_plan(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _expected_slug(plan: dict[str, Any], *, locale: str, name: str) -> str | None:
    locale_key = "el" if locale == "el" else "ru" if locale == "ru" else None
    if locale_key is None:
        return None
    resolution = (plan.get("resolution") or {}).get(locale_key) or {}
    return resolution.get(name)


def _has_slug_column(conn: sqlite3.Connection) -> bool:
    columns = {
        row[1]
        for row in conn.execute("PRAGMA table_info(tags)").fetchall()
    }
    return "slug" in columns


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB_PATH, help="Path to Strapi SQLite DB.")
    parser.add_argument("--tag-plan", type=Path, default=TAG_PLAN_PATH, help="Path to tag_plan.json.")
    parser.add_argument("--dry-run", action="store_true", help="Print planned updates without mutating the DB.")
    args = parser.parse_args()

    plan = _load_plan(args.tag_plan)
    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row

    has_slug_column = _has_slug_column(conn)
    column_added = False
    if not has_slug_column and not args.dry_run:
        conn.execute("ALTER TABLE tags ADD COLUMN slug varchar(255)")
        has_slug_column = True
        column_added = True

    select_sql = (
        """
        SELECT id, document_id, locale, name, slug
        FROM tags
        ORDER BY document_id, locale, id
        """
        if has_slug_column
        else """
        SELECT id, document_id, locale, name, NULL AS slug
        FROM tags
        ORDER BY document_id, locale, id
        """
    )
    rows = conn.execute(select_sql).fetchall()

    unresolved: list[dict[str, Any]] = []
    updates: list[tuple[str, int]] = []
    slug_to_documents: dict[str, set[str]] = {}

    for row in rows:
        locale = str(row["locale"] or "")
        name = str(row["name"] or "")
        expected = _expected_slug(plan, locale=locale, name=name)
        if not expected:
            unresolved.append(
                {
                    "id": row["id"],
                    "document_id": row["document_id"],
                    "locale": locale,
                    "name": name,
                }
            )
            continue

        document_id = str(row["document_id"] or "")
        slug_to_documents.setdefault(expected, set()).add(document_id)
        if row["slug"] != expected:
            updates.append((expected, int(row["id"])))

    duplicate_slugs = {
        slug: sorted(document_ids)
        for slug, document_ids in slug_to_documents.items()
        if len(document_ids) > 1
    }

    if unresolved or duplicate_slugs:
        conn.rollback()
        if unresolved:
            print("Unresolved tags:")
            for row in unresolved:
                print(
                    f"  id={row['id']} document_id={row['document_id']} "
                    f"locale={row['locale']} name={row['name']!r}"
                )
        if duplicate_slugs:
            print("Duplicate canonical slugs across documents:")
            for slug, document_ids in sorted(duplicate_slugs.items()):
                joined = ", ".join(document_ids)
                print(f"  {slug}: {joined}")
        return 1

    if args.dry_run:
        if not has_slug_column:
            column_added = True
        populated = total = len(rows)
        conn.rollback()
    else:
        conn.executemany("UPDATE tags SET slug = ? WHERE id = ?", updates)
        conn.commit()
        populated = conn.execute(
            "SELECT COUNT(*) FROM tags WHERE slug IS NOT NULL AND TRIM(slug) != ''"
        ).fetchone()[0]
        total = len(rows)

    print(
        f"tag slug backfill {'planned' if args.dry_run else 'applied'}: "
        f"{len(updates)} row updates, {populated}/{total} rows populated, "
        f"column_added={'yes' if column_added else 'no'}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
