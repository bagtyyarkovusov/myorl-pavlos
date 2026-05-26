#!/usr/bin/env python3
"""Snapshot GSC Baseline — pull a pre-launch ranking baseline from Google Search Console.

Pulls the top 100 queries, top 100 landing pages, country breakdown, and device
breakdown from the GSC API and writes a versioned JSON snapshot.

Interface:
  python3 tools/snapshot_gsc_baseline.py \\
    --credentials path/to/gsc-service-account.json \\
    --property sc-domain:myorl.gr

  python3 tools/snapshot_gsc_baseline.py \\
    --credentials path/to/gsc-service-account.json \\
    --property sc-domain:myorl.gr \\
    --start-date 2026-01-01 \\
    --end-date 2026-05-26 \\
    --output artifacts/seo-baseline/2026-05-26.json
"""

from __future__ import annotations

import argparse
import datetime
import json
import sys
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Lazy Google imports — only needed when making API calls (not in tests)
# ---------------------------------------------------------------------------

_GSERVICE_AVAILABLE = False
service_account = None  # type: ignore[assignment]
build = None  # type: ignore[assignment]

try:
    from google.oauth2 import service_account as _sa  # noqa: F401
    from googleapiclient.discovery import build as _build  # noqa: F401

    service_account = _sa
    build = _build
    _GSERVICE_AVAILABLE = True
except ImportError:
    pass

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

TOOL_VERSION = "1.0.0"
DEFAULT_OUTPUT_DIR = "artifacts/seo-baseline"
DEFAULT_DAYS_BACK = 90
DEFAULT_ROW_LIMIT = 100
GSC_SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]

# ---------------------------------------------------------------------------
# GSC service builder
# ---------------------------------------------------------------------------


def _build_gsc_service(credentials_path: str) -> Any:
    """Build and return a Google Search Console API service object.

    Raises ImportError if google-auth or google-api-python-client are missing.
    Raises ValueError/OSError on credential file issues.
    """
    if not _GSERVICE_AVAILABLE:
        raise ImportError(
            "google-auth and google-api-python-client are required for GSC API calls.\n"
            "Install them with: pip install google-auth google-api-python-client"
        )

    credentials = service_account.Credentials.from_service_account_file(
        credentials_path, scopes=GSC_SCOPES
    )
    return build("webmasters", "v3", credentials=credentials)


# ---------------------------------------------------------------------------
# GSC query helpers
# ---------------------------------------------------------------------------


def _query_gsc(
    service: Any,
    property_uri: str,
    start_date: str,
    end_date: str,
    dimensions: list[str],
    row_limit: int = DEFAULT_ROW_LIMIT,
) -> dict[str, Any]:
    """Execute a GSC search analytics query and return the raw response."""
    request_body: dict[str, Any] = {
        "startDate": start_date,
        "endDate": end_date,
        "dimensions": dimensions,
        "rowLimit": row_limit,
    }
    response = (
        service.searchanalytics()
        .query(siteUrl=property_uri, body=request_body)
        .execute()
    )
    return response


def _parse_row(
    row: dict[str, Any], key_field: str, value_fields: list[str]
) -> dict[str, Any]:
    """Convert a GSC API row into a flat dict keyed by *key_field*.

    The GSC returns ``keys`` as a list (one per dimension). We take the first
    dimension value for *key_field* and merge it with the requested metrics.
    """
    result: dict[str, Any] = {key_field: row["keys"][0]}
    for field in value_fields:
        result[field] = row.get(field, 0)
    return result


def _format_query_response(
    response: dict[str, Any], key_field: str, value_fields: list[str]
) -> list[dict[str, Any]]:
    """Format a raw GSC query response into a list of row dicts."""
    rows = response.get("rows", []) or []
    return [_parse_row(row, key_field, value_fields) for row in rows]


# ---------------------------------------------------------------------------
# Data fetchers (public — receive a service object for testability)
# ---------------------------------------------------------------------------

VALUE_FIELDS = ["clicks", "impressions", "position", "ctr"]


def fetch_top_queries(
    service: Any, property_uri: str, start_date: str, end_date: str, limit: int = DEFAULT_ROW_LIMIT
) -> list[dict[str, Any]]:
    """Fetch top queries by clicks for the given date range."""
    response = _query_gsc(service, property_uri, start_date, end_date, ["query"], limit)
    return _format_query_response(response, "query", VALUE_FIELDS)


def fetch_top_pages(
    service: Any, property_uri: str, start_date: str, end_date: str, limit: int = DEFAULT_ROW_LIMIT
) -> list[dict[str, Any]]:
    """Fetch top landing pages by clicks for the given date range."""
    response = _query_gsc(service, property_uri, start_date, end_date, ["page"], limit)
    return _format_query_response(response, "page", VALUE_FIELDS)


def fetch_by_country(
    service: Any, property_uri: str, start_date: str, end_date: str
) -> dict[str, list[dict[str, Any]]]:
    """Fetch query breakdown by country."""
    response = _query_gsc(
        service, property_uri, start_date, end_date, ["query", "country"], DEFAULT_ROW_LIMIT
    )
    rows = response.get("rows", []) or []
    by_country: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        country = row["keys"][1]
        by_country.setdefault(country, []).append(_parse_row(row, "query", VALUE_FIELDS))
    return by_country


