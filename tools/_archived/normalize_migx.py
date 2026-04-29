"""Phase 2 MIGX normalizer.

Reads the MIGX Template Variables from ``transformed_resources.json`` and
emits an ordered ``_import.blocks`` list per resource, keyed by the Strapi
dynamic-zone component name (``blocks.accordion-item``, ``blocks.faq-item``,
etc.). The original TVs are left intact so re-runs are idempotent.

MODX ships MIGX payloads as JSON-encoded strings that have been mangled by
later HTML post-processing: PHP-style ``\\'`` escapes, line-continuation
backslashes, and unescaped ``=""`` attribute pairs that terminate the JSON
string early. ``tolerant_decode`` handles those cases by stripping invalid
backslash escapes and then parsing the longest valid JSON prefix via
``raw_decode``.
"""

from __future__ import annotations

import html
import json
import re
import urllib.parse
from pathlib import Path

from cms_audit import CHECKPOINT_SOURCE_DIR, MANIFESTS_DIR, MODX_SOURCE_DIR, REPORTS_DIR, ROOT
from typing import Any

from html_cleanup import cleanup_dead_html_in_structure
from internal_link_rewrite import build_page_link_index, rewrite_internal_links_in_structure
from transform_data import iter_resource_tree

ROOT = Path(__file__).resolve().parents[1]
TRANSFORMED_PATH = MODX_SOURCE_DIR / "transformed_resources.json"
ASSET_MAP_PATH = CHECKPOINT_SOURCE_DIR / "asset_map.json"

