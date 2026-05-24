#!/usr/bin/env python3
"""Rewrite unresolved legacy ``<img src>`` paths in Strapi page HTML fields.

Maps ``files/...`` and ``/webp/{locale}/files/...`` paths through
``asset_map.json`` to canonical ``/uploads/...`` URLs.

Usage:
  python tools/repair_legacy_html_images.py
  python tools/repair_legacy_html_images.py --apply
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import unquote

from bs4 import BeautifulSoup, MarkupResemblesLocatorWarning
import warnings

ROOT = Path(__file__).resolve().parents[1]
ASSET_MAP_PATH = ROOT / "data/source/checkpoints/asset_map.json"
DEFAULT_PLAN_PATH = ROOT / "tools/data/manual-repairs/legacy-html-images-repair-plan.json"
DEFAULT_RESULT_PATH = ROOT / "tools/data/manual-repairs/legacy-html-images-repair-result.json"
STRAPI_PLAN_PATH = ROOT / "backend/.tmp/legacy-html-images-repair-plan.json"
STRAPI_RESULT_PATH = ROOT / "backend/.tmp/legacy-html-images-repair-result.json"
POSTGRES_CONTAINER = "myorl-pg"

PAGE_HTML_FIELDS: tuple[tuple[str, str], ...] = (
    ("content", "content"),
    ("excerpt", "excerpt"),
    ("info_block_bottom", "infoBlockBottom"),
    ("sources", "sources"),
)

WEBP_PREFIX_RE = re.compile(r"^/?webp/(?:ru|el)/(.+\.webp)$", re.IGNORECASE)


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


def load_asset_map() -> dict[str, dict[str, Any]]:
    return json.loads(ASSET_MAP_PATH.read_text(encoding="utf-8"))


def lookup_asset(raw_src: str, asset_map: dict[str, dict[str, Any]]) -> str | None:
    src = unquote(raw_src.strip())
    webp_match = WEBP_PREFIX_RE.match(src)
    if webp_match:
        stem = webp_match.group(1)
        if stem.endswith(".webp"):
            stem = stem[:-5]
        src = unquote(stem)
    candidate = src.lstrip("/")
    for key in (candidate, unquote(candidate)):
        entry = asset_map.get(key)
        if entry and entry.get("url"):
            return str(entry["url"])
    return None


def rewrite_html(raw_html: str, asset_map: dict[str, dict[str, Any]]) -> tuple[str, int]:
    if not raw_html or "<img" not in raw_html.lower():
        return raw_html, 0

    warnings.filterwarnings("ignore", category=MarkupResemblesLocatorWarning)
    soup = BeautifulSoup(raw_html, "html.parser")
    replacements = 0

    for img in soup.find_all("img"):
        src = img.get("src")
        if not isinstance(src, str) or not src.strip():
            continue
        if src.startswith("/uploads/") or src.startswith("http://") or src.startswith("https://"):
            continue
        resolved = lookup_asset(src, asset_map)
        if resolved and resolved != src:
            img["src"] = resolved
            replacements += 1

    return str(soup), replacements


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
          WHERE published_at IS NOT NULL
          ORDER BY locale, slug
        ) t;
        """
    )


def build_plan(pages: list[dict[str, Any]], asset_map: dict[str, dict[str, Any]]) -> dict[str, Any]:
    planned_updates: list[dict[str, Any]] = []
    skipped: list[dict[str, str]] = []

    for page in pages:
        payload: dict[str, str] = {}
        changed_fields: list[str] = []
        replacement_count = 0

        for db_field, api_field in PAGE_HTML_FIELDS:
            rewritten, count = rewrite_html(page.get(db_field), asset_map)
            if count > 0:
                payload[api_field] = rewritten
                changed_fields.append(api_field)
                replacement_count += count

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
                "repairKind": "legacy-html-images",
                "itemCount": replacement_count,
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
            "replacementTotal": sum(entry["itemCount"] for entry in planned_updates),
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
            ".tmp/legacy-html-images-repair-plan.json",
            "--result",
            ".tmp/legacy-html-images-repair-result.json",
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
    asset_map = load_asset_map()
    pages = load_pages()
    plan = build_plan(pages, asset_map)
    args.plan.parent.mkdir(parents=True, exist_ok=True)
    args.plan.write_text(json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    summary = plan["summary"]
    print(
        f"Plan written to {args.plan}: "
        f"{summary['plannedCount']} pages, "
        f"{summary['replacementTotal']} img src rewrite(s)."
    )
    for entry in plan["plannedUpdates"]:
        print(
            f"  - {entry['locale']}/{entry['slug']}: "
            f"{entry['itemCount']} replacement(s) in {', '.join(entry['changedFields'])}"
        )

    if args.apply:
        if summary["plannedCount"] == 0:
            print("Nothing to apply.")
            return 0
        apply_plan(args.plan, args.result)
        print(f"Apply result written to {args.result}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
