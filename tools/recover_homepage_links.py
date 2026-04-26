"""Audit and recover homepage navigation links without mutating legacy pageBlocks.

This forward-only migration rebuilds semantic homepage sections from the
untouched legacy pageBlocks, adds internal page targets to promo slides and
linked resources, and applies a reviewed slug correction. Writes always go
through Strapi's document service; SQLite is used only for planning and audit.
"""

from __future__ import annotations

import argparse
import html
import json
import logging
import os
import sqlite3
import subprocess
import sys
from collections import Counter, defaultdict
from pathlib import Path

from cms_audit import CHECKPOINT_SOURCE_DIR, MANIFESTS_DIR, MODX_SOURCE_DIR, REPORTS_DIR, ROOT
from typing import Any

from migrate_page_model import (
    DEFAULT_DB_PATH,
    DEFAULT_SNAPSHOT_DIR,
    LEGACY_COMPONENT_TABLES,
    _audit_baseline,
    _load_logical_pages,
    _load_page_blocks,
    _snapshot_database,
    _sqlite_connect,
)
from normalize_migx import tolerant_decode

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_REPORT_PATH = REPORTS_DIR / "homepage_link_recovery_report.json"
DEFAULT_SOURCE_PATH = MODX_SOURCE_DIR / "transformed_resources.json"
DEFAULT_MAPPING_PATH = CHECKPOINT_SOURCE_DIR / "modx_to_strapi.json"
DEFAULT_EXCEPTIONS_PATH = MANIFESTS_DIR / "homepage_link_exceptions.json"
APPLY_SCRIPT_PATH = ROOT / "backend/scripts/apply-homepage-link-plan.js"

HOME_SOURCE_BY_LOCALE = {
    "el": 1,
    "ru": 153,
}

HOME_SECTION_MAP = {
    "blocks.promo-slide": ("sections.promo-slider", "slides"),
    "blocks.social-link": ("sections.social-links", "links"),
    "blocks.video": ("sections.video", "videos"),
    "blocks.advantage": ("sections.advantages", "items"),
    "blocks.accordion-item": ("sections.accordion", "items"),
    "blocks.tab-item": ("sections.tabs", "items"),
    "blocks.gallery-image": ("sections.gallery", "items"),
    "blocks.contact-detail": ("sections.contact", "details"),
    "blocks.clinic": ("sections.contact", "clinics"),
}

logging.basicConfig(format="%(asctime)s %(levelname)s %(name)s %(message)s", level=logging.INFO)
logger = logging.getLogger("recover_homepage_links")


