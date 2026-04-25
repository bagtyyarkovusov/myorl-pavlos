"""Audit Strapi content hygiene before starting the Next.js UI.

The script is intentionally read-only. It inspects the local Strapi SQLite
database, checks migrated HTML/link quality, and optionally confirms the live
Strapi navigation render contract.
"""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
from collections import Counter
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse

from strapi_client import StrapiClient, StrapiError, load_strapi_env_from_dotenv

ROOT = Path(__file__).resolve().parent
DEFAULT_DB_PATH = ROOT / "backend" / ".tmp" / "data.db"
DEFAULT_REDIRECTS_PATH = ROOT / "slug_redirects_next.json"

DEFAULT_ALLOWED_BROKEN_INTERNAL_LINKS = 14
EXPECTED_NAVIGATION_ROOTS = {"el": 7, "ru": 8}
INTERNAL_HOSTS = {
    "localhost",
    "127.0.0.1",
    "myorl.gr",
    "www.myorl.gr",
    "orl.gr",
    "www.orl.gr",
}
IGNORED_SCHEMES = {"mailto", "tel", "javascript", "data", "skype"}
LEGACY_HTML_PATTERNS = ("<font", "</font", "style=", "class=", "[[", "&nbsp;")
UNSAFE_HTML_PATTERNS = ("<script", "onclick=", "onerror=", "javascript:")
HREF_RE = re.compile(r"""href\s*=\s*["']([^"'#]+)(?:#[^"']*)?["']""", re.IGNORECASE)

PAGE_TEXT_FIELDS = (
    "content",
    "excerpt",
    "info_block_bottom",
    "sources",
    "pop_up_close",
)
COMPONENT_TEXT_FIELDS: dict[str, tuple[str, ...]] = {
    "components_items_accordion_items": ("content",),
    "components_items_faq_items": ("answer",),
    "components_items_tab_items": ("content", "link"),
    "components_items_contact_details": ("value",),
    "components_items_clinics": ("address", "phone", "email"),
    "components_items_linked_resources": ("description", "target_url"),
    "components_items_promo_slides": ("description", "target_url"),
    "components_sections_accordions": ("intro",),
    "components_sections_faqs": ("intro",),
    "components_sections_galleries": ("intro",),
    "components_sections_tabs": ("intro",),
    "components_sections_contacts": ("intro",),
    "components_sections_linked_resources": ("intro",),
}


@dataclass(frozen=True)
class TextSource:
    source: str
    field: str
    text: str


@dataclass(frozen=True)
class LinkFinding:
    source: str
    field: str
    href: str
    normalizedPath: str


@dataclass(frozen=True)
class LegacyHtmlFinding:
    source: str
    field: str
    markers: list[str]
    textLength: int


def connect_readonly(db_path: Path) -> sqlite3.Connection:
    uri = f"file:{db_path.resolve()}?mode=ro"
    connection = sqlite3.connect(uri, uri=True)
    connection.row_factory = sqlite3.Row
    return connection


