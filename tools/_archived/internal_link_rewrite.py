"""Rewrite internal page <a href> values to canonical Strapi slugs.

Observed broken patterns in MODX HTML (see transformed_resources.json):

- Relative Greek or transliterated paths: ``href=\"%CE%B5%CE%BD...\"`` or
  ``href=\"ενδοσκοπική-αδενοτομή"`` that do not match the ASCII ``_import.slug``.
- Absolute URLs on the legacy site host: ``https://myorl.gr/kreatakia-egxeirisi``.

This module builds a per-``context_key`` index (``web`` / ``rus``) from all
resources after ``_import.slug`` exists, then rewrites ``href`` attributes to
``/{canonical_slug}`` while preserving fragments and leaving true external
links unchanged.

Legacy hosts are configurable via ``INTERNAL_LINK_LEGACY_HOSTS`` (comma-separated).

Optional: ``internal_link_overrides.json`` (or ``INTERNAL_LINK_OVERRIDES_PATH``) maps
``{ "web": { "greek-or-old-key": "target-slug" }, "rus": {} }`` for edge cases.

Fuzzy matching (``unidecode`` + ``difflib``) resolves Greek hrefs to ASCII slugs when
exact keys miss; disable with ``INTERNAL_LINK_FUZZY=0`` or tune
``INTERNAL_LINK_FUZZY_CUTOFF`` (default ``0.88``). Install ``unidecode`` for best results.
"""

from __future__ import annotations

import json
import os
import re
import urllib.parse
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Iterable

from bs4 import BeautifulSoup, MarkupResemblesLocatorWarning
import unicodedata
import warnings

from cms_audit import MANIFESTS_DIR, ROOT

try:
    from unidecode import unidecode as _unidecode
except ImportError:  # pragma: no cover - optional dependency
    _unidecode = None  # type: ignore[misc, assignment]

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OVERRIDES_PATH = MANIFESTS_DIR / "internal_link_overrides.json"

DEFAULT_LEGACY_HOSTS: frozenset[str] = frozenset(
    h.strip().lower()
    for h in os.environ.get("INTERNAL_LINK_LEGACY_HOSTS", "myorl.gr,www.myorl.gr").split(",")
    if h.strip()
)


def _slug_from_text(value: str | None) -> str:
    """Match ``transform_data._slug_from_text`` (ASCII slug from Greek/Cyrillic)."""

    normalized = unicodedata.normalize("NFKD", value or "")
    ascii_only = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    ascii_only = ascii_only.encode("ascii", "ignore").decode("ascii").lower()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_only).strip("-")
    return slug


def _norm_href_key(segment: str) -> str:
    """Normalize a path segment for lookup (unicode casefold, no leading slashes)."""

    s = (segment or "").strip()
    s = urllib.parse.unquote(s)
    s = s.strip("/")
    s = re.sub(r"\.html?$", "", s, flags=re.IGNORECASE)
    return s.casefold()


def _register_key(bucket: dict[str, str], key: str, target_path: str) -> None:
    if not key:
        return
    if key not in bucket:
        bucket[key] = target_path


def _greek_friendly_path_key_from_heading(text: Any) -> str | None:
    """MODX-style Greek URL segment derived from ``pagetitle`` / headings (spaces → hyphens)."""

    if not isinstance(text, str):
        return None
    t = text.strip().casefold()
    if not t:
        return None
    t = re.sub(r"[\s/.,;:!?]+", "-", t)
    t = re.sub(r"-+", "-", t).strip("-")
    if not t:
        return None
    return _norm_href_key(t)


def _norm_key_has_non_ascii(norm_key: str) -> bool:
    try:
        (norm_key or "").encode("ascii")
        return False
    except UnicodeEncodeError:
        return True


