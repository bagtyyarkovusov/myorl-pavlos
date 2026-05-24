#!/usr/bin/env python3
"""Generate (and optionally apply) section-hub structural repairs on Postgres Strapi.

Fixes hub folder pages that should use ``section-hub`` + ``isFolder=true``, septum
child navigation fields, and RU folder shells from the blank-pages handoff.

Uses the plan → ``apply-accordion-repair-plan.js`` pipeline (Strapi Documents API).

Usage:
  python tools/repair_section_hub_structure.py
  python tools/repair_section_hub_structure.py --apply
"""

from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PLAN_PATH = ROOT / "tools/data/manual-repairs/section-hub-structure-repair-plan.json"
DEFAULT_RESULT_PATH = ROOT / "tools/data/manual-repairs/section-hub-structure-repair-result.json"
STRAPI_PLAN_PATH = ROOT / "backend/.tmp/section-hub-structure-repair-plan.json"
STRAPI_RESULT_PATH = ROOT / "backend/.tmp/section-hub-structure-repair-result.json"
POSTGRES_CONTAINER = "myorl-pg"

TARGET_HUB_VARIANT = "section-hub"

# From migrate_section_hub.py plus full-handoff RU folder shells.
HUB_TARGETS: tuple[tuple[str, str], ...] = (
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
    ("ru", "iatreio"),
    ("ru", "amygdales-adenoeideis-ekvlastiseis"),
)

SEPTUM_HUB_SLUG = "skoliosi-rinikou-diafragmatos-stravo-dafragma"

SEPTUM_CHILD_MENU_INDEX: dict[str, int] = {
    "eutheiasmos-rinikou-diafragmatos": 0,
    "skoliosi-rinikou-diafragmatos-stravo-diafragma-1": 1,
    "diafragma-me-laser": 2,
    "diafragma-syxnes-erwtiseis-apantiseis": 3,
}

IATREIO_RU_CHILD_MENU_INDEX: dict[str, int] = {
    "iatreio-alexandras": 0,
    "iatreio-koukaki": 1,
}

TARGET_CHILD_LAYOUT = "encyclopedia-article"
TARGET_CHILD_PAGE_TYPE = "content"


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
            p.menu_index,
            p.page_type,
            (p.published_at IS NOT NULL) AS has_published,
            EXISTS (
              SELECT 1 FROM pages_cmps c
              WHERE c.entity_id = p.id
                AND c.component_type = 'sections.linked-resources'
            ) AS has_linked_resources_section
          FROM pages p
          WHERE p.published_at IS NOT NULL
          ORDER BY p.locale, p.slug
        ) t;
        """
    )


def hub_payload(row: dict[str, Any]) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "layoutVariant": TARGET_HUB_VARIANT,
        "isFolder": True,
    }
    if row["slug"] == SEPTUM_HUB_SLUG and row.get("has_linked_resources_section"):
        payload["pageSections"] = []
    return payload


def hub_needs_update(row: dict[str, Any]) -> bool:
    if row["layout_variant"] != TARGET_HUB_VARIANT:
        return True
    if not row["is_folder"]:
        return True
    if row["slug"] == SEPTUM_HUB_SLUG and row.get("has_linked_resources_section"):
        return True
    return False


def child_payload(menu_index: int) -> dict[str, Any]:
    return {
        "hideFromMenu": False,
        "menuIndex": menu_index,
        "layoutVariant": TARGET_CHILD_LAYOUT,
        "pageType": TARGET_CHILD_PAGE_TYPE,
    }


def child_needs_update(row: dict[str, Any], menu_index: int) -> bool:
    if row["hide_from_menu"]:
        return True
    if row["menu_index"] != menu_index:
        return True
    if row["layout_variant"] != TARGET_CHILD_LAYOUT:
        return True
    if row["page_type"] != TARGET_CHILD_PAGE_TYPE:
        return True
    return False


def iatreio_child_payload(menu_index: int) -> dict[str, Any]:
    return {
        "hideFromMenu": False,
        "menuIndex": menu_index,
    }


def iatreio_child_needs_update(row: dict[str, Any], menu_index: int) -> bool:
    if row["hide_from_menu"]:
        return True
    if row["menu_index"] != menu_index:
        return True
    return False


def build_plan(pages: list[dict[str, Any]]) -> dict[str, Any]:
    by_key = {(row["locale"], row["slug"]): row for row in pages}
    planned_updates: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []

    for locale, slug in HUB_TARGETS:
        row = by_key.get((locale, slug))
        if not row:
            errors.append({"locale": locale, "slug": slug, "error": "hub page not found"})
            continue
        if not hub_needs_update(row):
            skipped.append(
                {
                    "documentId": row["document_id"],
                    "locale": locale,
                    "slug": slug,
                    "reason": "hub already at target",
                }
            )
            continue
        planned_updates.append(
            {
                "documentId": row["document_id"],
                "locale": locale,
                "slug": slug,
                "hasPublished": bool(row["has_published"]),
                "repairKind": "section-hub-structure",
                "itemCount": 1,
                "payload": hub_payload(row),
            }
        )

    for locale in ("el", "ru"):
        for slug, menu_index in SEPTUM_CHILD_MENU_INDEX.items():
            row = by_key.get((locale, slug))
            if not row:
                errors.append({"locale": locale, "slug": slug, "error": "septum child not found"})
                continue
            if not child_needs_update(row, menu_index):
                skipped.append(
                    {
                        "documentId": row["document_id"],
                        "locale": locale,
                        "slug": slug,
                        "reason": "septum child already at target",
                    }
                )
                continue
            planned_updates.append(
                {
                    "documentId": row["document_id"],
                    "locale": locale,
                    "slug": slug,
                    "hasPublished": bool(row["has_published"]),
                    "repairKind": "section-hub-child-nav",
                    "itemCount": 1,
                    "payload": child_payload(menu_index),
                }
            )

    for slug, menu_index in IATREIO_RU_CHILD_MENU_INDEX.items():
        row = by_key.get(("ru", slug))
        if not row:
            errors.append({"locale": "ru", "slug": slug, "error": "iatreio child not found"})
            continue
        if not iatreio_child_needs_update(row, menu_index):
            skipped.append(
                {
                    "documentId": row["document_id"],
                    "locale": "ru",
                    "slug": slug,
                    "reason": "iatreio child already at target",
                }
            )
            continue
        planned_updates.append(
            {
                "documentId": row["document_id"],
                "locale": "ru",
                "slug": slug,
                "hasPublished": bool(row["has_published"]),
                "repairKind": "iatreio-child-nav",
                "itemCount": 1,
                "payload": iatreio_child_payload(menu_index),
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
            ".tmp/section-hub-structure-repair-plan.json",
            "--result",
            ".tmp/section-hub-structure-repair-result.json",
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
