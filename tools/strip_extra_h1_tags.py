"""Demote extra ``<h1>`` tags to ``<h2>`` across published Strapi pages.

Dry-run by default; pass ``--apply`` to write fixes back via the REST API.
Idempotent: re-running on already-fixed content produces zero changes.
"""

from __future__ import annotations

import argparse
import json
import sys
import warnings
from typing import Any

from bs4 import BeautifulSoup, MarkupResemblesLocatorWarning

from cms_audit import connect_readonly, scalar
from strapi_client import StrapiClient, load_strapi_env_from_dotenv

_PAGE_TEXT_FIELDS = (
    "content",
    "excerpt",
    "info_block_bottom",
    "sources",
    "pop_up_close",
)
_COMPONENT_TEXT_FIELDS: dict[str, tuple[str, ...]] = {
    "components_items_accordion_items": ("content",),
    "components_items_faq_items": ("answer",),
    "components_items_tab_items": ("content", "link"),
    "components_items_contact_details": ("value",),
    "components_items_clinics": ("address", "phone", "email"),
    "components_items_linked_resources": ("description", "target_url"),
    "components_sections_accordions": ("intro",),
    "components_sections_faqs": ("intro",),
    "components_sections_galleries": ("intro",),
    "components_sections_tabs": ("intro",),
    "components_sections_contacts": ("intro",),
    "components_sections_linked_resources": ("intro",),
}


def strip_extra_h1_tags(html: str | None) -> tuple[str, int]:
    """Demote the 2nd+ ``<h1>`` elements to ``<h2>``, preserving attributes and children.

    Returns ``(modified_html, count_demoted)``.
    """
    if not html or not isinstance(html, str):
        return "", 0
    if "<h1" not in html.lower():
        return html, 0

    warnings.filterwarnings("ignore", category=MarkupResemblesLocatorWarning)
    soup = BeautifulSoup(html, "html.parser")
    h1_tags = soup.find_all("h1")
    demoted = 0
    for tag in h1_tags[1:]:
        tag.name = "h2"
        demoted += 1
    return str(soup), demoted


def strip_page_fields(fields: dict[str, str | None]) -> dict[str, str]:
    """Apply ``strip_extra_h1_tags`` to each field. Returns only changed/new values."""
    changed: dict[str, str] = {}
    for key, value in fields.items():
        if not value:
            continue
        cleaned, count = strip_extra_h1_tags(value)
        if count > 0:
            changed[key] = cleaned
    return changed


def _page_key(locale: str, slug: str, document_id: str) -> str:
    return f"page:{locale}:{slug}:{document_id}"


def _fields_from_row(row: Any) -> dict[str, str | None]:
    return {field: row[field] for field in _PAGE_TEXT_FIELDS if field in row.keys()}


def scan_local_db(db_path: str) -> list[dict[str, Any]]:
    """Return pages from the SQLite DB that have 2+ ``<h1>`` tags."""
    connection = connect_readonly(db_path)
    violations: list[dict[str, Any]] = []

    columns = ", ".join(("document_id", "locale", "slug", *_PAGE_TEXT_FIELDS))
    for row in connection.execute(
        f"""
        SELECT {columns}
        FROM pages
        WHERE published_at IS NOT NULL
        """
    ):
        h1_count = 0
        for field in _PAGE_TEXT_FIELDS:
            value = row[field]
            if value and isinstance(value, str) and "<h1" in value.lower():
                h1_count += value.lower().count("<h1")
        if h1_count >= 2:
            violations.append(
                {
                    "page": _page_key(row["locale"], row["slug"], row["document_id"]),
                    "locale": row["locale"],
                    "slug": row["slug"],
                    "documentId": row["document_id"],
                    "h1Count": h1_count,
                    "fields": _fields_from_row(row),
                }
            )

    connection.close()
    return violations