def _collect_keys_for_resource(resource: dict[str, Any]) -> Iterable[str]:
    imp = resource.get("_import") or {}
    slug = (imp.get("slug") or "").strip()
    if not slug:
        return
    alias = (resource.get("alias") or "").strip()
    uri = (resource.get("uri") or "").strip()

    keys: set[str] = set()
    keys.add(_norm_href_key(slug))
    if alias:
        keys.add(_norm_href_key(alias))
        keys.add(_norm_href_key(_slug_from_text(alias)))
        keys.add(_norm_href_key(urllib.parse.quote(alias, safe="/")))
        if _unidecode:
            keys.add(_norm_href_key(_unidecode(alias)))
    if uri:
        keys.add(_norm_href_key(uri))
        if _unidecode:
            keys.add(_norm_href_key(_unidecode(uri)))
    # Some exports use pagetitle-derived paths when alias was empty in older rows.
    title_slug = _slug_from_text(resource.get("pagetitle"))
    if title_slug:
        keys.add(_norm_href_key(title_slug))
    if _unidecode and resource.get("pagetitle"):
        keys.add(_norm_href_key(_unidecode(str(resource.get("pagetitle")))))
    gk = _greek_friendly_path_key_from_heading(resource.get("pagetitle"))
    if gk:
        keys.add(gk)
    gk_lt = _greek_friendly_path_key_from_heading(resource.get("longtitle"))
    if gk_lt and gk_lt != gk:
        keys.add(gk_lt)
    keys.discard("")
    for k in keys:
        yield k


def _babel_linked_modx_ids(resource: dict[str, Any]) -> dict[str, int]:
    """Parse ``babelLanguageLinks`` like ``web:82;rus:186`` into ``context -> MODX id``."""

    raw = (resource.get("template_variables") or {}).get("babelLanguageLinks")
    if not isinstance(raw, str) or not raw.strip():
        return {}
    out: dict[str, int] = {}
    for part in raw.split(";"):
        part = part.strip()
        if ":" not in part:
            continue
        ctx_key, id_part = part.split(":", 1)
        ck = ctx_key.strip().lower()
        try:
            out[ck] = int(id_part.strip())
        except ValueError:
            continue
    return out


def _merge_manual_overrides(out: dict[str, dict[str, str]], path: Path) -> None:
    if not path.exists():
        return
    with path.open("r", encoding="utf-8") as handle:
        raw = json.load(handle)
    if not isinstance(raw, dict):
        return
    for ctx, mapping in raw.items():
        if not isinstance(ctx, str) or not isinstance(mapping, dict):
            continue
        bucket = out.setdefault(ctx, {})
        for href_key, slug_or_path in mapping.items():
            if not isinstance(href_key, str) or not isinstance(slug_or_path, str):
                continue
            key = _norm_href_key(href_key)
            if not key:
                continue
            dest = slug_or_path.strip()
            if not dest.startswith("/"):
                dest = "/" + dest
            bucket[key] = dest


def build_page_link_index(resources: list[dict[str, Any]]) -> dict[str, dict[str, str]]:
    """Return ``context_key -> { normalized_path: \"/target-slug\" }``.

    First writer wins (lowest MODX ``id``) so collisions are deterministic.
    """

    ordered = sorted(resources, key=lambda row: int(row.get("id") or 0))
    id_to_res = {int(r["id"]): r for r in ordered if r.get("id") is not None}
    out: dict[str, dict[str, str]] = {}
    for resource in ordered:
        ctx = resource.get("context_key")
        if not isinstance(ctx, str):
            continue
        imp = resource.get("_import") or {}
        slug = (imp.get("slug") or "").strip()
        if not slug:
            continue
        target_path = "/" + slug
        bucket = out.setdefault(ctx, {})
        for key in _collect_keys_for_resource(resource):
            _register_key(bucket, key, target_path)
        # RU pages sometimes still link with the Greek ``web`` friendly paths; map via Babel pairs.
        if ctx == "rus":
            web_id = _babel_linked_modx_ids(resource).get("web")
            if web_id is not None:
                partner = id_to_res.get(web_id)
                if isinstance(partner, dict) and partner.get("context_key") == "web":
                    for tit in (partner.get("pagetitle"), partner.get("longtitle")):
                        gk = _greek_friendly_path_key_from_heading(tit)
                        if gk:
                            _register_key(bucket, gk, target_path)
                    for pk in _collect_keys_for_resource(partner):
                        if pk and _norm_key_has_non_ascii(pk):
                            _register_key(bucket, pk, target_path)
    override_path = Path(os.environ.get("INTERNAL_LINK_OVERRIDES_PATH", str(DEFAULT_OVERRIDES_PATH)))
    _merge_manual_overrides(out, override_path)
    return out


def _legacy_host_set(extra: frozenset[str] | None) -> frozenset[str]:
    base = set(DEFAULT_LEGACY_HOSTS)
    if extra:
        base |= {h.lower() for h in extra}
    return frozenset(base)


