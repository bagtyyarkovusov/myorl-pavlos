#!/usr/bin/env python3
"""Restore missing sections.accordion content for accordion page types.

The MODX → Strapi migration classified these pages correctly
(pageType=accordion, layoutVariant=service-accordion) but never populated
pageSections. This script scrapes the legacy myorl.gr accordion panels and
writes a Strapi document update plan, then optionally applies it through the
backend Strapi bootstrap (same pattern as apply-page-model-plan.js).

Usage:
  python tools/repair_accordion_sections.py --dry-run
  python tools/repair_accordion_sections.py --apply
  python tools/repair_accordion_sections.py --rewrite-existing --apply
"""

from __future__ import annotations

import argparse
import html as htmlmod
import json
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
import warnings
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from bs4 import BeautifulSoup, MarkupResemblesLocatorWarning

from cms_html_cleanup import remove_broken_images

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PLAN_PATH = ROOT / "tools/data/manual-repairs/accordion-section-repair-plan.json"
DEFAULT_RESULT_PATH = ROOT / "tools/data/manual-repairs/accordion-section-repair-result.json"
ASSET_MAP_PATH = ROOT / "data/source/checkpoints/asset_map.json"
STRAPI_PLAN_PATH = ROOT / "backend/.tmp/accordion-section-repair-plan.json"
STRAPI_RESULT_PATH = ROOT / "backend/.tmp/accordion-section-repair-result.json"
APPLY_SCRIPT_PATH = ROOT / "backend/scripts/apply-accordion-repair-plan.js"
LEGACY_BASE = "https://myorl.gr"
POSTGRES_CONTAINER = "myorl-pg"
ACCORDION_GROUP_RE = re.compile(
    r'<div class="accordion-group">.*?<a class="accordion-toggle"[^>]*>(.*?)</a>.*?'
    r'<div class="accordion-inner">(.*?)</div>\s*</div>\s*</div>',
    re.IGNORECASE | re.DOTALL,
)
WEBP_ASSET_RE = re.compile(r"^/?webp/(?:ru/)?(files/.+)\.webp$", re.IGNORECASE)


@dataclass(frozen=True)
class AccordionPage:
    document_id: str
    locale: str
    slug: str
    has_published: bool


