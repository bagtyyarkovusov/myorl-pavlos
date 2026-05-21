"""Injection readiness audit.

Runs every gate that must be green before the Strapi importer writes a single
row. Consumes ``babel_normalization.json`` as the single source of truth for
locale pairing (never touches the unreliable Babel TV).

Exit code 1 if any blocker fires; blocker vs warning classification is noted
per gate in the JSON report.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sqlite3
import sys
import unicodedata
import urllib.parse
from collections import Counter, defaultdict
from pathlib import Path

from cms_audit import CHECKPOINT_SOURCE_DIR, MANIFESTS_DIR, MODX_SOURCE_DIR, REPORTS_DIR, ROOT
from typing import Any, Iterable

from transform_data import iter_resource_tree

ROOT = Path(__file__).resolve().parents[1]
TRANSFORMED_PATH = MODX_SOURCE_DIR / "transformed_resources.json"
AUDIT_PATH = MANIFESTS_DIR / "locale_pair_audit.json"
NORMALIZATION_PATH = MANIFESTS_DIR / "babel_normalization.json"
ASSET_MAP_PATH = CHECKPOINT_SOURCE_DIR / "asset_map.json"
PAGE_SCHEMA_PATH = ROOT / "backend/src/api/page/content-types/page/schema.json"
TAG_SCHEMA_PATH = ROOT / "backend/src/api/tag/content-types/tag/schema.json"
COMPONENTS_ROOT = ROOT / "backend/src/components"
STRAPI_DB_PATH = ROOT / "backend/.tmp/data.db"
TAG_MAPPING_PATH = MANIFESTS_DIR / "tag_mapping.yaml"
REPORT_PATH = REPORTS_DIR / "injection_readiness.json"

# Pragmatic-drop policy (matches Phase 1 transform rules and import_policy.md).
DIRECT_FIELDS = {
    "pagetitle": "title",
    "content": "content",
    "introtext": "excerpt",
    "alias": "slug",
    "description": "seo.metaDescription",  # used as fallback for metaDescription
    "parent": "parentPage",
    "menuindex": "menuIndex",
    "isfolder": "isFolder",
    "hidemenu": "hideFromMenu",
    "published": "publishedAt",
    "template": "templateId",
    "context_key": "locale",
}

# Template-variable keys mapped to Strapi attributes or components.
TRANSFORM_TVS = {
    "metaTitle": "seo.metaTitle",
    "metaDescription": "seo.metaDescription",
    "image": "featuredImage",
    "imageCenter": "imageCenter",
    "infoBlockBottom": "infoBlockBottom",
    "articleAuthor": "articleAuthor",
    "sources": "sources",
    "popUpClose": "popUpClose",
    "url": "externalUrl",
    "tags": "tags",
    "migxAccordion": "pageBlocks(blocks.accordion-item)",
    "migxFaq": "pageBlocks(blocks.faq-item)",
    "migxResources": "pageBlocks(blocks.faq-item)",
    "migxLocation": "pageBlocks(blocks.clinic)",
    "migxLocation2": "pageBlocks(blocks.clinic)",
    "migxTabs": "pageBlocks(blocks.tab-item)",
    "migxTabsLink": "pageBlocks(blocks.tab-item)",
    "migxPromoSlider": "pageBlocks(blocks.promo-slide)",
    "migxContacts": "pageBlocks(blocks.contact-detail)",
    "migxSocial": "pageBlocks(blocks.social-link)",
    "migxGallery": "pageBlocks(blocks.gallery-image)",
    "migxVideo": "pageBlocks(blocks.video)",
    "migxAdvantages": "pageBlocks(blocks.advantage)",
    "videoMp4": "pageBlocks(blocks.video)",
    "videoWebm": "pageBlocks(blocks.video)",
    "imageVideo": "pageBlocks(blocks.video)",
    "videoTags": "pageBlocks(blocks.video)",
    "location": "pageBlocks(shared.location)",
    "class": "(html class passthrough)",  # embedded in HTML render
}

DROP_POLICY = {
    "longtitle": "drop(policy): folded into metaTitle fallback when TV absent",
    "menutitle": "drop(policy): Strapi uses title in nav",
    "metaKeywords": "drop(policy): Strapi SEO component drops keywords",
    "babelLanguageLinks": "drop(policy): replaced by babel_normalization.json",
    "AffiliateAddress": "drop(policy): affiliate-only, not modelled",
    "AffiliatePhone": "drop(policy): affiliate-only, not modelled",
    "AffiliateEmail": "drop(policy): affiliate-only, not modelled",
    "AffiliateCoords": "drop(policy): affiliate-only, not modelled",
}

# Raw MODX columns that we intentionally ignore (system / auditing / caching).
DROP_SYSTEM = {
    "cacheable",
    "class_key",
    "contentType",
    "content_dispo",
    "content_type",
    "createdby",
    "createdon",
    "deleted",
    "deletedby",
    "deletedon",
    "donthit",
    "editedby",
    "editedon",
    "hide_children_in_tree",
    "link_attributes",
    "privatemgr",
    "privateweb",
    "pub_date",
    "publishedby",
    "publishedon",
    "richtext",
    "searchable",
    "show_in_tree",
    "type",
    "unpub_date",
    "uri",
    "uri_override",
    "alias_visible",
    "children",
    "properties",
    "id",
    "template_variables",
    # Phase 1 sibling produced by transform_data.py; the importer reads from
    # here, so it is intentionally not classified as source content.
    "_import",
}

MIGX_JSON_TVS = {
    "migxAccordion",
    "migxFaq",
    "migxResources",
    "migxLocation",
    "migxLocation2",
    "migxTabs",
    "migxTabsLink",
    "migxPromoSlider",
    "migxContacts",
    "migxSocial",
    "migxGallery",
    "migxVideo",
    "migxAdvantages",
}


def slugify(value: str) -> str:
    """ASCII slug used to detect slug collisions after transliteration."""

    normalized = unicodedata.normalize("NFKD", value or "")
    ascii_only = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    ascii_only = ascii_only.encode("ascii", "ignore").decode("ascii")
    ascii_only = ascii_only.lower()
    ascii_only = re.sub(r"[^a-z0-9]+", "-", ascii_only).strip("-")
    return ascii_only or "page"


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def sha256_file(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(64 * 1024), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def as_int_set(values: Iterable[Any]) -> set[int]:
    return {int(v) for v in values}


def index_resources(resources: list[dict[str, Any]]) -> dict[str, dict[int, dict[str, Any]]]:
    index: dict[str, dict[int, dict[str, Any]]] = {"web": {}, "rus": {}}
    for resource in resources:
        ctx = resource.get("context_key")
        if ctx not in index:
            continue
        index[ctx][int(resource["id"])] = resource
    return index


# ---------------------------------------------------------------------------
# Gate implementations
# ---------------------------------------------------------------------------


def gate_boot() -> dict[str, Any]:
    findings: list[str] = []
    details: dict[str, Any] = {}

    if not STRAPI_DB_PATH.exists():
        return {
            "status": "blocker",
            "findings": [f"{STRAPI_DB_PATH} missing; cannot continue"],
            "details": {},
        }

    with sqlite3.connect(STRAPI_DB_PATH) as connection:
        cursor = connection.cursor()
        locales = [row[0] for row in cursor.execute("SELECT code FROM i18n_locale")]
        details["locales"] = locales
        if "el" not in locales:
            findings.append("i18n_locale missing 'el'")
        if "ru" not in locales:
            findings.append("i18n_locale missing 'ru'")

        for table in ("pages", "tags"):
            count = cursor.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            details[f"{table}_count"] = count
            if count != 0:
                findings.append(f"{table} is not empty ({count}); rehearsal DB must be pristine")

    page_schema = load_json(PAGE_SCHEMA_PATH)
    if not page_schema.get("pluginOptions", {}).get("i18n", {}).get("localized"):
        findings.append("Page content-type is not i18n.localized")

    tag_schema = load_json(TAG_SCHEMA_PATH)
    if not tag_schema.get("pluginOptions", {}).get("i18n", {}).get("localized"):
        findings.append("Tag content-type is not i18n.localized")

    return {
        "status": "blocker" if findings else "ok",
        "findings": findings,
        "details": details,
    }


def gate_normalization() -> dict[str, Any]:
    findings: list[str] = []
    details: dict[str, Any] = {}

    if not NORMALIZATION_PATH.exists():
        return {
            "status": "blocker",
            "findings": [f"{NORMALIZATION_PATH.name} missing; run build_babel_normalization.py"],
            "details": {},
        }
    if not AUDIT_PATH.exists():
        return {
            "status": "blocker",
            "findings": [f"{AUDIT_PATH.name} missing; run audit_locale_pairs.py"],
            "details": {},
        }

    normalization = load_json(NORMALIZATION_PATH)
    recorded_version = normalization.get("audit_version")
    current_version = sha256_file(AUDIT_PATH)
    details["recorded_audit_version"] = recorded_version
    details["current_audit_sha256"] = current_version

    if recorded_version != current_version:
        findings.append(
            "babel_normalization.json.audit_version != sha256(locale_pair_audit.json); "
            "rerun build_babel_normalization.py"
        )

    pairs = normalization.get("pairs", [])
    web_ids = [p["web_id"] for p in pairs]
    rus_ids = [p["rus_id"] for p in pairs]
    if len(web_ids) != len(set(web_ids)):
        findings.append("Duplicate web_id in pairs[]")
    if len(rus_ids) != len(set(rus_ids)):
        findings.append("Duplicate rus_id in pairs[]")

    web_single = [s["id"] for s in normalization.get("web_singletons", [])]
    rus_single = [s["id"] for s in normalization.get("rus_singletons", [])]
    if len(web_single) != len(set(web_single)):
        findings.append("Duplicate id in web_singletons[]")
    if len(rus_single) != len(set(rus_single)):
        findings.append("Duplicate id in rus_singletons[]")

    overlap_web = set(web_ids) & set(web_single)
    overlap_rus = set(rus_ids) & set(rus_single)
    if overlap_web:
        findings.append(f"Web ids in both pairs and singletons: {sorted(overlap_web)}")
    if overlap_rus:
        findings.append(f"Rus ids in both pairs and singletons: {sorted(overlap_rus)}")

    details["pair_count"] = len(pairs)
    details["web_singleton_count"] = len(web_single)
    details["rus_singleton_count"] = len(rus_single)

    return {
        "status": "blocker" if findings else "ok",
        "findings": findings,
        "details": details,
    }


def gate_coverage(resources_by_ctx: dict[str, dict[int, dict[str, Any]]]) -> dict[str, Any]:
    findings: list[str] = []
    details: dict[str, Any] = {}
    normalization = load_json(NORMALIZATION_PATH)

    pairs = normalization.get("pairs", [])
    web_single = normalization.get("web_singletons", [])
    rus_single = normalization.get("rus_singletons", [])

    covered_web = as_int_set(p["web_id"] for p in pairs) | as_int_set(s["id"] for s in web_single)
    covered_rus = as_int_set(p["rus_id"] for p in pairs) | as_int_set(s["id"] for s in rus_single)

    source_web = set(resources_by_ctx["web"].keys())
    source_rus = set(resources_by_ctx["rus"].keys())

    missing_web = source_web - covered_web
    extra_web = covered_web - source_web
    missing_rus = source_rus - covered_rus
    extra_rus = covered_rus - source_rus

    details["source_web_count"] = len(source_web)
    details["source_rus_count"] = len(source_rus)
    details["missing_from_normalization"] = {
        "web": sorted(missing_web),
        "rus": sorted(missing_rus),
    }
    details["normalization_references_missing_sources"] = {
        "web": sorted(extra_web),
        "rus": sorted(extra_rus),
    }
    if missing_web:
        findings.append(f"{len(missing_web)} web ids not covered by normalization")
    if missing_rus:
        findings.append(f"{len(missing_rus)} rus ids not covered by normalization")
    if extra_web:
        findings.append(f"{len(extra_web)} web ids in normalization but absent from source")
    if extra_rus:
        findings.append(f"{len(extra_rus)} rus ids in normalization but absent from source")

    return {
        "status": "blocker" if findings else "ok",
        "findings": findings,
        "details": details,
    }


def classify_field(field: str, tv: bool) -> tuple[str, str]:
    """Return (classification, destination_or_reason)."""

    if tv:
        if field in TRANSFORM_TVS:
            return "transform", TRANSFORM_TVS[field]
        if field in DROP_POLICY:
            return "drop(policy)", DROP_POLICY[field]
        return "unmapped", "TV has no Strapi destination"

    if field in DIRECT_FIELDS:
        return "direct", DIRECT_FIELDS[field]
    if field in DROP_POLICY:
        return "drop(policy)", DROP_POLICY[field]
    if field in DROP_SYSTEM:
        return "drop(system)", "MODX-internal column, not content"
    return "unmapped", "column has no Strapi destination"


def gate_schema_coverage(resources: list[dict[str, Any]]) -> dict[str, Any]:
    per_field: dict[str, dict[str, Any]] = {}

    for resource in resources:
        for key, value in resource.items():
            if value in (None, "", [], {}):
                continue
            classification, destination = classify_field(key, tv=False)
            bucket = per_field.setdefault(
                key, {"type": "field", "classification": classification, "destination": destination, "rows": 0}
            )
            bucket["rows"] += 1
        for tv_key, tv_value in (resource.get("template_variables") or {}).items():
            if tv_value in (None, "", [], {}):
                continue
            classification, destination = classify_field(tv_key, tv=True)
            bucket = per_field.setdefault(
                f"TV:{tv_key}",
                {"type": "tv", "classification": classification, "destination": destination, "rows": 0},
            )
            bucket["rows"] += 1

    unmapped = sorted(
        (name for name, info in per_field.items() if info["classification"] == "unmapped")
    )
    findings: list[str] = []
    if unmapped:
        findings.append(
            f"{len(unmapped)} unmapped source fields (would silently drop): {unmapped}"
        )

    return {
        "status": "blocker" if unmapped else "ok",
        "findings": findings,
        "details": {"fields": per_field},
    }


def gate_migx(resources: list[dict[str, Any]]) -> dict[str, Any]:
    findings: list[str] = []
    details: dict[str, Any] = {
        "resources_with_migx_tvs": 0,
        "resources_missing_blocks": [],
        "invalid_blocks": [],
        "raw_parse_failures": [],
    }

    # Snapshot the normalizer's contract: raw MIGX TVs remain readable via
    # ``tolerant_decode`` (best-effort), but the importer only ever reads
    # ``_import.blocks``.
    try:
        from normalize_migx import tolerant_decode
    except ImportError:
        tolerant_decode = None  # type: ignore[assignment]

    allowed_components = {
        "blocks.accordion-item",
        "blocks.faq-item",
        "blocks.gallery-image",
        "blocks.tab-item",
        "blocks.video",
        "blocks.clinic",
        "blocks.social-link",
        "blocks.promo-slide",
        "blocks.contact-detail",
        "blocks.advantage",
        "shared.location",
    }

    for resource in resources:
        tvs = resource.get("template_variables") or {}
        migx_keys = [
            key
            for key, value in tvs.items()
            if key in MIGX_JSON_TVS and isinstance(value, str) and value.strip()
        ]
        if not migx_keys:
            continue
        details["resources_with_migx_tvs"] += 1

        blocks = (resource.get("_import") or {}).get("blocks")
        if blocks is None:
            details["resources_missing_blocks"].append(
                {"id": resource["id"], "context": resource["context_key"], "tvs": migx_keys}
            )
            continue

        for index, block in enumerate(blocks):
            if not isinstance(block, dict) or "__component" not in block:
                details["invalid_blocks"].append(
                    {"id": resource["id"], "index": index, "reason": "missing __component"}
                )
            elif block["__component"] not in allowed_components:
                details["invalid_blocks"].append(
                    {
                        "id": resource["id"],
                        "index": index,
                        "component": block["__component"],
                        "reason": "component not in Page dynamic zone",
                    }
                )

        if tolerant_decode is not None:
            for key in migx_keys:
                try:
                    tolerant_decode(tvs[key])
                except Exception as exc:  # noqa: BLE001 - surface any decode failure
                    details["raw_parse_failures"].append(
                        {"id": resource["id"], "tv": key, "error": str(exc)}
                    )

    if details["resources_missing_blocks"]:
        findings.append(
            f"{len(details['resources_missing_blocks'])} resources with MIGX TVs but no _import.blocks; run normalize_migx.py"
        )
    if details["invalid_blocks"]:
        findings.append(
            f"{len(details['invalid_blocks'])} _import.blocks entries reference unknown components"
        )
    if details["raw_parse_failures"]:
        findings.append(
            f"{len(details['raw_parse_failures'])} raw MIGX TVs still cannot be decoded"
        )

    status = "blocker" if details["resources_missing_blocks"] or details["invalid_blocks"] else (
        "warning" if details["raw_parse_failures"] else "ok"
    )
    return {"status": status, "findings": findings, "details": details}


ASSET_PATH_RE = re.compile(r"(?:src|href)=[\"']([^\"']+)[\"']", re.IGNORECASE)
# ``gate_internal_page_hrefs`` must only inspect ``<a href>``, not ``<img src>`` etc.
ANCHOR_HREF_RE = re.compile(r"""href\s*=\s*["']([^"']+)["']""", re.IGNORECASE)


def iter_asset_references(html: str) -> Iterable[str]:
    if not isinstance(html, str):
        return
    for match in ASSET_PATH_RE.finditer(html):
        yield match.group(1)


def _load_orphan_allowlist(root: Path) -> tuple[set[tuple[int, str, str]], set[tuple[int, str, str]]]:
    """Return (html_allowlist, tv_allowlist) from ``orphan_assets.json``.

    Each allowlist entry is a tuple of identifying keys. Missing file = empty
    sets (gate falls back to strict behaviour).
    """
    path = MANIFESTS_DIR / "orphan_assets.json"
    if not path.exists():
        return set(), set()
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return set(), set()
    html_set = {
        (int(row["resource_id"]), row["field"], row["href"])
        for row in payload.get("html") or []
    }
    tv_set = {
        (int(row["resource_id"]), row["tv"], row["value"])
        for row in payload.get("tv") or []
    }
    return html_set, tv_set


def gate_asset(resources: list[dict[str, Any]], asset_map: dict[str, Any]) -> dict[str, Any]:
    findings: list[str] = []
    unresolved_html: list[dict[str, Any]] = []
    unresolved_tv: list[dict[str, Any]] = []
    orphan_html_hits: list[dict[str, Any]] = []
    orphan_tv_hits: list[dict[str, Any]] = []

    resolved_urls = {info["url"] for info in asset_map.values()}
    html_allowlist, tv_allowlist = _load_orphan_allowlist(ROOT)

    for resource in resources:
        for field in ("content", "introtext"):
            html = resource.get(field)
            for href in iter_asset_references(html):
                if href.startswith("http://") or href.startswith("https://"):
                    continue
                if href.startswith("#") or href.startswith("mailto:") or href.startswith("tel:"):
                    continue
                decoded = urllib.parse.unquote(href)
                candidate = decoded.lstrip("/")
                if not (candidate.startswith("uploads/") or candidate.startswith("files/")):
                    continue
                # resolved HTML ends up with /uploads/<hash>.ext (already a Strapi URL)
                if href.startswith("/uploads/") and href in resolved_urls:
                    continue
                if href in resolved_urls:
                    continue
                row = {"resource_id": resource["id"], "field": field, "href": href}
                if (resource["id"], field, href) in html_allowlist:
                    orphan_html_hits.append(row)
                else:
                    unresolved_html.append(row)
        for tv_key, tv_value in (resource.get("template_variables") or {}).items():
            if not isinstance(tv_value, str):
                continue
            stripped = tv_value.strip()
            if stripped.startswith("uploads/") or stripped.startswith("/uploads/") or stripped.startswith("files/"):
                row = {"resource_id": resource["id"], "tv": tv_key, "value": stripped}
                if (resource["id"], tv_key, stripped) in tv_allowlist:
                    orphan_tv_hits.append(row)
                else:
                    unresolved_tv.append(row)

    details = {
        "unresolved_html_references": unresolved_html,
        "unresolved_tv_references": unresolved_tv,
        "documented_orphan_html": orphan_html_hits,
        "documented_orphan_tv": orphan_tv_hits,
        "asset_map_entries": len(asset_map),
    }

    if unresolved_html or unresolved_tv:
        findings.append(
            f"Unresolved asset references: {len(unresolved_html)} in HTML, {len(unresolved_tv)} in TVs"
        )
    if orphan_html_hits or orphan_tv_hits:
        findings.append(
            f"Documented orphan references (dropped by policy): "
            f"{len(orphan_html_hits)} in HTML, {len(orphan_tv_hits)} in TVs "
            f"- see orphan_assets.json"
        )

    # Asset gaps are a blocker; documented orphans are a warning only.
    if unresolved_html or unresolved_tv:
        status = "blocker"
    elif orphan_html_hits or orphan_tv_hits:
        status = "warning"
    else:
        status = "ok"
    return {"status": status, "findings": findings, "details": details}


_LEGACY_HOST_FRAGMENTS = ("myorl.gr",)
# Relative internal links should resolve to ASCII slug paths after transform.
_SAFE_RELATIVE_PATH = re.compile(r"^/?[a-z0-9][a-z0-9./_-]*(?:\?[^#]*)?(?:#.+)?$", re.IGNORECASE)


def _anchor_hrefs_from_html(html: Any) -> Iterable[str]:
    if not isinstance(html, str):
        return
    for m in ANCHOR_HREF_RE.finditer(html):
        yield m.group(1)


def _anchor_hrefs_from_blocks(obj: Any) -> Iterable[str]:
    if isinstance(obj, dict):
        for v in obj.values():
            yield from _anchor_hrefs_from_blocks(v)
    elif isinstance(obj, list):
        for item in obj:
            yield from _anchor_hrefs_from_blocks(item)
    elif isinstance(obj, str) and "href=" in obj.lower():
        yield from _anchor_hrefs_from_html(obj)


# Keys produced by ``strapi_importer._build_page_payload`` (subset checks only).
PAGE_REST_WRITE_KEYS = frozenset(
    {
        "title",
        "slug",
        "content",
        "excerpt",
        "templateId",
        "isFolder",
        "hideFromMenu",
        "menuIndex",
        "seo",
        "articleAuthor",
        "sources",
        "popUpClose",
        "infoBlockBottom",
        "externalUrl",
        "featuredImage",
        "imageCenter",
        "pageBlocks",
        "parentPage",
        "tags",
    }
)


def gate_strapi_page_payload_schema() -> dict[str, Any]:
    """Ensure importer REST payload keys exist on ``api::page.page`` (schema/code alignment)."""

    schema = load_json(PAGE_SCHEMA_PATH)
    attrs = frozenset((schema.get("attributes") or {}).keys())
    missing = sorted(PAGE_REST_WRITE_KEYS - attrs)
    findings: list[str] = []
    if missing:
        findings.append(
            f"Importer writes field(s) not present in Page schema: {missing}. Update schema or _build_page_payload."
        )
    return {
        "status": "blocker" if missing else "ok",
        "findings": findings,
        "details": {"missing_in_page_schema": missing, "schema_attribute_count": len(attrs)},
    }


def gate_internal_page_hrefs(resources: list[dict[str, Any]]) -> dict[str, Any]:
    """Post-transform check: internal anchors should be ``/ascii-slug`` (not legacy site / Greek paths)."""

    findings: list[str] = []
    legacy_hits: list[dict[str, Any]] = []
    messy_relative: list[dict[str, Any]] = []

    def _consume_href(rid: Any, ctx: Any, field: str, href: str, seen: set[str]) -> None:
        key = f"{rid}:{field}:{href}"
        if key in seen:
            return
        seen.add(key)
        low = href.strip().lower()
        if any(host in low for host in _LEGACY_HOST_FRAGMENTS):
            legacy_hits.append({"id": rid, "context": ctx, "field": field, "href": href})
            return
        if href.strip() == "/":
            return
        if low.startswith(("mailto:", "tel:", "javascript:", "#")):
            return
        if low.startswith(("http://", "https://")):
            return
        if "[[~" in href or "{{" in href:
            return
        if low.startswith("//") and not low.startswith("///"):
            rest = low[2:]
            if rest.startswith(
                ("www.youtube.com", "youtube.com", "youtu.be", "player.vimeo.com", "vimeo.com")
            ):
                return
        if low.startswith("/uploads/") or low.startswith("uploads/"):
            return
        if _SAFE_RELATIVE_PATH.fullmatch(href.strip()):
            return
        messy_relative.append({"id": rid, "context": ctx, "field": field, "href": href})

    for resource in resources:
        rid = resource.get("id")
        ctx = resource.get("context_key")
        seen: set[str] = set()
        for field in ("content", "introtext"):
            html = resource.get(field)
            if isinstance(html, str):
                for href in _anchor_hrefs_from_html(html):
                    _consume_href(rid, ctx, field, href, seen)
        tvs = resource.get("template_variables") or {}
        for tv_key, tv_value in tvs.items():
            if not isinstance(tv_value, str) or not tv_value.strip():
                continue
            if isinstance(tv_key, str) and tv_key.lower().startswith("migx"):
                continue
            if "<" in tv_value and ">" in tv_value and "href=" in tv_value.lower():
                for href in _anchor_hrefs_from_html(tv_value):
                    _consume_href(rid, ctx, f"TV:{tv_key}", href, seen)
        blocks = (resource.get("_import") or {}).get("blocks")
        if blocks:
            blob = json.dumps(blocks, ensure_ascii=False)
            if "href=" in blob.lower():
                for href in _anchor_hrefs_from_blocks(blocks):
                    _consume_href(rid, ctx, "blocks", href, seen)

    details = {
        "legacy_site_hrefs": legacy_hits[:200],
        "legacy_site_href_count": len(legacy_hits),
        "non_ascii_slug_relative_hrefs": messy_relative[:200],
        "non_ascii_slug_relative_count": len(messy_relative),
    }

    if legacy_hits:
        findings.append(f"{len(legacy_hits)} anchor(s) still point at legacy site host(s)")
    if messy_relative:
        findings.append(
            f"{len(messy_relative)} relative anchor(s) are not plain ``/slug`` paths (Greek/encoded/modifiers?)"
        )

    status = "blocker" if legacy_hits else ("warning" if messy_relative else "ok")
    return {"status": status, "findings": findings, "details": details}


def gate_stale_html_placeholders(resources: list[dict[str, Any]]) -> dict[str, Any]:
    """Audit leftover MODX link tags, empty anchors, ``href=\"#\"``, and empty ``img src`` after cleanup."""

    trivial_hash_re = re.compile(r"""<a\b[^>]*\bhref\s*=\s*["']\s*#\s*["']""", re.IGNORECASE)
    empty_href_re = re.compile(r"""<a\b[^>]*\bhref\s*=\s*["']\s*["']""", re.IGNORECASE)
    empty_img_src_re = re.compile(r"""<img\b[^>]*\bsrc\s*=\s*["']\s*["']""", re.IGNORECASE)
    broken_img_src_re = re.compile(
        r"""<img\b[^>]*\bsrc\s*=\s*["'](?:file:[^"']*|[^"']*msohtmlclip[^"']*)["']""",
        re.IGNORECASE,
    )
    missing_img_src_re = re.compile(r"""<img\b(?![^>]*\bsrc\s*=)[^>]*>""", re.IGNORECASE)

    modx_samples: list[dict[str, Any]] = []
    trivial_hash_samples: list[dict[str, Any]] = []
    empty_href_samples: list[dict[str, Any]] = []
    empty_img_samples: list[dict[str, Any]] = []
    broken_img_src_samples: list[dict[str, Any]] = []
    missing_img_src_samples: list[dict[str, Any]] = []
    modx_total = 0
    trivial_total = 0
    empty_href_total = 0
    empty_img_total = 0
    broken_img_src_total = 0
    missing_img_src_total = 0

    def _scan_blob(rid: Any, field: str, blob: str) -> None:
        nonlocal modx_total, trivial_total, empty_href_total, empty_img_total
        nonlocal broken_img_src_total, missing_img_src_total
        if not blob:
            return
        if "[[~" in blob:
            modx_total += blob.count("[[~")
            if len(modx_samples) < 50:
                pos = blob.index("[[~")
                modx_samples.append(
                    {"id": rid, "field": field, "snippet": blob[max(0, pos - 24) : pos + 48]}
                )
        for m in trivial_hash_re.finditer(blob):
            trivial_total += 1
            if len(trivial_hash_samples) < 50:
                trivial_hash_samples.append({"id": rid, "field": field, "match": m.group(0)[:160]})
        for m in empty_href_re.finditer(blob):
            empty_href_total += 1
            if len(empty_href_samples) < 50:
                empty_href_samples.append({"id": rid, "field": field, "match": m.group(0)[:160]})
        for m in empty_img_src_re.finditer(blob):
            empty_img_total += 1
            if len(empty_img_samples) < 50:
                empty_img_samples.append({"id": rid, "field": field, "match": m.group(0)[:160]})
        for m in broken_img_src_re.finditer(blob):
            broken_img_src_total += 1
            if len(broken_img_src_samples) < 50:
                broken_img_src_samples.append({"id": rid, "field": field, "match": m.group(0)[:160]})
        for m in missing_img_src_re.finditer(blob):
            missing_img_src_total += 1
            if len(missing_img_src_samples) < 50:
                missing_img_src_samples.append({"id": rid, "field": field, "match": m.group(0)[:160]})

    for resource in resources:
        rid = resource.get("id")
        for field in ("content", "introtext"):
            html = resource.get(field)
            if isinstance(html, str) and "<" in html:
                _scan_blob(rid, field, html)
        tvs = resource.get("template_variables") or {}
        for tv_key, tv_value in tvs.items():
            if not isinstance(tv_value, str) or "<" not in tv_value:
                continue
            if isinstance(tv_key, str) and tv_key.lower().startswith("migx"):
                continue
            _scan_blob(rid, f"TV:{tv_key}", tv_value)
        blocks = (resource.get("_import") or {}).get("blocks")
        if blocks:
            blob = json.dumps(blocks, ensure_ascii=False)
            if "<" in blob:
                _scan_blob(rid, "blocks", blob)

    details = {
        "modx_link_tag_total": modx_total,
        "modx_link_samples": modx_samples,
        "trivial_hash_href_total": trivial_total,
        "trivial_hash_samples": trivial_hash_samples,
        "empty_href_total": empty_href_total,
        "empty_href_samples": empty_href_samples,
        "empty_img_src_total": empty_img_total,
        "empty_img_src_samples": empty_img_samples,
        "broken_img_src_total": broken_img_src_total,
        "broken_img_src_samples": broken_img_src_samples,
        "missing_img_src_total": missing_img_src_total,
        "missing_img_src_samples": missing_img_src_samples,
    }
    findings: list[str] = []
    if modx_total:
        findings.append(f"{modx_total} MODX ``[[~`` link tag occurrence(s) remain in HTML")
    if trivial_total:
        findings.append(f"{trivial_total} placeholder ``href=#`` anchor(s) remain")
    if empty_href_total:
        findings.append(f"{empty_href_total} empty ``href`` anchor(s) remain")
    if empty_img_total:
        findings.append(f"{empty_img_total} ``<img>`` tag(s) with empty ``src`` remain")
    if broken_img_src_total:
        findings.append(f"{broken_img_src_total} ``<img>`` tag(s) with Word/local ``file://`` or ``msohtmlclip`` ``src`` remain")
    if missing_img_src_total:
        findings.append(f"{missing_img_src_total} ``<img>`` tag(s) without a ``src`` attribute remain")

    total_signal = (
        modx_total
        + trivial_total
        + empty_href_total
        + empty_img_total
        + broken_img_src_total
        + missing_img_src_total
    )
    return {"status": "warning" if total_signal else "ok", "findings": findings, "details": details}


