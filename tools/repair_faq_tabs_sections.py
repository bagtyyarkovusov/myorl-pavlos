#!/usr/bin/env python3
"""Restore missing FAQ sections, tabs sections, and amygdales article content.

The MODX → Strapi migration typed these pages correctly but never populated
pageSections (FAQ/tabs) or page.content (amygdales hub article). Scrapes legacy
myorl.gr HTML and applies updates through the Strapi documents API.

Usage:
  python tools/repair_faq_tabs_sections.py
  python tools/repair_faq_tabs_sections.py --apply
"""

from __future__ import annotations

import argparse
import html as htmlmod
import json
import re
import subprocess
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PLAN_PATH = ROOT / "tools/data/manual-repairs/faq-tabs-section-repair-plan.json"
DEFAULT_RESULT_PATH = ROOT / "tools/data/manual-repairs/faq-tabs-section-repair-result.json"
STRAPI_PLAN_PATH = ROOT / "backend/.tmp/faq-tabs-section-repair-plan.json"
STRAPI_RESULT_PATH = ROOT / "backend/.tmp/faq-tabs-section-repair-result.json"
APPLY_SCRIPT_PATH = ROOT / "backend/scripts/apply-accordion-repair-plan.js"
LEGACY_BASE = "https://myorl.gr"
SKIP_SLUGS = frozenset({"ru-page"})
AMYGDALES_SLUG = "amygdales-adenoeideis-ekvlastiseis"
BOTULIN_SLUG = "botulinotherapia-ru"

FAQ_ITEM_RE = re.compile(
    r'<div class="faq__item">\s*<h3 class="faq__question">(.*?)</h3>\s*<div class="faq__answer">(.*?)</div>\s*</div>',
    re.IGNORECASE | re.DOTALL,
)
ARTICLE_RE = re.compile(
    r'<article class="content span12">(.*?)</article>',
    re.IGNORECASE | re.DOTALL,
)
TAB_TITLE_RE = re.compile(
    r'<a[^>]*data-toggle="tab"[^>]*tabid="(\d+)"[^>]*>(.*?)</a>',
    re.IGNORECASE | re.DOTALL,
)
TAB_PANE_RE = re.compile(
    r'<div class="tab-pane[^"]*" id="tab(\d+)">(.*?)(?=<div class="tab-pane|<div class="space|<footer|$)',
    re.IGNORECASE | re.DOTALL,
)


@dataclass(frozen=True)
class RepairPage:
    document_id: str
    locale: str
    slug: str
    page_type: str
    has_published: bool
    content_length: int


