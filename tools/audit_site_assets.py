#!/usr/bin/env python3
"""Read-only audit of missing or broken media across the myorl-pavlos site.

Inspects the local Strapi Postgres database and classifies findings by UI
impact: directory listing thumbnails, inline article images, gallery items,
promo slides, and video section assets.

Usage:
  python tools/audit_site_assets.py
  python tools/audit_site_assets.py --output tools/data/manual-repairs/site-asset-audit.json
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "tools/data/manual-repairs/site-asset-audit.json"
POSTGRES_CONTAINER = "myorl-pg"

DIRECTORY_PARENT_LAYOUTS = ("section-index", "encyclopedia-index", "clinic-index")
PAGE_HTML_FIELDS = ("content", "excerpt", "info_block_bottom", "sources")

IMG_SRC_RE = re.compile(r"""<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']""", re.IGNORECASE)
BROKEN_SRC_RE = re.compile(
    r"^\s*$|^file:|msohtmlclip",
    re.IGNORECASE,
)
WEBP_PREFIX_RE = re.compile(r"^/?webp/(?:ru|el)/(.+\.webp)$", re.IGNORECASE)


@dataclass(frozen=True)
class Finding:
    category: str
    severity: str
    locale: str
    slug: str
    title: str
    detail: str
    uiImpact: str | None = None
    parentSlug: str | None = None
    layoutVariant: str | None = None
    field: str | None = None
    src: str | None = None


def psql_scalar(query: str) -> str:
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


def psql_json(query: str) -> Any:
    raw = psql_scalar(query)
    if not raw:
        return []
    return json.loads(raw)


def normalize_upload_path(src: str) -> str:
    path = unquote(src.strip().split("?", 1)[0])
    if path.startswith("//"):
        path = "https:" + path
    parsed = urlparse(path)
    if parsed.scheme in {"http", "https"}:
        return unquote(parsed.path)
    return unquote(path if path.startswith("/") else f"/{path}")


def page_has_listing_media(page_id: int) -> bool:
    return psql_scalar(
        f"""
        SELECT EXISTS (
          SELECT 1
          FROM files_related_mph fr
          WHERE fr.related_id = {page_id}
            AND fr.related_type = 'api::page.page'
            AND fr.field IN ('featuredImage', 'imageCenter')
        );
        """
    ) == "t"


def page_has_og_image(page_id: int) -> bool:
    return psql_scalar(
        f"""
        SELECT EXISTS (
          SELECT 1
          FROM pages_cmps pc
          JOIN components_shared_seos seo ON seo.id = pc.cmp_id
          JOIN files_related_mph fr
            ON fr.related_id = seo.id
           AND fr.related_type = 'shared.seo'
           AND fr.field = 'ogImage'
          WHERE pc.entity_id = {page_id}
            AND pc.component_type LIKE '%seo%'
        );
        """
    ) == "t"


def audit_listing_media(pages: list[dict[str, Any]]) -> list[Finding]:
    findings: list[Finding] = []
    for page in pages:
        page_id = page["id"]
        if page_has_listing_media(page_id) or page_has_og_image(page_id):
            continue

        parent_layout = page.get("parent_layout_variant")
        ui_impact = "none"
        if parent_layout in DIRECTORY_PARENT_LAYOUTS:
            ui_impact = "directory-listing-thumbnail"
        elif page.get("layout_variant") in {"section-hub", "service-article", "encyclopedia-article"}:
            ui_impact = "possible-related-topics-or-grid"

        severity = "high" if ui_impact == "directory-listing-thumbnail" else "medium"
        if page.get("layout_variant") in {"contact", "sitemap", "not-found", "search-results"}:
            severity = "low"
            ui_impact = "none"

        findings.append(
            Finding(
                category="missing-listing-media",
                severity=severity,
                locale=page["locale"],
                slug=page["slug"],
                title=page["title"],
                detail="No featuredImage, imageCenter, or seo.ogImage linked",
                uiImpact=ui_impact,
                parentSlug=page.get("parent_slug"),
                layoutVariant=page.get("layout_variant"),
            )
        )
    return findings