def gate_slug(
    resources_by_ctx: dict[str, dict[int, dict[str, Any]]],
    normalization: dict[str, Any],
) -> dict[str, Any]:
    skipped = {s["id"] for s in normalization.get("web_singletons", []) if s.get("action") == "skip"}
    skipped |= {s["id"] for s in normalization.get("rus_singletons", []) if s.get("action") == "skip"}

    collisions: dict[str, list[dict[str, Any]]] = {"web": [], "rus": []}
    for ctx, resources in resources_by_ctx.items():
        slugs: dict[str, list[int]] = defaultdict(list)
        for rid, resource in resources.items():
            if rid in skipped:
                continue
            import_block = resource.get("_import") or {}
            if import_block.get("slug"):
                slug = import_block["slug"]
            else:
                raw_slug = resource.get("alias") or slugify(resource.get("pagetitle", ""))
                slug = slugify(str(raw_slug))
            slugs[slug].append(rid)
        for slug, ids in slugs.items():
            if len(ids) > 1:
                collisions[ctx].append({"slug": slug, "ids": sorted(ids)})

    findings: list[str] = []
    for ctx, items in collisions.items():
        if items:
            findings.append(f"{ctx}: {len(items)} slug collision(s)")

    return {
        "status": "blocker" if findings else "ok",
        "findings": findings,
        "details": {"collisions": collisions, "skipped_ids": sorted(skipped)},
    }


