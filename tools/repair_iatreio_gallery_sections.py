#!/usr/bin/env python3
"""Attach gallery sections to iatreio clinic child pages.

Populates ``pageSections`` with ``sections.gallery`` items using Strapi file IDs
resolved from ``asset_map.json`` URLs.

Usage:
  python tools/repair_iatreio_gallery_sections.py
  python tools/repair_iatreio_gallery_sections.py --apply
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
ASSET_MAP_PATH = ROOT / "data/source/checkpoints/asset_map.json"
DEFAULT_PLAN_PATH = ROOT / "tools/data/manual-repairs/iatreio-gallery-sections-repair-plan.json"
DEFAULT_RESULT_PATH = ROOT / "tools/data/manual-repairs/iatreio-gallery-sections-repair-result.json"
STRAPI_PLAN_PATH = ROOT / "backend/.tmp/iatreio-gallery-sections-repair-plan.json"
STRAPI_RESULT_PATH = ROOT / "backend/.tmp/iatreio-gallery-sections-repair-result.json"
POSTGRES_CONTAINER = "myorl-pg"

CHILD_SLUGS = ("iatreio-alexandras", "iatreio-koukaki")
LOCALES = ("el", "ru")
MAX_IMAGES_BY_SLUG = {
    "iatreio-alexandras": 7,
    "iatreio-koukaki": 5,
}

FOLDER_BY_SLUG = {
    "iatreio-alexandras": "files/images/iatreio/iatreio-alexandras",
    "iatreio-koukaki": "files/images/iatreio/iatreio-koukaki",
}


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


def load_file_ids_by_url() -> dict[str, int]:
    rows = psql_json(
        """
        SELECT COALESCE(json_object_agg(url, id), '{}'::json)
        FROM files;
        """
    )
    return {url: int(file_id) for url, file_id in rows.items()}


def load_pages() -> list[dict[str, Any]]:
    slug_list = ", ".join(f"'{slug}'" for slug in CHILD_SLUGS)
    return psql_json(
        f"""
        SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
        FROM (
          SELECT
            p.document_id,
            p.locale,
            p.slug,
            (p.published_at IS NOT NULL) AS has_published,
            EXISTS (
              SELECT 1 FROM pages_cmps c
              WHERE c.entity_id = p.id
                AND c.field = 'pageSections'
                AND c.component_type = 'sections.gallery'
            ) AS has_gallery_section
          FROM pages p
          WHERE p.published_at IS NOT NULL
            AND p.slug IN ({slug_list})
          ORDER BY p.locale, p.slug
        ) t;
        """
    )


def sort_key(path: str) -> tuple[int, str]:
    name = Path(path).name.lower()
    img_match = re.match(r"img(\d+)", name)
    if img_match:
        return (0, f"{int(img_match.group(1)):04d}")
    num_match = re.match(r"(\d+)", name)
    if num_match:
        return (1, f"{int(num_match.group(1)):04d}")
    if name.startswith("orl"):
        return (2, name)
    return (3, name)


def gallery_items_for_slug(slug: str, asset_map: dict[str, Any], url_to_id: dict[str, int]) -> list[dict[str, Any]]:
    folder_prefix = FOLDER_BY_SLUG[slug]
    max_images = MAX_IMAGES_BY_SLUG[slug]
    candidates = [
        (key, entry)
        for key, entry in asset_map.items()
        if key.startswith(folder_prefix + "/") and isinstance(entry, dict) and entry.get("url")
    ]
    candidates.sort(key=lambda pair: sort_key(pair[0]))

    items: list[dict[str, Any]] = []
    seen_urls: set[str] = set()
    for _, entry in candidates:
        url = entry["url"]
        if url in seen_urls:
            continue
        file_id = url_to_id.get(url)
        if file_id is None:
            continue
        seen_urls.add(url)
        items.append({"caption": None, "image": file_id})
        if len(items) >= max_images:
            break
    return items


def gallery_payload(slug: str, asset_map: dict[str, Any], url_to_id: dict[str, int]) -> dict[str, Any]:
    items = gallery_items_for_slug(slug, asset_map, url_to_id)
    return {
        "pageSections": [
            {
                "__component": "sections.gallery",
                "heading": None,
                "intro": None,
                "items": items,
            }
        ]
    }


def build_plan(
    pages: list[dict[str, Any]],
    asset_map: dict[str, Any],
    url_to_id: dict[str, int],
    *,
    force: bool = False,
) -> dict[str, Any]:
    by_key = {(row["locale"], row["slug"]): row for row in pages}
    planned_updates: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []

    for locale in LOCALES:
        for slug in CHILD_SLUGS:
            row = by_key.get((locale, slug))
            if not row:
                errors.append({"locale": locale, "slug": slug, "error": "page not found"})
                continue
            if row.get("has_gallery_section") and not force:
                skipped.append(
                    {
                        "documentId": row["document_id"],
                        "locale": locale,
                        "slug": slug,
                        "reason": "gallery section already present",
                    }
                )
                continue

            items = gallery_items_for_slug(slug, asset_map, url_to_id)
            if not items:
                errors.append({"locale": locale, "slug": slug, "error": "no resolvable gallery images"})
                continue

            planned_updates.append(
                {
                    "documentId": row["document_id"],
                    "locale": locale,
                    "slug": slug,
                    "hasPublished": bool(row["has_published"]),
                    "repairKind": "iatreio-gallery-section",
                    "itemCount": len(items),
                    "payload": {
                        "pageSections": [
                            {
                                "__component": "sections.gallery",
                                "heading": None,
                                "intro": None,
                                "items": items,
                            }
                        ]
                    },
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
            ".tmp/iatreio-gallery-sections-repair-plan.json",
            "--result",
            ".tmp/iatreio-gallery-sections-repair-result.json",
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
    parser.add_argument(
        "--force",
        action="store_true",
        help="Rebuild gallery sections even when one already exists (e.g. to add more images).",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    asset_map = json.loads(ASSET_MAP_PATH.read_text(encoding="utf-8"))
    url_to_id = load_file_ids_by_url()
    pages = load_pages()
    plan = build_plan(pages, asset_map, url_to_id, force=args.force)

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
        print(f"  - [{entry['locale']}] {entry['slug']} ({entry['itemCount']} images)")

    if args.apply:
        if summary["plannedCount"] == 0:
            print("Nothing to apply.")
            return 0 if summary["errorCount"] == 0 else 1
        apply_plan(args.plan, args.result)
        print(f"Apply result written to {args.result}")

    return 0 if summary["errorCount"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
