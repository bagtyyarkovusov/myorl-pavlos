#!/usr/bin/env python3
"""Post-migration audit: parity summary, Strapi slug GET checks, redirect manifest coverage.

Writes ``slug_migration_verification_audit.json``. Run after ``slug_parity_apply.py --apply``
and ``emit_slug_redirects.py``.
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

from cms_audit import CHECKPOINT_SOURCE_DIR, MANIFESTS_DIR, MODX_SOURCE_DIR, REPORTS_DIR, ROOT
from typing import Any, Dict, List

from slug_uid_utils import STRAPI_UID_PATTERN
from strapi_client import StrapiClient, StrapiError, load_strapi_env_from_dotenv

logger = logging.getLogger("slug_migration_audit")

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_REPORT = REPORTS_DIR / "slug_parity_report.json"
DEFAULT_MANIFEST = MANIFESTS_DIR / "slug_redirects_next.json"
DEFAULT_OUT = REPORTS_DIR / "slug_migration_verification_audit.json"


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    parser = argparse.ArgumentParser(description="Audit slug migration + redirect manifest")
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--output", "-o", type=Path, default=DEFAULT_OUT)
    parser.add_argument(
        "--skip-strapi",
        action="store_true",
        help="Do not call Strapi GET (parity + manifest only)",
    )
    args = parser.parse_args()

    if not args.report.is_file():
        logger.error("Missing report: %s", args.report)
        return 1
    report: Dict[str, Any] = json.loads(args.report.read_text(encoding="utf-8"))
    summary_in = report.get("summary") or {}

    manifest_rows: List[Dict[str, Any]] = []
    if args.manifest.is_file():
        man = json.loads(args.manifest.read_text(encoding="utf-8"))
        manifest_rows = list(man.get("redirects") or [])
    by_doc = {r["documentId"]: r for r in manifest_rows if r.get("documentId")}

    client: StrapiClient | None = None
    if not args.skip_strapi:
        load_strapi_env_from_dotenv()
        client = StrapiClient()

    audit_rows: List[Dict[str, Any]] = []
    for r in report.get("rows") or []:
        if not r.get("non_ascii_modx_alias"):
            continue
        doc = r.get("document_id")
        loc = r.get("strapi_locale")
        expected = (r.get("strapi_slug_resolved") or r.get("strapi_slug_ascii") or "").strip()
        slug_api = None
        err = None
        if client and doc and loc:
            try:
                resp = client.get(f"/api/pages/{doc}", locale=str(loc), **{"fields[0]": "slug"})
                data = resp.get("data") or {}
                slug_api = (data.get("slug") or data.get("attributes", {}).get("slug") or "").strip()
            except StrapiError as exc:
                err = str(exc)
        man = by_doc.get(str(doc)) if doc else None
        cyr = False
        if man:
            cyr = any(any(ord(ch) > 127 for ch in v) for v in man.get("fromPathVariants") or [])
        slug_for_uid = slug_api or ""
        audit_rows.append(
            {
                "modx_id": r.get("modx_id"),
                "document_id": doc,
                "locale": loc,
                "modx_alias": r.get("alias"),
                "expected_strapi_slug": expected,
                "strapi_get_slug": slug_api,
                "slug_matches_expected": slug_api is not None and slug_api == expected,
                "uid_pattern_ok": bool(slug_for_uid and STRAPI_UID_PATTERN.fullmatch(slug_for_uid)),
                "manifest_present": man is not None,
                "manifest_toPath": (man or {}).get("toPath"),
                "non_ascii_from_path_in_manifest": cyr,
                "strapi_error": err,
            }
        )

    strict_ok = (
        summary_in.get("change_needed") == 0
        and summary_in.get("blocked_collision") == 0
        and summary_in.get("ready_to_apply") == 0
    )
    if audit_rows:
        strict_ok = strict_ok and all(a["manifest_present"] for a in audit_rows)
        strict_ok = strict_ok and all(a["non_ascii_from_path_in_manifest"] for a in audit_rows)
    if audit_rows and client:
        strict_ok = strict_ok and all(
            a["slug_matches_expected"] and a["uid_pattern_ok"] and a["strapi_error"] is None
            for a in audit_rows
        )

    out = {
        "summary": {
            "parity_change_needed": summary_in.get("change_needed"),
            "parity_ready_to_apply": summary_in.get("ready_to_apply"),
            "parity_blocked_collision": summary_in.get("blocked_collision"),
            "non_ascii_modx_alias_rows": summary_in.get("non_ascii_modx_alias_rows"),
            "non_ascii_rows_audited": len(audit_rows),
            "strict_verification_passed": strict_ok,
        },
        "non_ascii_alias_audit": audit_rows,
        "notes": [
            "Three RU pages use Cyrillic MODX aliases; one RU page (modx_id 417) uses Greek letters in `alias` — all require Next.js redirects from Unicode paths to ASCII `toPath`.",
            "Re-run after `emit_slug_redirects.py`; use `--skip-strapi` for offline manifest-only checks.",
        ],
    }

    args.output.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    logger.info("Wrote %s strict_ok=%s", args.output, strict_ok)
    return 0 if strict_ok else 2


if __name__ == "__main__":
    sys.exit(main())
