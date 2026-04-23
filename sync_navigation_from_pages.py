"""Sync Strapi Navigation trees from the Page hierarchy.

This script treats `Page` as the source of truth for navigation structure and
builds `strapi-plugin-navigation` trees for `el` and/or `ru` from:

  * `parentPage`
  * `menuIndex`
  * `hideFromMenu`
  * `isFolder`

It is designed to be safe to rerun during migration:

  * `--dry-run` prints and optionally writes a JSON report without changing data
  * `--replace-existing` removes the current tree for the selected locale(s)
    and recreates it deterministically
  * `--merge` reconciles against the current tree by related document IDs /
    stable router keys and preserves existing navigation item document IDs where
    possible

Write operations use the Navigation plugin's admin API (JWT login required).
Read operations use the existing Strapi REST client for published page and
rendered-navigation inspection.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
import unicodedata
from collections import defaultdict
from dataclasses import asdict, dataclass, field
from typing import Any, Dict, Iterable, List, Optional, Sequence, Set, Tuple
from urllib import error, request

from strapi_client import (
    BACKOFF_CAP_S,
    DEBOUNCE_DELAY_MS,
    MAX_RETRIES,
    StrapiClient,
    StrapiError,
    load_strapi_env_from_dotenv,
)

logger = logging.getLogger("sync_navigation_from_pages")

DEFAULT_LOCALES = ("el", "ru")
PAGE_SIZE = 100
DEFAULT_NAVIGATION_SLUG = "navigation"
DEFAULT_NAVIGATION_NAME = "Navigation"
PAGE_UID = "api::page.page"


@dataclass
class PageRecord:
    id: int
    document_id: str
    locale: str
    title: Optional[str]
    slug: Optional[str]
    parent_document_id: Optional[str]
    hide_from_menu: bool
    is_folder: bool
    menu_index: Optional[int]
    content: Optional[str]
    excerpt: Optional[str]
    info_block_bottom: Optional[str]
    external_url: Optional[str]


@dataclass
class DesiredNavItem:
    source_page_document_id: str
    locale: str
    title: str
    item_type: str
    path: Optional[str]
    external_path: Optional[str]
    ui_router_key: str
    menu_attached: bool
    collapsed: bool
    order: int
    related: Optional[Dict[str, str]]
    auto_sync: Optional[bool]
    items: List["DesiredNavItem"] = field(default_factory=list)

    def to_update_payload(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "title": self.title,
            "type": self.item_type,
            "path": self.path,
            "externalPath": self.external_path,
            "uiRouterKey": self.ui_router_key,
            "menuAttached": self.menu_attached,
            "order": self.order,
            "collapsed": self.collapsed,
            "items": [child.to_update_payload() for child in self.items],
        }
        if self.related:
            payload["related"] = self.related
        if self.auto_sync is not None:
            payload["autoSync"] = self.auto_sync
        return payload

    def count_items(self) -> int:
        return 1 + sum(child.count_items() for child in self.items)

    def count_types(self) -> Dict[str, int]:
        counts = {"INTERNAL": 0, "WRAPPER": 0, "EXTERNAL": 0}
        counts[self.item_type] += 1
        for child in self.items:
            child_counts = child.count_types()
            for key, value in child_counts.items():
                counts[key] += value
        return counts


@dataclass
class LocaleBuildReport:
    locale: str
    page_count: int
    root_count: int
    included_page_count: int
    hidden_page_count: int
    hidden_branch_count: int
    orphan_root_count: int
    internal_count: int
    wrapper_count: int
    external_count: int
    missing_translation_from_default_count: int
    pages_missing_translation_from_default: List[Dict[str, str]]
    pages_only_in_locale_count: int
    pages_only_in_locale: List[Dict[str, str]]
    orphan_roots: List[Dict[str, str]]
    hidden_roots: List[Dict[str, str]]
    former_wrapper_candidates: List[Dict[str, str]] = field(default_factory=list)
    slug_key_collisions: List[Dict[str, str]] = field(default_factory=list)


def _slugify(value: Optional[str], fallback: str) -> str:
    raw = value or fallback
    normalized = unicodedata.normalize("NFKD", raw)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_value).strip("-").lower()
    return slug or fallback.lower()


def _nav_path_for_router_key(router_key: str) -> str:
    """Public URL segment for the Navigation item; home slug maps to ``/``."""

    rk = (router_key or "").strip()
    if rk.lower() == "index":
        return "/"
    return rk


def _allocate_nav_router_key(
    page: PageRecord,
    used: Set[str],
    collision_log: List[Dict[str, str]],
) -> str:
    """Stable ``uiRouterKey`` aligned with Page ``slug`` when present."""

    raw = (page.slug or "").strip()
    if raw:
        base = raw
    else:
        base = _slugify(page.title, page.document_id[:8])
    candidate = base
    if candidate not in used:
        used.add(candidate)
        return candidate
    suffix = re.sub(r"[^a-z0-9]", "", (page.document_id or "").lower())
    suffix = suffix[-6:] if len(suffix) >= 6 else (suffix or "dup")
    candidate = f"{base}-{suffix}"
    n = 2
    while candidate in used:
        candidate = f"{base}-{suffix}-{n}"
        n += 1
    used.add(candidate)
    collision_log.append(
        {
            "document_id": page.document_id,
            "title": page.title or "",
            "base_slug": base,
            "resolved_key": candidate,
        }
    )
    return candidate


def _menu_attached_for_depth(depth: int) -> bool:
    """Roots attach to the site menu; nested rows do not unless env overrides."""

    if os.environ.get("NAV_SYNC_MENU_ATTACHED_ALL", "").strip().lower() in ("1", "true", "yes"):
        return True
    return depth == 0


def _get_entry_value(entry: Dict[str, Any], key: str) -> Any:
    if key in entry:
        return entry.get(key)
    return entry.get("attributes", {}).get(key)


def _extract_parent_document_id(entry: Dict[str, Any]) -> Optional[str]:
    parent = _get_entry_value(entry, "parentPage")
    if not parent:
        return None
    if isinstance(parent, dict):
        if "documentId" in parent:
            return parent.get("documentId")
        return parent.get("attributes", {}).get("documentId")
    return None


def _fetch_all_pages(client: StrapiClient, locale: str) -> List[PageRecord]:
    rows: List[PageRecord] = []
    page = 1
    while True:
        response = client.get(
            "/api/pages",
            **{
                "locale": locale,
                "status": "published",
                "pagination[page]": page,
                "pagination[pageSize]": PAGE_SIZE,
                "fields[0]": "title",
                "fields[1]": "slug",
                "fields[2]": "hideFromMenu",
                "fields[3]": "isFolder",
                "fields[4]": "menuIndex",
                "fields[5]": "content",
                "fields[6]": "excerpt",
                "fields[7]": "infoBlockBottom",
                "fields[8]": "externalUrl",
                "populate[parentPage][fields][0]": "documentId",
                "populate[parentPage][fields][1]": "title",
            },
        )
        entries = response.get("data", []) or []
        for entry in entries:
            rows.append(
                PageRecord(
                    id=int(entry.get("id") or 0),
                    document_id=str(_get_entry_value(entry, "documentId") or ""),
                    locale=locale,
                    title=_get_entry_value(entry, "title"),
                    slug=_get_entry_value(entry, "slug"),
                    parent_document_id=_extract_parent_document_id(entry),
                    hide_from_menu=bool(_get_entry_value(entry, "hideFromMenu")),
                    is_folder=bool(_get_entry_value(entry, "isFolder")),
                    menu_index=_get_entry_value(entry, "menuIndex"),
                    content=_get_entry_value(entry, "content"),
                    excerpt=_get_entry_value(entry, "excerpt"),
                    info_block_bottom=_get_entry_value(entry, "infoBlockBottom"),
                    external_url=_get_entry_value(entry, "externalUrl"),
                )
            )
        meta = response.get("meta", {}).get("pagination", {})
        if page >= int(meta.get("pageCount") or 1):
            break
        page += 1
    return rows


def _sort_pages(pages: Iterable[PageRecord]) -> List[PageRecord]:
    def key(page: PageRecord) -> Tuple[int, str, str]:
        order = page.menu_index if isinstance(page.menu_index, int) else 10**9
        title = (page.title or "").lower()
        return (order, title, page.document_id)

    return sorted(pages, key=key)


def _has_meaningful_content(page: PageRecord) -> bool:
    return any(
        bool(value and str(value).strip())
        for value in (page.content, page.excerpt, page.info_block_bottom, page.external_url)
    )


def _legacy_wrapper_folder_empty(page: PageRecord) -> bool:
    """Previous policy: folder + no body fields implied WRAPPER (audit-only)."""

    return page.is_folder and not _has_meaningful_content(page)


def _should_emit_wrapper(page: PageRecord) -> bool:
    """Always page-backed INTERNAL nodes so locales stay aligned (no WRAPPER)."""

    return False


def _build_navigation_tree(
    locale: str,
    pages: Sequence[PageRecord],
    *,
    default_locale_pages: Optional[Sequence[PageRecord]] = None,
) -> Tuple[List[DesiredNavItem], LocaleBuildReport]:
    pages_by_id: Dict[str, PageRecord] = {page.document_id: page for page in pages if page.document_id}
    children_by_parent: Dict[Optional[str], List[PageRecord]] = defaultdict(list)
    hidden_roots: List[Dict[str, str]] = []
    orphan_roots: List[Dict[str, str]] = []

    for page in pages:
        if page.parent_document_id and page.parent_document_id not in pages_by_id:
            orphan_roots.append(
                {
                    "document_id": page.document_id,
                    "title": page.title or "",
                    "missing_parent_document_id": page.parent_document_id,
                }
            )
            children_by_parent[None].append(page)
        else:
            children_by_parent[page.parent_document_id].append(page)

    for key in list(children_by_parent.keys()):
        children_by_parent[key] = _sort_pages(children_by_parent[key])

    used_ui_keys: Set[str] = set()
    hidden_page_count = 0
    hidden_branch_count = 0
    former_wrapper_candidates: List[Dict[str, str]] = []
    slug_key_collisions: List[Dict[str, str]] = []

    def remove_hidden_branch(page: PageRecord) -> None:
        nonlocal hidden_branch_count
        hidden_branch_count += 1
        for child in children_by_parent.get(page.document_id, []):
            remove_hidden_branch(child)

    def build_items(parent_document_id: Optional[str], depth: int) -> List[DesiredNavItem]:
        nonlocal hidden_page_count
        items: List[DesiredNavItem] = []
        ordered_pages = children_by_parent.get(parent_document_id, [])
        sibling_order = 1
        for page in ordered_pages:
            if page.hide_from_menu:
                hidden_page_count += 1
                hidden_roots.append(
                    {
                        "document_id": page.document_id,
                        "title": page.title or "",
                    }
                )
                remove_hidden_branch(page)
                continue

            child_items = build_items(page.document_id, depth + 1)
            if _legacy_wrapper_folder_empty(page):
                former_wrapper_candidates.append(
                    {
                        "document_id": page.document_id,
                        "title": page.title or "",
                        "slug": page.slug or "",
                    }
                )
            item_type = "WRAPPER" if _should_emit_wrapper(page) else "INTERNAL"
            ui_key = _allocate_nav_router_key(page, used_ui_keys, slug_key_collisions)
            related = None
            auto_sync = None
            path = None
            external_path = None

            if item_type == "INTERNAL":
                related = {"documentId": page.document_id, "__type": PAGE_UID}
                auto_sync = True
                path = _nav_path_for_router_key(ui_key)

            item = DesiredNavItem(
                source_page_document_id=page.document_id,
                locale=locale,
                title=page.title or page.slug or page.document_id,
                item_type=item_type,
                path=path,
                external_path=external_path,
                ui_router_key=ui_key,
                menu_attached=_menu_attached_for_depth(depth),
                # Branches start collapsed in the admin so large trees stay
                # scannable on first open, while leaves remain expanded-free.
                collapsed=bool(child_items),
                order=sibling_order,
                related=related,
                auto_sync=auto_sync,
                items=child_items,
            )
            sibling_order += 1
            items.append(item)
        return items

    tree = build_items(None, 0)
    total_counts = {"INTERNAL": 0, "WRAPPER": 0, "EXTERNAL": 0}
    included_page_count = 0
    for item in tree:
        included_page_count += item.count_items()
        item_counts = item.count_types()
        for key, value in item_counts.items():
            total_counts[key] += value

    default_doc_ids = {page.document_id for page in default_locale_pages or []}
    locale_doc_ids = {page.document_id for page in pages}
    missing_from_locale = []
    locale_only = []
    if default_locale_pages is not None and locale != DEFAULT_LOCALES[0]:
        for page in _sort_pages(default_locale_pages):
            if page.document_id not in locale_doc_ids and not page.hide_from_menu:
                missing_from_locale.append(
                    {"document_id": page.document_id, "title": page.title or "", "slug": page.slug or ""}
                )
    if default_locale_pages is not None and locale == DEFAULT_LOCALES[1]:
        for page in _sort_pages(pages):
            if page.document_id not in default_doc_ids and not page.hide_from_menu:
                locale_only.append(
                    {"document_id": page.document_id, "title": page.title or "", "slug": page.slug or ""}
                )

    report = LocaleBuildReport(
        locale=locale,
        page_count=len(pages),
        root_count=len(children_by_parent.get(None, [])),
        included_page_count=included_page_count,
        hidden_page_count=hidden_page_count,
        hidden_branch_count=hidden_branch_count,
        orphan_root_count=len(orphan_roots),
        internal_count=total_counts["INTERNAL"],
        wrapper_count=total_counts["WRAPPER"],
        external_count=total_counts["EXTERNAL"],
        missing_translation_from_default_count=len(missing_from_locale),
        pages_missing_translation_from_default=missing_from_locale,
        pages_only_in_locale_count=len(locale_only),
        pages_only_in_locale=locale_only,
        orphan_roots=orphan_roots,
        hidden_roots=hidden_roots,
        former_wrapper_candidates=former_wrapper_candidates,
        slug_key_collisions=slug_key_collisions,
    )
    return tree, report


def _derive_navigation_name(slug: str) -> str:
    if slug == DEFAULT_NAVIGATION_SLUG:
        return DEFAULT_NAVIGATION_NAME
    return " ".join(part.capitalize() for part in slug.split("-"))


class AdminApiClient:
    """Thin admin client for Navigation plugin write endpoints."""

    def __init__(
        self,
        *,
        base_url: Optional[str] = None,
        email: Optional[str] = None,
        password: Optional[str] = None,
    ) -> None:
        load_strapi_env_from_dotenv()
        self.base_url = (base_url or os.environ.get("STRAPI_URL") or "").rstrip("/")
        self.email = email or os.environ.get("STRAPI_ADMIN_EMAIL")
        self.password = password or os.environ.get("STRAPI_ADMIN_PASSWORD")
        self.jwt: Optional[str] = None

        if not self.base_url:
            raise RuntimeError("STRAPI_URL is required for admin API access")
        if not self.email or not self.password:
            raise RuntimeError(
                "STRAPI_ADMIN_EMAIL and STRAPI_ADMIN_PASSWORD are required for write mode"
            )

    def login(self) -> None:
        if self.jwt:
            return
        payload = {"email": self.email, "password": self.password}
        data = json.dumps(payload).encode("utf-8")
        headers = {"Content-Type": "application/json", "Accept": "application/json"}
        req = request.Request(f"{self.base_url}/admin/login", data=data, method="POST", headers=headers)
        with request.urlopen(req, timeout=60) as response:
            body = json.loads(response.read())
        auth_data = body.get("data", {})
        self.jwt = auth_data.get("token") or auth_data.get("accessToken")
        if not self.jwt:
            raise RuntimeError("Admin login succeeded but no token was returned")

    def request(
        self,
        method: str,
        path: str,
        *,
        payload: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        self.login()
        assert self.jwt
        url = f"{self.base_url}{path}" if path.startswith("/") else f"{self.base_url}/{path}"
        body_bytes = json.dumps(payload, ensure_ascii=False).encode("utf-8") if payload is not None else None
        headers = {"Accept": "application/json", "Authorization": f"Bearer {self.jwt}"}
        if body_bytes is not None:
            headers["Content-Type"] = "application/json"

        for attempt in range(1, MAX_RETRIES + 1):
            req = request.Request(url, data=body_bytes, method=method, headers=headers)
            try:
                with request.urlopen(req, timeout=60) as response:
                    raw = response.read()
                    return json.loads(raw) if raw else {}
            except error.HTTPError as exc:
                raw = exc.read().decode("utf-8", errors="replace")
                if 500 <= exc.code < 600 and attempt < MAX_RETRIES:
                    delay = min(BACKOFF_CAP_S, (DEBOUNCE_DELAY_MS / 1000.0) * (2 ** (attempt - 1)))
                    logger.warning(
                        "admin %s %s -> %s (attempt %s); retrying in %.2fs",
                        method,
                        url,
                        exc.code,
                        attempt,
                        delay,
                    )
                    import time

                    time.sleep(delay)
                    continue
                raise StrapiError(status=exc.code, url=url, method=method, body=raw) from exc

        raise RuntimeError(f"Admin request {method} {url} exhausted retries")

    def post(self, path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        return self.request("POST", path, payload=payload)

    def put(self, path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        return self.request("PUT", path, payload=payload)

    def delete(self, path: str) -> Dict[str, Any]:
        return self.request("DELETE", path)


def _find_navigation_meta(client: StrapiClient, slug: str, locale: str) -> Optional[Dict[str, Any]]:
    response = client.get("/api/navigation", locale=locale)
    for navigation in response or []:
        if navigation.get("slug") == slug:
            return navigation
    return None


def _fetch_current_tree(client: StrapiClient, slug: str, locale: str) -> List[Dict[str, Any]]:
    try:
        response = client.get("/api/navigation/render/{0}".format(slug), type="TREE", locale=locale)
        return response if isinstance(response, list) else []
    except StrapiError as exc:
        if exc.status == 404:
            return []
        raise


def _remove_branch_payload(item: Dict[str, Any], order: int) -> Dict[str, Any]:
    related = item.get("related") or {}
    payload: Dict[str, Any] = {
        "documentId": item["documentId"],
        "title": item.get("title") or item.get("path") or item.get("uiRouterKey") or item["documentId"],
        "type": item.get("type") or "WRAPPER",
        "path": item.get("path"),
        "externalPath": item.get("externalPath"),
        "uiRouterKey": item.get("uiRouterKey") or item["documentId"],
        "menuAttached": bool(item.get("menuAttached", True)),
        "collapsed": bool(item.get("collapsed", False)),
        "order": int(item.get("order") or order),
        "removed": True,
    }
    if related.get("documentId") and related.get("__type"):
        payload["related"] = {
            "documentId": related["documentId"],
            "__type": related["__type"],
        }
    children = item.get("items") or []
    if children:
        payload["items"] = [
            _remove_branch_payload(child, index)
            for index, child in enumerate(children, start=1)
        ]
    return payload


def _desired_key(item: DesiredNavItem) -> Tuple[str, str]:
    if item.item_type == "INTERNAL" and item.related:
        return ("INTERNAL", item.related["documentId"])
    return (item.item_type, item.ui_router_key)


def _current_key(item: Dict[str, Any]) -> Tuple[str, str]:
    if item.get("type") == "INTERNAL":
        related = item.get("related") or {}
        document_id = related.get("documentId")
        if document_id:
            return ("INTERNAL", document_id)
    return (str(item.get("type") or ""), str(item.get("uiRouterKey") or ""))


def _desired_item_equals_current(item: DesiredNavItem, current: Dict[str, Any]) -> bool:
    related = current.get("related") or {}
    return (
        current.get("title") == item.title
        and current.get("type") == item.item_type
        and (current.get("path") or None) == item.path
        and (current.get("externalPath") or None) == item.external_path
        and current.get("uiRouterKey") == item.ui_router_key
        and bool(current.get("menuAttached")) == item.menu_attached
        and bool(current.get("collapsed")) == item.collapsed
        and int(current.get("order") or 0) == item.order
        and bool(current.get("autoSync")) == bool(item.auto_sync)
        and (related.get("documentId") if related else None)
        == (item.related.get("documentId") if item.related else None)
    )


def _reconcile_items(current_items: List[Dict[str, Any]], desired_items: List[DesiredNavItem]) -> List[Dict[str, Any]]:
    payload_items: List[Dict[str, Any]] = []
    used_current_indexes: Set[int] = set()

    for desired in desired_items:
        match_index = None
        desired_key = _desired_key(desired)
        for index, current in enumerate(current_items):
            if index in used_current_indexes:
                continue
            if _current_key(current) == desired_key:
                match_index = index
                break

        if match_index is None:
            payload_items.append(desired.to_update_payload())
            continue

        used_current_indexes.add(match_index)
        current = current_items[match_index]
        merged = desired.to_update_payload()
        merged["documentId"] = current["documentId"]
        merged["updated"] = not _desired_item_equals_current(desired, current)
        merged["items"] = _reconcile_items(current.get("items") or [], desired.items)
        payload_items.append(merged)

    for index, current in enumerate(current_items):
        if index in used_current_indexes:
            continue
        payload_items.append(_remove_branch_payload(current, index + 1))

    return payload_items


def _replace_items(current_items: List[Dict[str, Any]], desired_items: List[DesiredNavItem]) -> List[Dict[str, Any]]:
    payload = [
        _remove_branch_payload(item, index)
        for index, item in enumerate(current_items, start=1)
    ]
    payload.extend(item.to_update_payload() for item in desired_items)
    return payload


def _build_report_json(
    *,
    navigation_slug: str,
    mode: str,
    locale_reports: Dict[str, LocaleBuildReport],
    desired_trees: Dict[str, List[DesiredNavItem]],
    shell_state: Dict[str, Optional[Dict[str, Any]]],
    planned_actions: List[Dict[str, Any]],
) -> Dict[str, Any]:
    return {
        "navigation_slug": navigation_slug,
        "mode": mode,
        "locales": {
            locale: {
                **asdict(report),
                "desired_tree": [item.to_update_payload() for item in desired_trees.get(locale, [])],
            }
            for locale, report in locale_reports.items()
        },
        "shell_state": shell_state,
        "planned_actions": planned_actions,
    }


def _print_summary(
    report: Dict[str, Any],
    *,
    dry_run: bool,
    replace_existing: bool,
    merge: bool,
) -> None:
    print()
    print("=== Navigation sync from Page hierarchy ===")
    print(f"Mode: {'dry-run' if dry_run else 'write'}")
    print(f"Strategy: {'replace-existing' if replace_existing else 'merge' if merge else 'unknown'}")
    print(f"Navigation slug: {report['navigation_slug']}")
    print()
    for locale, locale_report in report["locales"].items():
        print(f"[{locale}] pages={locale_report['page_count']} included={locale_report['included_page_count']} "
              f"internal={locale_report['internal_count']} wrapper={locale_report['wrapper_count']} "
              f"hidden={locale_report['hidden_page_count']} orphan_roots={locale_report['orphan_root_count']}")
        if locale_report["missing_translation_from_default_count"]:
            print(
                f"  missing-from-default-locale: {locale_report['missing_translation_from_default_count']}"
            )
        if locale_report["pages_only_in_locale_count"]:
            print(f"  locale-only-pages: {locale_report['pages_only_in_locale_count']}")
        legacy = locale_report.get("former_wrapper_candidates") or []
        if legacy:
            print(f"  former-wrapper-candidates (audit, would have been WRAPPER): {len(legacy)}")
            for row in legacy[:25]:
                print(
                    f"    - {row.get('title', '')!r} documentId={row.get('document_id', '')} slug={row.get('slug', '')!r}"
                )
            if len(legacy) > 25:
                print(f"    ... and {len(legacy) - 25} more")
        collisions = locale_report.get("slug_key_collisions") or []
        if collisions:
            print(f"  slug/uiRouterKey collisions resolved: {len(collisions)}")
            for row in collisions[:15]:
                print(
                    f"    - {row.get('resolved_key', '')!r} (documentId={row.get('document_id', '')}, "
                    f"base_slug={row.get('base_slug', '')!r})"
                )
            if len(collisions) > 15:
                print(f"    ... and {len(collisions) - 15} more")
    print()
    for action in report["planned_actions"]:
        print(f"- {action['kind']}: {action['locale']} -> {action['summary']}")
    print()


def _parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--locale", choices=["el", "ru", "all"], default="all")
    parser.add_argument("--navigation-slug", default=DEFAULT_NAVIGATION_SLUG)
    parser.add_argument("--report-json", metavar="PATH")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--replace-existing", action="store_true")
    parser.add_argument("--merge", action="store_true")
    parser.add_argument("--admin-email")
    parser.add_argument("--admin-password")
    parser.add_argument("--log-level", default="INFO")
    args = parser.parse_args(argv)

    if args.replace_existing == args.merge:
        parser.error("Choose exactly one of --replace-existing or --merge")

    return args


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = _parse_args(argv)
    logging.basicConfig(level=args.log_level, format="%(levelname)s %(name)s %(message)s")

    load_strapi_env_from_dotenv()
    target_locales = list(DEFAULT_LOCALES if args.locale == "all" else [args.locale])
    content_token = os.environ.get("STRAPI_TOKEN") or os.environ.get("AUTORIZATION_TOKEN")
    if not content_token:
        raise RuntimeError("STRAPI_TOKEN (or AUTORIZATION_TOKEN for local dev) is required")

    public_client = StrapiClient(token=content_token)
    default_locale = DEFAULT_LOCALES[0]

    logger.info("Fetching page hierarchies for locales: %s", ", ".join(target_locales))
    pages_by_locale: Dict[str, List[PageRecord]] = {
        locale: _fetch_all_pages(public_client, locale) for locale in target_locales
    }
    default_pages = pages_by_locale.get(default_locale)
    if default_pages is None:
        default_pages = _fetch_all_pages(public_client, default_locale)

    desired_trees: Dict[str, List[DesiredNavItem]] = {}
    locale_reports: Dict[str, LocaleBuildReport] = {}
    for locale in target_locales:
        tree, report = _build_navigation_tree(
            locale,
            pages_by_locale[locale],
            default_locale_pages=default_pages,
        )
        desired_trees[locale] = tree
        locale_reports[locale] = report

    shell_state: Dict[str, Optional[Dict[str, Any]]] = {}
    current_trees: Dict[str, List[Dict[str, Any]]] = {}
    for locale in target_locales:
        shell_state[locale] = _find_navigation_meta(public_client, args.navigation_slug, locale)
        current_trees[locale] = _fetch_current_tree(public_client, args.navigation_slug, locale)

    planned_actions: List[Dict[str, Any]] = []

    navigation_name = _derive_navigation_name(args.navigation_slug)
    if any(shell_state[locale] is None for locale in target_locales):
        planned_actions.append(
            {
                "kind": "create-shell",
                "locale": "all",
                "summary": f"create navigation shell '{navigation_name}' if missing",
            }
        )

    update_payloads: Dict[str, Dict[str, Any]] = {}
    for locale in target_locales:
        current_items = current_trees[locale]
        desired_items = desired_trees[locale]
        payload_items = (
            _replace_items(current_items, desired_items)
            if args.replace_existing
            else _reconcile_items(current_items, desired_items)
        )
        update_payloads[locale] = {"items": payload_items}
        planned_actions.append(
            {
                "kind": "sync-tree",
                "locale": locale,
                "summary": f"{len(current_items)} current root(s) -> {len(desired_items)} desired root(s)",
            }
        )

    report = _build_report_json(
        navigation_slug=args.navigation_slug,
        mode="dry-run" if args.dry_run else "write",
        locale_reports=locale_reports,
        desired_trees=desired_trees,
        shell_state=shell_state,
        planned_actions=planned_actions,
    )
    _print_summary(report, dry_run=args.dry_run, replace_existing=args.replace_existing, merge=args.merge)

    if args.report_json:
        with open(args.report_json, "w", encoding="utf-8") as handle:
            json.dump(report, handle, ensure_ascii=False, indent=2)
        print(f"Full report written to {args.report_json}")

    if args.dry_run:
        return 0

    admin_client = AdminApiClient(
        email=args.admin_email,
        password=args.admin_password,
    )

    if args.replace_existing and target_locales == list(DEFAULT_LOCALES):
        existing_shell = next((shell for shell in shell_state.values() if shell is not None), None)
        if existing_shell is not None:
            logger.info("Deleting existing navigation shell '%s' before full rebuild", args.navigation_slug)
            admin_client.delete(f"/navigation/{existing_shell['documentId']}")
            for locale in target_locales:
                shell_state[locale] = None
                current_trees[locale] = []

    if any(shell_state[locale] is None for locale in target_locales):
        logger.info("Creating missing navigation shell '%s'", navigation_name)
        admin_client.post("/navigation", {"name": navigation_name, "visible": True})
        for locale in target_locales:
            shell_state[locale] = _find_navigation_meta(public_client, args.navigation_slug, locale)
            if shell_state[locale] is None:
                raise RuntimeError(
                    f"Navigation shell '{args.navigation_slug}' was created but locale '{locale}' was not found"
                )

    for locale in target_locales:
        shell = shell_state[locale]
        if shell is None:
            raise RuntimeError(f"Missing navigation shell metadata for locale {locale}")

        payload = {
            "id": shell["id"],
            "name": shell["name"],
            "visible": bool(shell.get("visible", True)),
            "locale": locale,
            "items": update_payloads[locale]["items"],
        }
        logger.info(
            "Syncing navigation slug=%s locale=%s with %s root item(s)",
            args.navigation_slug,
            locale,
            len(desired_trees[locale]),
        )
        admin_client.put(f"/navigation/{shell['documentId']}", payload)

    return 0


if __name__ == "__main__":
    sys.exit(main())