def gate_parent(
    resources_by_ctx: dict[str, dict[int, dict[str, Any]]],
    normalization: dict[str, Any],
) -> dict[str, Any]:
    pairs = normalization.get("pairs", [])
    web_ids_in_scope = {p["web_id"] for p in pairs} | {
        s["id"] for s in normalization.get("web_singletons", []) if s.get("action") != "skip"
    }
    rus_ids_in_scope = {p["rus_id"] for p in pairs} | {
        s["id"] for s in normalization.get("rus_singletons", []) if s.get("action") != "skip"
    }

    orphans: dict[str, list[dict[str, Any]]] = {"web": [], "rus": []}
    for ctx, ids_in_scope in (("web", web_ids_in_scope), ("rus", rus_ids_in_scope)):
        in_scope_resources = resources_by_ctx[ctx]
        for rid in sorted(ids_in_scope):
            resource = in_scope_resources.get(rid)
            if resource is None:
                continue
            parent = int(resource.get("parent") or 0)
            if parent == 0:
                continue
            if parent not in ids_in_scope:
                orphans[ctx].append({"id": rid, "parent": parent})

    findings: list[str] = []
    for ctx, items in orphans.items():
        if items:
            findings.append(f"{ctx}: {len(items)} row(s) reference a parent not in import scope")

    return {
        "status": "blocker" if findings else "ok",
        "findings": findings,
        "details": {"orphans": orphans},
    }


