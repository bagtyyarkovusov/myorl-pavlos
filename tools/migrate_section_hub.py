#!/usr/bin/env python3
"""Apply or rollback the section-hub layout-variant migration.

Updates folder pages that were incorrectly set to ``specialized-article``
during the MODX import to the new ``section-hub`` layout variant. These are
MODX template-20 pages — small hub folders (2–6 children) that should render
children as a horizontal tab bar instead of an article layout.

Affected pages (MODX template-20 hub folders)::

    el: rinoplastiki, otoplastika-v-athinah, blepharoplasty, roxalito-kai-apnoia,
        skoliosi-rinikou-diafragmatos-stravo-dafragma, ypertrofia-rinikon-kogxon,
        metamosxeusi-mallion, pathiseis-stomatos, parotida-ypognathios-adenas
    ru: rinoplastiki, otoplastika-v-athinah, blefaroplastika-plastika-glaz,
        skoliosi-rinikou-diafragmatos-stravo-dafragma, metamosxeusi-mallion,
        pathiseis-stomatos, ypertrofia-rinikon-kogxon

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
    ("el", "otoplastika-v-athinah"),
    ("el", "blepharoplasty"),
    ("el", "roxalito-kai-apnoia"),
    ("el", "skoliosi-rinikou-diafragmatos-stravo-dafragma"),
    ("el", "ypertrofia-rinikon-kogxon"),
    ("el", "metamosxeusi-mallion"),
    ("el", "pathiseis-stomatos"),
    ("el", "parotida-ypognathios-adenas"),
    ("ru", "rinoplastiki"),
    ("ru", "otoplastika-v-athinah"),
    ("ru", "blefaroplastika-plastika-glaz"),
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
        "ORDER BY locale, slug",
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
        folder_ok = bool(r["is_folder"])
        variant_ok = current == TO_VARIANT
        if variant_ok and folder_ok:
            status = "OK"
        else:
            parts = []
            if not variant_ok:
                parts.append(f"{current} → {TO_VARIANT}")
            if not folder_ok:
                parts.append("is_folder → true")
            status = ", ".join(parts)
        print(f"  [{r['locale']}] {r['slug']}  ({status})")

    already_ok = sum(
        1 for r in affected_rows if r["layout_variant"] == TO_VARIANT and bool(r["is_folder"])
    )
    needs_change = len(affected_rows) - already_ok
    print(f"\n{needs_change} row(s) need updating, {already_ok} already at target.")


def apply(db_path: str) -> None:
    """Back up current state and update affected rows."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    affected_set = {(loc, slug) for loc, slug in AFFECTED}
    cur = conn.execute(
        "SELECT id, document_id, locale, slug, layout_variant, is_folder "
        "FROM pages WHERE published_at IS NOT NULL",
    )
    targets = [
        dict(r)
        for r in cur.fetchall()
        if (r["locale"], r["slug"]) in affected_set
        and (r["layout_variant"] != TO_VARIANT or not bool(r["is_folder"]))
    ]

    if not targets:
        print("No rows to update (all already at target variant or not found).")
        conn.close()
        return

    # Save backup
    backup_file = _backup_path()
    backup_file.write_text(json.dumps(targets, indent=2, ensure_ascii=False), "utf-8")
    print(f"Backup saved to {backup_file}")

    # Update layout + folder flag for hub pages
    ids = [r["id"] for r in targets]
    placeholders = ",".join("?" for _ in ids)
    conn.execute(
        f"UPDATE pages SET layout_variant = ?, is_folder = 1 WHERE id IN ({placeholders})",
        [TO_VARIANT] + ids,
    )
    conn.commit()
    conn.close()

    print(f"Updated {len(targets)} row(s):")
    for r in targets:
        changes: list[str] = []
        if r["layout_variant"] != TO_VARIANT:
            changes.append(f"{r['layout_variant']} → {TO_VARIANT}")
        if not bool(r["is_folder"]):
            changes.append("is_folder → true")
        print(f"  [{r['locale']}] {r['slug']}: {', '.join(changes)}")


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
            "UPDATE pages SET layout_variant = ?, is_folder = ? WHERE id = ?",
            (r["layout_variant"], int(bool(r.get("is_folder", 0))), r["id"]),
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
