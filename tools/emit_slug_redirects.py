#!/usr/bin/env python3
"""Emit ``slug_redirects_next.json`` for Next.js from MODX paths + slug parity report."""

from __future__ import annotations

import argparse
import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

from cms_audit import CHECKPOINT_SOURCE_DIR, MANIFESTS_DIR, MODX_SOURCE_DIR, REPORTS_DIR, ROOT
from typing import Any, Dict, List, Optional, Set
from urllib.parse import quote, unquote

from slug_uid_utils import assign_resolved_slugs_for_report_rows, strapi_slug_for_modx_alias
from transform_data import iter_resource_tree

logger = logging.getLogger("emit_slug_redirects")

# Keep in sync with ``slug_parity_analyze.CONTEXT_TO_LOCALE``.
CONTEXT_TO_LOCALE = {"web": "el", "rus": "ru"}

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MODX = MODX_SOURCE_DIR / "published_resources_flat.json"
DEFAULT_TRANSFORMED = MODX_SOURCE_DIR / "transformed_resources.json"
DEFAULT_REPORT = REPORTS_DIR / "slug_parity_report.json"
DEFAULT_OUT = MANIFESTS_DIR / "slug_redirects_next.json"


def _load_modx_flat(path: Path) -> List[dict]:
    with path.open(encoding="utf-8") as handle:
        data = json.load(handle)
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and "resources" in data:
        return iter_resource_tree(data["resources"])
    return iter_resource_tree(data)


def _parse_autoredirect_old_uri(properties_raw: Any) -> Optional[str]:
    if not properties_raw or not isinstance(properties_raw, str):
        return None
    try:
        props = json.loads(properties_raw)
    except json.JSONDecodeError:
        return None
    ar = props.get("autoredirector") if isinstance(props, dict) else None
    if not isinstance(ar, dict):
        return None
    old = ar.get("old_uri")
    if not old or not isinstance(old, str):
        return None
    return old.replace("\\/", "/")


def _normalize_path_segment(path: str) -> str:
    p = path.strip().strip("/")
    if not p:
        return ""
    return "/" + "/".join(unquote(part) for part in p.split("/"))


def _collect_from_path_variants(
    *,
    locale: str,
    base_prefix: str,
    alias: str,
    uri: str,
    old_uri: Optional[str],
) -> List[str]:
    """Public URL path variants (with locale prefix) that may appear in the wild."""

    variants: List[str] = []
    seen: Set[str] = set()

    def add(p: str) -> None:
        p = p.strip() or ""
        if not p.startswith("/"):
            p = "/" + p
        if p not in seen:
            seen.add(p)
            variants.append(p)

    ap = base_prefix.rstrip("/")
    if alias.strip():
        add(f"{ap}/{alias.strip()}")
        enc = f"{ap}/" + quote(alias.strip(), safe="")
        if enc not in seen:
            seen.add(enc)
            variants.append(enc)

    raw_uri = (uri or "").strip().strip("/")
    if raw_uri:
        add(f"{ap}/{raw_uri}")
        add(f"{ap}/{raw_uri}/")

    if old_uri:
        ou = old_uri.strip().strip("/")
        if ou:
            add(f"{ap}/{ou}")
            add(f"{ap}/{ou}/")

    return variants