def _load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _save_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _flatten_resources(nodes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    flat: list[dict[str, Any]] = []

    def walk(items: list[dict[str, Any]]) -> None:
        for item in items:
            flat.append(item)
            children = item.get("children") or []
            if isinstance(children, list) and children:
                walk(children)

    walk(nodes)
    return flat


def _clean_text(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    return html.unescape(value).strip()


def _clean_html(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    return html.unescape(value).strip()


def _resource_id(value: Any) -> int | None:
    if value in (None, ""):
        return None
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return None


def _resolve_latest_page_model_snapshot(snapshot_dir: Path) -> Path | None:
    candidates = sorted(snapshot_dir.glob("*.page-model.*.db"))
    return candidates[-1] if candidates else None


def _state_label(published_at: Any) -> str:
    return "published" if published_at is not None else "draft"


def _rows_by_id(conn: sqlite3.Connection) -> dict[int, dict[str, Any]]:
    rows = conn.execute("select id, document_id, locale, published_at, slug, template_id, page_type, layout_variant from pages").fetchall()
    return {int(row["id"]): dict(row) for row in rows}


def _legacy_pageblocks_payload_by_key(conn: sqlite3.Connection) -> dict[tuple[str, str, str], list[dict[str, Any]]]:
    page_blocks, _ = _load_page_blocks(conn)
    rows = _rows_by_id(conn)
    out: dict[tuple[str, str, str], list[dict[str, Any]]] = {}
    for entity_id, blocks in page_blocks.items():
        row = rows.get(entity_id)
        if not row or not row.get("document_id") or not row.get("locale"):
            continue
        key = (str(row["document_id"]), str(row["locale"]), _state_label(row.get("published_at")))
        out[key] = [{"componentType": block["componentType"], "item": block["item"]} for block in blocks]
    return out


def _legacy_component_table_counts(conn: sqlite3.Connection) -> dict[str, int]:
    counts: dict[str, int] = {}
    for table_name in sorted(set(LEGACY_COMPONENT_TABLES.values())):
        counts[table_name] = int(conn.execute(f"select count(*) from {table_name}").fetchone()[0])
    counts["pages_cmps.pageBlocks"] = int(
        conn.execute("select count(*) from pages_cmps where field = 'pageBlocks'").fetchone()[0]
    )
    return counts


def _legacy_parity_audit(current_conn: sqlite3.Connection, compare_conn: sqlite3.Connection | None) -> dict[str, Any]:
    if compare_conn is None:
        return {
            "compareSnapshotAvailable": False,
            "issues": ["No compare snapshot available for legacy parity audit."],
        }

    current_payloads = _legacy_pageblocks_payload_by_key(current_conn)
    compare_payloads = _legacy_pageblocks_payload_by_key(compare_conn)

    all_keys = sorted(set(compare_payloads) | set(current_payloads))
    diff_keys: list[dict[str, Any]] = []
    for key in all_keys:
        if compare_payloads.get(key) != current_payloads.get(key):
            diff_keys.append(
                {
                    "documentId": key[0],
                    "locale": key[1],
                    "state": key[2],
                }
            )

    return {
        "compareSnapshotAvailable": True,
        "pageBlocksPayloadKeyCount": {
            "compare": len(compare_payloads),
            "current": len(current_payloads),
        },
        "pageBlocksPayloadDiffCount": len(diff_keys),
        "pageBlocksPayloadDiffSample": diff_keys[:10],
        "legacyComponentTableCounts": {
            "compare": _legacy_component_table_counts(compare_conn),
            "current": _legacy_component_table_counts(current_conn),
        },
    }


def _source_alias_by_document_locale(resources: list[dict[str, Any]], mapping: dict[str, str]) -> dict[tuple[str, str], str]:
    alias_by_doc_locale: dict[tuple[str, str], str] = {}
    for resource in resources:
        context_key = resource.get("context_key")
        if context_key not in ("web", "rus"):
            continue
        alias = _clean_text(resource.get("alias"))
        document_id = mapping.get(str(resource.get("id")))
        if not alias or not document_id:
            continue
        locale = "el" if context_key == "web" else "ru"
        alias_by_doc_locale[(document_id, locale)] = alias
    return alias_by_doc_locale


def _best_locale_slug_map(conn: sqlite3.Connection) -> dict[tuple[str, str], str]:
    rows = conn.execute(
        """
        select document_id, locale, slug, case when published_at is null then 0 else 1 end as published_rank
        from pages
        where document_id is not null and locale is not null
        order by document_id, locale, published_rank, id
        """
    ).fetchall()

    best: dict[tuple[str, str], str] = {}
    for row in rows:
        key = (str(row["document_id"]), str(row["locale"]))
        if key not in best:
            best[key] = str(row["slug"]) if row["slug"] is not None else ""
    return best


def _slug_change_summary(compare_conn: sqlite3.Connection | None, current_conn: sqlite3.Connection) -> dict[str, Any]:
    if compare_conn is None:
        return {
            "compareSnapshotAvailable": False,
            "issues": ["No compare snapshot available for slug audit."],
        }

    compare_rows = {
        (str(row["document_id"]), str(row["locale"]), _state_label(row["published_at"])): str(row["slug"]) if row["slug"] is not None else ""
        for row in compare_conn.execute("select document_id, locale, published_at, slug from pages where document_id is not null and locale is not null").fetchall()
    }
    current_rows = {
        (str(row["document_id"]), str(row["locale"]), _state_label(row["published_at"])): str(row["slug"]) if row["slug"] is not None else ""
        for row in current_conn.execute("select document_id, locale, published_at, slug from pages where document_id is not null and locale is not null").fetchall()
    }

    changes = []
    for key, compare_slug in compare_rows.items():
        current_slug = current_rows.get(key)
        if current_slug != compare_slug:
            changes.append(
                {
                    "documentId": key[0],
                    "locale": key[1],
                    "state": key[2],
                    "compareSlug": compare_slug,
                    "currentSlug": current_slug,
                }
            )

    return {
        "compareSnapshotAvailable": True,
        "changedRowStateCount": len(changes),
        "changedRowStateSample": changes[:10],
    }


def _slug_alias_parity(
    compare_conn: sqlite3.Connection | None,
    current_conn: sqlite3.Connection,
    resources: list[dict[str, Any]],
    mapping: dict[str, str],
) -> dict[str, Any]:
    alias_map = _source_alias_by_document_locale(resources, mapping)
    current_slugs = _best_locale_slug_map(current_conn)
    compare_slugs = _best_locale_slug_map(compare_conn) if compare_conn is not None else {}

    stats: dict[str, Any] = {
        "total": 0,
        "compareMatchesAlias": 0,
        "currentMatchesAlias": 0,
        "bothMatch": 0,
        "neitherMatch": 0,
        "currentFixed": 0,
        "currentDiverged": 0,
        "divergedExamples": [],
    }

    for key, alias in alias_map.items():
        compare_slug = compare_slugs.get(key)
        current_slug = current_slugs.get(key)
        if compare_slug is None or current_slug is None:
            continue
        stats["total"] += 1
        compare_match = compare_slug == alias
        current_match = current_slug == alias
        stats["compareMatchesAlias"] += int(compare_match)
        stats["currentMatchesAlias"] += int(current_match)
        if compare_match and current_match:
            stats["bothMatch"] += 1
        elif not compare_match and not current_match:
            stats["neitherMatch"] += 1
        elif not compare_match and current_match:
            stats["currentFixed"] += 1
        elif compare_match and not current_match:
            stats["currentDiverged"] += 1
            if len(stats["divergedExamples"]) < 10:
                stats["divergedExamples"].append(
                    {
                        "documentId": key[0],
                        "locale": key[1],
                        "alias": alias,
                        "compareSlug": compare_slug,
                        "currentSlug": current_slug,
                    }
                )

    return stats


def _resolve_target(
    *,
    resource_id: int | None,
    locale: str,
    mapping: dict[str, str],
    exceptions: dict[str, Any],
) -> tuple[dict[str, Any], dict[str, Any] | None]:
    if resource_id is None:
        return {}, None

    locale_overrides = ((exceptions.get("resourceTargets") or {}).get(locale) or {})
    override = locale_overrides.get(str(resource_id))
    if isinstance(override, dict):
        document_id = override.get("documentId")
        target_url = override.get("targetUrl")
        if document_id:
            return {
                "targetPage": {
                    "connect": [
                        {
                            "documentId": str(document_id),
                            "locale": locale,
                        }
                    ]
                }
            }, {"resourceId": resource_id, "resolution": "exception"}
        if target_url:
            return {"targetUrl": str(target_url)}, {"resourceId": resource_id, "resolution": "exception-url"}

    mapped_document = mapping.get(str(resource_id))
    if mapped_document:
        return {
            "targetPage": {
                "connect": [
                    {
                        "documentId": mapped_document,
                        "locale": locale,
                    }
                ]
            }
        }, {"resourceId": resource_id, "resolution": "mapping"}

    return {}, {
        "resourceId": resource_id,
        "resolution": "unresolved",
    }


def _load_homepage_source(
    resources: list[dict[str, Any]],
    locale: str,
) -> dict[str, Any]:
    source_id = HOME_SOURCE_BY_LOCALE[locale]
    by_id = {int(resource["id"]): resource for resource in resources if resource.get("id") is not None}
    resource = by_id[source_id]
    tvs = resource.get("template_variables") or {}
    linked_rows = tolerant_decode(tvs.get("migxResources") or "[]")
    promo_rows = tolerant_decode(tvs.get("migxPromoSlider") or "[]")
    if not isinstance(linked_rows, list):
        linked_rows = []
    if not isinstance(promo_rows, list):
        promo_rows = []
    return {
        "resourceId": source_id,
        "resource": resource,
        "linkedRows": linked_rows,
        "promoRows": promo_rows,
    }


def _build_linked_resource_items(
    linked_rows: list[dict[str, Any]],
    *,
    locale: str,
    mapping: dict[str, str],
    exceptions: dict[str, Any],
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    items: list[dict[str, Any]] = []
    resolution_counts: Counter[str] = Counter()
    unresolved: list[dict[str, Any]] = []

    for row in linked_rows:
        resource_id = _resource_id(row.get("resource"))
        item = {
            "title": _clean_text(row.get("title")),
            "description": _clean_html(row.get("description")),
        }
        if resource_id is not None:
            item["legacySourceResourceId"] = resource_id

        target_payload, resolution = _resolve_target(
            resource_id=resource_id,
            locale=locale,
            mapping=mapping,
            exceptions=exceptions,
        )
        item.update(target_payload)
        if resolution is not None:
            resolution_counts[resolution["resolution"]] += 1
            if resolution["resolution"] == "unresolved":
                unresolved.append(
                    {
                        "kind": "linked-resource",
                        "resourceId": resource_id,
                        "title": item.get("title"),
                    }
                )

        items.append(item)

    return items, {
        "count": len(items),
        "resolutionCounts": dict(resolution_counts),
        "unresolved": unresolved,
    }


def _build_promo_targets(
    promo_rows: list[dict[str, Any]],
    *,
    locale: str,
    mapping: dict[str, str],
    exceptions: dict[str, Any],
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    items: list[dict[str, Any]] = []
    resolution_counts: Counter[str] = Counter()
    unresolved: list[dict[str, Any]] = []

    for row in promo_rows:
        for index in range(1, 7):
            suffix = str(index)
            title = _clean_text(row.get(f"title{suffix}"))
            description = _clean_html(row.get(f"description{suffix}"))
            image = row.get(f"image{suffix}")
            if not title and not description and not image:
                continue

            resource_id = _resource_id(row.get(f"resource{suffix}"))
            item: dict[str, Any] = {}
            if resource_id is not None:
                item["legacySourceResourceId"] = resource_id

            target_payload, resolution = _resolve_target(
                resource_id=resource_id,
                locale=locale,
                mapping=mapping,
                exceptions=exceptions,
            )
            item.update(target_payload)

            if resolution is not None:
                resolution_counts[resolution["resolution"]] += 1
                if resolution["resolution"] == "unresolved":
                    unresolved.append(
                        {
                            "kind": "promo-slide",
                            "resourceId": resource_id,
                            "title": title,
                        }
                    )

            items.append(item)

    return items, {
        "count": len(items),
        "resolutionCounts": dict(resolution_counts),
        "unresolved": unresolved,
    }


def _normalize_compare_text(value: str) -> str:
    return " ".join((value or "").split()).strip()


def _build_homepage_sections(
    *,
    legacy_blocks: list[dict[str, Any]],
    linked_resource_items: list[dict[str, Any]],
    promo_targets: list[dict[str, Any]],
    locale: str,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    sections: list[dict[str, Any]] = []
    section_index: dict[str, dict[str, Any]] = {}
    issues: list[dict[str, Any]] = []
    promo_index = 0
    linked_section_added = False
    faq_index = 0

    source_linked_titles = [_normalize_compare_text(item.get("title", "")) for item in linked_resource_items]
    source_promo_ids = [item.get("legacySourceResourceId") for item in promo_targets]

    legacy_faq_blocks = [block for block in legacy_blocks if block["componentType"] == "blocks.faq-item"]
    legacy_promo_blocks = [block for block in legacy_blocks if block["componentType"] == "blocks.promo-slide"]

    if len(legacy_faq_blocks) != len(linked_resource_items):
        issues.append(
            {
                "locale": locale,
                "reason": "legacy faq block count does not match homepage linked-resource source count",
                "legacyFaqCount": len(legacy_faq_blocks),
                "sourceLinkedResourceCount": len(linked_resource_items),
            }
        )
    if len(legacy_promo_blocks) != len(promo_targets):
        issues.append(
            {
                "locale": locale,
                "reason": "legacy promo block count does not match homepage promo source count",
                "legacyPromoCount": len(legacy_promo_blocks),
                "sourcePromoCount": len(promo_targets),
            }
        )

    for legacy_index, legacy_block in enumerate(legacy_faq_blocks):
        source_title = source_linked_titles[legacy_index] if legacy_index < len(source_linked_titles) else ""
        legacy_title = _normalize_compare_text(legacy_block["item"].get("question") or "")
        if source_title and legacy_title and source_title != legacy_title:
            issues.append(
                {
                    "locale": locale,
                    "reason": "legacy faq title does not match source linked-resource title at the same position",
                    "position": legacy_index + 1,
                    "legacyTitle": legacy_title,
                    "sourceTitle": source_title,
                }
            )

    for legacy_index, legacy_block in enumerate(legacy_promo_blocks):
        source_id = source_promo_ids[legacy_index] if legacy_index < len(source_promo_ids) else None
        legacy_title = _normalize_compare_text(legacy_block["item"].get("title") or "")
        if source_id is None:
            continue
        if not legacy_title:
            issues.append(
                {
                    "locale": locale,
                    "reason": "legacy promo slide is missing a title while the source target is present",
                    "position": legacy_index + 1,
                    "resourceId": source_id,
                }
            )

    for block in legacy_blocks:
        component_type = block["componentType"]

        if component_type == "blocks.faq-item":
            if linked_section_added:
                faq_index += 1
                continue
            linked_section_added = True
            sections.append(
                {
                    "__component": "sections.linked-resources",
                    "items": [dict(item) for item in linked_resource_items],
                }
            )
            faq_index += 1
            continue

        section_meta = HOME_SECTION_MAP.get(component_type)
        if section_meta is None:
            continue

        section_component, item_key = section_meta
        section = section_index.get(section_component)
        if section is None:
            section = {"__component": section_component}
            if section_component == "sections.contact":
                section["details"] = []
                section["clinics"] = []
            else:
                section[item_key] = []
            section_index[section_component] = section
            sections.append(section)

        item = dict(block["item"])
        if component_type == "blocks.promo-slide":
            if promo_index >= len(promo_targets):
                issues.append(
                    {
                        "locale": locale,
                        "reason": "promo target list is shorter than the legacy promo block list",
                        "position": promo_index + 1,
                    }
                )
            else:
                item.update(promo_targets[promo_index])
            promo_index += 1

        if item_key not in section:
            section[item_key] = []
        section[item_key].append(item)

    if not linked_section_added and linked_resource_items:
        insert_index = 1 if sections and sections[0]["__component"] == "sections.promo-slider" else len(sections)
        sections.insert(
            insert_index,
            {
                "__component": "sections.linked-resources",
                "items": [dict(item) for item in linked_resource_items],
            },
        )

    if promo_index != len(promo_targets):
        issues.append(
            {
                "locale": locale,
                "reason": "promo target list has a different count than the rebuilt promo section",
                "promoTargets": len(promo_targets),
                "appliedPromoTargets": promo_index,
            }
        )

    return sections, issues


def _find_slug_conflicts(conn: sqlite3.Connection, *, locale: str, slug: str, document_id: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        """
        select document_id, locale, title, slug
        from pages
        where locale = ? and slug = ? and document_id <> ?
        order by document_id, id
        """,
        (locale, slug, document_id),
    ).fetchall()
    return [dict(row) for row in rows]


def _home_page_rows(logical_pages: list[Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for page in logical_pages:
        if page.template_id == "template_1":
            out[page.locale] = page
    return out


def _plan_homepage_updates(
    *,
    conn: sqlite3.Connection,
    resources: list[dict[str, Any]],
    mapping: dict[str, str],
    exceptions: dict[str, Any],
) -> tuple[list[dict[str, Any]], dict[str, Any], list[dict[str, Any]]]:
    logical_pages, _ = _load_logical_pages(conn)
    home_pages = _home_page_rows(logical_pages)
    page_blocks, block_issues = _load_page_blocks(conn)
    planned: list[dict[str, Any]] = []
    source_resolution: dict[str, Any] = {}
    issues: list[dict[str, Any]] = list(block_issues)

    for locale in ("el", "ru"):
        page = home_pages.get(locale)
        if page is None:
            issues.append(
                {
                    "locale": locale,
                    "reason": "home page logical row not found",
                }
            )
            continue

        source = _load_homepage_source(resources, locale)
        linked_items, linked_stats = _build_linked_resource_items(
            source["linkedRows"],
            locale=locale,
            mapping=mapping,
            exceptions=exceptions,
        )
        promo_targets, promo_stats = _build_promo_targets(
            source["promoRows"],
            locale=locale,
            mapping=mapping,
            exceptions=exceptions,
        )

        sections, build_issues = _build_homepage_sections(
            legacy_blocks=page_blocks.get(page.entity_id, []),
            linked_resource_items=linked_items,
            promo_targets=promo_targets,
            locale=locale,
        )
        issues.extend(build_issues)

        source_resolution[locale] = {
            "sourceResourceId": source["resourceId"],
            "linkedResources": linked_stats,
            "promoSlides": promo_stats,
            "sectionCount": len(sections),
        }

        planned.append(
            {
                "documentId": page.document_id,
                "locale": page.locale,
                "entityId": page.entity_id,
                "title": page.title,
                "hasDraft": page.has_draft,
                "hasPublished": page.has_published,
                "payload": {
                    "pageSections": sections,
                },
            }
        )

    return planned, source_resolution, issues


def _plan_slug_updates(
    *,
    conn: sqlite3.Connection,
    exceptions: dict[str, Any],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    planned: list[dict[str, Any]] = []
    issues: list[dict[str, Any]] = []
    logical_pages, _ = _load_logical_pages(conn)
    by_key = {(page.document_id, page.locale): page for page in logical_pages}
    rows = {
        (str(row["document_id"]), str(row["locale"])): dict(row)
        for row in conn.execute("select document_id, locale, slug from pages where document_id is not null and locale is not null and published_at is null").fetchall()
    }

    slug_overrides = exceptions.get("slugOverrides") or {}
    for document_id, locale_map in slug_overrides.items():
        if not isinstance(locale_map, dict):
            continue
        for locale, desired_slug in locale_map.items():
            page = by_key.get((document_id, locale))
            current_row = rows.get((document_id, locale))
            if page is None or current_row is None:
                issues.append(
                    {
                        "documentId": document_id,
                        "locale": locale,
                        "reason": "slug override target document/locale was not found",
                    }
                )
                continue

            desired_slug = str(desired_slug).strip()
            if not desired_slug:
                continue
            if current_row["slug"] == desired_slug:
                continue

            conflicts = _find_slug_conflicts(conn, locale=locale, slug=desired_slug, document_id=document_id)
            if conflicts:
                issues.append(
                    {
                        "documentId": document_id,
                        "locale": locale,
                        "reason": "slug override conflicts with another page in the same locale",
                        "desiredSlug": desired_slug,
                        "conflicts": conflicts,
                    }
                )
                continue

            planned.append(
                {
                    "documentId": document_id,
                    "locale": locale,
                    "title": page.title,
                    "hasDraft": page.has_draft,
                    "hasPublished": page.has_published,
                    "slug": desired_slug,
                }
            )

    return planned, issues


def _relative_database_filename(db_path: Path) -> str:
    backend_root = ROOT / "backend"
    return os.path.relpath(db_path.resolve(), backend_root.resolve())


def _apply_updates_via_strapi(report_path: Path, *, db_path: Path, sleep_ms: int) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    if not APPLY_SCRIPT_PATH.is_file():
        raise RuntimeError(f"Strapi apply script not found: {APPLY_SCRIPT_PATH}")

    report_path = report_path.resolve()
    result_path = report_path.with_name(f"{report_path.stem}.apply-results.json")
    env = os.environ.copy()
    env["DATABASE_FILENAME"] = _relative_database_filename(db_path)
    cmd = [
        "node",
        str(APPLY_SCRIPT_PATH),
        "--plan",
        str(report_path),
        "--result",
        str(result_path),
        "--sleep-ms",
        str(sleep_ms),
    ]
    logger.info("Applying homepage link recovery through Strapi document service")
    proc = subprocess.run(cmd, cwd=ROOT / "backend", env=env, check=False)
    if proc.returncode not in (0, 1):
        raise RuntimeError(f"Apply script exited with code {proc.returncode}")
    if not result_path.is_file():
        raise RuntimeError(f"Apply result file not found: {result_path}")
    result = _load_json(result_path)
    return result.get("ok", []), result.get("errors", [])


def _duplicate_draft_slugs(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    rows = conn.execute(
        """
        select locale, slug, count(*) as count
        from pages
        where published_at is null and slug is not null
        group by locale, slug
        having count(*) > 1
        order by locale, slug
        """
    ).fetchall()
    return [dict(row) for row in rows]


def _homepage_section_component_counts(conn: sqlite3.Connection) -> dict[str, dict[str, int]]:
    rows = conn.execute(
        """
        select p.locale, pc.component_type, count(*) as count
        from pages p
        join pages_cmps pc on pc.entity_id = p.id
        where p.template_id = 'template_1' and p.published_at is null and pc.field = 'pageSections'
        group by p.locale, pc.component_type
        order by p.locale, pc.component_type
        """
    ).fetchall()
    out: dict[str, dict[str, int]] = defaultdict(dict)
    for row in rows:
        out[str(row["locale"])][str(row["component_type"])] = int(row["count"])
    return dict(out)


def _relation_table_counts(conn: sqlite3.Connection) -> dict[str, int]:
    rows = conn.execute(
        """
        select name
        from sqlite_master
        where type = 'table'
          and (
            name like 'components_items_promo_slides%target_page%'
            or name like 'components_items_linked_resources%target_page%'
          )
        order by name
        """
    ).fetchall()
    counts: dict[str, int] = {}
    for row in rows:
        name = str(row["name"])
        counts[name] = int(conn.execute(f"select count(*) from {name}").fetchone()[0])
    return counts


def _post_apply_audit(
    *,
    current_conn: sqlite3.Connection,
    compare_conn: sqlite3.Connection | None,
    resources: list[dict[str, Any]],
    mapping: dict[str, str],
) -> dict[str, Any]:
    return {
        "baselineAudit": _audit_baseline(current_conn),
        "legacyParityAudit": _legacy_parity_audit(current_conn, compare_conn),
        "slugChangeSummary": _slug_change_summary(compare_conn, current_conn),
        "slugAliasParity": _slug_alias_parity(compare_conn, current_conn, resources, mapping),
        "duplicateDraftSlugs": _duplicate_draft_slugs(current_conn),
        "homePageSectionComponentCounts": _homepage_section_component_counts(current_conn),
        "targetRelationTableCounts": _relation_table_counts(current_conn),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Write the new homepage fields through Strapi. Default is audit/dry-run only.")
    parser.add_argument("--db-path", type=Path, default=DEFAULT_DB_PATH, help="Path to the local SQLite database.")
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT_PATH, help="Where to write the JSON audit/backfill report.")
    parser.add_argument("--snapshot-dir", type=Path, default=DEFAULT_SNAPSHOT_DIR, help="Directory used for read-only DB snapshots.")
    parser.add_argument("--snapshot-db", action="store_true", help="Create a read-only SQLite snapshot before running the audit.")
    parser.add_argument("--no-snapshot", action="store_true", help="Disable the automatic pre-apply snapshot.")
    parser.add_argument(
        "--compare-snapshot",
        type=Path,
        default=None,
        help="Optional pre-migration snapshot used for legacy parity and slug audits. Defaults to the latest *.page-model.*.db snapshot.",
    )
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE_PATH, help="Path to transformed_resources.json.")
    parser.add_argument("--mapping", type=Path, default=DEFAULT_MAPPING_PATH, help="Path to modx_to_strapi.json.")
    parser.add_argument("--exceptions", type=Path, default=DEFAULT_EXCEPTIONS_PATH, help="Path to reviewed homepage exception mappings.")
    parser.add_argument("--sleep-ms", type=int, default=50, help="Pause between API writes when --apply is used.")
    args = parser.parse_args()

    if not args.db_path.is_file():
        parser.error(f"SQLite database not found: {args.db_path}")
    if not args.source.is_file():
        parser.error(f"Source resource file not found: {args.source}")
    if not args.mapping.is_file():
        parser.error(f"MODX-to-Strapi mapping file not found: {args.mapping}")
    if not args.exceptions.is_file():
        parser.error(f"Homepage exception file not found: {args.exceptions}")

    compare_snapshot = args.compare_snapshot
    if compare_snapshot is None:
        compare_snapshot = _resolve_latest_page_model_snapshot(args.snapshot_dir)
    if compare_snapshot is not None and not compare_snapshot.is_file():
        parser.error(f"Compare snapshot not found: {compare_snapshot}")

    snapshot_path: Path | None = None
    if args.snapshot_db or (args.apply and not args.no_snapshot):
        snapshot_path = _snapshot_database(args.db_path, args.snapshot_dir)
        logger.info("Created read-only DB snapshot at %s", snapshot_path)

    resources = _flatten_resources(_load_json(args.source))
    mapping = _load_json(args.mapping)
    exceptions = _load_json(args.exceptions)

    compare_conn = _sqlite_connect(compare_snapshot) if compare_snapshot is not None else None
    current_conn = _sqlite_connect(args.db_path)
    applied_errors: list[dict[str, Any]] = []
    try:
        report = {
            "mode": "apply" if args.apply else "dry-run",
            "dbPath": str(args.db_path),
            "snapshotPath": str(snapshot_path) if snapshot_path else None,
            "compareSnapshotPath": str(compare_snapshot) if compare_snapshot else None,
            "baselineAudit": _audit_baseline(current_conn),
            "legacyParityAudit": _legacy_parity_audit(current_conn, compare_conn),
            "slugChangeSummary": _slug_change_summary(compare_conn, current_conn),
            "slugAliasParity": _slug_alias_parity(compare_conn, current_conn, resources, mapping),
        }

        planned_homepage_updates, source_resolution, homepage_issues = _plan_homepage_updates(
            conn=current_conn,
            resources=resources,
            mapping=mapping,
            exceptions=exceptions,
        )
        planned_slug_updates, slug_issues = _plan_slug_updates(conn=current_conn, exceptions=exceptions)
        planning_issues = homepage_issues + slug_issues

        report.update(
            {
                "sourceResolutionAudit": source_resolution,
                "planSummary": {
                    "homepageUpdateCount": len(planned_homepage_updates),
                    "slugUpdateCount": len(planned_slug_updates),
                    "issueCount": len(planning_issues),
                },
                "plannedHomepageUpdates": planned_homepage_updates,
                "plannedSlugUpdates": planned_slug_updates,
                "planningIssues": planning_issues,
                "applyResults": {
                    "okCount": 0,
                    "errorCount": 0,
                    "ok": [],
                    "errors": [],
                },
            }
        )

        _save_json(args.report, report)

        if args.apply:
            applied_ok, applied_errors = _apply_updates_via_strapi(args.report, db_path=args.db_path, sleep_ms=args.sleep_ms)
            report["applyResults"] = {
                "okCount": len(applied_ok),
                "errorCount": len(applied_errors),
                "ok": applied_ok,
                "errors": applied_errors,
            }
            current_conn.close()
            current_conn = _sqlite_connect(args.db_path)
            report["postApplyAudit"] = _post_apply_audit(
                current_conn=current_conn,
                compare_conn=compare_conn,
                resources=resources,
                mapping=mapping,
            )
            _save_json(args.report, report)
        else:
            logger.info("Wrote dry-run report to %s", args.report)
    finally:
        current_conn.close()
        if compare_conn is not None:
            compare_conn.close()

    return 1 if applied_errors else 0


if __name__ == "__main__":
    sys.exit(main())
