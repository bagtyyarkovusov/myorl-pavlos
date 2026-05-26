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
DEFAULT_ALT_TEXT_REPORT = ROOT / "artifacts/reports/alt-text-audit.md"
DEFAULT_MIN_ALT_COVERAGE = 95
POSTGRES_CONTAINER = "myorl-pg"

DIRECTORY_PARENT_LAYOUTS = ("section-index", "encyclopedia-index", "clinic-index")
PAGE_HTML_FIELDS = ("content", "excerpt", "info_block_bottom", "sources")

IMG_SRC_RE = re.compile(r"""<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']""", re.IGNORECASE)
BROKEN_SRC_RE = re.compile(
    r"^\s*$|^file:|msohtmlclip",
    re.IGNORECASE,
)
WEBP_PREFIX_RE = re.compile(r"^/?webp/(?:ru|el)/(.+\.webp)$", re.IGNORECASE)

IMG_TAG_RE = re.compile(r"""<img\b([^>]*)>""", re.IGNORECASE)
ALT_RE = re.compile(r"""\balt\s*=\s*["']([^"']*)["']""", re.IGNORECASE)

PAGE_HTML_FIELDS_FOR_ALT = ("content", "excerpt", "info_block_bottom", "sources")


@dataclass(frozen=True)
class AltTextEntry:
    status: str       # "has-alt", "empty-alt", "missing-alt"
    alt_value: str    # the alt text (empty string when missing)
    src: str          # the img src attribute value
    field: str        # which HTML field the img was found in


@dataclass(frozen=True)
class PageAltTextStats:
    locale: str
    slug: str
    title: str
    entries: list[AltTextEntry]
    total: int
    has_alt: int
    empty_alt: int
    missing_alt: int


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


def classify_img_alt(img_tag: str) -> tuple[str, str]:
    """Classify an <img> tag's alt text into one of three states.

    Returns (status, alt_value) where status is:
      "has-alt"     — non-empty alt text after trimming
      "empty-alt"   — alt="" or alt with only whitespace
      "missing-alt" — no alt attribute at all
    """
    alt_match = ALT_RE.search(img_tag)
    if alt_match is None:
        return ("missing-alt", "")
    alt_value = alt_match.group(1)
    if not alt_value.strip():
        return ("empty-alt", alt_value)
    return ("has-alt", alt_value.strip())


def calculate_alt_coverage(stats: dict[str, int]) -> float:
    """Return the alt-text coverage percentage (images with non-empty alt / total)."""
    total = stats.get("total", 0)
    if total == 0:
        return 100.0
    return (stats["has-alt"] / total) * 100


def audit_inline_image_alt_text(
    pages: list[dict[str, Any]],
) -> list[PageAltTextStats]:
    """Scan page HTML fields for <img> tags and classify alt text status."""
    result: list[PageAltTextStats] = []

    for page in pages:
        entries: list[AltTextEntry] = []
        for field in PAGE_HTML_FIELDS_FOR_ALT:
            html = page.get(field) or ""
            if not html or "<img" not in html.lower():
                continue
            for match in IMG_TAG_RE.finditer(html):
                full_tag = match.group(0)
                src_match = IMG_SRC_RE.search(full_tag)
                src = src_match.group(1) if src_match else ""
                status, alt_value = classify_img_alt(full_tag)
                entries.append(
                    AltTextEntry(
                        status=status,
                        alt_value=alt_value,
                        src=src[:160],
                        field=field,
                    )
                )

        if entries:
            counts: dict[str, int] = {"has-alt": 0, "empty-alt": 0, "missing-alt": 0}
            for e in entries:
                counts[e.status] += 1
            result.append(
                PageAltTextStats(
                    locale=page["locale"],
                    slug=page["slug"],
                    title=page["title"],
                    entries=entries,
                    total=len(entries),
                    has_alt=counts["has-alt"],
                    empty_alt=counts["empty-alt"],
                    missing_alt=counts["missing-alt"],
                )
            )

    return result


def aggregate_alt_text_stats(
    page_stats: list[PageAltTextStats],
) -> dict[str, int]:
    """Aggregate counts across all pages."""
    totals = {"has-alt": 0, "empty-alt": 0, "missing-alt": 0, "total": 0}
    for ps in page_stats:
        totals["has-alt"] += ps.has_alt
        totals["empty-alt"] += ps.empty_alt
        totals["missing-alt"] += ps.missing_alt
        totals["total"] += ps.total
    return totals


