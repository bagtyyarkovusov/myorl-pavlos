#!/usr/bin/env python3
"""Audit published pages with empty reader-visible body content.

Baseline classifier for blank-page repair regressions. Writes JSON summary to
``tools/data/manual-repairs/blank-pages-audit.json`` by default.

Usage:
  python tools/audit_blank_pages.py
"""

from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "tools/data/manual-repairs/blank-pages-audit.json"
POSTGRES_CONTAINER = "myorl-pg"

# Layouts where empty content is expected for folder/index shells.
INTENTIONAL_EMPTY_LAYOUTS = frozenset(
    {
        "section-hub",
        "section-index",
        "clinic-index",
        "encyclopedia-index",
        "video-index",
        "contact",
        "sitemap",
        "appointment-form",
        "frontend-native",
    }
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
            p.document_id,
            p.locale,
            p.slug,
            p.title,
            p.layout_variant,
            p.page_type,
            p.is_folder,
            length(coalesce(p.content, '')) AS content_len,
            EXISTS (
              SELECT 1 FROM pages_cmps c WHERE c.entity_id = p.id
            ) AS has_page_sections,
            hub.slug AS parent_slug
          FROM pages p
          LEFT JOIN pages_parent_page_lnk l ON l.page_id = p.id
          LEFT JOIN pages hub ON hub.id = l.inv_page_id
          WHERE p.published_at IS NOT NULL
          ORDER BY p.locale, p.slug
        ) t;
        """
    )


def classify(pages: list[dict[str, Any]]) -> dict[str, Any]:
    zero_visible: list[dict[str, Any]] = []
    empty_content: list[dict[str, Any]] = []

    for page in pages:
        content_len = int(page["content_len"])
        layout = page.get("layout_variant") or ""
        has_sections = bool(page.get("has_page_sections"))

        if content_len == 0:
            empty_content.append(page)

        if content_len == 0 and not has_sections:
            if layout in INTENTIONAL_EMPTY_LAYOUTS:
                continue
            if page.get("is_folder") and layout in {"", "specialized-article", "service-article", "standard"}:
                bucket = "hub_shell"
            else:
                bucket = "blank_leaf"
            zero_visible.append(
                {
                    "documentId": page["document_id"],
                    "locale": page["locale"],
                    "slug": page["slug"],
                    "title": page["title"],
                    "layoutVariant": layout or None,
                    "pageType": page.get("page_type"),
                    "parentSlug": page.get("parent_slug"),
                    "bucket": bucket,
                }
            )

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "publishedPageCount": len(pages),
        "summary": {
            "emptyContentCount": len(empty_content),
            "zeroVisibleTextCount": len(zero_visible),
            "hubShellCount": sum(1 for row in zero_visible if row["bucket"] == "hub_shell"),
            "blankLeafCount": sum(1 for row in zero_visible if row["bucket"] == "blank_leaf"),
        },
        "zeroVisibleText": zero_visible,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    report = classify(load_pages())
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    summary = report["summary"]
    print(f"Audit written to {args.output}")
    print(
        f"  published={report['publishedPageCount']} "
        f"zeroVisibleText={summary['zeroVisibleTextCount']} "
        f"(hubShell={summary['hubShellCount']}, blankLeaf={summary['blankLeafCount']})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
