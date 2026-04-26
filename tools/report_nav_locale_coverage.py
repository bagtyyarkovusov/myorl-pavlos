"""Report cross-locale page coverage so editors know what the Navigation
bootstrap/copy will leave dangling.

Strapi's navigation plugin keeps one tree per locale. Before (re)building
the Greek nav and mirroring it into Russian, we want a clear picture of:

  * pages that exist in `el` but have no `ru` translation
    -> if you include them in the Greek nav and copy into Russian, the
       Russian nav item will point at a page with no Russian content.
  * pages that exist in `ru` but have no `el` translation
    -> these are the "orphan" Russian pages (i18n_migration_strategy.md
       noted ~20 of them). They need to be added to the Russian nav
       *after* the copy-from-el step.

Usage:
    STRAPI_URL=http://localhost:1337 \
    STRAPI_TOKEN=...read-only api token... \
    python report_nav_locale_coverage.py [--json report.json]

The script is read-only. It uses the same StrapiClient as the main
importer so auth / retry behaviour stays consistent.
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from dataclasses import dataclass
from typing import Any

from strapi_client import StrapiClient

logger = logging.getLogger("nav_locale_coverage")

DEFAULT_LOCALE = "el"
TRANSLATION_LOCALE = "ru"
PAGE_SIZE = 100


@dataclass
class PageRow:
    document_id: str
    locale: str
    title: str | None
    slug: str | None
    hide_from_menu: bool
    is_folder: bool


def _fetch_all_pages(client: StrapiClient, locale: str) -> list[PageRow]:
    rows: list[PageRow] = []
    page = 1
    while True:
        resp = client.get(
            "/api/pages",
            **{
                "locale": locale,
                "pagination[page]": page,
                "pagination[pageSize]": PAGE_SIZE,
                "fields[0]": "title",
                "fields[1]": "slug",
                "fields[2]": "hideFromMenu",
                "fields[3]": "isFolder",
                "fields[4]": "documentId",
                "status": "published",
            },
        )
        data: list[dict[str, Any]] = resp.get("data", []) or []
        for entry in data:
            # Strapi v5 flattens attributes onto the entry.
            rows.append(
                PageRow(
                    document_id=entry.get("documentId") or entry.get("attributes", {}).get("documentId", ""),
                    locale=locale,
                    title=entry.get("title") or entry.get("attributes", {}).get("title"),
                    slug=entry.get("slug") or entry.get("attributes", {}).get("slug"),
                    hide_from_menu=bool(
                        entry.get("hideFromMenu")
                        if "hideFromMenu" in entry
                        else entry.get("attributes", {}).get("hideFromMenu")
                    ),
                    is_folder=bool(
                        entry.get("isFolder")
                        if "isFolder" in entry
                        else entry.get("attributes", {}).get("isFolder")
                    ),
                )
            )
        meta = resp.get("meta", {}).get("pagination", {})
        page_count = meta.get("pageCount") or 1
        if page >= page_count:
            break
        page += 1
    return rows


def _build_report(
    default_rows: list[PageRow], translation_rows: list[PageRow]
) -> dict[str, Any]:
    default_ids = {r.document_id for r in default_rows if r.document_id}
    translation_ids = {r.document_id for r in translation_rows if r.document_id}

    # Only pages that are actually navigation candidates (menu-visible,
    # not folders by themselves). Folders are fine — they group children —
    # so keep them; just skip `hideFromMenu`.
    default_menu = [r for r in default_rows if not r.hide_from_menu]
    translation_menu = [r for r in translation_rows if not r.hide_from_menu]

    missing_in_translation = sorted(
        (r for r in default_menu if r.document_id not in translation_ids),
        key=lambda r: (r.title or "").lower(),
    )
    missing_in_default = sorted(
        (r for r in translation_menu if r.document_id not in default_ids),
        key=lambda r: (r.title or "").lower(),
    )

    return {
        "locales": {
            "default": DEFAULT_LOCALE,
            "translation": TRANSLATION_LOCALE,
        },
        "counts": {
            f"total_{DEFAULT_LOCALE}": len(default_rows),
            f"total_{TRANSLATION_LOCALE}": len(translation_rows),
            f"menu_visible_{DEFAULT_LOCALE}": len(default_menu),
            f"menu_visible_{TRANSLATION_LOCALE}": len(translation_menu),
            "paired_document_ids": len(default_ids & translation_ids),
            f"missing_in_{TRANSLATION_LOCALE}": len(missing_in_translation),
            f"missing_in_{DEFAULT_LOCALE}": len(missing_in_default),
        },
        "missing_in_translation": [r.__dict__ for r in missing_in_translation],
        "missing_in_default": [r.__dict__ for r in missing_in_default],
    }


def _print_human(report: dict[str, Any]) -> None:
    c = report["counts"]
    print()
    print("=== Navigation locale coverage report ===")
    print(f"Default locale:     {DEFAULT_LOCALE}  ({c[f'total_{DEFAULT_LOCALE}']} published pages, "
          f"{c[f'menu_visible_{DEFAULT_LOCALE}']} menu-visible)")
    print(f"Translation locale: {TRANSLATION_LOCALE}  ({c[f'total_{TRANSLATION_LOCALE}']} published pages, "
          f"{c[f'menu_visible_{TRANSLATION_LOCALE}']} menu-visible)")
    print(f"Paired by documentId: {c['paired_document_ids']}")
    print()
    print(
        f"Pages in {DEFAULT_LOCALE} with NO {TRANSLATION_LOCALE} translation "
        f"(will be dead links after copy): {c[f'missing_in_{TRANSLATION_LOCALE}']}"
    )
    for r in report["missing_in_translation"][:50]:
        print(f"  - [{r['document_id']}] {r['title']} /{r['slug']}")
    if len(report["missing_in_translation"]) > 50:
        print(f"  ... and {len(report['missing_in_translation']) - 50} more")
    print()
    print(
        f"Pages in {TRANSLATION_LOCALE} with NO {DEFAULT_LOCALE} original "
        f"(must be added to the {TRANSLATION_LOCALE} nav manually AFTER copy): "
        f"{c[f'missing_in_{DEFAULT_LOCALE}']}"
    )
    for r in report["missing_in_default"][:50]:
        print(f"  - [{r['document_id']}] {r['title']} /{r['slug']}")
    if len(report["missing_in_default"]) > 50:
        print(f"  ... and {len(report['missing_in_default']) - 50} more")
    print()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--json",
        metavar="PATH",
        help="Write the full report to this path as JSON (in addition to the human summary).",
    )
    parser.add_argument("--log-level", default="INFO")
    args = parser.parse_args(argv)

    logging.basicConfig(level=args.log_level, format="%(levelname)s %(name)s %(message)s")

    client = StrapiClient()
    logger.info("Fetching %s pages...", DEFAULT_LOCALE)
    default_rows = _fetch_all_pages(client, DEFAULT_LOCALE)
    logger.info("Fetching %s pages...", TRANSLATION_LOCALE)
    translation_rows = _fetch_all_pages(client, TRANSLATION_LOCALE)

    report = _build_report(default_rows, translation_rows)
    _print_human(report)

    if args.json:
        with open(args.json, "w", encoding="utf-8") as fh:
            json.dump(report, fh, ensure_ascii=False, indent=2)
        print(f"Full report written to {args.json}")

    # Exit non-zero only if the *default* locale has gaps relative to the
    # translation locale — that signals a data bug (orphan ru with no el).
    return 1 if report["counts"][f"missing_in_{DEFAULT_LOCALE}"] else 0


if __name__ == "__main__":
    sys.exit(main())