def generate_alt_text_markdown_report(
    page_stats: list[PageAltTextStats],
    min_coverage: float = 95.0,
) -> str:
    """Generate a per-page markdown report of alt text status."""
    totals = aggregate_alt_text_stats(page_stats)
    coverage = calculate_alt_coverage(totals)
    passed = coverage >= min_coverage
    gate_status = "PASS" if passed else "FAIL"

    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    lines = [
        "# Alt Text Audit Report",
        "",
        f"**Generated:** {now_iso}",
        "",
        "## Summary",
        "",
        f"- Total images: {totals['total']}",
        f"- Has alt text: {totals['has-alt']} ({coverage:.1f}%)",
        f"- Empty alt (decorative): {totals['empty-alt']}",
        f"- Missing alt attribute: {totals['missing-alt']}",
        f"- Coverage: {coverage:.1f}% (gate: {min_coverage:.0f}%) — **{gate_status}**",
        "",
    ]

    if not page_stats:
        lines.append("No content images found across any page.")
        return "\n".join(lines)

    lines.extend(["## Per-Page Breakdown", ""])

    for ps in page_stats:
        page_coverage = (ps.has_alt / ps.total * 100) if ps.total else 100.0
        lines.append(f"### /{ps.locale}/{ps.slug} — {ps.title}")
        lines.append("")
        lines.append(
            f"Total: {ps.total} | Has alt: {ps.has_alt} | "
            f"Empty: {ps.empty_alt} | Missing: {ps.missing_alt} "
            f"({page_coverage:.0f}% coverage)"
        )
        lines.append("")
        lines.append("| Status | Alt Text | Image Src | Field |")
        lines.append("|--------|----------|-----------|-------|")

        for entry in ps.entries:
            alt_display = entry.alt_value if entry.status == "has-alt" else (
                '(empty)' if entry.status == "empty-alt" else '(missing)'
            )
            lines.append(
                f"| {entry.status} | {alt_display} | {entry.src} | {entry.field} |"
            )

        lines.append("")

    return "\n".join(lines)


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
    parser.add_argument(
        "--min-alt-coverage",
        type=float,
        default=DEFAULT_MIN_ALT_COVERAGE,
        help=f"Launch gate: minimum alt text coverage percentage (default: {DEFAULT_MIN_ALT_COVERAGE}).",
    )
    parser.add_argument(
        "--alt-text-report",
        type=Path,
        default=DEFAULT_ALT_TEXT_REPORT,
        help="Where to write the alt text markdown report.",
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

    # Alt text audit
    alt_text_stats = audit_inline_image_alt_text(html_pages)
    alt_totals = aggregate_alt_text_stats(alt_text_stats)
    alt_coverage = calculate_alt_coverage(alt_totals)

    alt_report_md = generate_alt_text_markdown_report(alt_text_stats, args.min_alt_coverage)
    args.alt_text_report.parent.mkdir(parents=True, exist_ok=True)
    args.alt_text_report.write_text(alt_report_md + "\n", encoding="utf-8")

    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "publishedPageCount": len(pages),
        "summary": summarize(findings),
        "findings": [asdict(f) for f in findings],
        "altText": {
            "coverage": round(alt_coverage, 2),
            "totalImages": alt_totals["total"],
            "hasAlt": alt_totals["has-alt"],
            "emptyAlt": alt_totals["empty-alt"],
            "missingAlt": alt_totals["missing-alt"],
            "minCoverageGate": args.min_alt_coverage,
            "coverageGatePassed": alt_coverage >= args.min_alt_coverage,
            "reportPath": str(args.alt_text_report),
        },
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    summary = report["summary"]
    print(f"Audit written to {args.output}")
    print(f"Alt text report written to {args.alt_text_report}")
    print(
        f"Findings: {summary['totalFindings']} total, "
        f"{summary['directoryListingThumbnailGaps']} directory listing thumbnail gap(s)"
    )
    for category, count in sorted(summary["byCategory"].items()):
        print(f"  - {category}: {count}")

    print()
    print(
        f"Alt text coverage: {alt_coverage:.1f}% ({alt_totals['has-alt']}/{alt_totals['total']} images) — "
        f"gate: {args.min_alt_coverage:.0f}%"
    )

    if alt_coverage < args.min_alt_coverage:
        print(
            f"[FAIL] Alt text coverage {alt_coverage:.1f}% is below the "
            f"{args.min_alt_coverage:.0f}% minimum. See {args.alt_text_report}."
        )
        return 1

    print(f"[PASS] Alt text coverage meets the {args.min_alt_coverage:.0f}% minimum.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
