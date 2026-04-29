"""Push refreshed HTML fields from ``transformed_resources.json`` into Strapi.

Uses ``modx_to_strapi.json`` (or ``--checkpoint``) to resolve MODX resource ids
to Strapi ``documentId`` values and rebuilds the same page payload shape as
``strapi_importer._build_page_payload`` so relations (``parentPage``, ``tags``,
media) stay aligned with the source tree.

Examples::

    python backfill_page_content.py --dry-run --limit 5
    python backfill_page_content.py --locale el
    python backfill_page_content.py

Navigation: if you later change ``slug`` or ``parentPage`` in Strapi, rebuild
the plugin tree with ``sync_navigation_from_pages.py`` (``--merge`` or
``--replace-existing``; see that script's docstring).

Does not run ``injection_readiness`` or snapshot the DB (unlike the main
importer).
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from collections import defaultdict
from pathlib import Path

from cms_audit import CHECKPOINT_SOURCE_DIR, MANIFESTS_DIR, MODX_SOURCE_DIR, REPORTS_DIR, ROOT
from typing import Any

from strapi_client import StrapiClient, StrapiError, load_strapi_env_from_dotenv
from transform_data import iter_resource_tree
from strapi_importer import (
    NORMALIZATION_PATH,
    TAG_ID_MAP_PATH,
    TAG_PLAN_PATH,
    TRANSFORMED_PATH,
    _build_page_payload,
    _load_json,
    _resolve_tags,
)

ROOT = Path(__file__).resolve().parents[1]
MODX_TO_STRAPI_PATH = CHECKPOINT_SOURCE_DIR / "modx_to_strapi.json"
CHECKPOINT_PATH = CHECKPOINT_SOURCE_DIR / "checkpoint.json"

logging.basicConfig(format="%(asctime)s %(levelname)s %(name)s %(message)s", level=logging.INFO)
logger = logging.getLogger("backfill_page_content")


def _pair_map(normalization: dict[str, Any]) -> dict[int, int]:
    return {p["web_id"]: p["rus_id"] for p in normalization.get("pairs", [])}


def _web_standalone_ids(normalization: dict[str, Any]) -> set[int]:
    return {s["id"] for s in normalization.get("web_singletons", []) if s.get("action") == "standalone"}


def _parent_document_id(
    resource: dict[str, Any],
    *,
    modx_to_strapi: dict[str, str],
    normalization: dict[str, Any],
) -> str | None:
    ctx = resource.get("context_key")
    parent_id = int(resource.get("parent") or 0)
    if not parent_id:
        return None

    if ctx == "web":
        pair_map = _pair_map(normalization)
        scope = set(pair_map.keys()) | _web_standalone_ids(normalization)
        if parent_id not in scope:
            return None
        return modx_to_strapi.get(str(parent_id))

    if ctx == "rus":
        parent_document_id = modx_to_strapi.get(str(parent_id))
        if parent_document_id:
            return parent_document_id
        reverse = {p["rus_id"]: p["web_id"] for p in normalization.get("pairs", [])}
        greek_parent_web = reverse.get(parent_id)
        if greek_parent_web:
            return modx_to_strapi.get(str(greek_parent_web))
        return None

    return None


def _strapi_locale(resource: dict[str, Any]) -> str | None:
    ctx = resource.get("context_key")
    if ctx == "web":
        return "el"
    if ctx == "rus":
        return "ru"
    return None


def _resources_by_checkpoint(
    resources: list[dict[str, Any]], checkpoint_pages: dict[str, dict[str, str]]
) -> list[tuple[dict[str, Any], str]]:
    """Return ``(resource, document_id)`` pairs for rows present in checkpoint."""

    out: list[tuple[dict[str, Any], str]] = []
    web_map = checkpoint_pages.get("web") or {}
    rus_map = checkpoint_pages.get("rus") or {}
    for r in resources:
        rid = str(r.get("id", ""))
        ctx = r.get("context_key")
        doc: str | None = None
        if ctx == "web":
            doc = web_map.get(rid)
        elif ctx == "rus":
            doc = rus_map.get(rid)
        if doc:
            out.append((r, doc))
    return out


def _resources_by_modx_map(
    resources: list[dict[str, Any]], modx_to_strapi: dict[str, str]
) -> list[tuple[dict[str, Any], str]]:
    out: list[tuple[dict[str, Any], str]] = []
    for r in resources:
        rid = str(r.get("id", ""))
        doc = modx_to_strapi.get(rid)
        if doc and r.get("context_key") in ("web", "rus"):
            out.append((r, doc))
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Log actions only (StrapiClient dry-run).")
    parser.add_argument(
        "--checkpoint",
        action="store_true",
        help="Use checkpoint.json pages maps instead of modx_to_strapi.json.",
    )
    parser.add_argument("--locale", choices=("el", "ru", "all"), default="all", help="Restrict to one Strapi locale.")
    parser.add_argument("--limit", type=int, default=0, help="Max pages to update (0 = no limit).")
    parser.add_argument("--sleep-ms", type=int, default=50, help="Pause between PUTs to avoid rate limits.")
    parser.add_argument(
        "--report",
        type=Path,
        default=REPORTS_DIR / "backfill_page_content_report.json",
        help="Write JSON summary of successes and failures.",
    )
    args = parser.parse_args()

    resources: list[dict[str, Any]] = _load_json(TRANSFORMED_PATH, [])
    resources_flat = iter_resource_tree(resources)
    normalization = _load_json(NORMALIZATION_PATH, {})
    tag_plan = _load_json(TAG_PLAN_PATH, {})
    tag_id_map = _load_json(TAG_ID_MAP_PATH, {})

    modx_to_strapi = _load_json(MODX_TO_STRAPI_PATH, {})
    if args.checkpoint:
        checkpoint = _load_json(CHECKPOINT_PATH, {})
        pairs = _resources_by_checkpoint(resources_flat, checkpoint.get("pages") or {})
    else:
        pairs = _resources_by_modx_map(resources_flat, modx_to_strapi)

    drops: defaultdict[str, int] = defaultdict(int)
    report: dict[str, Any] = {"ok": [], "errors": [], "skipped": []}

    load_strapi_env_from_dotenv()
    base_url = os.environ.get("STRAPI_URL")
    if not base_url and args.dry_run:
        base_url = "http://127.0.0.1:1"
    client = StrapiClient(base_url=base_url, dry_run=args.dry_run)
    done = 0
    for resource, document_id in pairs:
        locale = _strapi_locale(resource)
        if locale is None:
            report["skipped"].append({"id": resource.get("id"), "reason": "unknown context_key"})
            continue
        if args.locale != "all" and locale != args.locale:
            continue

        parent_document_id = _parent_document_id(
            resource, modx_to_strapi=modx_to_strapi, normalization=normalization
        )
        tag_ids, unresolved_tags = _resolve_tags(resource, tag_id_map, tag_plan)
        if unresolved_tags:
            logger.warning(
                "MODX id %s locale %s unresolved tags %s (continuing like importer)",
                resource.get("id"),
                locale,
                unresolved_tags,
            )

        payload = _build_page_payload(
            resource,
            parent_document_id=parent_document_id,
            tag_document_ids=tag_ids,
            drops=drops,
        )

        rid = resource.get("id")
        try:
            client.put(f"/api/pages/{document_id}", {"data": payload}, locale=locale)
            report["ok"].append({"modx_id": rid, "document_id": document_id, "locale": locale})
            logger.info("Updated page modx_id=%s document_id=%s locale=%s", rid, document_id, locale)
        except StrapiError as exc:
            report["errors"].append({"modx_id": rid, "document_id": document_id, "locale": locale, "error": str(exc)})
            logger.error("Failed modx_id=%s: %s", rid, exc)

        done += 1
        if args.limit and done >= args.limit:
            break
        if args.sleep_ms:
            time.sleep(args.sleep_ms / 1000.0)

    report["counts"] = {"ok": len(report["ok"]), "errors": len(report["errors"]), "skipped": len(report["skipped"])}
    with args.report.open("w", encoding="utf-8") as fh:
        json.dump(report, fh, ensure_ascii=False, indent=2)
    logger.info("Wrote report to %s", args.report)
    return 1 if report["errors"] else 0


if __name__ == "__main__":
    sys.exit(main())