def _load_report(path: Path) -> Dict[str, Any]:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def _repo_path(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(ROOT))
    except ValueError:
        return str(path)


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    parser = argparse.ArgumentParser(description="Build slug_redirects_next.json for Next.js")
    parser.add_argument("--modx", type=Path, default=None, help="MODX JSON (flat or tree)")
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--output", "-o", type=Path, default=DEFAULT_OUT)
    parser.add_argument(
        "--include-unchanged",
        action="store_true",
        help="Emit rows even when every fromPath variant equals toPath (default: skip)",
    )
    args = parser.parse_args()

    modx_path = args.modx
    if modx_path is None:
        modx_path = DEFAULT_MODX if DEFAULT_MODX.is_file() else DEFAULT_TRANSFORMED
    if not modx_path.is_file():
        logger.error("MODX file not found: %s", modx_path)
        return 1
    if not args.report.is_file():
        logger.error("Report not found: %s (run slug_parity_analyze.py first)", args.report)
        return 1

    report = _load_report(args.report)
    rows: List[Dict[str, Any]] = list(report.get("rows") or [])
    if rows and "strapi_slug_resolved" not in rows[0]:
        assign_resolved_slugs_for_report_rows(rows)

    flat = _load_modx_flat(modx_path)
    modx_by_key: Dict[tuple[str, str], dict] = {}
    for resource in flat:
        ctx = resource.get("context_key") or ""
        if ctx not in CONTEXT_TO_LOCALE:
            continue
        mid = str(resource.get("id") or "")
        if not mid.isdigit():
            continue
        modx_by_key[(mid, CONTEXT_TO_LOCALE[ctx])] = resource

    base_path_by_locale = {loc: f"/{loc}" for loc in CONTEXT_TO_LOCALE.values()}
    redirects_out: List[Dict[str, Any]] = []

    for row in rows:
        doc = row.get("document_id")
        locale = row.get("strapi_locale")
        modx_id = str(row.get("modx_id") or "")
        alias = (row.get("alias") or "").strip()
        if not doc or not locale or not modx_id.isdigit() or not alias:
            continue

        resolved = row.get("strapi_slug_resolved") or row.get("strapi_slug_ascii")
        if not resolved:
            resolved = strapi_slug_for_modx_alias(alias)
        to_path = f"/{locale}/{resolved}".replace("//", "/")
        to_norm = _normalize_path_segment(to_path)

        resource = modx_by_key.get((modx_id, str(locale)))
        uri = (resource.get("uri") or "") if resource else ""
        props = resource.get("properties") if resource else None
        old_uri = _parse_autoredirect_old_uri(props)

        prefix = base_path_by_locale.get(str(locale), f"/{locale}")
        from_variants = _collect_from_path_variants(
            locale=str(locale),
            base_prefix=prefix,
            alias=alias,
            uri=uri,
            old_uri=old_uri,
        )

        filtered_variants: List[str] = []
        for v in from_variants:
            vn = _normalize_path_segment(v.rstrip("/"))
            if not args.include_unchanged and vn == to_norm.rstrip("/"):
                continue
            filtered_variants.append(v)

        if not filtered_variants and not args.include_unchanged:
            continue

        use_variants = filtered_variants if filtered_variants else from_variants

        redirects_out.append(
            {
                "locale": locale,
                "fromPathVariants": use_variants,
                "toPath": to_path,
                "modxId": int(modx_id),
                "documentId": str(doc),
                "modxAlias": alias,
                "strapiSlugAscii": str(resolved),
                "nonAsciiModxAlias": bool(row.get("non_ascii_modx_alias")),
                "sources": ["alias", "uri", "old_uri"],
            }
        )

    staging: List[Dict[str, Any]] = []
    for row in rows:
        if not row.get("change_needed"):
            continue
        cur = row.get("current_slug") or ""
        tgt = row.get("strapi_slug_resolved") or row.get("strapi_slug_ascii") or ""
        if cur and tgt and cur != tgt:
            staging.append(
                {
                    "documentId": row.get("document_id"),
                    "locale": row.get("strapi_locale"),
                    "fromSlug": cur,
                    "toSlug": tgt,
                }
            )

    payload = {
        "meta": {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "modxSource": _repo_path(modx_path),
            "reportPath": _repo_path(args.report),
            "basePathByLocale": base_path_by_locale,
        },
        "redirects": redirects_out,
        "optionalStagingSlugRedirects": staging,
    }

    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    logger.info("Wrote %s (%s redirect rows)", args.output, len(redirects_out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