def _load_tag_plan() -> tuple[dict[str, Any] | None, list[str]]:
    """Prefer ``tag_plan.json`` (built by ``build_tag_plan.py``) and fall back
    to parsing ``tag_mapping.yaml`` directly if the plan hasn't been built yet.
    """

    plan_path = MANIFESTS_DIR / "tag_plan.json"
    if plan_path.exists():
        with plan_path.open("r", encoding="utf-8") as handle:
            return json.load(handle), []

    if not TAG_MAPPING_PATH.exists():
        return None, [f"{TAG_MAPPING_PATH.name} missing (Phase 3 not done yet)"]
    try:
        import yaml  # type: ignore
    except ImportError:
        return None, ["PyYAML not available; cannot parse tag_mapping.yaml"]
    with TAG_MAPPING_PATH.open("r", encoding="utf-8") as handle:
        mapping = yaml.safe_load(handle) or {}

    # Derive a lightweight resolution map from the YAML so the gate still
    # works before `tag_plan.json` is generated.
    el_map: dict[str, str] = {}
    ru_map: dict[str, str] = {}
    for entry in mapping.get("canonical_tags") or []:
        slug = entry.get("slug")
        if not slug:
            continue
        for value in [entry.get("el"), *(entry.get("aliases_el") or [])]:
            if value:
                el_map[value] = slug
        for value in [entry.get("ru"), *(entry.get("aliases_ru") or [])]:
            if value:
                ru_map[value] = slug
    for entry in mapping.get("russian_only_tags") or []:
        slug = entry.get("slug")
        if not slug:
            continue
        for value in [entry.get("ru"), *(entry.get("aliases_ru") or [])]:
            if value:
                ru_map[value] = slug
    return {"resolution": {"el": el_map, "ru": ru_map}}, []


