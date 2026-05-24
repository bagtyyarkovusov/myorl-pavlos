#!/usr/bin/env python3
"""Seed Search Index — populate Meilisearch from Strapi.

Crawls all Pages and Video Entries from the CMS (Strapi) and pushes them into
the Search Indexes via the Next.js reindex API.

Interface:
  python3 tools/seed_search_index.py --target=dev --mode=full
  python3 tools/seed_search_index.py --target=dev --mode=single --content-type=page --id=abc123 --locale=el
  python3 tools/seed_search_index.py --target=production --mode=full --force
"""

from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import os
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any, Literal

from environments import ENVIRONMENTS, get

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

CONTENT_TYPES = ("page", "video")
LOCALES = ("el", "ru")
STRAPI_PAGE_SIZE = 500

# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------


@dataclass
class Target:
    name: str
    access: str
    meili_host_port: int | None


def _resolve_target(name: str) -> Target:
    env = get(name)
    return Target(name=name, access=env["access"], meili_host_port=env.get("meili_host_port"))


# ---------------------------------------------------------------------------
# Strapi client
# ---------------------------------------------------------------------------


def _strapi_headers() -> dict[str, str]:
    token = os.environ.get("STRAPI_API_TOKEN")
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _strapi_base_url() -> str:
    return os.environ.get("STRAPI_BASE_URL", "http://localhost:1337").rstrip("/")


def _fetch_strapi_all(endpoint: str) -> list[dict[str, Any]]:
    """Fetch all pages from a paginated Strapi endpoint."""
    base_url = _strapi_base_url()
    url = f"{base_url}{endpoint}&pagination[pageSize]={STRAPI_PAGE_SIZE}"
    page = 1
    all_data: list[dict[str, Any]] = []

    while True:
        page_url = f"{url}&pagination[page]={page}"
        try:
            req = urllib.request.Request(page_url, headers=_strapi_headers())
            with urllib.request.urlopen(req, timeout=30) as resp:
                body = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            print(f"ERROR: Strapi request failed: {e.code} {e.reason}", file=sys.stderr)
            sys.exit(1)
        except urllib.error.URLError as e:
            print(f"ERROR: Cannot reach Strapi at {_strapi_base_url()}: {e.reason}", file=sys.stderr)
            sys.exit(1)

        data = body.get("data", [])
        all_data.extend(data)

        meta = body.get("meta", {}) or {}
        pagination = meta.get("pagination", {}) or {}
        page_count = pagination.get("pageCount", 0)
        if page >= page_count:
            break
        page += 1

    return all_data


def crawl_pages(locale: str) -> list[dict[str, Any]]:
    """Fetch all Pages for a locale from Strapi."""
    endpoint = f"/api/pages?locale={locale}&populate=*"
    return _fetch_strapi_all(endpoint)


def crawl_video_entries(locale: str) -> list[dict[str, Any]]:
    """Fetch all Video Entries for a locale from Strapi."""
    endpoint = f"/api/video-entries?locale={locale}&populate=*"
    return _fetch_strapi_all(endpoint)


# ---------------------------------------------------------------------------
# Next.js reindex API client
# ---------------------------------------------------------------------------


def _nextjs_base_url(target: Target) -> str:
    """Return the Next.js base URL for the given target."""
    if target.name == "dev":
        return os.environ.get("NEXTJS_URL", "http://localhost:3000").rstrip("/")
    return os.environ.get("NEXTJS_URL", "").rstrip("/")


def _serialize_json(payload: dict[str, Any]) -> bytes:
    """Compact JSON serialization matching Node.js JSON.stringify."""
    return json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def _compute_hmac(payload: dict[str, Any]) -> str:
    """Compute HMAC-SHA256 signature for the JSON payload."""
    secret = os.environ.get("STRAPI_WEBHOOK_SECRET", "")
    body = _serialize_json(payload)
    return hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()