def fetch_by_device(
    service: Any, property_uri: str, start_date: str, end_date: str
) -> dict[str, list[dict[str, Any]]]:
    """Fetch query breakdown by device category (DESKTOP / MOBILE / TABLET)."""
    response = _query_gsc(
        service, property_uri, start_date, end_date, ["query", "device"], DEFAULT_ROW_LIMIT
    )
    rows = response.get("rows", []) or []
    by_device: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        device = row["keys"][1]
        by_device.setdefault(device, []).append(_parse_row(row, "query", VALUE_FIELDS))
    return by_device


# ---------------------------------------------------------------------------
# Snapshot assembly
# ---------------------------------------------------------------------------


def build_snapshot(
    property_uri: str,
    start_date: str,
    end_date: str,
    top_queries: list[dict[str, Any]],
    top_pages: list[dict[str, Any]],
    by_country: dict[str, list[dict[str, Any]]],
    by_device: dict[str, list[dict[str, Any]]],
) -> dict[str, Any]:
    """Assemble the four GSC data sections into the standard snapshot schema."""
    return {
        "meta": {
            "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "property": property_uri,
            "date_range": [start_date, end_date],
            "tool_version": TOOL_VERSION,
        },
        "top_queries": top_queries,
        "top_pages": top_pages,
        "by_country": by_country,
        "by_device": by_device,
    }


def write_snapshot(snapshot: dict[str, Any], output_path: Path) -> None:
    """Write the snapshot JSON to *output_path*, creating parent dirs as needed."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, indent=2, ensure_ascii=False)


# ---------------------------------------------------------------------------
# CLI helpers
# ---------------------------------------------------------------------------


def _build_output_path(end_date: str, output_dir: str = DEFAULT_OUTPUT_DIR) -> Path:
    """Resolve the snapshot output file path for the given date."""
    return Path(output_dir) / f"{end_date}.json"


def _validate_dates(start_date: str, end_date: str) -> None:
    """Validate that dates are in YYYY-MM-DD format and *start_date* ≤ *end_date*.

    Raises ValueError on invalid format or inverted range.
    """
    try:
        start = datetime.date.fromisoformat(start_date)
        end = datetime.date.fromisoformat(end_date)
    except (ValueError, TypeError) as exc:
        raise ValueError(
            f"Dates must be in YYYY-MM-DD format. Got start={start_date!r}, end={end_date!r}"
        ) from exc

    if start > end:
        raise ValueError(
            f"Start date {start_date!r} is after end date {end_date!r}."
        )


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def parse_args() -> argparse.Namespace:
    default_end = datetime.date.today().isoformat()
    default_start = (datetime.date.today() - datetime.timedelta(days=DEFAULT_DAYS_BACK)).isoformat()

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--credentials",
        required=True,
        help="Path to GSC service-account JSON key file (not committed)",
    )
    parser.add_argument(
        "--property",
        required=True,
        help="GSC Domain Property identifier, e.g. sc-domain:myorl.gr",
    )
    parser.add_argument(
        "--start-date",
        default=default_start,
        help=f"Start date YYYY-MM-DD (default: {default_start}, 90 days ago)",
    )
    parser.add_argument(
        "--end-date",
        default=default_end,
        help=f"End date YYYY-MM-DD (default: {default_end}, today)",
    )
    parser.add_argument(
        "--output",
        default=None,
        help=f"Output file path (default: {DEFAULT_OUTPUT_DIR}/<end-date>.json)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    # Validate dates first — fail fast before touching the network
    try:
        _validate_dates(args.start_date, args.end_date)
    except ValueError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1

    # Check credentials file exists
    if not Path(args.credentials).exists():
        print(
            f"ERROR: Credentials file not found: {args.credentials}",
            file=sys.stderr,
        )
        return 1

    # Build GSC service
    try:
        service = _build_gsc_service(args.credentials)
    except ImportError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1
    except (ValueError, OSError) as e:
        print(
            f"ERROR: Failed to load GSC credentials from {args.credentials}: {e}",
            file=sys.stderr,
        )
        return 1

    print(f"Property: {args.property}")
    print(f"Date range: {args.start_date} → {args.end_date}")
    print()

    # Fetch data
    print("Fetching top queries...", end=" ", flush=True)
    top_queries = fetch_top_queries(service, args.property, args.start_date, args.end_date)
    print(f"{len(top_queries)} found")

    print("Fetching top pages...", end=" ", flush=True)
    top_pages = fetch_top_pages(service, args.property, args.start_date, args.end_date)
    print(f"{len(top_pages)} found")

    print("Fetching country breakdown...", end=" ", flush=True)
    by_country = fetch_by_country(service, args.property, args.start_date, args.end_date)
    print(f"{len(by_country)} countries")

    print("Fetching device breakdown...", end=" ", flush=True)
    by_device = fetch_by_device(service, args.property, args.start_date, args.end_date)
    print(f"{len(by_device)} device categories")

    # Build and write snapshot
    snapshot = build_snapshot(
        property_uri=args.property,
        start_date=args.start_date,
        end_date=args.end_date,
        top_queries=top_queries,
        top_pages=top_pages,
        by_country=by_country,
        by_device=by_device,
    )

    output_path = (
        Path(args.output)
        if args.output
        else _build_output_path(args.end_date)
    )
    write_snapshot(snapshot, output_path)

    print()
    print(f"Snapshot written to {output_path}")
    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
