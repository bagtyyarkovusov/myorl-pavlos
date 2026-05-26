"""Apply slug renames for issue #180 (6 slug quality fixes).

Fixes:
  1. el:lftynnk-prospou-2 → lifting-prosopou (typo fix)
  2. el:rinorragia → rinorragia-enilikoi (adult, disambiguate from paediatric)
  3. ru:rinorragia → rinorragia-enilikoi (adult, disambiguate from paediatric)
  4. el:rinorragies → rinorragia-paidia (paediatric, disambiguate from adult)
  5. ru:rinorragies → rinorragia-paidia (paediatric, disambiguate from adult)

Each rename also creates a URL Mapping entry (internal-301) from old → new.

The 6th finding (el:preauricular-cyst) is a false positive fixed in
``audit_slug_quality.py`` by adding "cyst" to the valid-English-words set.

Usage:
  python3 tools/fix_issue_180_slugs.py --dry-run   # preview only
  python3 tools/fix_issue_180_slugs.py --apply      # write to Strapi
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any

_TOOLS = Path(__file__).resolve().parent
if str(_TOOLS) not in sys.path:
    sys.path.insert(0, str(_TOOLS))

from strapi_client import StrapiClient, StrapiError

# (locale, document_id, old_slug, new_slug, title)
RENAMES: list[tuple[str, str, str, str, str]] = [
    ("el", "ga146qjmuc4nzd2b96a7f726", "lftynnk-prospou-2", "lifting-prosopou", "Λίφτινγκ προσώπου 2"),
    ("el", "yo9bpgx42lwx19ketdt2zwrt", "rinorragia", "rinorragia-enilikoi", "Ρινορραγία (Επίσταξη)"),
    ("ru", "yo9bpgx42lwx19ketdt2zwrt", "rinorragia", "rinorragia-enilikoi", "Носовое кровотечение"),
    ("el", "yv09o1x42ubffjze8oqkgnz5", "rinorragies", "rinorragia-paidia", "Ρινορραγίες στα παιδιά (Επίσταξη ρινός)"),
    ("ru", "yv09o1x42ubffjze8oqkgnz5", "rinorragies", "rinorragia-paidia", "Носовые кровотечения у детей"),
]


def update_slug(client: StrapiClient, locale: str, document_id: str, new_slug: str) -> bool:
    """PUT /api/pages/{documentId}?locale={locale} with {data: {slug: new_slug}}."""
    print(f"  Updating slug: {locale}:{new_slug} (docId={document_id}) ... ", end="")
    client.put(
        f"/api/pages/{document_id}",
        {"data": {"slug": new_slug}},
        locale=locale,
    )
    print("OK")
    return True


def create_url_mapping(client: StrapiClient, locale: str, old_slug: str, new_slug: str) -> bool:
    """POST /api/url-mappings with internal-301 entry."""
    legacy_path = f"/{locale}/{old_slug}"
    dest_path = f"/{locale}/{new_slug}"
    print(f"  Creating URL mapping: {legacy_path} → {dest_path} ... ", end="")
    client.post(
        "/api/url-mappings",
        {
            "data": {
                "legacyPath": legacy_path,
                "destinationPath": dest_path,
                "destinationKind": "internal-301",
                "locale": locale,
                "notes": f"Issue #180 slug quality fix: {old_slug} → {new_slug}",
            }
        },
    )
    print("OK")
    return True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without writing to Strapi")
    parser.add_argument("--apply", action="store_true", help="Write changes to Strapi")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    dry_run = not args.apply

    try:
        client = StrapiClient(dry_run=dry_run)
    except RuntimeError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    mode = "DRY-RUN" if dry_run else "APPLY"
    print(f"=== Issue #180 slug quality fix ({mode}) ===\n")

    slug_errors = 0
    mapping_errors = 0

    for locale, doc_id, old_slug, new_slug, title in RENAMES:
        print(f"[{locale}] \"{title}\"")
        print(f"  {old_slug} → {new_slug}")

        try:
            update_slug(client, locale, doc_id, new_slug)
        except StrapiError as exc:
            print(f"FAILED: {exc}")
            slug_errors += 1

        try:
            create_url_mapping(client, locale, old_slug, new_slug)
        except StrapiError as exc:
            print(f"FAILED: {exc}")
            mapping_errors += 1

        print()

    total = slug_errors + mapping_errors
    if dry_run:
        print(f"Dry-run complete. {len(RENAMES)} slug renames + {len(RENAMES)} URL mappings previewed.")
        print(f"Run with --apply to write changes.")
    else:
        print(f"Applied: {len(RENAMES)} slug renames + {len(RENAMES)} URL mappings.")
        if total > 0:
            print(f"Errors: {slug_errors} slug updates, {mapping_errors} URL mappings failed.")

    return 1 if total > 0 else 0


if __name__ == "__main__":
    raise SystemExit(main())
