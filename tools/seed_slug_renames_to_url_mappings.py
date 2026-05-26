"""Produce URL Mapping JSON rows from an approved slug-rename list.

Input: a JSON file (the "approved rename list") whose entries are::

    { "locale": "el", "old_slug": "broken-slug",
      "new_slug": "fixed-slug", "notes": "..." }

- If *new_slug* is truthy the row is ``internal-301``.
- If *new_slug* is empty the row is ``gone-410`` (page retired / garbage).

Output: a JSON array of URL Mapping rows (one per entry) matching the schema
defined in ADR-012.  The output feeds ``tools/seed_url_mappings.py`` (issue #13).

Usage::

    python3 tools/seed_slug_renames_to_url_mappings.py \\
        --input artifacts/reports/approved-slug-renames.json \\
        --output data/manifests/url-mapping-seed-from-slug-renames.json
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


def _as_path(raw: str) -> str:
    """Normalize a slug-relative value to a URL path segment."""
    s = raw.strip().strip("/")
    return f"/{s}" if s else ""


def build_url_mappings(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Convert approved rename entries into URL Mapping rows."""

    rows: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()

    for i, entry in enumerate(entries):
        locale = str(entry.get("locale", "")).strip()
        old_slug = str(entry.get("old_slug", "")).strip()
        new_slug = str(entry.get("new_slug", "")).strip()
        notes = str(entry.get("notes", "")).strip()

        if not locale or not old_slug:
            print(f"Skipping entry {i}: missing locale or old_slug", file=sys.stderr)
            continue

        legacy_path = _as_path(f"{locale}/{old_slug}")

        if (locale, old_slug) in seen:
            print(f"Skipping duplicate entry {i}: {legacy_path}", file=sys.stderr)
            continue
        seen.add((locale, old_slug))

        if new_slug:
            row: dict[str, Any] = {
                "legacyPath": legacy_path,
                "destinationPath": _as_path(f"{locale}/{new_slug}"),
                "destinationKind": "internal-301",
                "locale": locale,
                "notes": notes or f"Renamed slug: {old_slug} → {new_slug}",
            }
        else:
            row = {
                "legacyPath": legacy_path,
                "destinationPath": "",
                "destinationKind": "gone-410",
                "locale": locale,
                "notes": notes or f"Retired slug: {old_slug}",
            }

        rows.append(row)

    return rows


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, help="Path to approved rename list (JSON)")
    parser.add_argument("--output", required=True, help="Path for URL Mapping seed JSON")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: input file not found: {input_path}", file=sys.stderr)
        return 1

    entries = json.loads(input_path.read_text(encoding="utf-8"))
    if not isinstance(entries, list):
        print("Error: input must be a JSON array", file=sys.stderr)
        return 1

    rows = build_url_mappings(entries)

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote {len(rows)} URL Mapping rows to {output_path}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