def psql(query: str) -> str:
    return subprocess.check_output(
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


def load_asset_map() -> dict[str, dict[str, Any]]:
    return json.loads(ASSET_MAP_PATH.read_text(encoding="utf-8"))


def normalize_legacy_asset_path(raw_val: str) -> str:
    """Map legacy MODX media URLs to ``asset_map`` keys under ``files/``."""

    val = raw_val.strip()
    if not val:
        return val

    decoded = urllib.parse.unquote(val)
    for candidate in (decoded, val):
        clean = candidate.lstrip("/")
        webp_match = WEBP_ASSET_RE.match("/" + clean if not clean.startswith("/") else clean)
        if webp_match:
            return webp_match.group(1)
        if clean.startswith("webp/"):
            rest = clean[5:]
            if rest.startswith("ru/"):
                rest = rest[3:]
            if rest.endswith(".webp"):
                rest = rest[:-5]
            if rest.startswith("files/"):
                return rest
        if clean.startswith("files/") or clean.startswith("uploads/"):
            return clean

    parsed = urllib.parse.urlparse("https:" + val if val.startswith("//") else val)
    if parsed.scheme in ("http", "https") and parsed.path:
        return normalize_legacy_asset_path(parsed.path)

    return decoded.lstrip("/")


def lookup_asset_url(raw_val: str, asset_map: dict[str, dict[str, Any]]) -> str | None:
    normalized = normalize_legacy_asset_path(raw_val)
    candidates = [
        normalized,
        urllib.parse.unquote(normalized),
        urllib.parse.quote(normalized, safe="/"),
        urllib.parse.quote(urllib.parse.unquote(normalized), safe="/"),
    ]
    seen: set[str] = set()
    for candidate in candidates:
        if not candidate or candidate in seen:
            continue
        seen.add(candidate)
        entry = asset_map.get(candidate)
        if isinstance(entry, dict) and isinstance(entry.get("url"), str):
            return entry["url"]
    return None


def modernize_html(raw_html: str, asset_map: dict[str, dict[str, Any]]) -> str:
    """Rewrite legacy media URLs to Strapi ``/uploads/`` paths (migration parity)."""

    if not raw_html or not isinstance(raw_html, str) or "<" not in raw_html:
        return raw_html or ""

    warnings.filterwarnings("ignore", category=MarkupResemblesLocatorWarning)
    soup = BeautifulSoup(raw_html, "html.parser")
    resolved_urls = {
        info["url"]
        for info in asset_map.values()
        if isinstance(info, dict) and isinstance(info.get("url"), str)
    }

    for tag in soup.find_all(True):
        for attr in ("src", "href"):
            val = tag.get(attr)
            if not isinstance(val, str) or not val.strip():
                continue
            rewritten = lookup_asset_url(val, asset_map)
            if rewritten:
                tag[attr] = rewritten

    for img in list(soup.find_all("img")):
        src = img.get("src") or ""
        if src in resolved_urls:
            continue
        candidate = normalize_legacy_asset_path(src)
        if candidate.startswith("files/") or candidate.startswith("uploads/"):
            parent = img.parent
            img.decompose()
            if (
                parent is not None
                and parent.name == "a"
                and not parent.get_text(strip=True)
                and not parent.find_all(["img", "picture", "svg"])
            ):
                parent.decompose()

    return remove_broken_images(str(soup))


def modernize_items(items: list[dict[str, str]], asset_map: dict[str, dict[str, Any]]) -> list[dict[str, str]]:
    return [
        {
            "title": item["title"],
            "content": modernize_html(item.get("content", ""), asset_map),
        }
        for item in items
    ]


def rewrite_plan_assets(plan: dict[str, Any], asset_map: dict[str, dict[str, Any]]) -> dict[str, Any]:
    rewrite_count = 0
    orphan_count = 0

    for entry in plan.get("plannedUpdates", []):
        payload = entry.get("payload") or {}
        sections = payload.get("pageSections") or []
        if not sections:
            continue
        items = sections[0].get("items") or []
        before = json.dumps(items, ensure_ascii=False)
        modernized = modernize_items(items, asset_map)
        after = json.dumps(modernized, ensure_ascii=False)
        rewrite_count += before.count("/webp/") - after.count("/webp/")
        orphan_count += before.count("<img") - after.count("<img")
        sections[0]["items"] = modernized

    summary = plan.setdefault("summary", {})
    summary["assetRewriteCount"] = rewrite_count
    summary["orphanImageDropCount"] = orphan_count
    return plan


def load_accordion_pages() -> list[AccordionPage]:
    rows = psql(
        """
        select document_id, locale, slug, bool_or(published_at is not null)
        from pages
        where page_type = 'accordion'
        group by document_id, locale, slug
        order by slug, locale
        """
    )
    pages: list[AccordionPage] = []
    for row in rows.splitlines():
        if not row.strip():
            continue
        document_id, locale, slug, has_published = row.split("|", 3)
        pages.append(
            AccordionPage(
                document_id=document_id,
                locale=locale,
                slug=slug,
                has_published=has_published == "t",
            )
        )
    return pages


def legacy_url(page: AccordionPage) -> str:
    if page.locale == "ru":
        return f"{LEGACY_BASE}/ru/{page.slug}"
    return f"{LEGACY_BASE}/{page.slug}"


def clean_title(raw_html: str) -> str:
    title = re.sub(r"<[^>]+>", "", raw_html)
    return htmlmod.unescape(re.sub(r"\s+", " ", title)).strip()


def clean_body(raw_html: str, asset_map: dict[str, dict[str, Any]]) -> str:
    body = raw_html.strip()
    body = re.sub(r"<font[^>]*>", "", body, flags=re.IGNORECASE)
    body = re.sub(r"</font>", "", body, flags=re.IGNORECASE)
    return modernize_html(body.strip(), asset_map)


def scrape_accordion_items(url: str, asset_map: dict[str, dict[str, Any]]) -> list[dict[str, str]]:
    request = urllib.request.Request(url, headers={"User-Agent": "myorl-accordion-repair/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        html = response.read().decode("utf-8", "replace")

    items: list[dict[str, str]] = []
    for title_html, body_html in ACCORDION_GROUP_RE.findall(html):
        title = clean_title(title_html)
        content = clean_body(body_html, asset_map)
        if not title and not content:
            continue
        items.append({"title": title, "content": content})

    return items


def build_plan(pages: list[AccordionPage], asset_map: dict[str, dict[str, Any]]) -> dict[str, object]:
    planned_updates: list[dict[str, object]] = []
    skipped: list[dict[str, str]] = []
    errors: list[dict[str, str]] = []

    for page in pages:
        url = legacy_url(page)
        try:
            items = scrape_accordion_items(url, asset_map)
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

        if not items:
            skipped.append(
                {
                    "documentId": page.document_id,
                    "locale": page.locale,
                    "slug": page.slug,
                    "url": url,
                    "reason": "no accordion items found",
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
                "itemCount": len(items),
                "payload": {
                    "pageSections": [
                        {
                            "__component": "sections.accordion",
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
            "pageCount": len(pages),
            "plannedCount": len(planned_updates),
            "skippedCount": len(skipped),
            "errorCount": len(errors),
            "itemTotal": sum(entry["itemCount"] for entry in planned_updates),
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
            ".tmp/accordion-section-repair-plan.json",
            "--result",
            ".tmp/accordion-section-repair-result.json",
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
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Only generate the plan JSON (default when --apply is omitted).",
    )
    parser.add_argument(
        "--rewrite-existing",
        action="store_true",
        help="Rewrite legacy media URLs in an existing plan instead of re-scraping legacy pages.",
    )
    parser.add_argument(
        "--postgres-container",
        default=POSTGRES_CONTAINER,
        help=f"Docker postgres container name (default: {POSTGRES_CONTAINER}).",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    global POSTGRES_CONTAINER
    POSTGRES_CONTAINER = args.postgres_container

    asset_map = load_asset_map()

    if args.rewrite_existing:
        if not args.plan.exists():
            print(f"Plan not found: {args.plan}", file=sys.stderr)
            return 1
        plan = json.loads(args.plan.read_text(encoding="utf-8"))
        plan = rewrite_plan_assets(plan, asset_map)
        plan["generatedAt"] = datetime.now(timezone.utc).isoformat()
    else:
        pages = load_accordion_pages()
        plan = build_plan(pages, asset_map)

    args.plan.parent.mkdir(parents=True, exist_ok=True)
    args.plan.write_text(json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    summary = plan["summary"]
    rewrite_note = ""
    if summary.get("assetRewriteCount"):
        rewrite_note = (
            f", {summary['assetRewriteCount']} legacy media URLs rewritten"
            f" ({summary.get('orphanImageDropCount', 0)} orphan images dropped)"
        )
    print(
        f"Plan written to {args.plan}: "
        f"{summary['plannedCount']} pages, {summary['itemTotal']} accordion items "
        f"({summary['errorCount']} errors, {summary['skippedCount']} skipped){rewrite_note}"
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
