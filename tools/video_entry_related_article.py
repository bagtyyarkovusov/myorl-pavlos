"""Resolve legacy MODX article URLs to Strapi page documentIds for Video Entries."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib import error, parse, request

from strapi_client import StrapiClient

logger = logging.getLogger("video_entry_related_article")

ROOT = Path(__file__).resolve().parents[1]
REDIRECTS_PATH = ROOT / "data" / "manifests" / "slug_redirects_next.json"
CHECKPOINT_PATH = ROOT / "data" / "source" / "checkpoints" / "checkpoint.json"
MODX_TO_STRAPI_PATH = ROOT / "data" / "source" / "checkpoints" / "modx_to_strapi.json"
MODX_FLAT_PATH = ROOT / "data" / "source" / "modx" / "published_resources_flat.json"
ALIAS_INDEX_CACHE_PATH = ROOT / "data" / "source" / "checkpoints" / "modx_alias_to_document_id.json"
LEGACY_SLUG_REDIRECT_CACHE_PATH = (
    ROOT / "data" / "source" / "checkpoints" / "video_legacy_slug_redirects.json"
)

CONTEXT_TO_LOCALE = {"web": "el", "rus": "ru"}
LOCALE_TO_CONTEXT = {"el": "web", "ru": "rus"}
LOCALES = ("el", "ru")


@dataclass(frozen=True)
class ArticleLinkInput:
    locale: str
    article_url: str


@dataclass(frozen=True)
class ResolutionResult:
    document_id: str | None
    resolved_slug: str | None
    source: str
    legacy_url: str | None
    extracted_slug: str | None


def iter_resource_tree(resources: list) -> list[dict]:
    """Flatten nested MODX ``children`` trees into resource dicts."""

    out: list[dict] = []

    def walk(nodes: list) -> None:
        for node in nodes:
            if not isinstance(node, dict):
                continue
            if node.get("id") is not None:
                out.append(node)
            children = node.get("children")
            if isinstance(children, list):
                walk(children)

    walk(resources)
    return out


def slug_from_article_url(url: str) -> str | None:
    """Extract the last path segment; ignores URL fragments such as ``#tab3``."""

    if not url or url.endswith("#") or url.endswith("/#"):
        return None
    try:
        parsed = parse.urlparse(url)
        segments = [segment for segment in parsed.path.split("/") if segment]
        if not segments:
            return None
        return parse.unquote(segments[-1]).strip()
    except ValueError:
        return None


def normalize_legacy_article_url(url: str | None) -> str | None:
    if not url:
        return None
    decoded = parse.unquote(url.strip())
    return decoded or None


def is_hash_only_article_url(url: str | None) -> bool:
    if not url:
        return True
    stripped = url.strip()
    return stripped in ("#",) or stripped.endswith("#") or stripped.endswith("/#")


def load_redirect_targets(
    redirects_path: Path = REDIRECTS_PATH,
) -> dict[str, dict[str, str]]:
    """Map locale -> old slug -> canonical Strapi slug."""

    if not redirects_path.is_file():
        return {"el": {}, "ru": {}}
    payload = json.loads(redirects_path.read_text(encoding="utf-8"))
    out: dict[str, dict[str, str]] = {"el": {}, "ru": {}}
    for row in payload.get("redirects", []):
        locale = row.get("locale")
        if locale not in out:
            continue
        target = row.get("strapiSlugAscii") or row.get("modxAlias")
        if not target:
            continue
        for variant in row.get("fromPathVariants", []):
            slug = slug_from_article_url(
                variant if variant.startswith("http") else f"https://myorl.gr{variant}",
            )
            if slug:
                out[locale][slug] = target
        alias = row.get("modxAlias")
        if alias:
            out[locale][alias] = target
    return out


def fetch_pages_by_slug(client: StrapiClient) -> dict[str, dict[str, str]]:
    pages: dict[str, dict[str, str]] = {"el": {}, "ru": {}}
    for locale in LOCALES:
        page = 1
        while True:
            resp = client.get(
                "/api/pages",
                **{
                    "locale": locale,
                    "pagination[page]": page,
                    "pagination[pageSize]": 100,
                    "fields[0]": "slug",
                    "fields[1]": "documentId",
                    "status": "published",
                },
            )
            for entry in resp.get("data") or []:
                slug = entry.get("slug")
                document_id = entry.get("documentId")
                if slug and document_id:
                    pages[locale][slug] = str(document_id)
            pagination = (resp.get("meta") or {}).get("pagination") or {}
            if page >= int(pagination.get("pageCount") or 1):
                break
            page += 1
    return pages


def invert_pages_by_slug(pages_by_slug: dict[str, dict[str, str]]) -> dict[str, dict[str, str]]:
    """Map locale -> documentId -> slug."""

    out: dict[str, dict[str, str]] = {"el": {}, "ru": {}}
    for locale, slug_map in pages_by_slug.items():
        for slug, document_id in slug_map.items():
            out.setdefault(locale, {})[document_id] = slug
    return out


