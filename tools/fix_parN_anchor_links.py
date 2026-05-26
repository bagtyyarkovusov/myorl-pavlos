"""Fix broken ``#parN`` anchor links on ``/el/rinitida-igmoritida-paidia``.

The page has an accordion ``<div>`` with 9 ``<a href="#parN">`` links pointing
to ``<h4>`` headings that lost their ``id`` attributes during MODX → Strapi
migration.  This script adds ``id="par1"`` through ``id="par9"`` to the
corresponding ``<h4>`` tags in the rich-text body.

Dry-run by default; pass ``--apply`` to write the fix back via the REST API.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from typing import Any

from bs4 import BeautifulSoup

from strapi_client import StrapiClient, load_strapi_env_from_dotenv

PAGE_SLUG = "rinitida-igmoritida-paidia"
LOCALE = "el"
_PAR_HREF_RE = re.compile(r"^#par\d+$")


def fix_par_anchors(html: str | None) -> tuple[str, int]:
    """Add ``id="parN"`` to ``<h4>`` headings that follow the accordion div.

    The accordion div is at the very start of the content, so the first N
    ``<h4>`` tags in document order are the correct targets.

    Returns ``(modified_html, count_added)``.
    """
    if not html:
        return "", 0

    soup = BeautifulSoup(html, "html.parser")

    # Extract the ordered #parN IDs from the accordion wrapper div.
    accordion_link = soup.find("div", class_="accordion-heading")
    if not accordion_link:
        return html, 0
    wrapper = accordion_link.parent
    if not wrapper:
        return html, 0

    par_ids: list[str] = []
    for link in wrapper.find_all("a", href=True):
        href = link["href"]
        if isinstance(href, str) and _PAR_HREF_RE.match(href):
            par_ids.append(href[1:])  # strip leading #

    if not par_ids:
        return html, 0

    # The accordion div is at the start of the content, so the first N <h4>
    # elements are the targets, paired positionally with the accordion links.
    h4_tags = soup.find_all("h4")
    added = 0
    for i, h4 in enumerate(h4_tags):
        if i >= len(par_ids):
            break
        if h4.get("id"):
            continue
        h4["id"] = par_ids[i]
        added += 1

    return str(soup), added


def fetch_page(client: StrapiClient, slug: str, locale: str) -> dict[str, Any] | None:
    """Fetch a single published page by slug and locale."""
    data = client.get(
        "/api/pages",
        locale=locale,
        status="published",
        **{f"filters[$and][0][slug][$eq]": slug},
        fields="documentId,locale,slug,content",
    )
    results = (data.get("data") or []) if isinstance(data, dict) else []
    if not results:
        return None
    item = results[0]
    attrs = item.get("attributes") or item if isinstance(item, dict) else {}
    return {
        "documentId": attrs.get("documentId", ""),
        "locale": attrs.get("locale", locale),
        "slug": attrs.get("slug", slug),
        "content": attrs.get("content", ""),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Write fixes back to Strapi.")
    parser.add_argument("--json", action="store_true", help="Output results as JSON on stdout.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    load_strapi_env_from_dotenv()
    client = StrapiClient(dry_run=not args.apply)

    page = fetch_page(client, PAGE_SLUG, LOCALE)
    if not page:
        print(f"Page not found: {LOCALE}/{PAGE_SLUG}")
        return 1

    fixed_html, count = fix_par_anchors(page["content"])
    result: dict[str, Any] = {
        "page": f"{LOCALE}/{PAGE_SLUG}",
        "documentId": page["documentId"],
        "anchorsAdded": count,
    }

    if count == 0:
        msg = "No broken #parN anchors found – already fixed."
        if args.json:
            result["applied"] = False
            result["message"] = msg
            print(json.dumps(result, ensure_ascii=False, indent=2))
        else:
            print(msg)
        return 0

    # Re-extract IDs for reporting (already extracted in fix_par_anchors)
    soup = BeautifulSoup(page["content"], "html.parser")
    wrapper_link = soup.find("div", class_="accordion-heading")
    par_ids = []
    if wrapper_link and wrapper_link.parent:
        for link in wrapper_link.parent.find_all("a", href=True):
            href = link["href"]
            if isinstance(href, str) and _PAR_HREF_RE.match(href):
                par_ids.append(href[1:])
    result["targetIds"] = par_ids

    if args.apply:
        try:
            client.put(
                f"/api/pages/{page['documentId']}",
                {"data": {"content": fixed_html}},
            )
            result["applied"] = True
            status = "FIXED"
        except Exception as exc:
            result["applied"] = False
            result["error"] = str(exc)
            status = "ERROR"
    else:
        result["applied"] = False
        status = "DRY-RUN"

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(f"[{status}] {result['page']}: {count} anchor(s) would be added — {par_ids}")
        if not args.apply:
            print("Pass --apply to write the fix.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