def audit_inline_html_images(
    pages: list[dict[str, Any]],
    file_urls: set[str],
    asset_map: dict[str, dict[str, Any]],
) -> list[Finding]:
    findings: list[Finding] = []

    def resolve_legacy(src: str) -> str | None:
        candidate = unquote(src.strip().lstrip("/"))
        webp_match = WEBP_PREFIX_RE.match(src.strip())
        if webp_match:
            stem = webp_match.group(1)
            if stem.endswith(".webp"):
                stem = stem[:-5]
            candidate = unquote(stem)
        for key in (candidate, candidate.lstrip("/"), unquote(candidate)):
            entry = asset_map.get(key)
            if entry and entry.get("url"):
                return str(entry["url"])
        return None

    for page in pages:
        for field in PAGE_HTML_FIELDS:
            html = page.get(field) or ""
            if "<img" not in html.lower():
                continue
            for match in IMG_SRC_RE.finditer(html):
                src = match.group(1)
                if BROKEN_SRC_RE.search(src):
                    findings.append(
                        Finding(
                            category="broken-inline-image",
                            severity="high",
                            locale=page["locale"],
                            slug=page["slug"],
                            title=page["title"],
                            detail="Invalid or empty img src",
                            uiImpact="article-body-image",
                            field=field,
                            src=src[:160],
                        )
                    )
                    continue

                path = normalize_upload_path(src)
                if path.startswith("/uploads/"):
                    if path not in file_urls:
                        findings.append(
                            Finding(
                                category="missing-upload-file",
                                severity="high",
                                locale=page["locale"],
                                slug=page["slug"],
                                title=page["title"],
                                detail=f"img src not found in files table: {path}",
                                uiImpact="article-body-image",
                                field=field,
                                src=src[:160],
                            )
                        )
                    continue

                if src.startswith("http://") or src.startswith("https://"):
                    continue

                resolved = resolve_legacy(src)
                if resolved:
                    findings.append(
                        Finding(
                            category="legacy-inline-image-path",
                            severity="high",
                            locale=page["locale"],
                            slug=page["slug"],
                            title=page["title"],
                            detail=f"Legacy path should be rewritten to {resolved}",
                            uiImpact="article-body-image",
                            field=field,
                            src=src[:160],
                        )
                    )
                else:
                    findings.append(
                        Finding(
                            category="unresolved-inline-image-path",
                            severity="high",
                            locale=page["locale"],
                            slug=page["slug"],
                            title=page["title"],
                            detail="Legacy img src could not be mapped to /uploads/",
                            uiImpact="article-body-image",
                            field=field,
                            src=src[:160],
                        )
                    )
    return findings


def audit_component_media() -> list[Finding]:
    findings: list[Finding] = []

    gallery_missing = int(
        psql_scalar(
            """
            SELECT COUNT(*) FROM components_items_gallery_items gi
            WHERE NOT EXISTS (
              SELECT 1 FROM files_related_mph fr
              WHERE fr.related_id = gi.id
                AND fr.related_type = 'items.gallery-item'
                AND fr.field = 'image'
            );
            """
        )
    )
    if gallery_missing:
        findings.append(
            Finding(
                category="missing-gallery-image",
                severity="high",
                locale="*",
                slug="*",
                title="Gallery items",
                detail=f"{gallery_missing} gallery item(s) without linked image",
                uiImpact="gallery-section",
            )
        )

    promo_missing = int(
        psql_scalar(
            """
            SELECT COUNT(*) FROM components_items_promo_slides ps
            WHERE NOT EXISTS (
              SELECT 1 FROM files_related_mph fr
              WHERE fr.related_id = ps.id
                AND fr.related_type = 'items.promo-slide'
                AND fr.field = 'image'
            );
            """
        )
    )
    if promo_missing:
        findings.append(
            Finding(
                category="missing-promo-slide-image",
                severity="high",
                locale="*",
                slug="*",
                title="Promo slides",
                detail=f"{promo_missing} promo slide(s) without linked image",
                uiImpact="homepage-promo",
            )
        )

    video_missing = int(
        psql_scalar(
            """
            SELECT COUNT(*) FROM components_items_videos v
            WHERE NOT EXISTS (
              SELECT 1 FROM files_related_mph fr
              WHERE fr.related_id = v.id
                AND fr.related_type = 'items.video'
                AND fr.field IN ('thumbnail', 'videoMp4', 'videoWebm')
            );
            """
        )
    )
    if video_missing:
        findings.append(
            Finding(
                category="missing-video-section-media",
                severity="medium",
                locale="*",
                slug="*",
                title="Embedded video blocks",
                detail=(
                    f"{video_missing} homepage/section video item(s) without linked media "
                    "(video library entries use YouTube thumbnails separately)"
                ),
                uiImpact="embedded-video-section",
            )
        )

    return findings


