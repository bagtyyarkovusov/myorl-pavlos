#!/usr/bin/env python3
"""Audit published pages for remaining legacy MODX HTML patterns.

Writes JSON summary to ``tools/data/manual-repairs/legacy-cms-markup-audit.json``.

Usage:
  python3 tools/audit_legacy_cms_markup.py
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

from cms_html_cleanup import count_legacy_markup_issues  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "tools/data/manual-repairs/legacy-cms-markup-audit.json"
POSTGRES_CONTAINER = "myorl-pg"

PAGE_HTML_FIELDS: tuple[str, ...] = ("content", "excerpt", "info_block_bottom", "sources")
ISSUE_KEYS = (
    "tab_content_wrapper",
    "inline_style",
    "align_attr",
    "file_or_msohtmlclip",
    "legacy_video",
    "fixed_dimension_img",
    "fixed_dimension_iframe",
    "empty_paragraphs",
    "prose_pre",
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


def audit_pages(pages: list[dict[str, Any]]) -> dict[str, Any]:
    totals = {key: 0 for key in ISSUE_KEYS}
    flagged: list[dict[str, Any]] = []

    for page in pages:
        page_issues = {key: 0 for key in ISSUE_KEYS}
        field_hits: dict[str, dict[str, int]] = {}

        for field in PAGE_HTML_FIELDS:
            raw = page.get(field)
            if not raw or not isinstance(raw, str):
                continue
            counts = count_legacy_markup_issues(raw)
            if not any(counts.values()):
                continue
            field_hits[field] = counts
            for key, value in counts.items():
                page_issues[key] += value
                totals[key] += value

        if not any(page_issues.values()):
            continue

        flagged.append(
            {
                "documentId": page["document_id"],
                "locale": page["locale"],
                "slug": page["slug"],
                "issues": page_issues,
                "fields": field_hits,
            }
        )

    flagged.sort(key=lambda row: (-sum(row["issues"].values()), row["locale"], row["slug"]))

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "pageCount": len(pages),
            "flaggedPageCount": len(flagged),
            "issueTotals": totals,
        },
        "flaggedPages": flagged,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    pages = load_pages()
    report = audit_pages(pages)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    summary = report["summary"]
    print(
        f"Audit written to {args.output}: "
        f"{summary['flaggedPageCount']}/{summary['pageCount']} pages flagged."
    )
    for key, value in summary["issueTotals"].items():
        if value:
            print(f"  {key}: {value}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