def scalar(connection: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> int:
    row = connection.execute(sql, params).fetchone()
    if row is None:
        return 0
    value = row[0]
    return int(value or 0)


def load_redirect_paths(path: Path) -> tuple[set[str], set[str]]:
    if not path.exists():
        return set(), set()
    data = json.loads(path.read_text(encoding="utf-8"))
    rows = data.get("redirects", []) if isinstance(data, dict) else data if isinstance(data, list) else []
    sources: set[str] = set()
    targets: set[str] = set()
    for row in rows:
        if not isinstance(row, dict):
            continue
        source = row.get("source") or row.get("from") or row.get("sourcePath")
        target = row.get("destination") or row.get("to") or row.get("target")
        for variant in row.get("fromPathVariants") or []:
            if isinstance(variant, str) and variant.strip():
                sources.add(variant.strip("/"))
        if isinstance(row.get("toPath"), str) and row["toPath"].strip():
            targets.add(row["toPath"].strip("/"))
        if isinstance(source, str) and source.strip():
            sources.add(source.strip("/"))
        if isinstance(target, str) and target.strip():
            targets.add(target.strip("/"))
    return sources, targets


def fetch_text_sources(connection: sqlite3.Connection) -> list[TextSource]:
    sources: list[TextSource] = []
    page_columns = ", ".join(("document_id", "locale", "slug", *PAGE_TEXT_FIELDS))
    for row in connection.execute(
        f"""
        SELECT {page_columns}
        FROM pages
        WHERE published_at IS NOT NULL
        """
    ):
        source_id = f"page:{row['locale']}:{row['slug']}:{row['document_id']}"
        for field in PAGE_TEXT_FIELDS:
            value = row[field]
            if value:
                sources.append(TextSource(source=source_id, field=field, text=str(value)))

    for table, fields in COMPONENT_TEXT_FIELDS.items():
        columns = ", ".join(("id", *fields))
        for row in connection.execute(f"SELECT {columns} FROM {table}"):
            source_id = f"component:{table}:{row['id']}"
            for field in fields:
                value = row[field]
                if value:
                    sources.append(TextSource(source=source_id, field=field, text=str(value)))
    return sources


def extract_links(sources: list[TextSource]) -> list[tuple[TextSource, str]]:
    links: list[tuple[TextSource, str]] = []
    for source in sources:
        for match in HREF_RE.finditer(source.text):
            links.append((source, match.group(1).strip()))
        if source.field in {"target_url", "link"} and source.text.strip():
            links.append((source, source.text.strip()))
    return links


def valid_slug_sets(connection: sqlite3.Connection) -> tuple[set[str], dict[str, set[str]]]:
    all_slugs: set[str] = set()
    by_locale: dict[str, set[str]] = {}
    for row in connection.execute(
        """
        SELECT locale, slug
        FROM pages
        WHERE published_at IS NOT NULL
          AND slug IS NOT NULL
          AND TRIM(slug) != ''
        """
    ):
        slug = str(row["slug"])
        locale = str(row["locale"])
        all_slugs.add(slug)
        by_locale.setdefault(locale, set()).add(slug)
    return all_slugs, by_locale


def normalize_internal_path(href: str) -> tuple[str | None, str]:
    parsed = urlparse(href.strip())
    if parsed.scheme in IGNORED_SCHEMES or href.startswith("#"):
        return None, "ignored"
    host = (parsed.hostname or "").lower()
    if parsed.scheme in {"http", "https"} and host and host not in INTERNAL_HOSTS:
        return None, "external"
    path = parsed.path if parsed.scheme else href.split("?", 1)[0]
    normalized_path = unquote(path).strip("/")
    if not normalized_path:
        return None, "ignored"
    return normalized_path, "internal"


def classify_internal_links(
    links: list[tuple[TextSource, str]],
    *,
    all_slugs: set[str],
    slugs_by_locale: dict[str, set[str]],
    redirect_sources: set[str],
    redirect_targets: set[str],
) -> dict[str, Any]:
    ok: list[LinkFinding] = []
    broken: list[LinkFinding] = []
    redirectable: list[LinkFinding] = []
    external_count = 0
    ignored_count = 0
    internal_count = 0

    for source, href in links:
        normalized_path, link_type = normalize_internal_path(href)
        if link_type == "external":
            external_count += 1
            continue
        if link_type == "ignored":
            ignored_count += 1
            continue

        assert normalized_path is not None
        internal_count += 1
        parts = [part for part in normalized_path.split("/") if part]
        slug = parts[-1] if parts else ""
        finding = LinkFinding(
            source=source.source,
            field=source.field,
            href=href,
            normalizedPath=normalized_path,
        )

        if normalized_path.startswith(("uploads/", "upload/", "assets/", "storage/")):
            ok.append(finding)
        elif len(parts) >= 2 and parts[0] in slugs_by_locale and parts[1] in slugs_by_locale[parts[0]]:
            ok.append(finding)
        elif slug in all_slugs:
            ok.append(finding)
        elif (
            normalized_path in redirect_sources
            or normalized_path in redirect_targets
            or slug in redirect_sources
            or slug in redirect_targets
        ):
            redirectable.append(finding)
        else:
            broken.append(finding)

    return {
        "internalCount": internal_count,
        "externalCount": external_count,
        "ignoredCount": ignored_count,
        "ok": ok,
        "redirectable": redirectable,
        "potentialBroken": broken,
    }


def audit_html_markers(sources: list[TextSource]) -> dict[str, Any]:
    legacy_findings: list[LegacyHtmlFinding] = []
    unsafe_findings: list[LegacyHtmlFinding] = []
    marker_source_counts: Counter[str] = Counter()

    for source in sources:
        lower_text = source.text.lower()
        legacy_markers = [marker for marker in LEGACY_HTML_PATTERNS if marker in lower_text]
        unsafe_markers = [marker for marker in UNSAFE_HTML_PATTERNS if marker in lower_text]
        if "<iframe" in lower_text:
            marker_source_counts["<iframe"] += 1
        for marker in legacy_markers:
            marker_source_counts[marker] += 1
        if legacy_markers:
            legacy_findings.append(
                LegacyHtmlFinding(
                    source=source.source,
                    field=source.field,
                    markers=legacy_markers,
                    textLength=len(source.text),
                )
            )
        if unsafe_markers:
            unsafe_findings.append(
                LegacyHtmlFinding(
                    source=source.source,
                    field=source.field,
                    markers=unsafe_markers,
                    textLength=len(source.text),
                )
            )

    return {
        "legacy": legacy_findings,
        "unsafe": unsafe_findings,
        "markerSourceCounts": dict(sorted(marker_source_counts.items())),
    }


def fetch_empty_content_leaves(connection: sqlite3.Connection) -> list[dict[str, Any]]:
    rows = connection.execute(
        """
        WITH child_counts AS (
          SELECT parent.id AS parent_id, COUNT(*) AS children
          FROM pages child
          JOIN pages_parent_page_lnk l ON l.page_id = child.id
          JOIN pages parent ON parent.id = l.inv_page_id
          WHERE child.published_at IS NOT NULL
            AND parent.published_at IS NOT NULL
            AND child.locale = parent.locale
          GROUP BY parent.id
        )
        SELECT p.document_id, p.locale, p.slug, p.title, p.page_type, p.layout_variant
        FROM pages p
        LEFT JOIN child_counts c ON c.parent_id = p.id
        WHERE p.published_at IS NOT NULL
          AND p.page_type = 'content'
          AND (p.content IS NULL OR TRIM(p.content) = '')
          AND p.is_folder = 0
          AND COALESCE(c.children, 0) = 0
        ORDER BY p.locale, p.slug
        """
    ).fetchall()
    return [dict(row) for row in rows]


def pageblocks_storage_summary(connection: sqlite3.Connection) -> dict[str, int]:
    return {
        "storageRows": scalar(connection, "SELECT COUNT(*) FROM pages_cmps WHERE field = 'pageBlocks'"),
        "publishedRows": scalar(
            connection,
            """
            SELECT COUNT(*)
            FROM pages_cmps pc
            JOIN pages p ON p.id = pc.entity_id
            WHERE pc.field = 'pageBlocks'
              AND p.published_at IS NOT NULL
            """,
        ),
    }


def basic_contract_summary(connection: sqlite3.Connection) -> dict[str, int]:
    return {
        "publishedPages": scalar(connection, "SELECT COUNT(*) FROM pages WHERE published_at IS NOT NULL"),
        "missingCoreFields": scalar(
            connection,
            """
            SELECT COUNT(*)
            FROM pages
            WHERE published_at IS NOT NULL
              AND (
                title IS NULL OR TRIM(title) = ''
                OR slug IS NULL OR TRIM(slug) = ''
                OR page_type IS NULL OR TRIM(page_type) = ''
                OR layout_variant IS NULL OR TRIM(layout_variant) = ''
              )
            """,
        ),
        "publishedSlugCollisions": scalar(
            connection,
            """
            SELECT COUNT(*)
            FROM (
              SELECT locale, slug
              FROM pages
              WHERE published_at IS NOT NULL
              GROUP BY locale, slug
              HAVING COUNT(*) > 1
            )
            """,
        ),
        "publishedTags": scalar(connection, "SELECT COUNT(*) FROM tags WHERE published_at IS NOT NULL"),
        "publishedTagsWithSlug": scalar(
            connection,
            """
            SELECT COUNT(*)
            FROM tags
            WHERE published_at IS NOT NULL
              AND slug IS NOT NULL
              AND TRIM(slug) != ''
            """,
        ),
    }


def check_navigation_render(skip: bool) -> dict[str, Any]:
    if skip:
        return {"skipped": True, "rootCounts": {}, "nestedPathCount": 0, "errors": []}

    load_strapi_env_from_dotenv()
    client = StrapiClient()
    root_counts: dict[str, int] = {}
    nested_path_count = 0
    nested_samples: list[dict[str, Any]] = []

    def walk(items: list[dict[str, Any]]) -> None:
        nonlocal nested_path_count
        for item in items:
            path = str(item.get("path") or "")
            ui_router_key = str(item.get("uiRouterKey") or "")
            normalized = path.strip("/")
            if normalized and "/" in normalized and normalized.split("/")[-1] == ui_router_key:
                nested_path_count += 1
                if len(nested_samples) < 10:
                    nested_samples.append(
                        {
                            "title": item.get("title"),
                            "path": path,
                            "uiRouterKey": ui_router_key,
                        }
                    )
            walk(item.get("items") or [])

    errors: list[str] = []
    for locale in ("el", "ru"):
        try:
            tree = client.get("/api/navigation/render/navigation", type="TREE", locale=locale)
        except StrapiError as exc:
            errors.append(str(exc))
            continue
        if not isinstance(tree, list):
            errors.append(f"{locale}: navigation render returned {type(tree).__name__}, expected list")
            continue
        root_counts[locale] = len(tree)
        walk(tree)

    return {
        "skipped": False,
        "rootCounts": root_counts,
        "expectedRootCounts": EXPECTED_NAVIGATION_ROOTS,
        "nestedPathCount": nested_path_count,
        "nestedPathSamples": nested_samples,
        "routePolicy": "Use Page.slug or uiRouterKey for flat Next.js routes; do not use navigation path as the route URL.",
        "errors": errors,
    }


def build_report(args: argparse.Namespace) -> tuple[dict[str, Any], list[str]]:
    connection = connect_readonly(Path(args.db))
    all_slugs, slugs_by_locale = valid_slug_sets(connection)
    redirect_sources, redirect_targets = load_redirect_paths(Path(args.redirects))
    text_sources = fetch_text_sources(connection)
    links = extract_links(text_sources)
    link_data = classify_internal_links(
        links,
        all_slugs=all_slugs,
        slugs_by_locale=slugs_by_locale,
        redirect_sources=redirect_sources,
        redirect_targets=redirect_targets,
    )
    html_data = audit_html_markers(text_sources)
    empty_content_leaves = fetch_empty_content_leaves(connection)
    navigation = check_navigation_render(skip=args.skip_strapi_navigation)

    failures: list[str] = []
    if len(html_data["unsafe"]) > 0:
        failures.append(f"unsafe HTML findings found: {len(html_data['unsafe'])}")
    if len(empty_content_leaves) > 0:
        failures.append(f"empty content leaf pages found: {len(empty_content_leaves)}")
    if len(link_data["potentialBroken"]) > args.max_broken_internal_links:
        failures.append(
            "potential broken internal links exceeded threshold: "
            f"{len(link_data['potentialBroken'])} > {args.max_broken_internal_links}"
        )
    if not args.skip_strapi_navigation:
        if navigation["errors"]:
            failures.append("Strapi navigation render check failed")
        for locale, expected_count in EXPECTED_NAVIGATION_ROOTS.items():
            actual_count = navigation["rootCounts"].get(locale)
            if actual_count != expected_count:
                failures.append(
                    f"{locale} navigation root count mismatch: {actual_count} != {expected_count}"
                )

    report = {
        "summary": {
            **basic_contract_summary(connection),
            "pageBlocks": pageblocks_storage_summary(connection),
            "textSources": len(text_sources),
            "hrefLinks": len(links),
            "internalLinks": link_data["internalCount"],
            "externalLinks": link_data["externalCount"],
            "ignoredLinks": link_data["ignoredCount"],
            "internalLinksOk": len(link_data["ok"]),
            "redirectableInternalLinks": len(link_data["redirectable"]),
            "potentialBrokenInternalLinks": len(link_data["potentialBroken"]),
            "legacyHtmlSources": len(html_data["legacy"]),
            "unsafeHtmlSources": len(html_data["unsafe"]),
            "emptyContentLeaves": len(empty_content_leaves),
            "redirectSourcesLoaded": len(redirect_sources),
        },
        "navigation": navigation,
        "htmlMarkerSourceCounts": html_data["markerSourceCounts"],
        "potentialBrokenInternalLinks": [
            asdict(finding) for finding in link_data["potentialBroken"][: args.max_samples]
        ],
        "redirectableInternalLinks": [
            asdict(finding) for finding in link_data["redirectable"][: args.max_samples]
        ],
        "legacyHtmlSamples": [
            asdict(finding) for finding in html_data["legacy"][: args.max_samples]
        ],
        "unsafeHtmlFindings": [asdict(finding) for finding in html_data["unsafe"]],
        "emptyContentLeaves": empty_content_leaves,
        "failures": failures,
    }
    return report, failures


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", default=str(DEFAULT_DB_PATH), help="Path to Strapi SQLite database")
    parser.add_argument(
        "--redirects",
        default=str(DEFAULT_REDIRECTS_PATH),
        help="Path to slug_redirects_next.json; missing file is allowed",
    )
    parser.add_argument("--report-json", help="Optional path to write the full JSON report")
    parser.add_argument("--max-samples", type=int, default=50)
    parser.add_argument(
        "--max-broken-internal-links",
        type=int,
        default=DEFAULT_ALLOWED_BROKEN_INTERNAL_LINKS,
        help="Current accepted ceiling; the audit fails if this increases",
    )
    parser.add_argument(
        "--skip-strapi-navigation",
        action="store_true",
        help="Skip live Strapi navigation render checks for offline analysis",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    report, failures = build_report(args)
    output = json.dumps(report, ensure_ascii=False, indent=2)
    print(output)
    if args.report_json:
        Path(args.report_json).write_text(output + "\n", encoding="utf-8")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