def psql(query: str) -> str:
    return subprocess.check_output(
        [
            "docker",
            "exec",
            "myorl-pg",
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


def load_repair_pages() -> list[RepairPage]:
    rows = psql(
        """
        select
          document_id,
          locale,
          slug,
          page_type,
          bool_or(published_at is not null),
          max(length(coalesce(content, '')))
        from pages
        where page_type in ('faq', 'tabs')
        group by document_id, locale, slug, page_type
        order by page_type, slug, locale
        """
    )
    pages: list[RepairPage] = []
    for row in rows.splitlines():
        if not row.strip():
            continue
        document_id, locale, slug, page_type, has_published, content_length = row.split("|", 5)
        pages.append(
            RepairPage(
                document_id=document_id,
                locale=locale,
                slug=slug,
                page_type=page_type,
                has_published=has_published == "t",
                content_length=int(content_length or 0),
            )
        )
    return pages


def legacy_url(page: RepairPage) -> str:
    if page.locale == "ru":
        return f"{LEGACY_BASE}/ru/{page.slug}"
    return f"{LEGACY_BASE}/{page.slug}"


def fetch_html(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": "myorl-faq-tabs-repair/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8", "replace")


def strip_font_tags(raw_html: str) -> str:
    body = raw_html.strip()
    body = re.sub(r"<font[^>]*>", "", body, flags=re.IGNORECASE)
    body = re.sub(r"</font>", "", body, flags=re.IGNORECASE)
    return body.strip()


def clean_plain_text(raw_html: str) -> str:
    text = re.sub(r"<[^>]+>", "", raw_html)
    return htmlmod.unescape(re.sub(r"\s+", " ", text)).strip()


def scrape_faq_items(url: str) -> list[dict[str, str]]:
    html = fetch_html(url)
    items: list[dict[str, str]] = []
    for question_html, answer_html in FAQ_ITEM_RE.findall(html):
        question = clean_plain_text(question_html)
        answer = strip_font_tags(answer_html)
        if not question and not answer:
            continue
        items.append({"question": question, "answer": answer})
    return items


def scrape_tab_items(url: str) -> list[dict[str, str | None]]:
    html = fetch_html(url)
    panes = {tab_id: strip_font_tags(body) for tab_id, body in TAB_PANE_RE.findall(html)}

    items: list[dict[str, str | None]] = []
    seen: set[str] = set()
    for tab_id, title_html in TAB_TITLE_RE.findall(html):
        if tab_id in seen:
            continue
        seen.add(tab_id)
        title = clean_plain_text(title_html)
        content = panes.get(tab_id, "")
        if not title and not content:
            continue
        items.append({"title": title, "content": content, "link": None})
    return items


def scrape_article_content(url: str) -> str:
    html = fetch_html(url)
    match = ARTICLE_RE.search(html)
    if not match:
        return ""
    return strip_font_tags(match.group(1))


def build_payload(page: RepairPage, url: str) -> tuple[dict[str, object], int, str]:
    if page.page_type == "faq":
        items = scrape_faq_items(url)
        if not items:
            raise ValueError("no FAQ items found")
        return (
            {
                "pageSections": [
                    {
                        "__component": "sections.faq",
                        "heading": None,
                        "intro": None,
                        "items": items,
                    }
                ]
            },
            len(items),
            "faq-section",
        )

    if page.slug == AMYGDALES_SLUG:
        content = scrape_article_content(url)
        if not content:
            raise ValueError("no article content found")
        return ({"content": content}, 0, "article-content")

    if page.slug == BOTULIN_SLUG:
        items = scrape_tab_items(url)
        if not items:
            raise ValueError("no tab items found")
        return (
            {
                "pageSections": [
                    {
                        "__component": "sections.tabs",
                        "heading": None,
                        "intro": None,
                        "items": items,
                    }
                ]
            },
            len(items),
            "tabs-section",
        )

    raise ValueError(f"unsupported tabs page: {page.slug}")


def build_plan(pages: list[RepairPage]) -> dict[str, object]:
    planned_updates: list[dict[str, object]] = []
    skipped: list[dict[str, str]] = []
    errors: list[dict[str, str]] = []

    for page in pages:
        if page.slug in SKIP_SLUGS:
            skipped.append(
                {
                    "documentId": page.document_id,
                    "locale": page.locale,
                    "slug": page.slug,
                    "reason": "content already present; skipped by policy",
                }
            )
            continue

        url = legacy_url(page)
        try:
            payload, item_count, repair_kind = build_payload(page, url)
        except urllib.error.HTTPError as exc:
            errors.append(
                {
                    "documentId": page.document_id,
                    "locale": page.locale,
                    "slug": page.slug,
                    "url": url,
                    "error": f"HTTP {exc.code}",
                }
            )
            continue
        except Exception as exc:  # noqa: BLE001 - collect per-page failures
            errors.append(
                {
                    "documentId": page.document_id,
                    "locale": page.locale,
                    "slug": page.slug,
                    "url": url,
                    "error": str(exc),
                }
            )
            continue

        planned_updates.append(
            {
                "documentId": page.document_id,
                "locale": page.locale,
                "slug": page.slug,
                "legacyUrl": url,
                "hasPublished": page.has_published,
                "repairKind": repair_kind,
                "itemCount": item_count,
                "payload": payload,
            }
        )

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "pageCount": len(pages),
            "plannedCount": len(planned_updates),
            "skippedCount": len(skipped),
            "errorCount": len(errors),
            "faqItemTotal": sum(
                entry["itemCount"]
                for entry in planned_updates
                if entry["repairKind"] == "faq-section"
            ),
            "tabItemTotal": sum(
                entry["itemCount"]
                for entry in planned_updates
                if entry["repairKind"] == "tabs-section"
            ),
            "contentRepairCount": sum(
                1 for entry in planned_updates if entry["repairKind"] == "article-content"
            ),
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
            ".tmp/faq-tabs-section-repair-plan.json",
            "--result",
            ".tmp/faq-tabs-section-repair-result.json",
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
    plan = build_plan(load_repair_pages())

    args.plan.parent.mkdir(parents=True, exist_ok=True)
    args.plan.write_text(json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    summary = plan["summary"]
    print(
        f"Plan written to {args.plan}: "
        f"{summary['plannedCount']} pages "
        f"({summary['faqItemTotal']} FAQ items, "
        f"{summary['tabItemTotal']} tab items, "
        f"{summary['contentRepairCount']} content repairs; "
        f"{summary['errorCount']} errors, {summary['skippedCount']} skipped)"
    )

    if summary["errorCount"]:
        for entry in plan["errors"]:
            print(f"  error  {entry['locale']}/{entry['slug']}: {entry['error']}")

    if args.apply:
        if not APPLY_SCRIPT_PATH.exists():
            print(f"Missing apply script: {APPLY_SCRIPT_PATH}", file=sys.stderr)
            return 1
        apply_plan(args.plan, args.result)
        print(f"Apply result written to {args.result}")

    return 1 if summary["errorCount"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