def load_pages() -> list[dict[str, Any]]:
    return psql_json(
        """
        SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
        FROM (
          SELECT
            p.id,
            p.document_id,
            p.locale,
            p.slug,
            p.title,
            p.layout_variant,
            parent.slug AS parent_slug,
            parent.layout_variant AS parent_layout_variant
          FROM pages p
          LEFT JOIN pages_parent_page_lnk lnk ON lnk.page_id = p.id
          LEFT JOIN pages parent
            ON parent.id = lnk.inv_page_id
           AND parent.locale = p.locale
          WHERE p.published_at IS NOT NULL
          ORDER BY p.locale, p.slug
        ) t;
        """
    )


def load_page_html() -> list[dict[str, Any]]:
    return psql_json(
        """
        SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
        FROM (
          SELECT locale, slug, title, content, excerpt, info_block_bottom, sources
          FROM pages
          WHERE published_at IS NOT NULL
        ) t;
        """
    )


def load_file_urls() -> set[str]:
    rows = psql_json("SELECT COALESCE(json_agg(url), '[]'::json) FROM files;")
    return {row for row in rows if isinstance(row, str)}


def load_asset_map() -> dict[str, dict[str, Any]]:
    path = ROOT / "data/source/checkpoints/asset_map.json"
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def summarize(findings: list[Finding]) -> dict[str, Any]:
    by_category: dict[str, int] = {}
    by_severity: dict[str, int] = {}
    directory_rows = 0
    for finding in findings:
        by_category[finding.category] = by_category.get(finding.category, 0) + 1
        by_severity[finding.severity] = by_severity.get(finding.severity, 0) + 1
        if finding.uiImpact == "directory-listing-thumbnail":
            directory_rows += 1
    return {
        "totalFindings": len(findings),
        "directoryListingThumbnailGaps": directory_rows,
        "byCategory": by_category,
        "bySeverity": by_severity,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="Where to write the JSON audit report.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    try:
        pages = load_pages()
        html_pages = load_page_html()
        file_urls = load_file_urls()
        asset_map = load_asset_map()
    except subprocess.CalledProcessError as exc:
        print(f"Failed to query Postgres: {exc}", file=sys.stderr)
        return 1
    except json.JSONDecodeError as exc:
        print(f"Failed to decode Postgres JSON payload: {exc}", file=sys.stderr)
        return 1

    findings: list[Finding] = []
    findings.extend(audit_listing_media(pages))
    findings.extend(audit_inline_html_images(html_pages, file_urls, asset_map))
    findings.extend(audit_component_media())

    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "publishedPageCount": len(pages),
        "summary": summarize(findings),
        "findings": [asdict(f) for f in findings],
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    summary = report["summary"]
    print(f"Audit written to {args.output}")
    print(
        f"Findings: {summary['totalFindings']} total, "
        f"{summary['directoryListingThumbnailGaps']} directory listing thumbnail gap(s)"
    )
    for category, count in sorted(summary["byCategory"].items()):
        print(f"  - {category}: {count}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
