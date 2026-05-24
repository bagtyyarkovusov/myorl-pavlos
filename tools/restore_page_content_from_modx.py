#!/usr/bin/env python3
"""Restore missing page HTML from MODX flat export into Strapi (content-only).

Reads ``data/source/modx/published_resources_flat.json`` and updates only scalar
HTML fields (``content``, ``excerpt``) via the Strapi Documents API apply script.

Usage:
  python tools/restore_page_content_from_modx.py
  python tools/restore_page_content_from_modx.py --apply
  python tools/restore_page_content_from_modx.py --slugs eutheiasmos-rinikou-diafragmatos
"""

from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
MODX_FLAT_PATH = ROOT / "data/source/modx/published_resources_flat.json"
DEFAULT_PLAN_PATH = ROOT / "tools/data/manual-repairs/modx-content-restore-plan.json"
DEFAULT_RESULT_PATH = ROOT / "tools/data/manual-repairs/modx-content-restore-result.json"
STRAPI_PLAN_PATH = ROOT / "backend/.tmp/modx-content-restore-plan.json"
STRAPI_RESULT_PATH = ROOT / "backend/.tmp/modx-content-restore-result.json"
POSTGRES_CONTAINER = "myorl-pg"

CONTEXT_TO_LOCALE = {"web": "el", "rus": "ru"}
LOCALES = ("el", "ru")

DEFAULT_TARGET_SLUGS: tuple[str, ...] = (
    "eutheiasmos-rinikou-diafragmatos",
    "skoliosi-rinikou-diafragmatos-stravo-diafragma-1",
    "diafragma-me-laser",
    "diafragma-syxnes-erwtiseis-apantiseis",
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


def load_modx_by_alias() -> dict[tuple[str, str], dict[str, Any]]:
    if not MODX_FLAT_PATH.is_file():
        raise FileNotFoundError(f"MODX flat export not found: {MODX_FLAT_PATH}")
    resources = json.loads(MODX_FLAT_PATH.read_text(encoding="utf-8"))
    index: dict[tuple[str, str], dict[str, Any]] = {}
    for resource in resources:
        if not isinstance(resource, dict):
            continue
        alias = resource.get("alias")
        context = resource.get("context_key")
        if not alias or context not in CONTEXT_TO_LOCALE:
            continue
        locale = CONTEXT_TO_LOCALE[context]
        index[(locale, str(alias))] = resource
    return index


def load_strapi_pages(slugs: tuple[str, ...]) -> list[dict[str, Any]]:
    slug_list = ", ".join(f"'{slug.replace(chr(39), chr(39)+chr(39))}'" for slug in slugs)
    return psql_json(
        f"""
        SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
        FROM (
          SELECT
            document_id,
            locale,
            slug,
            (published_at IS NOT NULL) AS has_published,
            length(coalesce(content, '')) AS content_len,
            length(coalesce(excerpt, '')) AS excerpt_len
          FROM pages
          WHERE published_at IS NOT NULL
            AND slug IN ({slug_list})
          ORDER BY locale, slug
        ) t;
        """
    )


def build_payload(resource: dict[str, Any]) -> dict[str, str]:
    payload: dict[str, str] = {}
    content = resource.get("content") or ""
    if content.strip():
        payload["content"] = content
    introtext = resource.get("introtext") or ""
    if introtext.strip():
        payload["excerpt"] = introtext.strip()
    return payload


def build_plan(
    *,
    target_slugs: tuple[str, ...],
    only_empty: bool,
) -> dict[str, Any]:
    modx_index = load_modx_by_alias()
    pages = load_strapi_pages(target_slugs)
    planned_updates: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []

    for row in pages:
        locale = row["locale"]
        slug = row["slug"]
        key = (locale, slug)
        resource = modx_index.get(key)
        if not resource:
            errors.append({"locale": locale, "slug": slug, "error": "MODX resource not found"})
            continue

        payload = build_payload(resource)
        if not payload.get("content"):
            errors.append({"locale": locale, "slug": slug, "error": "MODX content empty"})
            continue

        if only_empty and row["content_len"] > 0:
            skipped.append(
                {
                    "documentId": row["document_id"],
                    "locale": locale,
                    "slug": slug,
                    "reason": "Strapi content already populated",
                }
            )
            continue

        planned_updates.append(
            {
                "documentId": row["document_id"],
                "locale": locale,
                "slug": slug,
                "hasPublished": bool(row["has_published"]),
                "repairKind": "modx-content-restore",
                "itemCount": len(payload["content"]),
                "modxContentLen": len(payload["content"]),
                "payload": payload,
            }
        )

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "targetSlugCount": len(target_slugs),
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
            ".tmp/modx-content-restore-plan.json",
            "--result",
            ".tmp/modx-content-restore-result.json",
            "--sleep-ms",
            "100",
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
        "--slugs",
        nargs="*",
        default=list(DEFAULT_TARGET_SLUGS),
        help="Page slugs to restore (default: septum children)",
    )
    parser.add_argument(
        "--include-non-empty",
        action="store_true",
        help="Overwrite Strapi content even when already populated",
    )
    parser.add_argument("--plan", type=Path, default=DEFAULT_PLAN_PATH)
    parser.add_argument("--result", type=Path, default=DEFAULT_RESULT_PATH)
    parser.add_argument("--apply", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    target_slugs = tuple(dict.fromkeys(args.slugs))
    plan = build_plan(target_slugs=target_slugs, only_empty=not args.include_non_empty)
    args.plan.parent.mkdir(parents=True, exist_ok=True)
    args.plan.write_text(json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    summary = plan["summary"]
    print(
        f"Plan written to {args.plan}: "
        f"{summary['plannedCount']} restore(s), "
        f"{summary['skippedCount']} skipped, "
        f"{summary['errorCount']} error(s)."
    )
    for entry in plan["plannedUpdates"]:
        print(
            f"  - [{entry['locale']}] {entry['slug']}: "
            f"{entry['modxContentLen']} chars from MODX"
        )

    if args.apply:
        if summary["plannedCount"] == 0:
            print("Nothing to apply.")
            return 0 if summary["errorCount"] == 0 else 1
        apply_plan(args.plan, args.result)
        print(f"Apply result written to {args.result}")

    return 0 if summary["errorCount"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