def _is_legacy_host(host: str, hosts: frozenset[str]) -> bool:
    h = (host or "").lower()
    if not h:
        return False
    if h in hosts:
        return True
    for base in hosts:
        if base and (h == base or h.endswith("." + base)):
            return True
    return False


def _fuzzy_resolve_target(
    norm_key: str,
    unique_targets: frozenset[str],
    *,
    cutoff: float | None = None,
) -> str | None:
    """Match Greek or mistyped path segments to ASCII slugs via unidecode + ratio."""

    if os.environ.get("INTERNAL_LINK_FUZZY", "1") == "0":
        return None
    if not _unidecode or not norm_key or len(norm_key) < 4:
        return None
    needle = _unidecode(urllib.parse.unquote(norm_key)).lower()
    if len(needle) < 4:
        return None
    eff_cutoff = (
        cutoff
        if cutoff is not None
        else float(os.environ.get("INTERNAL_LINK_FUZZY_CUTOFF", "0.88"))
    )
    best_ratio = 0.0
    best_path: str | None = None
    for tp in unique_targets:
        cand = _unidecode(tp.strip("/")).lower()
        ratio = SequenceMatcher(None, needle, cand).ratio()
        if ratio > best_ratio:
            best_ratio = ratio
            best_path = tp
    if best_path is not None and best_ratio >= eff_cutoff:
        return best_path
    return None


def _ascii_slug_from_norm_key(norm_key: str) -> str | None:
    """Turn a normalized href key (unicode path, no slashes) into an ASCII slug."""

    if not norm_key:
        return None
    raw = urllib.parse.unquote(norm_key)
    if _unidecode:
        raw = _unidecode(raw)
    slug = _slug_from_text(raw)
    return slug or None


def _resolve_extended_fuzzy(norm_key: str, unique_targets: frozenset[str]) -> str | None:
    """Lower-cutoff fuzzy + derived ASCII slug match against known targets."""

    if not norm_key:
        return None
    fb = float(os.environ.get("INTERNAL_LINK_FUZZY_FALLBACK_CUTOFF", "0.72"))
    t = _fuzzy_resolve_target(norm_key, unique_targets, cutoff=fb)
    if t:
        return t
    slug = _ascii_slug_from_norm_key(norm_key)
    if not slug:
        return None
    cand = "/" + slug
    if cand in unique_targets:
        return cand
    return _fuzzy_resolve_target(slug, unique_targets, cutoff=fb)


def _resolve_loose_unicode_fuzzy(norm_key: str, unique_targets: frozenset[str]) -> str | None:
    """Last resort for Greek / editorial paths that diverge from ``pagetitle`` hyphenation."""

    if not norm_key or not _norm_key_has_non_ascii(norm_key):
        return None
    lo = float(os.environ.get("INTERNAL_LINK_FUZZY_UNICODE_CUTOFF", "0.62"))
    return _fuzzy_resolve_target(norm_key, unique_targets, cutoff=lo)


