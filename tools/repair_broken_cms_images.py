#!/usr/bin/env python3
"""Remove broken CMS images from Strapi page HTML fields.

Strips Word ``msohtmlclip`` paste artifacts, ``file://`` temp images, and other
``<img>`` tags without a usable ``src`` from page scalar rich-text fields.

Usage:
  python tools/repair_broken_cms_images.py
  python tools/repair_broken_cms_images.py --apply
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from cms_html_cleanup import html_has_broken_images, remove_broken_images

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PLAN_PATH = ROOT / "tools/data/manual-repairs/broken-cms-images-repair-plan.json"
DEFAULT_RESULT_PATH = ROOT / "tools/data/manual-repairs/broken-cms-images-repair-result.json"
STRAPI_PLAN_PATH = ROOT / "backend/.tmp/broken-cms-images-repair-plan.json"
STRAPI_RESULT_PATH = ROOT / "backend/.tmp/broken-cms-images-repair-result.json"
POSTGRES_CONTAINER = "myorl-pg"

PAGE_HTML_FIELDS: tuple[tuple[str, str], ...] = (
    ("content", "content"),
    ("excerpt", "excerpt"),
    ("info_block_bottom", "infoBlockBottom"),
    ("sources", "sources"),
)


def psql_json(query: str) -> Any:
    raw = subprocess.check_output(
        [
            "docker",
            "exec",
            POSTGRES_CONTAINER,
            "psql",
            "-U",
            "strapi",
            "-d",
            "strapi",
            "-At",
            "-c",
            query,
        ],
        text=True,
    ).strip()
    if not raw:
        return []
    return json.loads(raw)


def load_pages() -> list[dict[str, Any]]:
    return psql_json(
        """
        SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
        FROM (
          SELECT
            document_id,
            locale,
            slug,
            (published_at IS NOT NULL) AS has_published,
            content,
            excerpt,
            info_block_bottom,
            sources
          FROM pages
          ORDER BY locale, slug
        ) t;
        """
    )


def repair_field(value: str | None) -> tuple[str | None, bool]:
    if not isinstance(value, str) or not value.strip():
        return value, False
    if not html_has_broken_images(value):
        return value, False
    cleaned = remove_broken_images(value)
    if cleaned == value:
        return value, False
    return cleaned, True


def build_plan(pages: list[dict[str, Any]]) -> dict[str, Any]:
    planned_updates: list[dict[str, Any]] = []
    skipped: list[dict[str, str]] = []

    for page in pages:
        payload: dict[str, str] = {}
        changed_fields: list[str] = []

        for db_field, api_field in PAGE_HTML_FIELDS:
            cleaned, changed = repair_field(page.get(db_field))
            if changed and isinstance(cleaned, str):
                payload[api_field] = cleaned
                changed_fields.append(api_field)

        if not payload:
            skipped.append(
                {
                    "documentId": page["document_id"],
                    "locale": page["locale"],
                    "slug": page["slug"],
                }
            )
            continue

        planned_updates.append(
            {
                "documentId": page["document_id"],
                "locale": page["locale"],
                "slug": page["slug"],
                "hasPublished": bool(page.get("has_published")),
                "repairKind": "broken-cms-images",
                "itemCount": len(changed_fields),
                "changedFields": changed_fields,
                "payload": payload,
            }
        )

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "pageCount": len(pages),
            "plannedCount": len(planned_updates),
            "skippedCount": len(skipped),
            "fieldRepairTotal": sum(entry["itemCount"] for entry in planned_updates),
        },
        "plannedUpdates": planned_updates,
        "skipped": skipped,
        "errors": [],
    }


def apply_plan(plan_path: Path, result_path: Path) -> None:
    STRAPI_PLAN_PATH.parent.mkdir(parents=True, exist_ok=True)
    STRAPI_PLAN_PATH.write_text(plan_path.read_text(encoding="utf-8"), encoding="utf-8")

    subprocess.run(
        [
            "docker",
            "exec",
            "myorl-strapi-dev",
            "node",
            "scripts/apply-accordion-repair-plan.js",
            "--plan",
            ".tmp/broken-cms-images-repair-plan.json",
            "--result",
            ".tmp/broken-cms-images-repair-result.json",
        ],
        cwd=ROOT / "backend",
        check=True,
    )

    if STRAPI_RESULT_PATH.exists():
        result_path.parent.mkdir(parents=True, exist_ok=True)
        result_path.write_text(STRAPI_RESULT_PATH.read_text(encoding="utf-8"), encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--plan",
        type=Path,
        default=DEFAULT_PLAN_PATH,
        help="Where to write the generated repair plan JSON.",
    )
    parser.add_argument(
        "--result",
        type=Path,
        default=DEFAULT_RESULT_PATH,
        help="Where the apply script writes its result JSON.",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply the generated plan through Strapi documents API.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    try:
        pages = load_pages()
    except subprocess.CalledProcessError as exc:
        print(f"Failed to read pages from Postgres: {exc}", file=sys.stderr)
        return 1
    except json.JSONDecodeError as exc:
        print(f"Failed to decode Postgres JSON payload: {exc}", file=sys.stderr)
        return 1

    plan = build_plan(pages)
    args.plan.parent.mkdir(parents=True, exist_ok=True)
    args.plan.write_text(json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    summary = plan["summary"]
    print(
        f"Plan written to {args.plan}: "
        f"{summary['plannedCount']} pages, "
        f"{summary['fieldRepairTotal']} field(s) to clean "
        f"({summary['skippedCount']} unchanged)."
    )

    for entry in plan["plannedUpdates"][:10]:
        print(
            f"  - {entry['locale']}/{entry['slug']}: "
            f"{', '.join(entry['changedFields'])}"
        )
    if summary["plannedCount"] > 10:
        print(f"  ... and {summary['plannedCount'] - 10} more")

    if args.apply:
        if summary["plannedCount"] == 0:
            print("Nothing to apply.")
            return 0
        apply_plan(args.plan, args.result)
        print(f"Apply result written to {args.result}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
