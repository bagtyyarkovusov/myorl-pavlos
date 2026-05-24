#!/usr/bin/env python3
"""Normalize MODX-era HTML in Strapi page fields (site-wide or pilot slugs).

Dry-run writes ``tools/data/manual-repairs/legacy-cms-markup-repair-plan.json``.
Apply uses ``backend/scripts/apply-accordion-repair-plan.js`` inside ``myorl-strapi-dev``.

Usage:
  PYTHONPATH=tools python3 tools/repair_legacy_cms_markup.py --scan-all
  PYTHONPATH=tools python3 tools/repair_legacy_cms_markup.py \\
    --locale el --locale ru --slug skoliosi-rinikou-diafragmatos-stravo-diafragma-1
  PYTHONPATH=tools python3 tools/repair_legacy_cms_markup.py --scan-all --apply
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_TOOLS_DIR = Path(__file__).resolve().parent
if str(_TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(_TOOLS_DIR))

from cms_html_cleanup import normalize_legacy_modx_markup  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PLAN_PATH = ROOT / "tools/data/manual-repairs/legacy-cms-markup-repair-plan.json"
DEFAULT_RESULT_PATH = ROOT / "tools/data/manual-repairs/legacy-cms-markup-repair-result.json"
STRAPI_PLAN_PATH = ROOT / "backend/.tmp/legacy-cms-markup-repair-plan.json"
STRAPI_RESULT_PATH = ROOT / "backend/.tmp/legacy-cms-markup-repair-result.json"
POSTGRES_CONTAINER = "myorl-pg"
LOCALES_DEFAULT = ("el", "ru")

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


def load_pages(*, locales: tuple[str, ...], slugs: tuple[str, ...] | None) -> list[dict[str, Any]]:
    locale_filter = ", ".join(f"'{loc}'" for loc in locales)
    slug_clause = ""
    if slugs:
        slug_list = ", ".join(f"'{slug}'" for slug in slugs)
        slug_clause = f"AND slug IN ({slug_list})"

    return psql_json(
        f"""
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
          WHERE published_at IS NOT NULL
            AND locale IN ({locale_filter})
            {slug_clause}
          ORDER BY locale, slug
        ) t;
        """
    )


def normalize_page_fields(page: dict[str, Any]) -> tuple[dict[str, str], dict[str, int], list[str]]:
    payload: dict[str, str] = {}
    aggregate_stats: dict[str, int] = {}
    changed_fields: list[str] = []

    for db_field, api_field in PAGE_HTML_FIELDS:
        raw = page.get(db_field)
        if not raw or not isinstance(raw, str):
            continue
        cleaned, stats = normalize_legacy_modx_markup(raw)
        if cleaned == raw:
            continue
        payload[api_field] = cleaned
        changed_fields.append(api_field)
        for key, value in stats.items():
            aggregate_stats[key] = aggregate_stats.get(key, 0) + value

    return payload, aggregate_stats, changed_fields


def build_plan(pages: list[dict[str, Any]]) -> dict[str, Any]:
    planned_updates: list[dict[str, Any]] = []
    skipped: list[dict[str, str]] = []

    for page in pages:
        payload, stats, changed_fields = normalize_page_fields(page)
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
                "repairKind": "legacy-cms-markup",
                "itemCount": sum(stats.values()) or len(changed_fields),
                "stats": stats,
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
            "transformTotal": sum(entry["itemCount"] for entry in planned_updates),
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
            ".tmp/legacy-cms-markup-repair-plan.json",
            "--result",
            ".tmp/legacy-cms-markup-repair-result.json",
        ],
        cwd=ROOT / "backend",
        check=True,
    )

    if STRAPI_RESULT_PATH.exists():
        result_path.parent.mkdir(parents=True, exist_ok=True)
        result_path.write_text(STRAPI_RESULT_PATH.read_text(encoding="utf-8"), encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", type=Path, default=DEFAULT_PLAN_PATH)
    parser.add_argument("--result", type=Path, default=DEFAULT_RESULT_PATH)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--scan-all", action="store_true", help="Process all published pages for selected locales.")
    parser.add_argument("--locale", choices=LOCALES_DEFAULT, action="append")
    parser.add_argument("--slug", action="append", metavar="SLUG")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    locales = tuple(args.locale or LOCALES_DEFAULT)
    slugs: tuple[str, ...] | None
    if args.scan_all:
        slugs = None
    elif args.slug:
        slugs = tuple(args.slug)
    else:
        print("Specify --scan-all or at least one --slug.", file=sys.stderr)
        return 1

    pages = load_pages(locales=locales, slugs=slugs)
    plan = build_plan(pages)
    args.plan.parent.mkdir(parents=True, exist_ok=True)
    args.plan.write_text(json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    summary = plan["summary"]
    print(
        f"Plan written to {args.plan}: "
        f"{summary['plannedCount']} pages, "
        f"{summary['transformTotal']} transform(s)."
    )
    for entry in plan["plannedUpdates"][:20]:
        stats_preview = ", ".join(f"{k}={v}" for k, v in sorted(entry.get("stats", {}).items()))
        print(
            f"  - {entry['locale']}/{entry['slug']}: "
            f"{entry['itemCount']} in {', '.join(entry['changedFields'])}"
            + (f" ({stats_preview})" if stats_preview else "")
        )
    if len(plan["plannedUpdates"]) > 20:
        print(f"  ... and {len(plan['plannedUpdates']) - 20} more")

    if args.apply:
        if summary["plannedCount"] == 0:
            print("Nothing to apply.")
            return 0
        apply_plan(args.plan, args.result)
        print(f"Apply result written to {args.result}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
