#!/usr/bin/env python3
"""Apply slug updates from ``slug_parity_report.json`` (dry-run by default)."""

from __future__ import annotations

import argparse
import json
import logging
import sys
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Set, Tuple

from slug_uid_utils import strapi_slug_for_modx_alias
from strapi_client import StrapiClient, StrapiError, load_strapi_env_from_dotenv

logger = logging.getLogger("slug_parity_apply")

ROOT = Path(__file__).resolve().parent
DEFAULT_REPORT = ROOT / "slug_parity_report.json"
DEFAULT_ERRORS = ROOT / "slug_migration_errors.json"


def _row_target_slug(row: Dict[str, Any]) -> str:
    """Strapi ``uid`` value from report row (prefers analyzer ``strapi_slug_resolved``)."""

    for key in ("strapi_slug_resolved", "strapi_slug_ascii"):
        val = row.get(key)
        if val:
            return str(val).strip()
    prop = row.get("proposed_slug") or row.get("alias") or ""
    return strapi_slug_for_modx_alias(str(prop)) if prop else ""


def _temp_slug(document_id: str) -> str:
    tail = document_id[-8:] if len(document_id) >= 8 else document_id
    return f"migr-tmp-{tail}-{uuid.uuid4().hex[:6]}"


def _load_report(path: Path) -> Dict[str, Any]:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def _plan_puts(
    report: Dict[str, Any],
    *,
    include_swaps: bool,
    only_document_id: str | None,
) -> List[Dict[str, Any]]:
    """Ordered list of {document_id, locale, slug} PUT operations."""

    rows = report.get("rows") or []
    swap_pairs: List[Tuple[str, str]] = []
    for sp in report.get("swap_pairs") or []:
        a = sp.get("document_a")
        b = sp.get("document_b")
        if a and b:
            swap_pairs.append((str(a), str(b)))

    eligible = []
    for row in rows:
        if not row.get("change_needed"):
            continue
        if row.get("blocked_reason") == "collision":
            continue
        if row.get("blocked_reason") == "swap_pair" and not include_swaps:
            continue
        doc = row.get("document_id")
        loc = row.get("strapi_locale")
        prop = _row_target_slug(row)
        if not doc or not loc or not prop:
            continue
        if only_document_id and doc != only_document_id:
            continue
        eligible.append(row)

    puts: List[Dict[str, Any]] = []
    swap_resolved_docs: Set[str] = set()

    if include_swaps and swap_pairs:
        for a, b in swap_pairs:
            ra = next((r for r in rows if r.get("document_id") == a), None)
            rb = next((r for r in rows if r.get("document_id") == b), None)
            if not ra or not rb or not ra.get("change_needed") or not rb.get("change_needed"):
                continue
            if ra.get("blocked_reason") == "collision" or rb.get("blocked_reason") == "collision":
                continue
            if only_document_id and only_document_id not in (a, b):
                continue
            ta = _temp_slug(a)
            tb = _temp_slug(b)
            cur_a = ra.get("current_slug") or ""
            cur_b = rb.get("current_slug") or ""
            prop_a = _row_target_slug(ra)
            prop_b = _row_target_slug(rb)
            if prop_a != cur_b or prop_b != cur_a:
                continue
            loc = ra.get("strapi_locale")
            if loc != rb.get("strapi_locale"):
                continue
            puts.append({"document_id": a, "locale": loc, "slug": ta, "phase": "swap_temp_a"})
            puts.append({"document_id": b, "locale": loc, "slug": tb, "phase": "swap_temp_b"})
            puts.append({"document_id": b, "locale": loc, "slug": cur_a, "phase": "swap_assign_b"})
            puts.append({"document_id": a, "locale": loc, "slug": cur_b, "phase": "swap_assign_a"})
            swap_resolved_docs.add(a)
            swap_resolved_docs.add(b)

    for row in eligible:
        doc = row["document_id"]
        if doc in swap_resolved_docs:
            continue
        if row.get("blocked_reason") == "swap_pair":
            continue
        puts.append(
            {
                "document_id": doc,
                "locale": row["strapi_locale"],
                "slug": _row_target_slug(row),
                "phase": "direct",
            }
        )
    return puts


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    parser = argparse.ArgumentParser(description="Apply slug parity from slug_parity_report.json")
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--errors", type=Path, default=DEFAULT_ERRORS)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Perform writes (default is dry-run using StrapiClient dry_run mode).",
    )
    parser.add_argument(
        "--include-swaps",
        action="store_true",
        help="Apply two-phase temp slug sequence for swap_pair rows from the report.",
    )
    parser.add_argument("--document-id", type=str, default=None, help="Only touch this documentId.")
    parser.add_argument(
        "--sleep-ms",
        type=int,
        default=0,
        help="Optional delay between PUTs to reduce load.",
    )
    args = parser.parse_args()

    if not args.report.is_file():
        logger.error("Report not found: %s (run slug_parity_analyze.py first)", args.report)
        return 1

    report = _load_report(args.report)
    puts = _plan_puts(
        report,
        include_swaps=args.include_swaps,
        only_document_id=args.document_id,
    )
    logger.info("planned_put_operations=%s", len(puts))
    if not puts:
        logger.info("Nothing to apply.")
        return 0

    load_strapi_env_from_dotenv()
    client = StrapiClient(dry_run=not args.apply)
    errors: List[Dict[str, Any]] = []

    for i, op in enumerate(puts):
        doc = op["document_id"]
        loc = op["locale"]
        slug = op["slug"]
        path = f"/api/pages/{doc}"
        payload = {"data": {"slug": slug}}
        try:
            client.put(path, payload, locale=loc)
            logger.info("[%s/%s] PUT %s locale=%s slug=%r", i + 1, len(puts), doc, loc, slug)
        except StrapiError as exc:
            err = {
                "document_id": doc,
                "locale": loc,
                "slug": slug,
                "phase": op.get("phase"),
                "error": str(exc),
            }
            errors.append(err)
            logger.error("PUT failed: %s", err)

        if args.sleep_ms > 0:
            time.sleep(args.sleep_ms / 1000.0)

    args.errors.write_text(json.dumps(errors, ensure_ascii=False, indent=2), encoding="utf-8")
    if errors:
        logger.error("Wrote %s (%s failures)", args.errors, len(errors))
        return 2 if args.apply else 0

    logger.info("Wrote %s (no failures)", args.errors)
    if not args.apply:
        logger.info("Dry-run only. Re-run with --apply to write.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
