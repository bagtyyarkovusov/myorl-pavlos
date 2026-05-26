"""Audit Strapi pages for title and meta description quality.

Checks every published Strapi page against 9 SEO quality rules and emits
a markdown report plus launch-gate exit codes.

Usage:
  python tools/audit_seo_meta.py
  python tools/audit_seo_meta.py --max-missing-descriptions 0 --max-overlong-titles 30
  python tools/audit_seo_meta.py --report artifacts/reports/seo-meta-audit.md
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
from urllib import parse, request

from cms_audit import REPORTS_DIR
from strapi_client import load_strapi_env_from_dotenv

DEFAULT_REPORT_PATH = REPORTS_DIR / "seo-meta-audit.md"
DEFAULT_MAX_MISSING_DESCRIPTIONS = 0
DEFAULT_MAX_OVERLONG_TITLES = 30

TITLE_MIN = 30
TITLE_MAX = 60
DESCRIPTION_MIN = 100
DESCRIPTION_MAX = 155

GENERIC_TITLES = {"myorl", "myorl.gr", "my orl"}

BRAND_SUFFIX: dict[str, str] = {
    "el": " | Δρ. Παύλος Τσολαρίδης",
    "ru": " | д-р Павлос Цоларидис",
}


@dataclass
class PageMeta:
    locale: str
    slug: str
    title: str
    meta_title: str | None
    meta_description: str | None

    @property
    def effective_title(self) -> str:
        mt = (self.meta_title or "").strip()
        return mt if mt else (self.title or "").strip()

    @property
    def description(self) -> str | None:
        d = (self.meta_description or "").strip()
        return d if d else None


@dataclass
class Finding:
    check: str
    severity: str  # "block", "warn", "info"
    locale: str
    slug: str
    title: str
    detail: str
    suggestion: str | None = None


# ---------------------------------------------------------------------------
# Checks
# ---------------------------------------------------------------------------

def check_title_length(pages: list[PageMeta]) -> list[Finding]:
    findings: list[Finding] = []
    for p in pages:
        et = p.effective_title
        length = len(et)
        if length < TITLE_MIN or length > TITLE_MAX:
            findings.append(
                Finding(
                    check="title-length",
                    severity="warn",
                    locale=p.locale,
                    slug=p.slug,
                    title=et,
                    detail=f"Title length {length} outside 30-60 range",
                    suggestion=(
                        "lengthen the title to at least 30 characters"
                        if length < TITLE_MIN
                        else "shorten the title to at most 60 characters"
                    ),
                )
            )
    return findings


def check_title_uniqueness(pages: list[PageMeta]) -> list[Finding]:
    titles = [p.effective_title for p in pages]
    counts = Counter(titles)
    dup_titles = {t for t, c in counts.items() if c > 1}
    block = any(c > 5 for c in counts.values())
    findings: list[Finding] = []
    for p in pages:
        if p.effective_title in dup_titles:
            findings.append(
                Finding(
                    check="title-uniqueness",
                    severity="block" if block else "warn",
                    locale=p.locale,
                    slug=p.slug,
                    title=p.effective_title,
                    detail=f'Duplicate title "{p.effective_title}" appears {counts[p.effective_title]} times',
                    suggestion="give each page a unique title that reflects its content",
                )
            )
    return findings


def _slug_keywords(slug: str) -> list[str]:
    """Extract content-bearing tokens from a slug."""
    raw = slug.strip("/").rsplit("/", 1)[-1]
    return [w for w in re.split(r"[-_]+", raw.lower()) if len(w) >= 3]


def check_title_contains_slug_keyword(pages: list[PageMeta]) -> list[Finding]:
    findings: list[Finding] = []
    for p in pages:
        keywords = _slug_keywords(p.slug)
        if not keywords:
            continue
        title_lower = p.effective_title.lower()
        matched = [kw for kw in keywords if kw in title_lower]
        if not matched:
            findings.append(
                Finding(
                    check="title-slug-keyword",
                    severity="info",
                    locale=p.locale,
                    slug=p.slug,
                    title=p.effective_title,
                    detail=f"No slug keyword ({', '.join(keywords)}) found in title",
                    suggestion="include a key term from the slug in the title",
                )
            )
    return findings


def check_meta_description_length(pages: list[PageMeta]) -> list[Finding]:
    findings: list[Finding] = []
    for p in pages:
        desc = p.description
        if desc is None:
            continue  # handled by check_meta_description_present
        length = len(desc)
        if length < DESCRIPTION_MIN or length > DESCRIPTION_MAX:
            findings.append(
                Finding(
                    check="meta-description-length",
                    severity="warn",
                    locale=p.locale,
                    slug=p.slug,
                    title=p.effective_title,
                    detail=f"Meta description length {length} outside 100-155 range",
                    suggestion=(
                        "lengthen the description to at least 100 characters"
                        if length < DESCRIPTION_MIN
                        else f"shorten the description to at most {DESCRIPTION_MAX} characters (currently {length})"
                    ),
                )
            )
    return findings


def check_meta_description_present(pages: list[PageMeta]) -> list[Finding]:
    findings: list[Finding] = []
    for p in pages:
        if p.description is None:
            findings.append(
                Finding(
                    check="meta-description-present",
                    severity="block",
                    locale=p.locale,
                    slug=p.slug,
                    title=p.effective_title,
                    detail="Meta description is missing (null or empty)",
                    suggestion=f"Add a meta description of {DESCRIPTION_MIN}-{DESCRIPTION_MAX} characters summarizing this page",
                )
            )
    return findings


def check_meta_description_uniqueness(pages: list[PageMeta]) -> list[Finding]:
    descs = [p.description for p in pages if p.description is not None]
    counts = Counter(descs)
    dup_descs = {d for d, c in counts.items() if c > 1}
    findings: list[Finding] = []
    for p in pages:
        if p.description and p.description in dup_descs:
            findings.append(
                Finding(
                    check="meta-description-uniqueness",
                    severity="warn",
                    locale=p.locale,
                    slug=p.slug,
                    title=p.effective_title,
                    detail=f"Duplicate meta description appears {counts[p.description]} times",
                    suggestion="give each page a unique meta description",
                )
            )
    return findings


def check_title_not_meta_description(pages: list[PageMeta]) -> list[Finding]:
    findings: list[Finding] = []
    for p in pages:
        if p.description is None:
            continue
        if p.effective_title.strip().lower() == p.description.strip().lower():
            findings.append(
                Finding(
                    check="title-not-description",
                    severity="warn",
                    locale=p.locale,
                    slug=p.slug,
                    title=p.effective_title,
                    detail="Title and meta description are identical",
                    suggestion="write a distinct meta description that expands on the title",
                )
            )
    return findings


def check_title_not_generic(pages: list[PageMeta]) -> list[Finding]:
    findings: list[Finding] = []
    for p in pages:
        if p.effective_title.strip().lower() in GENERIC_TITLES:
            findings.append(
                Finding(
                    check="title-not-generic",
                    severity="warn",
                    locale=p.locale,
                    slug=p.slug,
                    title=p.effective_title,
                    detail=f'Title is the generic value "{p.effective_title}"',
                    suggestion="use a descriptive page-specific title",
                )
            )
    return findings


def check_brand_suffix(pages: list[PageMeta]) -> list[Finding]:
    findings: list[Finding] = []
    for p in pages:
        expected = BRAND_SUFFIX.get(p.locale)
        if expected is None:
            continue  # unknown locale — skip
        et = p.effective_title
        if not et.endswith(expected):
            # Try case-insensitive match
            if et.lower().endswith(expected.lower()):
                continue
            findings.append(
                Finding(
                    check="brand-suffix",
                    severity="warn",
                    locale=p.locale,
                    slug=p.slug,
                    title=et,
                    detail=f'Title does not end with brand suffix "{expected}"',
                    suggestion=f"append {expected} to the end of the title",
                )
            )
    return findings


CHECK_REGISTRY: dict[str, Any] = {
    "title-length": check_title_length,
    "title-uniqueness": check_title_uniqueness,
    "title-slug-keyword": check_title_contains_slug_keyword,
    "meta-description-length": check_meta_description_length,
    "meta-description-present": check_meta_description_present,
    "meta-description-uniqueness": check_meta_description_uniqueness,
    "title-not-description": check_title_not_meta_description,
    "title-not-generic": check_title_not_generic,
    "brand-suffix": check_brand_suffix,
}


def run_all_checks(pages: list[PageMeta]) -> dict[str, list[Finding]]:
    return {name: check_fn(pages) for name, check_fn in CHECK_REGISTRY.items()}


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------

CHECK_LABELS: dict[str, str] = {
    "title-length": "1. Title length (30-60 characters)",
    "title-uniqueness": "2. Title uniqueness",
    "title-slug-keyword": "3. Title contains slug-derived keyword",
    "meta-description-length": "4. Meta description length (100-155 characters)",
    "meta-description-present": "5. Meta description present (BLOCK LAUNCH)",
    "meta-description-uniqueness": "6. Meta description uniqueness",
    "title-not-description": "7. Title not equal to meta description",
    "title-not-generic": '8. Title not "MyORL" generic',
    "brand-suffix": "9. Brand suffix consistency",
}


def build_markdown_report(
    results: dict[str, list[Finding]], pages: list[PageMeta], args: argparse.Namespace
) -> str:
    lines: list[str] = []
    lines.append("# SEO Meta Audit Report")
    lines.append("")

    # Summary
    block_count = sum(len(v) for v in results.values() if v and v[0].severity == "block")
    warn_count = sum(
        len(v) for v in results.values() if v and v[0].severity == "warn"
    )
    info_count = sum(
        len(v) for v in results.values() if v and v[0].severity == "info"
    )
    total_findings = sum(len(v) for v in results.values())

    missing_descs = len(results.get("meta-description-present", []))
    overlong_titles = len(results.get("title-length", []))

    lines.append(f"**Pages audited:** {len(pages)}")
    lines.append(f"**Total findings:** {total_findings} ({block_count} block, {warn_count} warn, {info_count} info)")
    lines.append("")

    if missing_descs > 0:
        lines.append(f"BLOCK: {missing_descs} pages with missing meta description")
    if missing_descs == 0:
        lines.append("PASS: All pages have a meta description")
    lines.append("")

    lines.append("---")
    lines.append("")

    # Per-check tables
    for check_name, check_fn in CHECK_REGISTRY.items():
        check_findings = results.get(check_name, [])
        label = CHECK_LABELS.get(check_name, check_name)
        lines.append(f"## {label}")
        lines.append("")

        if not check_findings:
            lines.append("No issues found.")
            lines.append("")
            continue

        lines.append(f"**{len(check_findings)} finding(s)**")
        lines.append("")
        lines.append("| Severity | Locale | Slug | Title | Detail | Suggestion |")
        lines.append("|---|---|---|---|---|---|")

        for f in check_findings:
            sev = f.severity.upper()
            title_escaped = f.title.replace("|", "\\|")
            detail_escaped = f.detail.replace("|", "\\|")
            suggestion_escaped = (f.suggestion or "").replace("|", "\\|")
            lines.append(
                f"| {sev} | {f.locale} | {f.slug} | {title_escaped} | {detail_escaped} | {suggestion_escaped} |"
            )
        lines.append("")

    # Launch gate summary
    lines.append("---")
    lines.append("")
    lines.append("## Launch Gate")
    lines.append("")

    gate_issues: list[str] = []
    if missing_descs > args.max_missing_descriptions:
        gate_issues.append(
            f"Missing descriptions ({missing_descs}) exceeds max ({args.max_missing_descriptions})"
        )
    if overlong_titles > args.max_overlong_titles:
        gate_issues.append(
            f"Overlong/short titles ({overlong_titles}) exceeds max ({args.max_overlong_titles})"
        )
    if results.get("title-uniqueness") and results["title-uniqueness"][0].severity == "block":
        gate_issues.append("Duplicate title count > 5 (BLOCK)")

    if gate_issues:
        for issue in gate_issues:
            lines.append(f"- BLOCKED: {issue}")
        lines.append("")
        lines.append("**Gate status: NOT READY**")
    else:
        lines.append("- All gate checks passed")
        lines.append("")
        lines.append("**Gate status: READY**")

    lines.append("")
    lines.append(f"*Report generated by `tools/audit_seo_meta.py`*")

    return "\n".join(lines)


def compute_gate_exit_code(
    results: dict[str, list[Finding]], pages: list[PageMeta], args: argparse.Namespace
) -> int:
    missing_descs = len(results.get("meta-description-present", []))
    overlong_titles = len(results.get("title-length", []))
    dup_block = (
        results.get("title-uniqueness")
        and results["title-uniqueness"][0].severity == "block"
    )

    if missing_descs > args.max_missing_descriptions:
        return 1
    if overlong_titles > args.max_overlong_titles:
        return 1
    if dup_block:
        return 1
    return 0


# ---------------------------------------------------------------------------
# Data fetching
# ---------------------------------------------------------------------------

def fetch_pages_via_strapi_api() -> list[PageMeta]:
    """Fetch all published pages with their SEO metadata from the Strapi API."""
    load_strapi_env_from_dotenv()
    base_url = (os.environ.get("STRAPI_URL") or "http://localhost:1337").rstrip("/")
    token = os.environ.get("STRAPI_TOKEN") or ""

    all_pages: list[PageMeta] = []
    page = 1
    page_size = 100

    while True:
        query = parse.urlencode(
            {
                "populate": "seo",
                "pagination[pageSize]": page_size,
                "pagination[page]": page,
                "filters[publishedAt][$notNull]": "true",
                "fields[0]": "title",
                "fields[1]": "slug",
                "fields[2]": "locale",
            }
        )
        url = f"{base_url}/api/pages?{query}"
        req = request.Request(url, headers={"Accept": "application/json"})
        if token:
            req.add_header("Authorization", f"Bearer {token}")

        try:
            with request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read())
        except Exception as exc:
            print(f"Error fetching pages from Strapi: {exc}", file=sys.stderr)
            sys.exit(2)

        batch = data.get("data", [])
        if not batch:
            break

        for item in batch:
            attrs = item.get("attributes") or item
            seo = attrs.get("seo") or {}
            all_pages.append(
                PageMeta(
                    locale=attrs.get("locale", ""),
                    slug=attrs.get("slug", ""),
                    title=attrs.get("title", ""),
                    meta_title=seo.get("metaTitle") if seo else None,
                    meta_description=seo.get("metaDescription") if seo else None,
                )
            )

        meta = data.get("meta", {})
        pagination = meta.get("pagination", {})
        if len(batch) < page_size:
            break
        if pagination.get("pageCount") and page >= pagination["pageCount"]:
            break
        page += 1

    return all_pages


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--report",
        default=str(DEFAULT_REPORT_PATH),
        help=f"Path for the markdown report (default: {DEFAULT_REPORT_PATH})",
    )
    parser.add_argument(
        "--max-missing-descriptions",
        type=int,
        default=DEFAULT_MAX_MISSING_DESCRIPTIONS,
        help=f"Max allowed missing meta descriptions before gate blocks (default: {DEFAULT_MAX_MISSING_DESCRIPTIONS})",
    )
    parser.add_argument(
        "--max-overlong-titles",
        type=int,
        default=DEFAULT_MAX_OVERLONG_TITLES,
        help=f"Max allowed out-of-range titles before gate blocks (default: {DEFAULT_MAX_OVERLONG_TITLES})",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    pages = fetch_pages_via_strapi_api()
    if not pages:
        print("No published pages found in Strapi.", file=sys.stderr)
        return 1

    results = run_all_checks(pages)
    report = build_markdown_report(results, pages, args)

    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(report, encoding="utf-8")
    print(f"Report written to {report_path}")

    exit_code = compute_gate_exit_code(results, pages, args)
    if exit_code != 0:
        print("Launch gate BLOCKED — see report for details.")
    else:
        print("Launch gate passed.")

    return exit_code


if __name__ == "__main__":
    sys.exit(main())
