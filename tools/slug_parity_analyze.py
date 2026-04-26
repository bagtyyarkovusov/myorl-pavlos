#!/usr/bin/env python3
"""Compare MODX ``alias`` (canonical flat URL segment) to Strapi ``Page.slug``.

Emits ``slug_parity_report.json`` for review before ``slug_parity_apply.py``.
"""

from __future__ import annotations

import argparse
import json
import logging
import re
import sys
from collections import defaultdict
from pathlib import Path

from cms_audit import CHECKPOINT_SOURCE_DIR, MANIFESTS_DIR, MODX_SOURCE_DIR, REPORTS_DIR, ROOT
from typing import Any, Dict, List, Optional, Set, Tuple

from slug_uid_utils import assign_resolved_slugs_for_report_rows
from strapi_client import StrapiClient, StrapiError, load_strapi_env_from_dotenv
from transform_data import iter_resource_tree

logger = logging.getLogger("slug_parity_analyze")

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MODX = MODX_SOURCE_DIR / "published_resources_flat.json"
DEFAULT_TRANSFORMED = MODX_SOURCE_DIR / "transformed_resources.json"
DEFAULT_CHECKPOINT = CHECKPOINT_SOURCE_DIR / "checkpoint.json"
DEFAULT_OUT = REPORTS_DIR / "slug_parity_report.json"

# MODX ``context_key`` in export → Strapi i18n locale code
CONTEXT_TO_LOCALE = {"web": "el", "rus": "ru"}

PAGE_SIZE = 100


def _get_entry_value(entry: Dict[str, Any], key: str) -> Any:
    if key in entry:
        return entry.get(key)
    return entry.get("attributes", {}).get(key)


def _load_modx_flat(path: Path) -> List[dict]:
    with path.open(encoding="utf-8") as handle:
        data = json.load(handle)
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and "resources" in data:
        return iter_resource_tree(data["resources"])
    return iter_resource_tree(data)


def _fetch_locale_slug_maps(
    client: StrapiClient, locales: Tuple[str, ...]
) -> Dict[str, Dict[str, str]]:
    """locale -> documentId -> slug (latest row wins if duplicates)."""

    out: Dict[str, Dict[str, str]] = {loc: {} for loc in locales}
    for locale in locales:
        page = 1
        while True:
            try:
                response = client.get(
                    "/api/pages",
                    **{
                        "locale": locale,
                        "pagination[page]": page,
                        "pagination[pageSize]": PAGE_SIZE,
                        "fields[0]": "slug",
                        "fields[1]": "title",
                    },
                )
            except StrapiError as exc:
                logger.error("Strapi GET failed: %s", exc)
                raise
            entries = response.get("data", []) or []
            for entry in entries:
                doc = str(_get_entry_value(entry, "documentId") or "")
                slug = (_get_entry_value(entry, "slug") or "").strip()
                if doc:
                    out[locale][doc] = slug
            meta = response.get("meta", {}).get("pagination", {})
            if page >= int(meta.get("pageCount") or 1):
                break
            page += 1
    return out


def _slug_suffix_is_modx_id(slug: str, modx_id: str) -> bool:
    if not slug or not modx_id.isdigit():
        return False
    m = re.match(r"^(.+)-(\d+)$", slug)
    if not m:
        return False
    return m.group(2) == modx_id