# TVs holding JSON arrays that must be decoded before reshaping.
MIGX_TVS = {
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

# Homepage-only video TVs (resource ids 1 and 153 per the plan).
HOMEPAGE_VIDEO_IDS = {1, 153}

_INVALID_ESCAPE_RE = re.compile(r"\\.", re.DOTALL)
# ``=`` never appears in valid JSON syntax (only inside strings), so every
# ``=""`` is an HTML attribute that must be escaped so the two bare quotes
# don't prematurely terminate the current JSON string.
_BARE_ATTR_RE = re.compile(r'=""')


def _repair_escapes(raw: str) -> str:
    def _sub(match: re.Match[str]) -> str:
        escape = match.group(0)
        char = escape[1]
        if char in '"\\/bfnrtu':
            return escape
        if char in ("\n", "\r"):
            return ""
        if char == "'":
            return "'"
        return char

    return _INVALID_ESCAPE_RE.sub(_sub, raw)


def tolerant_decode(raw: str) -> Any:
    """Parse a MIGX JSON payload, tolerating mangled escapes and trailing noise."""

    if not isinstance(raw, str) or not raw.strip():
        return []
    cleaned = _repair_escapes(raw)
    decoder = json.JSONDecoder()
    try:
        obj, _ = decoder.raw_decode(cleaned)
        return obj
    except json.JSONDecodeError:
        pass
    # Some rows ship bare =\"\" pairs inside HTML attributes that terminate the
    # JSON string early; escape them, retry.
    retried = _BARE_ATTR_RE.sub(r'=\\"\\"', cleaned)
    obj, _ = decoder.raw_decode(retried)
    return obj


def _clean_html(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    decoded = html.unescape(value)
    return decoded.strip()


def _clean_text(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    return html.unescape(value).strip()


def _resolve_asset(value: Any, asset_map: dict[str, Any]) -> Any:
    """Return Strapi asset id if the path resolves in the asset map, else the raw path."""

    if isinstance(value, int):
        return value
    if not isinstance(value, str) or not value.strip():
        return None
    candidate = value.lstrip("/")
    if candidate in asset_map:
        return asset_map[candidate]["id"]
    decoded = urllib.parse.unquote(candidate)
    if decoded in asset_map:
        return asset_map[decoded]["id"]
    return value  # unresolved; readiness gate will surface it.


def _block(component: str, **fields: Any) -> dict[str, Any]:
    block: dict[str, Any] = {"__component": component}
    for key, value in fields.items():
        if value in (None, "", [], {}):
            continue
        block[key] = value
    return block


# ---------------------------------------------------------------------------
# Per-TV expanders
# ---------------------------------------------------------------------------


def expand_accordion(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    for item in items:
        title = _clean_text(item.get("title"))
        content = _clean_html(item.get("description") or item.get("content"))
        if not title and not content:
            continue
        blocks.append(_block("blocks.accordion-item", title=title, content=content))
    return blocks


def expand_faq(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    for item in items:
        question = _clean_text(item.get("question") or item.get("title"))
        answer = _clean_html(item.get("answer") or item.get("description"))
        if not question and not answer:
            continue
        blocks.append(_block("blocks.faq-item", question=question, answer=answer))
    return blocks


def expand_tabs(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    for item in items:
        title = _clean_text(item.get("title"))
        content = _clean_html(item.get("description") or item.get("content"))
        link = _clean_text(item.get("link") or item.get("url"))
        blocks.append(_block("blocks.tab-item", title=title, content=content, link=link))
    return blocks


_COORD_RE = re.compile(r"(-?\d+\.\d+)\s*[,;\s]\s*(-?\d+\.\d+)")


def expand_location(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    for item in items:
        name = _clean_text(item.get("name") or item.get("title"))
        address = _clean_html(item.get("address") or item.get("description"))
        phone = _clean_text(item.get("phone"))
        email = _clean_text(item.get("email"))
        latitude = item.get("latitude") or item.get("lat")
        longitude = item.get("longitude") or item.get("lng")
        # Fallback parse: ``lat;lng;address`` pattern stuffed in title.
        if latitude is None or longitude is None:
            match = _COORD_RE.search(str(item.get("coords") or item.get("coordinates") or ""))
            if match:
                latitude, longitude = match.group(1), match.group(2)
        try:
            latitude = float(latitude) if latitude not in (None, "") else None
            longitude = float(longitude) if longitude not in (None, "") else None
        except (TypeError, ValueError):
            latitude, longitude = None, None
        blocks.append(
            _block(
                "blocks.clinic",
                name=name,
                address=address,
                phone=phone,
                email=email,
                latitude=latitude,
                longitude=longitude,
            )
        )
    return blocks


def expand_promo_slider(
    items: list[dict[str, Any]], asset_map: dict[str, Any]
) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    for item in items:
        for index in range(1, 7):
            suffix = str(index)
            title = _clean_text(item.get(f"title{suffix}"))
            description = _clean_html(item.get(f"description{suffix}"))
            image = _resolve_asset(item.get(f"image{suffix}"), asset_map)
            if not title and not description and not image:
                continue
            blocks.append(
                _block("blocks.promo-slide", title=title, description=description, image=image)
            )
    return blocks


def expand_contacts(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    for item in items:
        contact_type = _clean_text(item.get("title"))
        value = _clean_html(item.get("description") or item.get("value"))
        if not contact_type and not value:
            continue
        blocks.append(_block("blocks.contact-detail", type=contact_type, value=value))
    return blocks


def expand_social(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    for item in items:
        name = _clean_text(item.get("title") or item.get("name"))
        url = _clean_text(item.get("url"))
        icon = _clean_text(item.get("icon"))
        blocks.append(_block("blocks.social-link", name=name, url=url, icon=icon))
    return blocks


def expand_gallery(
    items: list[dict[str, Any]], asset_map: dict[str, Any]
) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    for item in items:
        image = _resolve_asset(item.get("image"), asset_map)
        caption = _clean_text(item.get("title") or item.get("caption"))
        if image is None and not caption:
            continue
        blocks.append(_block("blocks.gallery-image", image=image, caption=caption))
    return blocks


def expand_video_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    for item in items:
        title = _clean_text(item.get("title"))
        # MIGX video rows carry YouTube ids / external URLs, not mp4/webm
        # uploads. Store whichever is populated in videoMp4 so the player can
        # pick the right source; leave videoWebm empty.
        url = _clean_text(item.get("url"))
        video_id = _clean_text(item.get("videoid"))
        tags = _clean_text(item.get("vtags") or item.get("videoTags"))
        src = url or (f"https://www.youtube.com/watch?v={video_id}" if video_id else "")
        blocks.append(
            _block("blocks.video", title=title, videoMp4=src, videoTags=tags)
        )
    return blocks


def expand_advantages(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    for item in items:
        title = _clean_text(item.get("value") or item.get("title"))
        description = _clean_text(item.get("description"))
        icon = _clean_text(item.get("icon"))
        if not title and not description:
            continue
        blocks.append(_block("blocks.advantage", title=title, description=description, icon=icon))
    return blocks


def expand_homepage_video(
    resource: dict[str, Any], asset_map: dict[str, Any]
) -> list[dict[str, Any]]:
    tvs = resource.get("template_variables") or {}
    video_mp4 = _resolve_asset(tvs.get("videoMp4"), asset_map)
    video_webm = _resolve_asset(tvs.get("videoWebm"), asset_map)
    thumbnail = _resolve_asset(tvs.get("imageVideo"), asset_map)
    tags = _clean_text(tvs.get("videoTags"))
    title = _clean_text(tvs.get("pagetitle") or resource.get("pagetitle"))
    if not any((video_mp4, video_webm, thumbnail, tags)):
        return []
    return [
        _block(
            "blocks.video",
            title=title,
            videoMp4=video_mp4,
            videoWebm=video_webm,
            thumbnail=thumbnail,
            videoTags=tags,
        )
    ]


# ---------------------------------------------------------------------------
# Driver
# ---------------------------------------------------------------------------


EXPANDERS: dict[str, Any] = {
    "migxAccordion": expand_accordion,
    "migxFaq": expand_faq,
    "migxResources": expand_faq,
    "migxTabs": expand_tabs,
    "migxTabsLink": expand_tabs,
    "migxLocation": expand_location,
    "migxLocation2": expand_location,
    "migxContacts": expand_contacts,
    "migxSocial": expand_social,
    "migxGallery": expand_gallery,
    "migxVideo": expand_video_items,
    "migxAdvantages": expand_advantages,
}


def normalize_resource(resource: dict[str, Any], asset_map: dict[str, Any]) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    tvs = resource.get("template_variables") or {}

    # Deterministic TV order: matches the dynamic-zone display order used in
    # the existing Strapi schema.
    ordered = [
        "migxPromoSlider",
        "migxAccordion",
        "migxFaq",
        "migxResources",
        "migxTabs",
        "migxTabsLink",
        "migxGallery",
        "migxVideo",
        "migxContacts",
        "migxLocation",
        "migxLocation2",
        "migxSocial",
        "migxAdvantages",
    ]

    for key in ordered:
        raw = tvs.get(key)
        if not raw:
            continue
        items = tolerant_decode(raw) if isinstance(raw, str) else raw
        if not isinstance(items, list):
            continue
        if key == "migxPromoSlider":
            blocks.extend(expand_promo_slider(items, asset_map))
        elif key == "migxGallery":
            blocks.extend(expand_gallery(items, asset_map))
        else:
            blocks.extend(EXPANDERS[key](items))

    if int(resource["id"]) in HOMEPAGE_VIDEO_IDS:
        blocks.extend(expand_homepage_video(resource, asset_map))

    return blocks


def process() -> None:
    with TRANSFORMED_PATH.open("r", encoding="utf-8") as handle:
        resources = json.load(handle)
    with ASSET_MAP_PATH.open("r", encoding="utf-8") as handle:
        asset_map = json.load(handle)

    flat = iter_resource_tree(resources)
    for resource in flat:
        import_block = resource.setdefault("_import", {})
        import_block["blocks"] = normalize_resource(resource, asset_map)
    page_link_index = build_page_link_index(flat)
    for resource in flat:
        ctx = resource.get("context_key")
        if not isinstance(ctx, str):
            continue
        bucket = page_link_index.get(ctx) or {}
        if not bucket:
            continue
        imp = resource.get("_import") or {}
        if imp.get("blocks"):
            imp["blocks"] = rewrite_internal_links_in_structure(imp["blocks"], locale_bucket=bucket)
            imp["blocks"] = cleanup_dead_html_in_structure(imp["blocks"], locale_bucket=bucket, asset_map=asset_map)

    with TRANSFORMED_PATH.open("w", encoding="utf-8") as handle:
        json.dump(resources, handle, ensure_ascii=False, indent=2)

    total_blocks = sum(len((r.get("_import") or {}).get("blocks") or []) for r in flat)
    print(
        f"MIGX normalization complete. {total_blocks} blocks across "
        f"{sum(1 for r in flat if (r.get('_import') or {}).get('blocks'))} resources."
    )


if __name__ == "__main__":
    process()