def gate_tags(resources: list[dict[str, Any]]) -> dict[str, Any]:
    distinct = {"web": Counter(), "rus": Counter()}
    for resource in resources:
        ctx = resource["context_key"]
        tags_raw = (resource.get("template_variables") or {}).get("tags")
        if not isinstance(tags_raw, str):
            continue
        for value in [item.strip() for item in tags_raw.split(",") if item.strip()]:
            distinct[ctx][value] += 1

    plan, warnings = _load_tag_plan()
    details: dict[str, Any] = {
        "distinct_tags": {ctx: dict(counter) for ctx, counter in distinct.items()},
        "warnings": warnings,
    }

    findings: list[str] = []
    if plan is None:
        details["resolved"] = False
        findings.extend(warnings)
        return {"status": "warning", "findings": findings, "details": details}

    resolution = plan.get("resolution") or {}
    el_map: dict[str, str] = resolution.get("el") or {}
    ru_map: dict[str, str] = resolution.get("ru") or {}

    unresolved = {
        "web": sorted(value for value in distinct["web"] if value not in el_map),
        "rus": sorted(value for value in distinct["rus"] if value not in ru_map),
    }
    details["resolved"] = not (unresolved["web"] or unresolved["rus"])
    details["unresolved"] = unresolved

    if unresolved["web"] or unresolved["rus"]:
        findings.append(
            f"Unresolved tags: {len(unresolved['web'])} el, {len(unresolved['rus'])} ru"
        )
        return {"status": "blocker", "findings": findings, "details": details}

    return {"status": "ok", "findings": findings, "details": details}