def _detect_swap_pairs(rows: List[Dict[str, Any]]) -> List[Tuple[str, str]]:
    """(doc_a, doc_b) where A wants B's current slug and B wants A's."""

    active = [r for r in rows if r.get("change_needed") and r.get("document_id")]
    pairs: List[Tuple[str, str]] = []
    seen: Set[Tuple[str, str]] = set()
    for i, ra in enumerate(active):
        da = ra["document_id"]
        ca = ra.get("current_slug") or ""
        pa = ra.get("strapi_slug_resolved") or ra.get("strapi_slug_ascii") or ra.get("proposed_slug") or ""
        if not pa:
            continue
        for rb in active[i + 1 :]:
            db = rb["document_id"]
            cb = rb.get("current_slug") or ""
            pb = rb.get("strapi_slug_resolved") or rb.get("strapi_slug_ascii") or rb.get("proposed_slug") or ""
            if pa == cb and pb == ca:
                key = tuple(sorted((da, db)))
                if key not in seen:
                    seen.add(key)
                    pairs.append((da, db))
    return pairs


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    parser = argparse.ArgumentParser(description="Build MODX vs Strapi slug parity report.")
    parser.add_argument(
        "--modx",
        type=Path,
        default=None,
        help=f"MODX JSON (flat list or tree). Default: {DEFAULT_MODX} if present else {DEFAULT_TRANSFORMED}",
    )
    parser.add_argument("--checkpoint", type=Path, default=DEFAULT_CHECKPOINT)
    parser.add_argument("--output", "-o", type=Path, default=DEFAULT_OUT)
    parser.add_argument(
        "--skip-strapi",
        action="store_true",
        help="Do not call Strapi; rows lack current_slug/collision (checkpoint + MODX only).",
    )
    args = parser.parse_args()

    modx_path = args.modx
    if modx_path is None:
        modx_path = DEFAULT_MODX if DEFAULT_MODX.is_file() else DEFAULT_TRANSFORMED
    if not modx_path.is_file():
        logger.error("MODX file not found: %s", modx_path)
        return 1

    with args.checkpoint.open(encoding="utf-8") as handle:
        checkpoint: Dict[str, Any] = json.load(handle)
    pages_ck = checkpoint.get("pages") or {}
    if not isinstance(pages_ck, dict):
        logger.error("checkpoint.json missing pages map")
        return 1

    flat = _load_modx_flat(modx_path)
    strapi_locale_slugs: Dict[str, Dict[str, str]] = {}
    slug_to_docs: Dict[str, Dict[str, List[str]]] = defaultdict(lambda: defaultdict(list))

    if not args.skip_strapi:
        load_strapi_env_from_dotenv()
        client = StrapiClient()
        strapi_locale_slugs = _fetch_locale_slug_maps(client, tuple(CONTEXT_TO_LOCALE.values()))
        for locale, doc_map in strapi_locale_slugs.items():
            for doc_id, slug in doc_map.items():
                if slug:
                    slug_to_docs[locale][slug].append(doc_id)

    rows: List[Dict[str, Any]] = []
    for resource in flat:
        ctx = resource.get("context_key") or ""
        if ctx not in CONTEXT_TO_LOCALE:
            continue
        locale = CONTEXT_TO_LOCALE[ctx]
        modx_id = str(resource.get("id") or "")
        if not modx_id.isdigit():
            continue
        alias = (resource.get("alias") or "").strip()
        page_map = pages_ck.get(ctx) or {}
        document_id = page_map.get(modx_id)
        if not document_id:
            rows.append(
                {
                    "modx_id": modx_id,
                    "context_key": ctx,
                    "strapi_locale": locale,
                    "document_id": None,
                    "alias": alias,
                    "pagetitle": (resource.get("pagetitle") or "")[:200],
                    "current_slug": None,
                    "proposed_slug": alias if alias else None,
                    "change_needed": False,
                    "collision_document_id": None,
                    "blocked_reason": None,
                    "notes": "missing_checkpoint_mapping",
                }
            )
            continue

        current_slug = None
        if not args.skip_strapi:
            current_slug = strapi_locale_slugs.get(locale, {}).get(str(document_id))

        proposed_slug = alias if alias else None

        notes_parts: List[str] = []
        if alias and current_slug and _slug_suffix_is_modx_id(current_slug, modx_id):
            notes_parts.append("current_slug_suffix_matches_modx_id")
        if not alias:
            notes_parts.append("no_modx_alias_skip")

        rows.append(
            {
                "modx_id": modx_id,
                "context_key": ctx,
                "strapi_locale": locale,
                "document_id": str(document_id),
                "alias": alias,
                "pagetitle": (resource.get("pagetitle") or "")[:200],
                "current_slug": current_slug,
                "proposed_slug": proposed_slug,
                "change_needed": False,
                "collision_document_id": None,
                "blocked_reason": None,
                "notes": ";".join(notes_parts) if notes_parts else None,
            }
        )

    assign_resolved_slugs_for_report_rows(rows)

    if not args.skip_strapi:
        for row in rows:
            doc = row.get("document_id")
            locale = row.get("strapi_locale")
            current_slug = row.get("current_slug")
            resolved = row.get("strapi_slug_resolved")
            collision_doc: Optional[str] = None
            blocked_reason: Optional[str] = None
            change_needed = False
            if doc and resolved is not None and current_slug is not None:
                change_needed = current_slug != resolved
            if change_needed and resolved and locale:
                holders = [d for d in slug_to_docs[str(locale)].get(resolved, []) if d != str(doc)]
                if holders:
                    collision_doc = holders[0]
                    blocked_reason = "collision"
            row["change_needed"] = change_needed
            row["collision_document_id"] = collision_doc
            row["blocked_reason"] = blocked_reason

    swap_pairs = _detect_swap_pairs(rows)
    partner: Dict[str, str] = {}
    for a, b in swap_pairs:
        partner[a] = b
        partner[b] = a
    for row in rows:
        if not row.get("change_needed") or not row.get("document_id"):
            continue
        doc = row["document_id"]
        if doc not in partner:
            continue
        row["blocked_reason"] = "swap_pair"
        row["collision_document_id"] = partner[doc]

    report = {
        "meta": {
            "modx_source": str(modx_path),
            "checkpoint": str(args.checkpoint),
            "skip_strapi": args.skip_strapi,
            "locales": list(CONTEXT_TO_LOCALE.values()),
        },
        "summary": {
            "modx_rows": len(rows),
            "change_needed": sum(1 for r in rows if r.get("change_needed")),
            "blocked_collision": sum(1 for r in rows if r.get("blocked_reason") == "collision"),
            "blocked_swap": sum(1 for r in rows if r.get("blocked_reason") == "swap_pair"),
            "ready_to_apply": sum(
                1
                for r in rows
                if r.get("change_needed") and not r.get("blocked_reason")
            ),
            "swap_pairs_count": len(swap_pairs),
            "non_ascii_modx_alias_rows": sum(1 for r in rows if r.get("non_ascii_modx_alias")),
        },
        "swap_pairs": [
            {
                "document_a": a,
                "document_b": b,
                "slug_current_a": next((r.get("current_slug") for r in rows if r.get("document_id") == a), None),
                "slug_current_b": next((r.get("current_slug") for r in rows if r.get("document_id") == b), None),
            }
            for a, b in swap_pairs
        ],
        "rows": rows,
    }

    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    logger.info("Wrote %s", args.output)
    logger.info(
        "summary: change_needed=%s ready=%s blocked_collision=%s blocked_swap=%s non_ascii_modx_alias=%s",
        report["summary"]["change_needed"],
        report["summary"]["ready_to_apply"],
        report["summary"]["blocked_collision"],
        report["summary"]["blocked_swap"],
        report["summary"]["non_ascii_modx_alias_rows"],
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
