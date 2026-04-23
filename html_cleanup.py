"""Remove dead ``<img>`` and unwrap useless ``<a>`` after asset rewrite + internal links.

Runs **after** ``modernize_html`` and ``rewrite_internal_links_html`` so orphan
legacy media (including absolute URLs on the configured legacy hosts) and
anchors that still do not resolve to a known page, upload, or mapped file are
stripped without dropping surrounding text.
"""

from __future__ import annotations

import re
import urllib.parse
import warnings
from typing import Any

from bs4 import BeautifulSoup, MarkupResemblesLocatorWarning

from internal_link_rewrite import (
    _is_legacy_host,
    _legacy_host_set,
    _norm_href_key,
)


def _resolved_urls(asset_map: dict[str, Any]) -> set[str]:
    return {info["url"] for info in asset_map.values() if isinstance(info, dict) and isinstance(info.get("url"), str)}


def _maybe_decompose_img(img: Any, resolved_urls: set[str], asset_map: dict[str, Any], hosts: frozenset[str]) -> bool:
    """Return True if the tag was removed."""

    src_raw = img.get("src")
    if not isinstance(src_raw, str) or not src_raw.strip():
        parent = img.parent
        img.decompose()
        if parent is not None and parent.name == "a" and not parent.get_text(strip=True) and not parent.find_all(
            ["img", "picture", "svg"]
        ):
            parent.decompose()
        return True

    src = src_raw.strip()
    if src in resolved_urls:
        return False

    decoded = urllib.parse.unquote(src)
    if decoded in resolved_urls:
        return False

    candidate = decoded.lstrip("/")
    if candidate.startswith("files/") or candidate.startswith("uploads/"):
        if candidate in asset_map or urllib.parse.unquote(candidate) in asset_map:
            return False
        parent = img.parent
        img.decompose()
        if parent is not None and parent.name == "a" and not parent.get_text(strip=True) and not parent.find_all(
            ["img", "picture", "svg"]
        ):
            parent.decompose()
        return True

    parse_src = "https:" + src if src.startswith("//") else src
    parsed = urllib.parse.urlparse(parse_src)
    host = parsed.hostname or ""
    if parsed.scheme in ("http", "https") or (parsed.netloc and not parsed.scheme):
        if not _is_legacy_host(host, hosts):
            return False
        rel_path = (parsed.path or "").lstrip("/")
        if rel_path.startswith("files/") or rel_path.startswith("uploads/"):
            if rel_path in asset_map or urllib.parse.unquote(rel_path) in asset_map:
                return False
            parent = img.parent
            img.decompose()
            if parent is not None and parent.name == "a" and not parent.get_text(strip=True) and not parent.find_all(
                ["img", "picture", "svg"]
            ):
                parent.decompose()
            return True
        return False

    return False


def _lookup_keys_for_path(trimmed: str) -> list[str]:
    keys: list[str] = []
    if trimmed:
        nk = _norm_href_key(trimmed)
        if nk:
            keys.append(nk)
        if "/" in trimmed:
            last = _norm_href_key(trimmed.split("/")[-1])
            if last and last not in keys:
                keys.append(last)
    return keys


def _internal_path_resolves(
    path_part: str,
    *,
    locale_bucket: dict[str, str],
    resolved_urls: set[str],
    asset_map: dict[str, Any],
) -> bool:
    rel = urllib.parse.unquote(path_part or "/")
    if not rel.startswith("/"):
        rel = "/" + rel
    rel = re.sub(r"/{2,}", "/", rel).rstrip("/") or "/"
    if rel == "/":
        return True
    low = rel.lower()
    if low.startswith("/uploads/"):
        return rel in resolved_urls or urllib.parse.unquote(rel) in resolved_urls
    if low.startswith("/files/"):
        fk = rel.lstrip("/")
        return fk in asset_map or urllib.parse.unquote(fk) in asset_map
    valid_slugs = {p.casefold() for p in locale_bucket.values()}
    if rel.casefold() in valid_slugs:
        return True
    trimmed = rel.strip().lstrip("/")
    for lk in _lookup_keys_for_path(trimmed):
        if lk and lk in locale_bucket:
            return True
    return False


