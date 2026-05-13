#!/usr/bin/env python3
"""Apply or rollback the section-hub layout-variant migration.

Updates folder pages that were incorrectly set to ``specialized-article``
during the MODX import to the new ``section-hub`` layout variant. These are
MODX template-20 pages — small hub folders (2–6 children) that should render
children as a horizontal tab bar instead of an article layout.

Affected pages (10 total across both locales)::

    el: rinoplastiki, skoliosi-rinikou-diafragmatos-stravo-dafragma,
        metamosxeusi-mallion, pathiseis-stomatos, parotida-ypognathios-adenas
    ru: rinoplastiki, skoliosi-rinikou-diafragmatos-stravo-dafragma,
        metamosxeusi-mallion, pathiseis-stomatos, ypertrofia-rinikon-kogxon

Usage::

    # Preview affected rows (dry-run)
    python3 tools/migrate_section_hub.py --db-path backend/.tmp/data.db

    # Apply the migration
    python3 tools/migrate_section_hub.py --db-path backend/.tmp/data.db --apply

    # Rollback (restore from backup)
    python3 tools/migrate_section_hub.py --db-path backend/.tmp/data.db --rollback
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
BACKUP_DIR = REPO_ROOT / "tools" / "data" / "migrations"

FROM_VARIANT = "specialized-article"
TO_VARIANT = "section-hub"

AFFECTED = [
    ("el", "rinoplastiki"),
    ("el", "skoliosi-rinikou-diafragmatos-stravo-dafragma"),
    ("el", "metamosxeusi-mallion"),
    ("el", "pathiseis-stomatos"),
    ("el", "parotida-ypognathios-adenas"),
    ("ru", "rinoplastiki"),
    ("ru", "skoliosi-rinikou-diafragmatos-stravo-dafragma"),
    ("ru", "metamosxeusi-mallion"),
    ("ru", "pathiseis-stomatos"),
    ("ru", "ypertrofia-rinikon-kogxon"),
]


def _backup_path() -> Path:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    return BACKUP_DIR / f"section-hub-backup-{ts}.json"


def preview(db_path: str) -> None:
    """Show affected rows without making changes."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.execute(
        "SELECT document_id, locale, slug, layout_variant, is_folder "
        "FROM pages WHERE published_at IS NOT NULL "
        "ORDER BY locale, slug"
    )
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()

    affected_rows = [
        r for r in rows
        if (r["locale"], r["slug"]) in {(loc, slug) for loc, slug in AFFECTED}
    ]

    print(f"Found {len(affected_rows)} affected page(s):")
    for r in affected_rows:
        current = r["layout_variant"]
        status = "OK" if current == TO_VARIANT else f"will change: {current} → {TO_VARIANT}"
        print(f"  [{r['locale']}] {r['slug']}  ({status})")

    already_ok = sum(1 for r in affected_rows if r["layout_variant"] == TO_VARIANT)
    needs_change = len(affected_rows) - already_ok
    print(f"\n{needs_change} row(s) need updating, {already_ok} already at target.")


def apply(db_path: str) -> None:
    """Back up current state and update affected rows."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    # Read current state of ALL rows for the backup (not just affected)
    cur = conn.execute(
        "SELECT id, document_id, locale, slug, layout_variant "
        "FROM pages WHERE published_at IS NOT NULL "
        "AND layout_variant = ?",
        (FROM_VARIANT,),
    )
    snapshot = [dict(r) for r in cur.fetchall()]

    # Filter to affected
    targets = [
        r for r in snapshot
        if (r["locale"], r["slug"]) in {(loc, slug) for loc, slug in AFFECTED}
    ]

    if not targets:
        print("No rows to update (all already at target variant or not found).")
        conn.close()
        return

    # Save backup
    backup_file = _backup_path()
    backup_file.write_text(json.dumps(targets, indent=2, ensure_ascii=False), "utf-8")
    print(f"Backup saved to {backup_file}")

    # Update
    ids = [r["id"] for r in targets]
    placeholders = ",".join("?" for _ in ids)
    conn.execute(
        f"UPDATE pages SET layout_variant = ? WHERE id IN ({placeholders})",
        [TO_VARIANT] + ids,
    )
    conn.commit()
    conn.close()

    print(f"Updated {len(targets)} row(s):")
    for r in targets:
        print(f"  [{r['locale']}] {r['slug']}: {FROM_VARIANT} → {TO_VARIANT}")


def rollback(db_path: str) -> None:
    """Restore layout variants from the most recent backup file."""
    backups = sorted(BACKUP_DIR.glob("section-hub-backup-*.json"))
    if not backups:
        print("No backup files found in", BACKUP_DIR)
        sys.exit(1)

    backup_file = backups[-1]
    print(f"Using backup: {backup_file}")
    rows = json.loads(backup_file.read_text("utf-8"))

    conn = sqlite3.connect(db_path)

    for r in rows:
        conn.execute(
            "UPDATE pages SET layout_variant = ? WHERE id = ?",
            (r["layout_variant"], r["id"]),
        )

    conn.commit()
    conn.close()

    print(f"Rolled back {len(rows)} row(s) to their previous layout_variant:")
    for r in rows:
        print(f"  [{r['locale']}] {r['slug']}: → {r['layout_variant']}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrate folder pages to section-hub layout variant")
    parser.add_argument("--db-path", required=True, help="Path to Strapi SQLite database")
    parser.add_argument("--apply", action="store_true", help="Apply the migration")
    parser.add_argument("--rollback", action="store_true", help="Rollback from most recent backup")
    args = parser.parse_args()

    if args.apply and args.rollback:
        print("Cannot use --apply and --rollback together.")
        sys.exit(1)

    if args.rollback:
        rollback(args.db_path)
    elif args.apply:
        apply(args.db_path)
    else:
        preview(args.db_path)


if __name__ == "__main__":
    main()