# ---------------------------------------------------------------------------
# Driver
# ---------------------------------------------------------------------------


def print_report(report: dict[str, Any]) -> None:
    print("=" * 72)
    print("Injection readiness audit")
    print("=" * 72)
    for gate_name, gate in report["gates"].items():
        symbol = {"ok": "ok ", "warning": "WRN", "blocker": "!!!"}[gate["status"]]
        print(f"[{symbol}] {gate_name}")
        for finding in gate.get("findings", []):
            print(f"    - {finding}")
    print("-" * 72)
    print(f"overall: {report['status']}")
    print(f"report written to {REPORT_PATH.name}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=REPORT_PATH,
        help="Where to write the JSON report (default: injection_readiness.json)",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Suppress console summary; still writes the JSON report and sets exit code",
    )
    args = parser.parse_args()

    raw_tree = load_json(TRANSFORMED_PATH)
    resources = iter_resource_tree(raw_tree) if isinstance(raw_tree, list) else []
    asset_map = load_json(ASSET_MAP_PATH)
    resources_by_ctx = index_resources(resources)
    normalization = load_json(NORMALIZATION_PATH) if NORMALIZATION_PATH.exists() else {}

    gates = {
        "boot": gate_boot(),
        "normalization": gate_normalization(),
        "strapi_page_schema": gate_strapi_page_payload_schema(),
        "coverage": gate_coverage(resources_by_ctx),
        "schema_coverage": gate_schema_coverage(resources),
        "migx": gate_migx(resources),
        "asset": gate_asset(resources, asset_map),
        "internal_page_hrefs": gate_internal_page_hrefs(resources),
        "stale_html_placeholders": gate_stale_html_placeholders(resources),
        "slug": gate_slug(resources_by_ctx, normalization),
        "parent": gate_parent(resources_by_ctx, normalization),
        "tags": gate_tags(resources),
    }

    blocker = any(gate["status"] == "blocker" for gate in gates.values())
    warning = any(gate["status"] == "warning" for gate in gates.values())
    overall = "blocker" if blocker else "warning" if warning else "ok"

    report = {
        "status": overall,
        "gates": gates,
    }

    with args.output.open("w", encoding="utf-8") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2)

    if not args.quiet:
        print_report(report)

    return 1 if blocker else 0


if __name__ == "__main__":
    sys.exit(main())