def fetch_pages_from_api(client: StrapiClient, locale: str) -> list[dict[str, Any]]:
    """Fetch published pages from Strapi v5 API for a given locale."""
    pages: list[dict[str, Any]] = []
    page = 1
    while True:
        data = client.get(
            "/api/pages",
            locale=locale,
            status="published",
            pagination_pageSize=100,
            pagination_page=page,
            fields=("documentId", "locale", "slug", *_PAGE_TEXT_FIELDS),
        )
        results = (data.get("data") or []) if isinstance(data, dict) else []
        if not results:
            break
        for item in results:
            attrs = item.get("attributes") or item if isinstance(item, dict) else {}
            pages.append(
                {
                    "documentId": attrs.get("documentId", ""),
                    "locale": attrs.get("locale", locale),
                    "slug": attrs.get("slug", ""),
                    "fields": {f: attrs.get(f) for f in _PAGE_TEXT_FIELDS},
                }
            )
        meta = data.get("meta", {}) if isinstance(data, dict) else {}
        pagination = meta.get("pagination", {}) if isinstance(meta, dict) else {}
        if page >= pagination.get("pageCount", 0):
            break
        page += 1
    return pages


def process_violations(
    violations: list[dict[str, Any]],
    client: StrapiClient,
    *,
    apply: bool = False,
) -> dict[str, Any]:
    """Apply ``strip_page_fields`` to each violation's fields."""
    results: dict[str, Any] = {"total": len(violations), "fixed": 0, "skipped": 0, "pages": []}
    for v in violations:
        changed = strip_page_fields(v["fields"])
        page_result = {
            "page": v.get("page", f"{v.get('locale', '?')}:{v.get('slug', '?')}"),
            "documentId": v["documentId"],
            "changes": len(changed),
            "fieldsChanged": list(changed.keys()),
            "applied": False,
        }
        if not changed:
            results["skipped"] += 1
            results["pages"].append(page_result)
            continue

        if apply:
            try:
                client.put(
                    f"/api/pages/{v['documentId']}",
                    {"data": changed},
                )
                page_result["applied"] = True
                results["fixed"] += 1
            except Exception as exc:
                page_result["error"] = str(exc)
                results["skipped"] += 1
        else:
            page_result["preview"] = {k: v[:200] + "..." if len(v) > 200 else v for k, v in changed.items()}
            results["fixed"] += 1

        results["pages"].append(page_result)
    return results


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Write fixes back to Strapi.")
    parser.add_argument(
        "--db",
        help="Path to Strapi SQLite database for local scanning (fast, read-only).",
    )
    parser.add_argument("--locale", help="Filter to a single locale (el or ru).")
    parser.add_argument("--json", action="store_true", help="Output results as JSON on stdout.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if args.db:
        violations = scan_local_db(args.db)
        if args.locale:
            violations = [v for v in violations if v["locale"] == args.locale]
    else:
        load_strapi_env_from_dotenv()
        client = StrapiClient()
        violations = []
        for locale in (args.locale,) if args.locale else ("el", "ru"):
            for page in fetch_pages_from_api(client, locale):
                fields = page["fields"]
                h1_count = 0
                for value in fields.values():
                    if value and isinstance(value, str) and "<h1" in value.lower():
                        h1_count += value.lower().count("<h1")
                if h1_count >= 2:
                    violations.append(
                        {
                            "page": _page_key(page["locale"], page["slug"], page["documentId"]),
                            "locale": page["locale"],
                            "slug": page["slug"],
                            "documentId": page["documentId"],
                            "h1Count": h1_count,
                            "fields": fields,
                        }
                    )

    if not violations:
        print("No pages with 2+ H1 tags found.")
        if args.json:
            print(json.dumps({"total": 0, "fixed": 0, "skipped": 0, "pages": []}, ensure_ascii=False, indent=2))
        return 0

    load_strapi_env_from_dotenv()
    client = StrapiClient(dry_run=not args.apply)

    results = process_violations(violations, client, apply=args.apply)

    if args.json:
        print(json.dumps(results, ensure_ascii=False, indent=2))
    else:
        for page_result in results["pages"]:
            status = "FIXED" if page_result["applied"] else "DRY-RUN"
            print(f"[{status}] {page_result['page']}: {page_result['changes']} field(s) — {page_result['fieldsChanged']}")
            if "preview" in page_result:
                for field, preview in page_result["preview"].items():
                    print(f"  {field}: {preview}")
        print(f"\n{results['fixed']} page(s) would be fixed, {results['skipped']} skipped.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