def _post_reindex(target: Target, payload: dict[str, Any]) -> dict[str, Any]:
    """POST a payload to the Next.js reindex endpoint."""
    base_url = _nextjs_base_url(target)
    if not base_url:
        print(
            "ERROR: NEXTJS_URL is not set and no default is known for target "
            f"{target.name!r}.",
            file=sys.stderr,
        )
        sys.exit(1)

    url = f"{base_url}/api/search/reindex"
    body = _serialize_json(payload)
    signature = _compute_hmac(payload)
    headers = {
        "Content-Type": "application/json",
        "x-webhook-signature": signature,
    }

    try:
        req = urllib.request.Request(url, data=body, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        print(f"ERROR: Reindex API returned {e.code}: {err_body}", file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as e:
        print(
            f"ERROR: Cannot reach Next.js at {base_url}: {e.reason}",
            file=sys.stderr,
        )
        sys.exit(1)


def reindex_single(target: Target, content_type: str, doc_id: str, locale: str) -> None:
    """Index a single document."""
    payload = {
        "contentType": content_type,
        "id": doc_id,
        "locale": locale,
        "action": "upsert",
    }
    result = _post_reindex(target, payload)
    status = "ok" if result.get("ok") else "FAILED"
    print(f"  [{status}] {content_type}:{locale}:{doc_id}  →  {json.dumps(result)}")


def reindex_bulk(target: Target, content_type: str, items: list[dict[str, str]]) -> dict[str, Any]:
    """Index a batch of documents."""
    if not items:
        return {"ok": True, "indexed": 0, "skipped": 0, "errors": []}

    payload = {"contentType": content_type, "items": items}
    return _post_reindex(target, payload)


# ---------------------------------------------------------------------------
# Full seed orchestrator
# ---------------------------------------------------------------------------


def _strip_id(id_value: Any) -> str:
    """Extract a string document ID from a Strapi entity."""
    if isinstance(id_value, str):
        return id_value
    if isinstance(id_value, dict):
        return str(id_value.get("documentId", ""))
    return str(id_value)


def run_full_seed(target: Target) -> int:
    """Crawl all content from Strapi and bulk-index into Meilisearch."""
    print(f"Target: {target.name}")
    print(f"Seeding search indexes — crawling Strapi at {_strapi_base_url()}...")
    print()

    totals: dict[str, dict[str, int]] = {}

    for content_type in CONTENT_TYPES:
        totals[content_type] = {}
        for locale in LOCALES:
            print(f"  Crawling {content_type}s [{locale}]...", end=" ", flush=True)

            if content_type == "page":
                entities = crawl_pages(locale)
            else:
                entities = crawl_video_entries(locale)

            count = len(entities)
            totals[content_type][locale] = count
            print(f"{count} found")

    print()

    # Bulk-index per content-type per locale
    indexed_total = 0
    skipped_total = 0
    errors_total = 0

    for content_type in CONTENT_TYPES:
        for locale in LOCALES:
            if totals[content_type][locale] == 0:
                continue

            print(f"  Indexing {content_type}s [{locale}]...", end=" ", flush=True)

            if content_type == "page":
                entities = crawl_pages(locale)
            else:
                entities = crawl_video_entries(locale)

            items = [
                {"id": _strip_id(e.get("documentId", e.get("id"))), "locale": locale}
                for e in entities
            ]

            result = reindex_bulk(target, content_type, items)
            indexed = result.get("indexed", 0)
            skipped = result.get("skipped", 0)
            errors = result.get("errors", [])

            indexed_total += indexed
            skipped_total += skipped
            errors_total += len(errors)

            status_parts = [f"indexed={indexed}"]
            if skipped:
                status_parts.append(f"skipped={skipped}")
            if errors:
                status_parts.append(f"errors={len(errors)}")
            print(", ".join(status_parts))

    print()
    print("── Full seed summary ──")
    for content_type in CONTENT_TYPES:
        for locale in LOCALES:
            print(f"  {content_type}s [{locale}]: {totals[content_type][locale]} found, indexed")
    print(f"  Total indexed: {indexed_total}")
    if skipped_total:
        print(f"  Skipped: {skipped_total}")
    if errors_total:
        print(f"  Errors: {errors_total}", file=sys.stderr)

    # Smoke test
    if target.meili_host_port:
        print()
        print("  Running smoke test: query 'ρινοπλαστική' on el index...")
        _smoke_test_meili(target, "el", "ρινοπλαστική")

    print()
    print("Done.")
    return 1 if errors_total else 0


def _smoke_test_meili(target: Target, locale: str, query: str) -> None:
    """Query Meilisearch to verify the index is populated."""
    host = f"http://localhost:{target.meili_host_port}"
    url = f"{host}/indexes/{locale}/search"
    body = json.dumps({"q": query, "limit": 3}).encode("utf-8")
    headers = {"Content-Type": "application/json"}

    try:
        req = urllib.request.Request(url, data=body, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            hits = result.get("hits", [])
            print(f"    {len(hits)} result(s) for '{query}'")
            for hit in hits[:3]:
                title = hit.get("title", "(no title)")
                doc_type = hit.get("type", "?")
                print(f"      - [{doc_type}] {title}")
    except urllib.error.URLError as e:
        print(f"    WARNING: Meili smoke test failed: {e.reason}", file=sys.stderr)


# ---------------------------------------------------------------------------
# Single mode
# ---------------------------------------------------------------------------


def run_single(target: Target, content_type: str, doc_id: str, locale: str) -> int:
    """Index a single document."""
    if content_type not in CONTENT_TYPES:
        print(
            f"ERROR: Unsupported content type {content_type!r}. Supported: {', '.join(CONTENT_TYPES)}.",
            file=sys.stderr,
        )
        return 1
    if locale not in LOCALES:
        print(
            f"ERROR: Unsupported locale {locale!r}. Supported: {', '.join(LOCALES)}.",
            file=sys.stderr,
        )
        return 1

    print(f"Indexing single {content_type} [{locale}]: {doc_id}...")
    reindex_single(target, content_type, doc_id, locale)
    print("Done.")
    return 0


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--target",
        choices=list(ENVIRONMENTS.keys()),
        required=True,
        help="Target environment",
    )
    parser.add_argument(
        "--mode",
        choices=["full", "single"],
        required=True,
        help="full = crawl all content; single = one document",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Required to run against production",
    )
    parser.add_argument("--content-type", choices=CONTENT_TYPES, help="Content type for single mode")
    parser.add_argument("--id", help="Document ID for single mode")
    parser.add_argument("--locale", choices=LOCALES, help="Locale for single mode")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    target = _resolve_target(args.target)

    if args.target == "production" and not args.force:
        print(
            "ERROR: Running against production requires --force.\n"
            "This will populate the production Search Indexes.",
            file=sys.stderr,
        )
        return 1

    if args.mode == "full":
        return run_full_seed(target)

    # Single mode
    if not args.content_type or not args.id or not args.locale:
        print(
            "ERROR: Single mode requires --content-type, --id, and --locale.",
            file=sys.stderr,
        )
        return 1

    return run_single(target, args.content_type, args.id, args.locale)


if __name__ == "__main__":
    sys.exit(main())
