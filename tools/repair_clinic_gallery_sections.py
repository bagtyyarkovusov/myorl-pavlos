#!/usr/bin/env python3
"""Attach gallery sections to cooperating-clinic pages (klinikes children).

Restores the legacy MODX ``migxGallery`` photo sets as Strapi ``sections.gallery``
blocks on ``clinic-gallery`` pages (EL + RU). Image order and selection follow the
legacy gallery; files are resolved through ``asset_map.json`` to the current DB
file IDs. Applies via the generic ``apply-accordion-repair-plan.js`` script.

Only pages whose ``pageSections`` are empty are touched (unless ``--force``), so
no existing section content is ever overwritten.

Usage:
  python tools/repair_clinic_gallery_sections.py            # dry-run, writes plan
  python tools/repair_clinic_gallery_sections.py --apply    # apply to dev DB
  python tools/repair_clinic_gallery_sections.py --apply --force
"""

from __future__ import annotations

import argparse
import json
import subprocess
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
ASSET_MAP_PATH = ROOT / "data/source/checkpoints/asset_map.json"
TRANSFORMED_PATH = ROOT / "data/source/modx/transformed_resources.json"
DEFAULT_PLAN_PATH = ROOT / "tools/data/manual-repairs/clinic-gallery-sections-repair-plan.json"
DEFAULT_RESULT_PATH = ROOT / "tools/data/manual-repairs/clinic-gallery-sections-repair-result.json"
STRAPI_PLAN_PATH = ROOT / "backend/.tmp/clinic-gallery-sections-repair-plan.json"
STRAPI_RESULT_PATH = ROOT / "backend/.tmp/clinic-gallery-sections-repair-result.json"
POSTGRES_CONTAINER = "myorl-pg"

# Legacy MODX clinic galleries hold up to ~6 photos; cap defensively.
MAX_IMAGES = 12
# The EL cooperating-clinics index resource id in the legacy tree; its children
# carry the canonical galleries (RU mirrors reuse the same photos).
EL_CLINIC_INDEX_PARENT = 77


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
    rows = psql_json("SELECT COALESCE(json_object_agg(url, id), '{}'::json) FROM files;")
    return {url: int(file_id) for url, file_id in rows.items()}


def load_clinic_pages() -> list[dict[str, Any]]:
    return psql_json(
        """
        SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
        FROM (
          SELECT
            p.document_id,
            p.locale,
            p.slug,
            (p.published_at IS NOT NULL) AS has_published,
            (
              SELECT count(*) FROM pages_cmps c
              WHERE c.entity_id = p.id AND c.field = 'pageSections'
            ) AS section_count,
            EXISTS (
              SELECT 1 FROM pages_cmps c
              WHERE c.entity_id = p.id
                AND c.field = 'pageSections'
                AND c.component_type = 'sections.gallery'
            ) AS has_gallery_section
          FROM pages p
          WHERE p.published_at IS NOT NULL
            AND p.layout_variant = 'clinic-gallery'
          ORDER BY p.locale, p.slug
        ) t;
        """
    )


def build_migx_by_slug() -> dict[str, list[str]]:
    raw = json.loads(TRANSFORMED_PATH.read_text(encoding="utf-8"))
    rows = raw if isinstance(raw, list) else (raw.get("resources") or raw.get("data") or [])
    by_slug: dict[str, list[str]] = {}
    for row in rows:
        alias = row.get("alias")
        gallery = (row.get("template_variables") or {}).get("migxGallery")
        if not alias or not gallery:
            continue
        try:
            items = json.loads(gallery) if isinstance(gallery, str) else gallery
        except (json.JSONDecodeError, TypeError):
            continue
        images = [it.get("image") for it in items if isinstance(it, dict) and it.get("image")]
        if not images:
            continue
        # Prefer the canonical EL clinic-index children; otherwise first seen.
        if alias not in by_slug or row.get("parent") == EL_CLINIC_INDEX_PARENT:
            by_slug[alias] = images
    return by_slug


def resolve_file_id(path: str, asset_map: dict[str, Any], url_to_id: dict[str, int]) -> int | None:
    for key in (path, path.replace(" ", "%20"), urllib.parse.quote(path)):
        entry = asset_map.get(key)
        if isinstance(entry, dict) and entry.get("url"):
            file_id = url_to_id.get(entry["url"])
            if file_id is not None:
                return file_id
    return None


def gallery_items(
    slug: str,
    migx_by_slug: dict[str, list[str]],
    asset_map: dict[str, Any],
    url_to_id: dict[str, int],
) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    seen: set[int] = set()
    for path in migx_by_slug.get(slug, []):
        file_id = resolve_file_id(path, asset_map, url_to_id)
        if file_id is None or file_id in seen:
            continue
        seen.add(file_id)
        items.append({"caption": None, "image": file_id})
        if len(items) >= MAX_IMAGES:
            break
    return items


def build_plan(
    pages: list[dict[str, Any]],
    migx_by_slug: dict[str, list[str]],
    asset_map: dict[str, Any],
    url_to_id: dict[str, int],
    *,
    force: bool = False,
) -> dict[str, Any]:
    planned_updates: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []

    for row in pages:
        locale, slug = row["locale"], row["slug"]
        ref = {"documentId": row["document_id"], "locale": locale, "slug": slug}

        if row.get("has_gallery_section") and not force:
            skipped.append({**ref, "reason": "gallery section already present"})
            continue
        # Safety: never overwrite a page that already carries other sections.
        if int(row.get("section_count") or 0) > 0 and not force:
            skipped.append({**ref, "reason": "page already has non-empty pageSections"})
            continue

        items = gallery_items(slug, migx_by_slug, asset_map, url_to_id)
        if not items:
            errors.append({**ref, "error": "no resolvable gallery images"})
            continue

        planned_updates.append(
            {
                **ref,
                "hasPublished": bool(row["has_published"]),
                "repairKind": "clinic-gallery-section",
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
            ".tmp/clinic-gallery-sections-repair-plan.json",
            "--result",
            ".tmp/clinic-gallery-sections-repair-result.json",
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
        help="Rebuild gallery sections even when one already exists / sections are present.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    asset_map = json.loads(ASSET_MAP_PATH.read_text(encoding="utf-8"))
    url_to_id = load_file_ids_by_url()
    migx_by_slug = build_migx_by_slug()
    pages = load_clinic_pages()
    plan = build_plan(pages, migx_by_slug, asset_map, url_to_id, force=args.force)

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
        print(f"  + [{entry['locale']}] {entry['slug']} ({entry['itemCount']} images)")
    for entry in plan["skipped"]:
        print(f"  = [{entry['locale']}] {entry['slug']} skipped: {entry['reason']}")
    for entry in plan["errors"]:
        print(f"  ! [{entry['locale']}] {entry['slug']} error: {entry['error']}")

    if args.apply:
        if summary["plannedCount"] == 0:
            print("Nothing to apply.")
            return 0 if summary["errorCount"] == 0 else 1
        apply_plan(args.plan, args.result)
        print(f"Apply result written to {args.result}")

    return 0 if summary["errorCount"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
