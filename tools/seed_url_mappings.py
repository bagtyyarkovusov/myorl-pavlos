#!/usr/bin/env python3
"""Seed the Strapi URL Mapping collection from audit JSON output.

Consumes the JSON seed file produced by ``tools/audit_legacy_urls.py`` and
creates or updates URL Mapping rows via the Strapi REST API. The script is
idempotent: re-running with identical input produces zero new rows.

Editor-curated ``gone-410`` rows are protected from overwrite — if a legacy
path already exists with ``destinationKind: gone-410``, the seed input is
skipped for that path (editor curation takes priority).

Usage:
  python tools/seed_url_mappings.py
  python tools/seed_url_mappings.py --dry-run
  python tools/seed_url_mappings.py --apply
  python tools/seed_url_mappings.py --input custom-seed.json --apply
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from cms_audit import REPORTS_DIR
from strapi_client import StrapiClient, StrapiError

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = REPORTS_DIR / "url-mapping-seed.json"
DEFAULT_RESULT = REPORTS_DIR / "url-mapping-seed-result.md"

STRAPI_PAGE_SIZE = 100


# ---------------------------------------------------------------------------
# JSON loader
# ---------------------------------------------------------------------------


def load_seed_json(path: Path) -> list[dict[str, Any]]:
    """Load and validate the seed JSON array."""
    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        raise ValueError(
            f"Seed file must contain a JSON array, got {type(raw).__name__}"
        )
    return raw


# ---------------------------------------------------------------------------
# Action classification
# ---------------------------------------------------------------------------


def classify_action(
    entry: dict[str, Any],
    existing_map: dict[str, dict[str, Any]],
) -> tuple[str, Optional[dict[str, Any]]]:
    """Classify a single seed entry against existing URL Mapping rows.

    Returns (action, existing_row) where action is one of:
      - ``"create"`` — no existing row with this legacyPath
      - ``"update"`` — different destination, not blocked by curation rules
      - ``"skip-identical"`` — destination and kind already match (idempotency)
      - ``"skip-gone-410"`` — existing row is gone-410 (editor curation wins)
      - ``"skip-301-curated"`` — existing row is a 301 redirect; seed wants
        to downgrade to gone-410. Editor-curated 301s win over auto-generated
        deletions (the audit can't distinguish "page was renamed but we
        haven't recorded the new target yet" from "page was retired").
    """
    legacy_path = entry["legacyPath"]
    existing = existing_map.get(legacy_path)

    if existing is None:
        return ("create", None)

    existing_kind = existing.get("destinationKind")

    # Editor-curated gone-410 rows are protected from overwrite.
    if existing_kind == "gone-410":
        return ("skip-gone-410", existing)

    # Editor-curated 301 rows are protected from being downgraded to gone-410.
    # When the seed says "this path is gone" but Strapi already has a real
    # redirect destination for it, trust the curated destination.
    entry_kind = entry.get("destinationKind")
    if entry_kind == "gone-410" and existing_kind in {"internal-301", "external-301"}:
        return ("skip-301-curated", existing)

    # Check idempotency: same destination path + same kind → skip.
    if (
        existing.get("destinationPath") == entry.get("destinationPath")
        and existing.get("destinationKind") == entry_kind
    ):
        return ("skip-identical", existing)

    return ("update", existing)


# ---------------------------------------------------------------------------
# Strapi operations
# ---------------------------------------------------------------------------


def _fetch_existing_map(client: StrapiClient) -> dict[str, dict[str, Any]]:
    """Fetch all existing URL Mapping rows, keyed by legacyPath."""
    existing: dict[str, dict[str, Any]] = {}
    page = 1
    while True:
        result = client.get(
            "/api/url-mappings",
            **{
                "pagination[page]": page,
                "pagination[pageSize]": STRAPI_PAGE_SIZE,
            },
        )
        data = result.get("data", [])
        if not data:
            break
        for item in data:
            attrs = item.get("attributes", item)
            path = attrs.get("legacyPath", "")
            if path:
                existing[path] = {
                    "documentId": item.get("documentId") or item.get("id"),
                    **attrs,
                }
        meta = result.get("meta", {})
        pagination = meta.get("pagination", {})
        if page >= pagination.get("pageCount", 1):
            break
        page += 1
    return existing


def _create_entry(client: StrapiClient, entry: dict[str, Any]) -> dict[str, Any]:
    """Create a new URL Mapping row."""
    return client.post(
        "/api/url-mappings",
        {"data": entry},
    )


def _update_entry(
    client: StrapiClient, document_id: str, entry: dict[str, Any]
) -> dict[str, Any]:
    """Update an existing URL Mapping row."""
    return client.put(
        f"/api/url-mappings/{document_id}",
        {"data": entry},
    )


# ---------------------------------------------------------------------------
# Core seeding logic
# ---------------------------------------------------------------------------


def run_seed(
    entries: list[dict[str, Any]],
    existing_map: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    """Classify entries against existing rows and return action counts + lists.

    Returns a dict with keys: ``added``, ``updated``, ``skipped``, ``errors``,
    ``input_count``, ``created``, ``updated_list``, ``skipped_list``.
    """
    created: list[dict[str, Any]] = []
    updated_list: list[dict[str, Any]] = []
    skipped_list: list[dict[str, Any]] = []

    for entry in entries:
        action, existing = classify_action(entry, existing_map)
        if action == "create":
            created.append({"entry": entry})
        elif action == "update":
            updated_list.append({"entry": entry, "existing": existing})
        else:
            skipped_list.append({"entry": entry, "reason": action})

    return {
        "added": len(created),
        "updated": len(updated_list),
        "skipped": len(skipped_list),
        "errors": 0,
        "input_count": len(entries),
        "created": created,
        "updated_list": updated_list,
        "skipped_list": skipped_list,
    }


# ---------------------------------------------------------------------------
# Markdown report
# ---------------------------------------------------------------------------


def build_markdown_summary(
    stats: dict[str, int],
    created: list[dict[str, Any]],
    updated_list: list[dict[str, Any]],
    skipped_list: list[dict[str, Any]],
) -> str:
    """Render a markdown summary report of the seeding run."""
    lines: list[str] = []
    lines.append("# URL Mapping Seed Result")
    lines.append("")
    lines.append(
        f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}"
    )
    lines.append("")

    lines.append("## Summary")
    lines.append("")
    lines.append(f"| Metric | Count |")
    lines.append(f"|--------|-------|")
    lines.append(f"| Input rows | **{stats['input_count']}** |")
    lines.append(f"| Rows added | **{stats['added']}** |")
    lines.append(f"| Rows updated | **{stats['updated']}** |")
    lines.append(f"| Rows skipped | **{stats['skipped']}** |")
    lines.append(f"| Errors | **{stats['errors']}** |")
    lines.append("")

    if created:
        lines.append("## Created")
        lines.append("")
        lines.append("| Legacy Path | Destination | Kind | Locale |")
        lines.append("|-------------|-------------|------|--------|")
        for item in created:
            e = item["entry"]
            lines.append(
                f"| `{e['legacyPath']}` | `{e['destinationPath']}` "
                f"| {e['destinationKind']} | {e.get('locale', '-')} |"
            )
        lines.append("")

    if updated_list:
        lines.append("## Updated")
        lines.append("")
        lines.append("| Legacy Path | Old Destination | New Destination | Kind |")
        lines.append("|-------------|----------------|-----------------|------|")
        for item in updated_list:
            e = item["entry"]
            ex = item["existing"]
            lines.append(
                f"| `{e['legacyPath']}` "
                f"| `{ex.get('destinationPath', '')}` "
                f"| `{e['destinationPath']}` "
                f"| {e['destinationKind']} |"
            )
        lines.append("")

    if skipped_list:
        lines.append("## Skipped")
        lines.append("")
        lines.append("| Legacy Path | Reason |")
        lines.append("|-------------|--------|")
        for item in skipped_list:
            e = item["entry"]
            reason = item["reason"]
            if reason == "skip-gone-410":
                reason = "gone-410 protection (editor-curated)"
            elif reason == "skip-identical":
                reason = "already identical (idempotent)"
            elif reason == "skip-301-curated":
                reason = "existing 301 protected from gone-410 downgrade"
            lines.append(f"| `{e['legacyPath']}` | {reason} |")
        lines.append("")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input",
        type=Path,
        default=DEFAULT_INPUT,
        help="Path to seed JSON file (default: artifacts/reports/url-mapping-seed.json)",
    )
    parser.add_argument(
        "--result",
        type=Path,
        default=DEFAULT_RESULT,
        help="Output path for markdown summary report",
    )
    parser.add_argument(
        "--strapi-url",
        default=None,
        help="Strapi base URL (default: $STRAPI_URL env var)",
    )
    parser.add_argument(
        "--strapi-token",
        default=None,
        help="Strapi API token (default: $STRAPI_API_TOKEN env var)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without writing to Strapi",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write changes to Strapi (default is dry-run)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    # Validate input
    if not args.input.exists():
        print(f"Error: seed JSON not found: {args.input}", file=sys.stderr)
        print(
            "Run tools/audit_legacy_urls.py first to generate the seed file.",
            file=sys.stderr,
        )
        return 1

    # Load seed data
    try:
        entries = load_seed_json(args.input)
    except (json.JSONDecodeError, ValueError) as exc:
        print(f"Error reading seed file: {exc}", file=sys.stderr)
        return 1

    print(f"Loaded {len(entries)} entries from {args.input}")

    # Fetch existing URL Mapping rows from Strapi
    dry_run = not args.apply
    try:
        client = StrapiClient(
            base_url=args.strapi_url,
            token=args.strapi_token,
            dry_run=(dry_run or args.dry_run),
        )
    except RuntimeError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        print(
            "Set STRAPI_URL and STRAPI_API_TOKEN env vars or pass --strapi-url / --strapi-token.",
            file=sys.stderr,
        )
        return 1

    is_writable = args.apply and not args.dry_run

    if is_writable:
        print("Fetching existing URL Mappings from Strapi ...")
    else:
        print("Dry-run mode: fetching existing URL Mappings from Strapi ...")

    try:
        existing_map = _fetch_existing_map(client)
    except StrapiError as exc:
        print(f"Error fetching existing URL Mappings: {exc}", file=sys.stderr)
        return 1

    print(f"  {len(existing_map)} existing URL Mapping rows")

    # Classify
    result = run_seed(entries, existing_map)
    print(
        f"  Added: {result['added']}, "
        f"Updated: {result['updated']}, "
        f"Skipped: {result['skipped']}"
    )

    # Apply writes if requested
    errors: list[dict[str, Any]] = []
    if is_writable and (result["added"] > 0 or result["updated"] > 0):
        print("Applying changes to Strapi ...")
        write_client = StrapiClient(
            base_url=args.strapi_url,
            token=args.strapi_token,
            dry_run=False,
        )

        for item in result["created"]:
            e = item["entry"]
            try:
                _create_entry(write_client, e)
            except StrapiError as exc:
                errors.append({"legacyPath": e["legacyPath"], "action": "create", "error": str(exc)})

        for item in result["updated_list"]:
            e = item["entry"]
            ex = item["existing"]
            doc_id = ex.get("documentId")
            if not doc_id:
                errors.append({"legacyPath": e["legacyPath"], "action": "update", "error": "missing documentId"})
                continue
            try:
                _update_entry(write_client, doc_id, e)
            except StrapiError as exc:
                errors.append({"legacyPath": e["legacyPath"], "action": "update", "error": str(exc)})

        result["errors"] = len(errors)
        print(f"  Applied with {len(errors)} errors")
    elif is_writable:
        print("  Nothing to apply.")
    else:
        print("  Dry-run: no changes written. Use --apply to write.")

    # Write markdown summary report
    stats = {
        "added": result["added"],
        "updated": result["updated"],
        "skipped": result["skipped"],
        "errors": result["errors"],
        "input_count": result["input_count"],
    }
    report_md = build_markdown_summary(
        stats,
        result.get("created", []),
        result.get("updated_list", []),
        result.get("skipped_list", []),
    )

    args.result.parent.mkdir(parents=True, exist_ok=True)
    args.result.write_text(report_md, encoding="utf-8")
    print(f"\nSummary report written to {args.result}")

    if errors:
        print(f"\n{len(errors)} error(s) occurred during apply:")
        for err in errors:
            print(f"  - {err['legacyPath']}: {err['action']} → {err['error']}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