def _anchor_should_unwrap(
    href: str,
    *,
    locale_bucket: dict[str, str],
    resolved_urls: set[str],
    asset_map: dict[str, Any],
    hosts: frozenset[str],
) -> bool:
    href_stripped = href.strip()
    if not href_stripped:
        return True
    if "[[~" in href_stripped or "{{" in href_stripped:
        return True

    low = href_stripped.lower()
    if low.startswith("mailto:") or low.startswith("tel:"):
        return False
    if low.startswith("javascript:"):
        return True
    if low.startswith("#"):
        frag = href_stripped[1:].strip()
        return frag == ""

    if not locale_bucket:
        return False

    parse_input = "https:" + href_stripped if href_stripped.startswith("//") else href_stripped
    parsed = urllib.parse.urlparse(parse_input)

    if parsed.scheme in ("http", "https") or (parsed.netloc and not parsed.scheme):
        host = parsed.hostname or ""
        if _is_legacy_host(host, hosts):
            path_part = parsed.path or "/"
            return not _internal_path_resolves(path_part, locale_bucket=locale_bucket, resolved_urls=resolved_urls, asset_map=asset_map)
        return False

    if href_stripped.startswith("//"):
        p2 = urllib.parse.urlparse("https:" + href_stripped)
        h2 = p2.hostname or ""
        if _is_legacy_host(h2, hosts):
            return not _internal_path_resolves(p2.path or "/", locale_bucket=locale_bucket, resolved_urls=resolved_urls, asset_map=asset_map)
        rest = href_stripped[2:].lower()
        if rest.startswith(
            ("www.youtube.com/", "youtube.com/", "youtu.be/", "player.vimeo.com/", "vimeo.com/")
        ):
            return False
        return False

    path_for_check = parsed.path or href_stripped
    if not path_for_check.startswith("/"):
        path_for_check = "/" + path_for_check.lstrip("/")
    return not _internal_path_resolves(path_for_check, locale_bucket=locale_bucket, resolved_urls=resolved_urls, asset_map=asset_map)


def cleanup_dead_html(
    raw_html: str | None,
    *,
    locale_bucket: dict[str, str],
    asset_map: dict[str, Any],
    legacy_hosts: frozenset[str] | None = None,
) -> str:
    if not raw_html or not isinstance(raw_html, str):
        return raw_html or ""
    if "<" not in raw_html:
        return raw_html
    low = raw_html.lower()
    if "<img" not in low and "<a" not in low:
        return raw_html

    hosts = _legacy_host_set(legacy_hosts or frozenset())
    resolved_urls = _resolved_urls(asset_map)
    warnings.filterwarnings("ignore", category=MarkupResemblesLocatorWarning)
    soup = BeautifulSoup(raw_html, "html.parser")

    for img in list(soup.find_all("img")):
        _maybe_decompose_img(img, resolved_urls, asset_map, hosts)

    for tag in list(soup.find_all("a")):
        href = tag.get("href")
        if not isinstance(href, str):
            if href is None:
                tag.unwrap()
            continue
        if _anchor_should_unwrap(
            href,
            locale_bucket=locale_bucket,
            resolved_urls=resolved_urls,
            asset_map=asset_map,
            hosts=hosts,
        ):
            tag.unwrap()

    return str(soup)


def cleanup_dead_html_in_structure(
    obj: Any,
    *,
    locale_bucket: dict[str, str],
    asset_map: dict[str, Any],
    legacy_hosts: frozenset[str] | None = None,
) -> Any:
    if isinstance(obj, dict):
        return {
            k: cleanup_dead_html_in_structure(v, locale_bucket=locale_bucket, asset_map=asset_map, legacy_hosts=legacy_hosts)
            for k, v in obj.items()
        }
    if isinstance(obj, list):
        return [
            cleanup_dead_html_in_structure(v, locale_bucket=locale_bucket, asset_map=asset_map, legacy_hosts=legacy_hosts)
            for v in obj
        ]
    if isinstance(obj, str) and "<" in obj:
        low = obj.lower()
        if "<img" in low or "<a" in low:
            return cleanup_dead_html(obj, locale_bucket=locale_bucket, asset_map=asset_map, legacy_hosts=legacy_hosts)
    return obj


def apply_dead_html_cleanup_to_resource(
    resource: dict[str, Any],
    index: dict[str, dict[str, str]],
    asset_map: dict[str, Any],
    *,
    legacy_hosts: frozenset[str] | None = None,
) -> None:
    ctx = resource.get("context_key")
    if not isinstance(ctx, str):
        return
    bucket = index.get(ctx) or {}

    resource["content"] = cleanup_dead_html(
        resource.get("content"), locale_bucket=bucket, asset_map=asset_map, legacy_hosts=legacy_hosts
    )
    resource["introtext"] = cleanup_dead_html(
        resource.get("introtext"), locale_bucket=bucket, asset_map=asset_map, legacy_hosts=legacy_hosts
    )

    tvs = resource.get("template_variables")
    if isinstance(tvs, dict):
        for k, v in list(tvs.items()):
            if isinstance(v, str) and isinstance(k, str) and k.lower().startswith("migx"):
                continue
            if isinstance(v, str) and "<" in v and ">" in v:
                tvs[k] = cleanup_dead_html(v, locale_bucket=bucket, asset_map=asset_map, legacy_hosts=legacy_hosts)

    imp = resource.get("_import")
    if isinstance(imp, dict) and imp.get("blocks"):
        imp["blocks"] = cleanup_dead_html_in_structure(
            imp["blocks"], locale_bucket=bucket, asset_map=asset_map, legacy_hosts=legacy_hosts
        )