def _alias_keys_for_resource(resource: dict) -> list[str]:
    keys: list[str] = []
    seen: set[str] = set()

    def add(value: str | None) -> None:
        if not value:
            return
        token = value.strip()
        if not token or token in seen:
            return
        seen.add(token)
        keys.append(token)

    add((resource.get("alias") or "").strip() or None)
    uri = (resource.get("uri") or "").strip().strip("/")
    if uri:
        add(parse.unquote(uri.split("/")[-1]))
    return keys


def _load_modx_flat(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as handle:
        data = json.load(handle)
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and "resources" in data:
        return iter_resource_tree(data["resources"])
    return iter_resource_tree(data)


def build_alias_to_document_id(
    *,
    checkpoint_path: Path = CHECKPOINT_PATH,
    modx_flat_path: Path = MODX_FLAT_PATH,
    modx_to_strapi_path: Path = MODX_TO_STRAPI_PATH,
    cache_path: Path = ALIAS_INDEX_CACHE_PATH,
    use_cache: bool = True,
) -> dict[str, dict[str, str]]:
    """
    Build locale -> MODX alias -> Strapi documentId using migration checkpoints.

    When ``cache_path`` exists and ``use_cache`` is true, returns the cached index.
    """

    if use_cache and cache_path.is_file():
        cached = json.loads(cache_path.read_text(encoding="utf-8"))
        return {loc: dict(cached.get(loc) or {}) for loc in LOCALES}

    alias_index: dict[str, dict[str, str]] = {"el": {}, "ru": {}}
    if not checkpoint_path.is_file():
        logger.warning("Checkpoint missing: %s", checkpoint_path)
        return alias_index

    checkpoint = json.loads(checkpoint_path.read_text(encoding="utf-8"))
    pages_map = checkpoint.get("pages") or {}
    modx_to_strapi: dict[str, str] = {}
    if modx_to_strapi_path.is_file():
        modx_to_strapi = {
            str(key): str(value)
            for key, value in json.loads(modx_to_strapi_path.read_text(encoding="utf-8")).items()
        }

    if not modx_flat_path.is_file():
        logger.warning("MODX flat file missing: %s", modx_flat_path)
        return alias_index

    for resource in _load_modx_flat(modx_flat_path):
        context = resource.get("context_key") or ""
        locale = CONTEXT_TO_LOCALE.get(context)
        if not locale:
            continue
        modx_id = str(resource.get("id") or "")
        if not modx_id:
            continue
        context_key = LOCALE_TO_CONTEXT[locale]
        document_id = (pages_map.get(context_key) or {}).get(modx_id) or modx_to_strapi.get(modx_id)
        if not document_id:
            continue
        document_id = str(document_id)
        for alias_key in _alias_keys_for_resource(resource):
            alias_index[locale][alias_key] = document_id

    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(json.dumps(alias_index, ensure_ascii=False, indent=2), encoding="utf-8")
    return alias_index


def save_alias_index(
    alias_index: dict[str, dict[str, str]],
    cache_path: Path = ALIAS_INDEX_CACHE_PATH,
) -> None:
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(json.dumps(alias_index, ensure_ascii=False, indent=2), encoding="utf-8")


def resolve_article_url_via_http(url: str, *, timeout: int = 20) -> str | None:
    """Follow redirects on a legacy article URL and return the final path slug."""

    if not url or is_hash_only_article_url(url):
        return None
    if not url.startswith("http"):
        url = f"https://myorl.gr/{url.lstrip('/')}"
    req = request.Request(url, headers={"User-Agent": "myorl-video-repair/1.0"})
    try:
        with request.urlopen(req, timeout=timeout) as response:
            response.read(256)
            return slug_from_article_url(response.geturl())
    except error.HTTPError as exc:
        if exc.code not in (301, 302, 303, 307, 308):
            return None
        location = exc.headers.get("Location")
        if not location:
            return None
        if location.startswith("/"):
            parsed = parse.urlparse(url)
            location = f"{parsed.scheme}://{parsed.netloc}{location}"
        return resolve_article_url_via_http(location, timeout=timeout)
    except (error.URLError, TimeoutError):
        return None


def load_legacy_slug_redirect_cache(
    cache_path: Path = LEGACY_SLUG_REDIRECT_CACHE_PATH,
) -> dict[str, dict[str, str]]:
    """Map locale -> legacy path slug -> canonical ASCII slug (from live myorl.gr redirects)."""

    if not cache_path.is_file():
        return {"el": {}, "ru": {}}
    payload = json.loads(cache_path.read_text(encoding="utf-8"))
    return {loc: dict(payload.get(loc) or {}) for loc in LOCALES}


def save_legacy_slug_redirect_cache(
    cache: dict[str, dict[str, str]],
    cache_path: Path = LEGACY_SLUG_REDIRECT_CACHE_PATH,
) -> None:
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")


def build_legacy_slug_redirect_cache(
    article_urls: list[tuple[str, str]],
    *,
    cache_path: Path = LEGACY_SLUG_REDIRECT_CACHE_PATH,
    delay_s: float = 0.25,
) -> dict[str, dict[str, str]]:
    """
    Resolve Greek/legacy path slugs to ASCII slugs by following live myorl.gr redirects.

    ``article_urls`` is a list of ``(locale, article_url)`` pairs.
    """

    import time

    cache: dict[str, dict[str, str]] = {"el": {}, "ru": {}}
    seen: set[tuple[str, str]] = set()

    for locale, article_url in article_urls:
        if locale not in LOCALES or is_hash_only_article_url(article_url):
            continue
        legacy_slug = slug_from_article_url(article_url)
        if not legacy_slug:
            continue
        key = (locale, legacy_slug)
        if key in seen:
            continue
        seen.add(key)

        ascii_slug = resolve_article_url_via_http(article_url)
        if ascii_slug and ascii_slug != legacy_slug:
            cache[locale][legacy_slug] = ascii_slug
            logger.info("[%s] %s -> %s", locale, legacy_slug[:40], ascii_slug)

        if delay_s > 0:
            time.sleep(delay_s)

    save_legacy_slug_redirect_cache(cache, cache_path)
    return cache


def _locales_to_try(locale: str) -> tuple[str, ...]:
    ordered: list[str] = []
    for candidate in (locale, *LOCALES):
        if candidate in LOCALES and candidate not in ordered:
            ordered.append(candidate)
    return tuple(ordered)


def _resolve_slug_for_locale(
    slug: str,
    try_locale: str,
    *,
    pages_by_slug: dict[str, dict[str, str]],
    redirects: dict[str, dict[str, str]],
    alias_index: dict[str, dict[str, str]],
    slug_by_document_id: dict[str, dict[str, str]],
) -> ResolutionResult | None:
    mapped = redirects.get(try_locale, {}).get(slug, slug)
    locale_redirects = redirects.get(try_locale, {})

    if slug in locale_redirects:
        doc_id = pages_by_slug.get(try_locale, {}).get(mapped)
        if doc_id:
            return ResolutionResult(str(doc_id), mapped, "redirect", None, slug)

    for alias_slug in (slug, mapped):
        doc_id = alias_index.get(try_locale, {}).get(alias_slug)
        if doc_id:
            resolved_slug = slug_by_document_id.get(try_locale, {}).get(doc_id, mapped)
            return ResolutionResult(str(doc_id), resolved_slug, "alias_index", None, slug)

    doc_id = pages_by_slug.get(try_locale, {}).get(mapped)
    if doc_id:
        return ResolutionResult(str(doc_id), mapped, "page_slug", None, slug)

    return None


def resolve_related_article(
    link: ArticleLinkInput,
    *,
    pages_by_slug: dict[str, dict[str, str]],
    redirects: dict[str, dict[str, str]],
    alias_index: dict[str, dict[str, str]] | None = None,
    slug_by_document_id: dict[str, dict[str, str]] | None = None,
    legacy_slug_redirects: dict[str, dict[str, str]] | None = None,
    http_slug: str | None = None,
) -> ResolutionResult:
    """Resolve a legacy article URL to a published Strapi page documentId."""

    legacy = normalize_legacy_article_url(link.article_url)
    slug = slug_from_article_url(link.article_url)

    if not slug and not http_slug:
        return ResolutionResult(None, None, "unresolved", legacy, None)

    alias_index = alias_index or {"el": {}, "ru": {}}
    slug_by_document_id = slug_by_document_id or invert_pages_by_slug(pages_by_slug)
    legacy_slug_redirects = legacy_slug_redirects or load_legacy_slug_redirect_cache()

    cached_ascii = legacy_slug_redirects.get(link.locale, {}).get(slug) if slug else None
    if not http_slug and cached_ascii:
        http_slug = cached_ascii

    slugs_to_try: list[tuple[str, str]] = []
    if slug:
        slugs_to_try.append((slug, "path"))
    if http_slug and http_slug != slug:
        redirect_prefix = "legacy_redirect" if cached_ascii and http_slug == cached_ascii else "http"
        slugs_to_try.append((http_slug, redirect_prefix))

    for try_slug, source_prefix in slugs_to_try:
        for try_locale in _locales_to_try(link.locale):
            hit = _resolve_slug_for_locale(
                try_slug,
                try_locale,
                pages_by_slug=pages_by_slug,
                redirects=redirects,
                alias_index=alias_index,
                slug_by_document_id=slug_by_document_id,
            )
            if hit:
                if source_prefix == "path":
                    source = hit.source
                elif source_prefix == "legacy_redirect":
                    source = "legacy_redirect"
                else:
                    source = "http"
                return ResolutionResult(
                    hit.document_id,
                    hit.resolved_slug,
                    source,
                    legacy,
                    slug or try_slug,
                )

    return ResolutionResult(None, None, "unresolved", legacy, slug)
