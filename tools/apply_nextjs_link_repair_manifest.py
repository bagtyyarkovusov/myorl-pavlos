#!/usr/bin/env python3
"""Apply reviewed internal link repairs for Next.js readiness.

Default mode is a dry run. Use ``--apply`` only after reviewing
``nextjs_internal_link_repair_manifest.json`` and snapshotting the rehearsal DB.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
import time
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from cms_audit import CHECKPOINT_SOURCE_DIR, DEFAULT_SQLITE_DB_PATH, MANIFESTS_DIR, MODX_SOURCE_DIR, REPORTS_DIR, ROOT, connect_readonly, scalar, write_json
from strapi_client import StrapiClient, StrapiError, load_strapi_env_from_dotenv

DEFAULT_MANIFEST = MANIFESTS_DIR / "nextjs_internal_link_repair_manifest.json"
DEFAULT_REPORT = REPORTS_DIR / "nextjs_internal_link_repair_apply_report.json"

PAGE_FIELD_TO_COLUMN = {
    "content": "content",
    "excerpt": "excerpt",
    "infoBlockBottom": "info_block_bottom",
    "sources": "sources",
    "popUpClose": "pop_up_close",
}


@dataclass(frozen=True)
class PageOccurrence:
    locale: str
    slug: str
    document_id: str
    field: str
    href: str
    target: str


def parse_page_source(source: str) -> tuple[str, str, str] | None:
    parts = source.split(":", 3)
    if len(parts) != 4 or parts[0] != "page":
        return None
    return parts[1], parts[2], parts[3]


def load_manifest(path: Path) -> list[PageOccurrence]:
    manifest = json.loads(path.read_text(encoding="utf-8"))
    occurrences: list[PageOccurrence] = []
    for row in manifest.get("occurrences", []):
        target = row.get("proposedTarget")
        parsed = parse_page_source(str(row.get("source") or ""))
        field = str(row.get("field") or "")
        if not parsed or not target or field not in PAGE_FIELD_TO_COLUMN:
            continue
        locale, slug, document_id = parsed
        occurrences.append(
            PageOccurrence(
                locale=locale,
                slug=slug,
                document_id=document_id,
                field=field,
                href=str(row.get("href") or ""),
                target=str(target),
            )
        )
    return occurrences


def rewrite_href(text: str, source_href: str, target_href: str) -> tuple[str, int]:
    pattern = re.compile(
        r"""(?P<prefix>href\s*=\s*["'])"""
        + re.escape(source_href)
        + r"""(?P<trailer>[#?][^"']*)?(?P<suffix>["'])""",
        re.IGNORECASE,
    )
    rewritten, count = pattern.subn(rf"\g<prefix>{target_href}\g<trailer>\g<suffix>", text)
    return rewritten, count


def current_page_text(document_id: str, locale: str, field: str) -> str:
    column = PAGE_FIELD_TO_COLUMN[field]
    connection = connect_readonly()
    try:
        row = connection.execute(
            f"""
            SELECT {column}
            FROM pages
            WHERE document_id = ?
              AND locale = ?
              AND published_at IS NOT NULL
            ORDER BY updated_at DESC
            LIMIT 1
            """,
            (document_id, locale),
        ).fetchone()
    finally:
        connection.close()
    return str(row[column] or "") if row else ""


def snapshot_database(db_path: Path) -> Path:
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    snapshot_path = db_path.with_name(f"{db_path.stem}.nextjs-link-repair-{timestamp}{db_path.suffix}")
    shutil.copy2(db_path, snapshot_path)
    return snapshot_path


def build_updates(occurrences: list[PageOccurrence]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    grouped: dict[tuple[str, str, str], list[PageOccurrence]] = defaultdict(list)
    for occurrence in occurrences:
        grouped[(occurrence.document_id, occurrence.locale, occurrence.field)].append(occurrence)

    updates: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    for (document_id, locale, field), group in sorted(grouped.items()):
        before = current_page_text(document_id, locale, field)
        if not before:
            skipped.append(
                {
                    "documentId": document_id,
                    "locale": locale,
                    "field": field,
                    "reason": "empty-or-missing-field",
                }
            )
            continue

        after = before
        replacements = 0
        for occurrence in group:
            after, count = rewrite_href(after, occurrence.href, occurrence.target)
            replacements += count

        if after == before:
            skipped.append(
                {
                    "documentId": document_id,
                    "locale": locale,
                    "field": field,
                    "reason": "no-matching-href",
                }
            )
            continue

        updates.append(
            {
                "documentId": document_id,
                "locale": locale,
                "field": field,
                "replacements": replacements,
                "payload": {field: after},
            }
        )

    return updates, skipped


def apply_updates(updates: list[dict[str, Any]], *, sleep_ms: int) -> list[dict[str, Any]]:
    load_strapi_env_from_dotenv()
    client = StrapiClient()
    errors: list[dict[str, Any]] = []

    for update in updates:
        try:
            client.put(
                f"/api/pages/{update['documentId']}",
                {"data": update["payload"]},
                locale=update["locale"],
            )
        except StrapiError as exc:
            errors.append(
                {
                    "documentId": update["documentId"],
                    "locale": update["locale"],
                    "field": update["field"],
                    "error": str(exc),
                }
            )
        if sleep_ms > 0:
            time.sleep(sleep_ms / 1000)

    return errors


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--apply", action="store_true", help="Write repaired fields to Strapi.")
    parser.add_argument("--snapshot-db", type=Path, default=DEFAULT_SQLITE_DB_PATH)
    parser.add_argument("--sleep-ms", type=int, default=100)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    occurrences = load_manifest(args.manifest)
    updates, skipped = build_updates(occurrences)
    snapshot_path: Path | None = None
    errors: list[dict[str, Any]] = []

    if args.apply:
        snapshot_path = snapshot_database(args.snapshot_db)
        errors = apply_updates(updates, sleep_ms=args.sleep_ms)

    report = {
        "mode": "apply" if args.apply else "dry-run",
        "manifest": str(args.manifest),
        "snapshot": str(snapshot_path) if snapshot_path else None,
        "plannedUpdates": updates,
        "skipped": skipped,
        "errors": errors,
        "counts": {
            "occurrences": len(occurrences),
            "updates": len(updates),
            "skipped": len(skipped),
            "errors": len(errors),
        },
    }
    write_json(args.report, report)
    print(json.dumps(report["counts"], ensure_ascii=False, indent=2))
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