def rewrite_internal_links_html(
    raw_html: str | None,
    *,
    locale_bucket: dict[str, str],
    legacy_hosts: frozenset[str] | None = None,
) -> str:
    """Return HTML with internal ``href`` values rewritten to ``/{slug}``."""

    if not raw_html or not isinstance(raw_html, str):
        return raw_html or ""
    if "href" not in raw_html.lower():
        return raw_html

    hosts = _legacy_host_set(legacy_hosts or frozenset())
    unique_targets = frozenset(locale_bucket.values())
    warnings.filterwarnings("ignore", category=MarkupResemblesLocatorWarning)
    soup = BeautifulSoup(raw_html, "html.parser")
    for tag in soup.find_all("a"):
        href = tag.get("href")
        if not isinstance(href, str) or not href.strip():
            continue
        href_stripped = href.strip()
        low = href_stripped.lower()
        if low.startswith("#"):
            continue
        if low.startswith("mailto:") or low.startswith("tel:") or low.startswith("javascript:"):
            continue

        parse_input = "https:" + href_stripped if href_stripped.startswith("//") else href_stripped
        parsed = urllib.parse.urlparse(parse_input)
        fragment = (parsed.fragment or "").lstrip("#")
        path_part: str
        legacy_absolute = False

        if parsed.scheme in ("http", "https"):
            host = parsed.hostname or ""
            if not _is_legacy_host(host, hosts):
                continue
            legacy_absolute = True
            path_part = parsed.path or "/"
        elif parsed.netloc and not parsed.scheme:
            host = parsed.hostname or ""
            if not _is_legacy_host(host, hosts):
                continue
            legacy_absolute = True
            path_part = parsed.path or "/"
        else:
            path_part = parsed.path or href_stripped

        trimmed = (path_part or "").strip().lstrip("/")
        lookup_keys: list[str] = []
        if trimmed:
            lookup_keys.append(_norm_href_key(trimmed))
            if "/" in trimmed:
                last_seg = _norm_href_key(trimmed.split("/")[-1])
                if last_seg and last_seg not in lookup_keys:
                    lookup_keys.append(last_seg)

        target: str | None = None
        for lk in lookup_keys:
            if lk:
                target = locale_bucket.get(lk)
                if target:
                    break
        if not target:
            for lk in lookup_keys:
                if not lk:
                    continue
                target = _fuzzy_resolve_target(lk, unique_targets)
                if target:
                    break
        if not target:
            for lk in lookup_keys:
                if not lk:
                    continue
                target = _resolve_extended_fuzzy(lk, unique_targets)
                if target:
                    break
        if not target:
            for lk in lookup_keys:
                if not lk:
                    continue
                target = _resolve_loose_unicode_fuzzy(lk, unique_targets)
                if target:
                    break

        if not target and legacy_absolute:
            rel = urllib.parse.unquote(path_part or "/")
            if not rel.startswith("/"):
                rel = "/" + rel
            rel = re.sub(r"/{2,}", "/", rel).rstrip("/") or "/"
            new_href = rel
            if fragment:
                new_href = f"{new_href}#{fragment}"
            tag["href"] = new_href
            continue

        if not target:
            continue

        new_href = target
        if fragment:
            new_href = f"{target}#{fragment}"
        tag["href"] = new_href

    return str(soup)


def _maybe_rewrite_html_string(
    value: Any,
    *,
    locale_bucket: dict[str, str],
    legacy_hosts: frozenset[str] | None,
) -> Any:
    if not isinstance(value, str) or "href" not in value.lower():
        return value
    return rewrite_internal_links_html(value, locale_bucket=locale_bucket, legacy_hosts=legacy_hosts)


def rewrite_internal_links_in_structure(
    obj: Any,
    *,
    locale_bucket: dict[str, str],
    legacy_hosts: frozenset[str] | None = None,
) -> Any:
    """Recursively rewrite HTML strings inside dict/list trees (e.g. ``_import.blocks``)."""

    if isinstance(obj, dict):
        return {k: rewrite_internal_links_in_structure(v, locale_bucket=locale_bucket, legacy_hosts=legacy_hosts) for k, v in obj.items()}
    if isinstance(obj, list):
        return [rewrite_internal_links_in_structure(v, locale_bucket=locale_bucket, legacy_hosts=legacy_hosts) for v in obj]
    return _maybe_rewrite_html_string(obj, locale_bucket=locale_bucket, legacy_hosts=legacy_hosts)


def apply_internal_link_rewrites_to_resource(
    resource: dict[str, Any],
    index: dict[str, dict[str, str]],
    *,
    legacy_hosts: frozenset[str] | None = None,
) -> None:
    """Mutate ``resource`` in place: ``content``, ``introtext``, HTML TVs, ``_import.blocks``."""

    ctx = resource.get("context_key")
    if not isinstance(ctx, str):
        return
    bucket = index.get(ctx) or {}
    if not bucket:
        return

    resource["content"] = rewrite_internal_links_html(
        resource.get("content"), locale_bucket=bucket, legacy_hosts=legacy_hosts
    )
    resource["introtext"] = rewrite_internal_links_html(
        resource.get("introtext"), locale_bucket=bucket, legacy_hosts=legacy_hosts
    )

    tvs = resource.get("template_variables")
    if isinstance(tvs, dict):
        for k, v in list(tvs.items()):
            if isinstance(v, str) and isinstance(k, str) and k.lower().startswith("migx"):
                continue
            if isinstance(v, str) and "<" in v and ">" in v:
                tvs[k] = rewrite_internal_links_html(v, locale_bucket=bucket, legacy_hosts=legacy_hosts)

    imp = resource.get("_import")
    if isinstance(imp, dict) and imp.get("blocks"):
        imp["blocks"] = rewrite_internal_links_in_structure(
            imp["blocks"], locale_bucket=bucket, legacy_hosts=legacy_hosts
        )
