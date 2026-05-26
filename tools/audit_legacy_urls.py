#!/usr/bin/env python3
"""Classify Legacy URL Inventory rows into case 1/2/3 for URL Mapping seeding.

Reads the MODX inventory CSV, compares against the current Strapi state in
SQLite, and partitions each row:

- Case 1 — slug unchanged (handled by locale-prefix wildcard, NOT seeded).
- Case 2 — slug renamed (emits internal-301 seed entry).
- Case 3 — page retired (deleted, unpublished, or no Strapi match; emits gone-410).

Also folds in the 31 second-hop Redirect 301 rules from legacy .htaccess,
flattening chains so each source points directly at the final URL.

Usage:
  python tools/audit_legacy_urls.py
  python tools/audit_legacy_urls.py --inventory path/to/inventory.csv
  python tools/audit_legacy_urls.py --db path/to/data.db --htaccess path/to/.htaccess
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Optional
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]

from cms_audit import REPORTS_DIR
from cms_audit.db import DEFAULT_SQLITE_DB_PATH, connect_readonly

DEFAULT_INVENTORY = Path.home() / "Projects" / "myorl-migrate" / "old_url_inventory_clean.csv"
DEFAULT_HTACCESS = Path.home() / "Projects" / "public_html" / ".htaccess"
DEFAULT_TRIAGE_OUT = REPORTS_DIR / "legacy-url-triage.md"
DEFAULT_SEED_OUT = REPORTS_DIR / "url-mapping-seed.json"

CONTEXT_KEY_TO_LOCALE = {"web": "el", "rus": "ru"}


# ---------------------------------------------------------------------------
# Domain types
# ---------------------------------------------------------------------------


class Case(Enum):
    UNCHANGED = 1  # slug matches, handled by wildcard
    RENAMED = 2    # slug differs, emit internal-301
    RETIRED = 3    # deleted / unpublished / no Strapi match, emit gone-410


@dataclass
class InventoryRow:
    modx_id: int
    pagetitle: str
    alias: str
    uri: str
    parent: int
    published: bool
    deleted: bool
    hidemenu: bool
    locale: str
    document_id: str
    status_guess: str = ""


@dataclass
class StrapiPage:
    document_id: str
    locale: str
    slug: str
    title: str


@dataclass
class HtaccessRule:
    source: str
    target: str


@dataclass
class SeedEntry:
    legacyPath: str
    destinationPath: str
    destinationKind: str  # "internal-301" | "external-301" | "gone-410"
    locale: Optional[str]
    notes: str
    _case: str = ""  # internal label: "case-1", "case-2", "case-3", "htaccess"


# ---------------------------------------------------------------------------
# CSV loader
# ---------------------------------------------------------------------------


def _parse_bool(val: str) -> bool:
    return val.strip() in {"1", "true", "yes", "y"}


def load_inventory_csv(path: Path) -> list[InventoryRow]:
    """Parse the Legacy URL Inventory CSV into InventoryRow objects."""
    rows: list[InventoryRow] = []
    with path.open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for line in reader:
            modx_id_str = (line.get("id") or "").strip()
            if not modx_id_str or not modx_id_str.isdigit():
                continue
            context_key = (line.get("context_key") or "web").strip()
            rows.append(InventoryRow(
                modx_id=int(modx_id_str),
                pagetitle=(line.get("pagetitle") or "").strip(),
                alias=(line.get("alias") or "").strip(),
                uri=(line.get("uri") or "").strip(),
                parent=int((line.get("parent") or "0").strip() or "0"),
                published=_parse_bool(line.get("published") or "1"),
                deleted=_parse_bool(line.get("deleted") or "0"),
                hidemenu=_parse_bool(line.get("hidemenu") or "0"),
                locale=CONTEXT_KEY_TO_LOCALE.get(context_key, "el"),
                document_id=(line.get("document_id") or "").strip(),
                status_guess=(line.get("status_guess") or "").strip(),
            ))
    return rows


# ---------------------------------------------------------------------------
# SQLite Strapi page loader
# ---------------------------------------------------------------------------


def load_strapi_page_map(conn: Any) -> dict[tuple[str, str], StrapiPage]:
    """Return (document_id, locale) → StrapiPage for all published pages."""
    page_map: dict[tuple[str, str], StrapiPage] = {}
    rows = conn.execute(
        "SELECT document_id, locale, slug, title "
        "FROM pages WHERE published_at IS NOT NULL"
    ).fetchall()
    for row in rows:
        key = (str(row["document_id"] or ""), str(row["locale"] or ""))
        page_map[key] = StrapiPage(
            document_id=str(row["document_id"] or ""),
            locale=str(row["locale"] or ""),
            slug=(row["slug"] or "").strip(),
            title=(row["title"] or "").strip(),
        )
    return page_map


# ---------------------------------------------------------------------------
# Classification
# ---------------------------------------------------------------------------


def classify_row(
    row: InventoryRow,
    page_map: dict[tuple[str, str], StrapiPage],
) -> tuple[Case, str, str]:
    """Classify a single inventory row.

    Returns (case, destination_path, rationale_notes).
    """
    # Case 3 checks first
    if row.deleted:
        return (Case.RETIRED, "", "MODX row marked deleted=1")

    if not row.published:
        return (Case.RETIRED, "", "MODX row unpublished (published=0)")

    if not row.document_id:
        return (Case.RETIRED, "", "No document_id in inventory row")

    page = page_map.get((row.document_id, row.locale))
    if page is None:
        return (Case.RETIRED, "", "No Strapi page for document_id + locale")

    # Compare MODX alias with Strapi slug
    if row.alias == page.slug:
        return (Case.UNCHANGED, "", f"slug unchanged: {row.alias}")

    dest = f"/{row.locale}/{page.slug}"
    return (
        Case.RENAMED,
        dest,
        f"slug renamed: {row.alias} → {page.slug}",
    )


# ---------------------------------------------------------------------------
# URL helpers
# ---------------------------------------------------------------------------


def url_decode_path(path: str) -> str:
    """Decode percent-encoded segments in a URL path, preserving structure."""
    if not path:
        return path
    return "/".join(unquote(part) for part in path.split("/"))


# ---------------------------------------------------------------------------
# .htaccess parsing
# ---------------------------------------------------------------------------

_HTACCESS_REDIRECT_RE = re.compile(
    r"^\s*Redirect\s+(301|302|303|307|308)\s+(\S+)\s+(\S+)",
    re.IGNORECASE,
)


def parse_htaccess_rules(text: str) -> list[HtaccessRule]:
    """Extract Redirect directives from .htaccess content."""
    rules: list[HtaccessRule] = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        m = _HTACCESS_REDIRECT_RE.match(line)
        if not m:
            continue
        source = url_decode_path(m.group(2))
        target = url_decode_path(m.group(3))
        rules.append(HtaccessRule(source=source, target=target))
    return rules


def _detect_locale(path: str) -> Optional[str]:
    """Extract locale prefix from a path like /el/slug or /ru/slug."""
    if path.startswith("/el/") or path == "/el":
        return "el"
    if path.startswith("/ru/") or path == "/ru":
        return "ru"
    return None


def flatten_htaccess_rules(rules: list[HtaccessRule]) -> list[SeedEntry]:
    """Flatten multi-hop .htaccess chains into direct single-hop entries.

    Each non-ASCII source that points to an ASCII intermediate gets resolved
    through to the final locale-prefixed destination. The intermediate hop is
    also emitted (pointing at the final destination) since real clients may
    have bookmarked the ASCII URL.
    """
    target_map: dict[str, str] = {r.source: r.target for r in rules}
    entries: list[SeedEntry] = []

    for rule in rules:
        # Follow the chain to find the final target
        final = rule.target
        visited: set[str] = {rule.source}
        while final in target_map and final not in visited:
            visited.add(final)
            final = target_map[final]

        locale = _detect_locale(final)

        entries.append(SeedEntry(
            legacyPath=rule.source,
            destinationPath=final,
            destinationKind="internal-301",
            locale=locale,
            notes="Flattened from .htaccess: "
                  f"{rule.source} → {rule.target} → {final}"
                  if final != rule.target
                  else f"From .htaccess: {rule.source} → {final}",
            _case="htaccess",
        ))

    return entries


# ---------------------------------------------------------------------------
# Seed entry builder
# ---------------------------------------------------------------------------


def build_seed_entries(
    rows: list[InventoryRow],
    page_map: dict[tuple[str, str], StrapiPage],
) -> list[dict[str, Any]]:
    """Build seed JSON entries for case 2 + case 3 inventory rows only.

    Case 1 (slug unchanged) is excluded — it's handled by the wildcard.
    Case 2 → internal-301, Case 3 → gone-410.
    """
    return [e for e in classify_all_rows(rows, page_map) if e["_case"] != "case-1"]


def classify_all_rows(
    rows: list[InventoryRow],
    page_map: dict[tuple[str, str], StrapiPage],
) -> list[dict[str, Any]]:
    """Classify all inventory rows (including case 1) for reporting."""
    entries: list[dict[str, Any]] = []
    for row in rows:
        case, dest, notes = classify_row(row, page_map)
        legacy_path = url_decode_path(row.uri) if row.uri else f"/{row.alias}"

        if case == Case.UNCHANGED:
            entries.append({
                "_case": "case-1",
                "legacyPath": legacy_path,
                "destinationPath": "",
                "destinationKind": "skip",
                "locale": row.locale,
                "notes": notes,
            })
        elif case == Case.RENAMED:
            entries.append({
                "_case": "case-2",
                "legacyPath": legacy_path,
                "destinationPath": dest,
                "destinationKind": "internal-301",
                "locale": row.locale,
                "notes": notes,
            })
        else:
            entries.append({
                "_case": "case-3",
                "legacyPath": legacy_path,
                "destinationPath": "",
                "destinationKind": "gone-410",
                "locale": row.locale,
                "notes": notes,
            })
    return entries


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------


def _build_uri_modx_map(rows: list[InventoryRow]) -> dict[str, int]:
    """Build {decoded_uri: modx_id} lookup for report table rendering."""
    result: dict[str, int] = {}
    for r in rows:
        if r.uri:
            result[url_decode_path(r.uri)] = r.modx_id
    return result


def build_markdown_report(
    inventory_rows: list[InventoryRow],
    classified_rows: list[dict[str, Any]],
    htaccess_entries: list[SeedEntry],
    sources: dict[str, str],
) -> str:
    """Render the editor-readable markdown triage report."""
    case1 = [e for e in classified_rows if e["_case"] == "case-1"]
    case2 = [e for e in classified_rows if e["_case"] == "case-2"]
    case3 = [e for e in classified_rows if e["_case"] == "case-3"]

    uri_modx_map = _build_uri_modx_map(inventory_rows)

    lines: list[str] = []
    lines.append("# Legacy URL Triage Report")
    lines.append("")
    lines.append(f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    lines.append("")
    lines.append("## Sources")
    lines.append("")
    lines.append(f"- Inventory CSV: `{sources.get('inventory', 'N/A')}`")
    lines.append(f"- SQLite DB: `{sources.get('db', 'N/A')}`")
    lines.append(f"- .htaccess: `{sources.get('htaccess', 'N/A')}`")
    lines.append("")
    lines.append("## Summary")
    lines.append("")
    lines.append(f"| Case | Count | Action |")
    lines.append(f"|------|-------|--------|")
    lines.append(f"| Case 1 — slug unchanged | {len(case1)} | Handled by wildcard; NOT seeded |")
    lines.append(f"| Case 2 — slug renamed  | {len(case2)} | Seeded as internal-301 |")
    lines.append(f"| Case 3 — page retired   | {len(case3)} | Seeded as gone-410 (pending editorial) |")
    lines.append(f"| .htaccess rules         | {len(htaccess_entries)} | Seeded as internal-301 |")
    lines.append(f"| **Total inventory**     | {len(inventory_rows)} | |")
    lines.append("")

    if case1:
        lines.append("## Case 1 — Slug Unchanged")
        lines.append("")
        lines.append("These are handled by the `next.config.ts` locale-prefix wildcard and are **not** seeded as URL Mapping rows.")
        lines.append("")
        lines.append("| MODX ID | Legacy Path | Current Slug | Locale |")
        lines.append("|---------|-------------|-------------|--------|")
        for e in case1:
            modx_id = uri_modx_map.get(e["legacyPath"], "?")
            slug = e['notes'].split(': ')[-1] if ': ' in e['notes'] else '?'
            lines.append(f"| {modx_id} | `{e['legacyPath']}` | `{slug}` | {e['locale']} |")
        lines.append("")

    if case2:
        lines.append("## Case 2 — Slug Renamed (internal-301)")
        lines.append("")
        lines.append("These legacy slugs differ from their current Strapi slug and are seeded as `internal-301` redirects.")
        lines.append("")
        lines.append("| MODX ID | Legacy Path | Destination | Locale | Notes |")
        lines.append("|---------|------------|-------------|--------|-------|")
        for e in case2:
            modx_id = uri_modx_map.get(e["legacyPath"], "?")
            lines.append(f"| {modx_id} | `{e['legacyPath']}` | `{e['destinationPath']}` | {e['locale']} | {e['notes']} |")
        lines.append("")

    if case3:
        lines.append("## Case 3 — Page Retired (gone-410)")
        lines.append("")
        lines.append("These pages are deleted, unpublished, or have no matching Strapi page. Seeded as `gone-410` pending editorial confirmation.")
        lines.append("")
        lines.append("| MODX ID | Legacy Path | Locale | Reason |")
        lines.append("|---------|------------|--------|--------|")
        for e in case3:
            modx_id = uri_modx_map.get(e["legacyPath"], "?")
            lines.append(f"| {modx_id} | `{e['legacyPath']}` | {e['locale']} | {e['notes']} |")
        lines.append("")

    if htaccess_entries:
        lines.append("## .htaccess Rules (Flattened)")
        lines.append("")
        lines.append("| Source | Destination | Locale | Notes |")
        lines.append("|--------|-------------|--------|-------|")
        for e in htaccess_entries:
            lines.append(f"| `{e.legacyPath}` | `{e.destinationPath}` | {e.locale or '-'} | {e.notes} |")
        lines.append("")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--inventory", type=Path, default=DEFAULT_INVENTORY,
        help="Path to Legacy URL Inventory CSV",
    )
    parser.add_argument(
        "--db", type=Path, default=DEFAULT_SQLITE_DB_PATH,
        help="Path to SQLite Strapi database",
    )
    parser.add_argument(
        "--htaccess", type=Path, default=DEFAULT_HTACCESS,
        help="Path to legacy .htaccess file",
    )
    parser.add_argument(
        "--triage-out", type=Path, default=DEFAULT_TRIAGE_OUT,
        help="Output path for markdown triage report",
    )
    parser.add_argument(
        "--seed-out", type=Path, default=DEFAULT_SEED_OUT,
        help="Output path for JSON seed file",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    # Validate inputs
    if not args.inventory.exists():
        print(f"Error: inventory CSV not found: {args.inventory}", file=sys.stderr)
        return 1
    if not args.db.exists():
        print(f"Error: SQLite database not found: {args.db}", file=sys.stderr)
        return 1

    # Load data
    print(f"Loading inventory from {args.inventory} ...")
    rows = load_inventory_csv(args.inventory)
    print(f"  {len(rows)} rows loaded")

    print(f"Loading Strapi pages from {args.db} ...")
    conn = connect_readonly(args.db)
    try:
        page_map = load_strapi_page_map(conn)
    finally:
        conn.close()
    print(f"  {len(page_map)} published pages")

    # Classify
    all_classified = classify_all_rows(rows, page_map)
    case1 = sum(1 for e in all_classified if e["_case"] == "case-1")
    case2 = sum(1 for e in all_classified if e["_case"] == "case-2")
    case3 = sum(1 for e in all_classified if e["_case"] == "case-3")
    print(f"  Case 1 (unchanged): {case1}")
    print(f"  Case 2 (renamed):   {case2}")
    print(f"  Case 3 (retired):   {case3}")

    # .htaccess
    htaccess_entries: list[SeedEntry] = []
    if args.htaccess.exists():
        print(f"Parsing .htaccess from {args.htaccess} ...")
        htaccess_text = args.htaccess.read_text(encoding="utf-8")
        rules = parse_htaccess_rules(htaccess_text)
        htaccess_entries = flatten_htaccess_rules(rules)
        print(f"  {len(rules)} redirect rules → {len(htaccess_entries)} seed entries")
    else:
        print(f".htaccess not found at {args.htaccess} — skipping")

    # Build seed JSON (case 2 + case 3 from classified rows, plus htaccess)
    seed_output: list[dict[str, Any]] = []
    for e in all_classified:
        if e["_case"] == "case-1":
            continue
        seed_output.append({
            "legacyPath": e["legacyPath"],
            "destinationPath": e["destinationPath"],
            "destinationKind": e["destinationKind"],
            "locale": e["locale"],
            "notes": e["notes"],
        })
    for e in htaccess_entries:
        seed_output.append({
            "legacyPath": e.legacyPath,
            "destinationPath": e.destinationPath,
            "destinationKind": e.destinationKind,
            "locale": e.locale,
            "notes": e.notes,
        })

    # Write outputs
    sources = {
        "inventory": str(args.inventory),
        "db": str(args.db),
        "htaccess": str(args.htaccess) if args.htaccess.exists() else "N/A",
    }

    args.triage_out.parent.mkdir(parents=True, exist_ok=True)
    report_md = build_markdown_report(rows, all_classified, htaccess_entries, sources)
    args.triage_out.write_text(report_md, encoding="utf-8")
    print(f"\nTriage report written to {args.triage_out}")

    args.seed_out.parent.mkdir(parents=True, exist_ok=True)
    args.seed_out.write_text(
        json.dumps(seed_output, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Seed file written to {args.seed_out} ({len(seed_output)} entries)")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
