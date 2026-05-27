#!/usr/bin/env python3
"""Revert mistaken section-hub treatment of the clinic (iatreio) pages.

The SEO handoff script ``repair_section_hub_structure.py`` incorrectly classified
``ru/iatreio`` as a section-hub folder. On the legacy site, ``/iatreio`` is a single
standard content page (doctor bio + both clinic locations). The gallery children
(``iatreio-alexandras``, ``iatreio-koukaki``) are separate URLs, hidden from the menu,
not tab siblings.

This repair aligns RU with EL:
  - ``iatreio``: ``layoutVariant=standard``, ``isFolder=false``
  - ``iatreio-alexandras`` / ``iatreio-koukaki``: ``hideFromMenu=true`` (both locales)

Usage:
  python tools/repair_iatreio_hub_mistake.py
  python tools/repair_iatreio_hub_mistake.py --apply
"""

from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PLAN_PATH = ROOT / "tools/data/manual-repairs/iatreio-hub-mistake-repair-plan.json"
DEFAULT_RESULT_PATH = ROOT / "tools/data/manual-repairs/iatreio-hub-mistake-repair-result.json"
STRAPI_PLAN_PATH = ROOT / "backend/.tmp/iatreio-hub-mistake-repair-plan.json"
STRAPI_RESULT_PATH = ROOT / "backend/.tmp/iatreio-hub-mistake-repair-result.json"
POSTGRES_CONTAINER = "myorl-pg"

PARENT_SLUG = "iatreio"
CHILD_SLUGS = ("iatreio-alexandras", "iatreio-koukaki")


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


def load_published_pages() -> list[dict[str, Any]]:
    return psql_json(
        """
        SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
        FROM (
          SELECT
            p.document_id,
            p.locale,
            p.slug,
            p.layout_variant,
            p.is_folder,
            p.hide_from_menu,
            (p.published_at IS NOT NULL) AS has_published
          FROM pages p
          WHERE p.published_at IS NOT NULL
            AND p.slug IN ('iatreio', 'iatreio-alexandras', 'iatreio-koukaki')
          ORDER BY p.locale, p.slug
        ) t;
        """
    )


def parent_payload() -> dict[str, Any]:
    return {
        "layoutVariant": "standard",
        "isFolder": False,
    }


def child_payload() -> dict[str, Any]:
    return {
        "hideFromMenu": True,
    }


def parent_needs_update(row: dict[str, Any]) -> bool:
    return row["layout_variant"] != "standard" or bool(row["is_folder"])


def child_needs_update(row: dict[str, Any]) -> bool:
    return not row["hide_from_menu"]


def build_plan(pages: list[dict[str, Any]]) -> dict[str, Any]:
    by_key = {(row["locale"], row["slug"]): row for row in pages}
    planned_updates: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []

    for locale in ("el", "ru"):
        parent = by_key.get((locale, PARENT_SLUG))
        if not parent:
            errors.append({"locale": locale, "slug": PARENT_SLUG, "error": "parent page not found"})
            continue
        if not parent_needs_update(parent):
            skipped.append(
                {
                    "documentId": parent["document_id"],
                    "locale": locale,
                    "slug": PARENT_SLUG,
                    "reason": "parent already at target",
                }
            )
        else:
            planned_updates.append(
                {
                    "documentId": parent["document_id"],
                    "locale": locale,
                    "slug": PARENT_SLUG,
                    "hasPublished": bool(parent["has_published"]),
                    "repairKind": "iatreio-parent-standard",
                    "itemCount": 1,
                    "payload": parent_payload(),
                }
            )

        for slug in CHILD_SLUGS:
            child = by_key.get((locale, slug))
            if not child:
                errors.append({"locale": locale, "slug": slug, "error": "child page not found"})
                continue
            if not child_needs_update(child):
                skipped.append(
                    {
                        "documentId": child["document_id"],
                        "locale": locale,
                        "slug": slug,
                        "reason": "child already at target",
                    }
                )
                continue
            planned_updates.append(
                {
                    "documentId": child["document_id"],
                    "locale": locale,
                    "slug": slug,
                    "hasPublished": bool(child["has_published"]),
                    "repairKind": "iatreio-child-hidden-nav",
                    "itemCount": 1,
                    "payload": child_payload(),
                }
            )

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "plannedCount": len(planned_updates),
            "skippedCount": len(skipped),
            "errorCount": len(errors),
        },
        "plannedUpdates": planned_updates,
        "skipped": skipped,
        "errors": errors,
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
            ".tmp/iatreio-hub-mistake-repair-plan.json",
            "--result",
            ".tmp/iatreio-hub-mistake-repair-result.json",
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
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    pages = load_published_pages()
    plan = build_plan(pages)
    args.plan.parent.mkdir(parents=True, exist_ok=True)
    args.plan.write_text(json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    summary = plan["summary"]
    print(
        f"Plan written to {args.plan}: "
        f"{summary['plannedCount']} update(s), "
        f"{summary['skippedCount']} skipped, "
        f"{summary['errorCount']} error(s)."
    )
    for entry in plan["plannedUpdates"]:
        print(f"  - [{entry['locale']}] {entry['slug']} ({entry['repairKind']})")

    if args.apply:
        if summary["plannedCount"] == 0:
            print("Nothing to apply.")
            return 0 if summary["errorCount"] == 0 else 1
        apply_plan(args.plan, args.result)
        print(f"Apply result written to {args.result}")

    return 0 if summary["errorCount"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
