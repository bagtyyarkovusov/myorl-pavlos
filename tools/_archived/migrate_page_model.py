"""Expand-contract migration for Strapi page templates and structured sections.

Reads legacy page/template data from the local SQLite database for audit and
classification, then writes the additive semantic fields back through the
Strapi content API when ``--apply`` is passed.

This keeps the migration dry-run friendly while still honoring the rule that
real content writes must go through Strapi rather than direct SQL mutations.
"""

from __future__ import annotations

import argparse
import json
import logging
import shutil
import sqlite3
import subprocess
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from cms_audit import CHECKPOINT_SOURCE_DIR, MANIFESTS_DIR, MODX_SOURCE_DIR, REPORTS_DIR, ROOT
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = ROOT / "backend/.tmp/data.db"
DEFAULT_REPORT_PATH = REPORTS_DIR / "page_model_migration_report.json"
DEFAULT_SNAPSHOT_DIR = ROOT / "backend/.tmp/snapshots"
APPLY_SCRIPT_PATH = ROOT / "backend/scripts/apply-page-model-plan.js"

LEGACY_SCALAR_FIELDS = (
    "title",
    "slug",
    "template_id",
    "content",
    "excerpt",
    "info_block_bottom",
    "external_url",
    "is_folder",
    "hide_from_menu",
    "menu_index",
    "article_author",
    "sources",
    "pop_up_close",
)

LEGACY_COMPONENT_TABLES = {
    "blocks.accordion-item": "components_blocks_accordion_items",
    "blocks.advantage": "components_blocks_advantages",
    "blocks.clinic": "components_blocks_clinics",
    "blocks.contact-detail": "components_blocks_contact_details",
    "blocks.faq-item": "components_blocks_faq_items",
    "blocks.gallery-image": "components_blocks_gallery_images",
    "blocks.promo-slide": "components_blocks_promo_slides",
    "blocks.social-link": "components_blocks_social_links",
    "blocks.tab-item": "components_blocks_tab_items",
    "blocks.video": "components_blocks_videos",
}

LEGACY_MEDIA_FIELDS = {
    "blocks.gallery-image": ("image",),
    "blocks.promo-slide": ("image",),
    "blocks.video": ("videoMp4", "videoWebm", "thumbnail"),
}

HOME_SECTION_MAP = {
    "blocks.promo-slide": ("sections.promo-slider", "slides"),
    "blocks.faq-item": ("sections.faq", "items"),
    "blocks.social-link": ("sections.social-links", "links"),
    "blocks.video": ("sections.video", "videos"),
    "blocks.advantage": ("sections.advantages", "items"),
    "blocks.accordion-item": ("sections.accordion", "items"),
    "blocks.tab-item": ("sections.tabs", "items"),
    "blocks.gallery-image": ("sections.gallery", "items"),
    "blocks.contact-detail": ("sections.contact", "details"),
    "blocks.clinic": ("sections.contact", "clinics"),
}

SUPPORTED_BLOCK_TYPES = frozenset(HOME_SECTION_MAP)

logging.basicConfig(format="%(asctime)s %(levelname)s %(name)s %(message)s", level=logging.INFO)
logger = logging.getLogger("migrate_page_model")


@dataclass
class LogicalPage:
    entity_id: int
    document_id: str
    locale: str
    template_id: str | None
    title: str | None
    has_draft: bool
    has_published: bool
    row_ids: tuple[int, ...]


def _save_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)


def _dict_row(row: sqlite3.Row | None) -> dict[str, Any] | None:
    return dict(row) if row is not None else None


def _sqlite_connect(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def _snapshot_database(db_path: Path, snapshot_dir: Path) -> Path:
    snapshot_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%dT%H%M%S")
    snapshot_path = snapshot_dir / f"{db_path.stem}.page-model.{stamp}{db_path.suffix}"
    shutil.copy2(db_path, snapshot_path)
    try:
        snapshot_path.chmod(0o444)
    except OSError:
        logger.warning("Could not mark snapshot %s read-only", snapshot_path)
    return snapshot_path


def _load_component_rows(conn: sqlite3.Connection) -> dict[str, dict[int, dict[str, Any]]]:
    out: dict[str, dict[int, dict[str, Any]]] = {}
    for component_type, table_name in LEGACY_COMPONENT_TABLES.items():
        rows = conn.execute(f"select * from {table_name}").fetchall()
        out[component_type] = {int(row["id"]): dict(row) for row in rows}
    return out


def _load_media_links(conn: sqlite3.Connection) -> dict[tuple[str, int, str], list[int]]:
    related_types = tuple(LEGACY_MEDIA_FIELDS)
    placeholders = ",".join("?" for _ in related_types)
    rows = conn.execute(
        f"""
        select related_type, related_id, field, file_id
        from files_related_mph
        where related_type in ({placeholders})
        order by related_type, related_id, field, `order`, id
        """,
        related_types,
    ).fetchall()

    out: dict[tuple[str, int, str], list[int]] = defaultdict(list)
    for row in rows:
        key = (str(row["related_type"]), int(row["related_id"]), str(row["field"]))
        out[key].append(int(row["file_id"]))
    return out


def _component_media_id(
    media_links: dict[tuple[str, int, str], list[int]],
    component_type: str,
    component_id: int,
    field: str,
) -> int | None:
    ids = media_links.get((component_type, component_id, field)) or []
    return ids[0] if ids else None


def _serialize_legacy_block(
    component_type: str,
    component_id: int,
    component_rows: dict[str, dict[int, dict[str, Any]]],
    media_links: dict[tuple[str, int, str], list[int]],
) -> dict[str, Any] | None:
    row = component_rows.get(component_type, {}).get(component_id)
    if row is None:
        return None

    if component_type == "blocks.accordion-item":
        return {"title": row.get("title"), "content": row.get("content")}
    if component_type == "blocks.advantage":
        return {"title": row.get("title"), "description": row.get("description"), "icon": row.get("icon")}
    if component_type == "blocks.clinic":
        return {
            "name": row.get("name"),
            "address": row.get("address"),
            "phone": row.get("phone"),
            "email": row.get("email"),
            "latitude": row.get("latitude"),
            "longitude": row.get("longitude"),
        }
    if component_type == "blocks.contact-detail":
        return {"type": row.get("type"), "value": row.get("value")}
    if component_type == "blocks.faq-item":
        return {"question": row.get("question"), "answer": row.get("answer")}
    if component_type == "blocks.gallery-image":
        return {
            "image": _component_media_id(media_links, component_type, component_id, "image"),
            "caption": row.get("caption"),
        }
    if component_type == "blocks.promo-slide":
        return {
            "title": row.get("title"),
            "description": row.get("description"),
            "image": _component_media_id(media_links, component_type, component_id, "image"),
        }
    if component_type == "blocks.social-link":
        return {"name": row.get("name"), "url": row.get("url"), "icon": row.get("icon")}
    if component_type == "blocks.tab-item":
        return {"title": row.get("title"), "content": row.get("content"), "link": row.get("link")}
    if component_type == "blocks.video":
        return {
            "title": row.get("title"),
            "videoMp4": _component_media_id(media_links, component_type, component_id, "videoMp4"),
            "videoWebm": _component_media_id(media_links, component_type, component_id, "videoWebm"),
            "thumbnail": _component_media_id(media_links, component_type, component_id, "thumbnail"),
            "videoTags": row.get("video_tags"),
        }
    return None


def _load_page_blocks(conn: sqlite3.Connection) -> tuple[dict[int, list[dict[str, Any]]], list[dict[str, Any]]]:
    component_rows = _load_component_rows(conn)
    media_links = _load_media_links(conn)
    rows = conn.execute(
        """
        select entity_id, cmp_id, component_type, `order`
        from pages_cmps
        where field = 'pageBlocks'
        order by entity_id, `order`, id
        """
    ).fetchall()

    page_blocks: dict[int, list[dict[str, Any]]] = defaultdict(list)
    issues: list[dict[str, Any]] = []
    for row in rows:
        entity_id = int(row["entity_id"])
        component_type = str(row["component_type"])
        component_id = int(row["cmp_id"])
        item = _serialize_legacy_block(component_type, component_id, component_rows, media_links)
        if item is None:
            issues.append(
                {
                    "entityId": entity_id,
                    "componentType": component_type,
                    "componentId": component_id,
                    "reason": "missing legacy component row or unsupported component type",
                }
            )
            continue
        page_blocks[entity_id].append(
            {
                "componentType": component_type,
                "componentId": component_id,
                "order": row["order"],
                "item": item,
            }
        )
    return page_blocks, issues


def _load_component_count_by_entity(conn: sqlite3.Connection) -> dict[int, Counter[tuple[str, str]]]:
    rows = conn.execute(
        """
        select entity_id, field, component_type, count(*) as count
        from pages_cmps
        group by entity_id, field, component_type
        """
    ).fetchall()
    counts: dict[int, Counter[tuple[str, str]]] = defaultdict(Counter)
    for row in rows:
        key = (str(row["field"]), str(row["component_type"]))
        counts[int(row["entity_id"])][key] = int(row["count"])
    return counts


def _load_logical_pages(conn: sqlite3.Connection) -> tuple[list[LogicalPage], list[dict[str, Any]]]:
    rows = conn.execute(
        """
        select id, document_id, locale, published_at, template_id, title
        from pages
        where document_id is not null and locale is not null
        order by document_id, locale, case when published_at is not null then 0 else 1 end, id
        """
    ).fetchall()

    grouped: dict[tuple[str, str], list[sqlite3.Row]] = defaultdict(list)
    for row in rows:
        grouped[(str(row["document_id"]), str(row["locale"]))].append(row)

    pages: list[LogicalPage] = []
    issues: list[dict[str, Any]] = []
    for (document_id, locale), group in grouped.items():
        preferred = group[0]
        has_published = any(item["published_at"] is not None for item in group)
        has_draft = any(item["published_at"] is None for item in group)
        if len(group) > 2:
            issues.append(
                {
                    "documentId": document_id,
                    "locale": locale,
                    "rowIds": [int(item["id"]) for item in group],
                    "reason": "more than two localized rows found for logical page",
                }
            )
        pages.append(
            LogicalPage(
                entity_id=int(preferred["id"]),
                document_id=document_id,
                locale=locale,
                template_id=preferred["template_id"],
                title=preferred["title"],
                has_draft=has_draft,
                has_published=has_published,
                row_ids=tuple(int(item["id"]) for item in group),
            )
        )
    pages.sort(key=lambda item: (item.locale, item.document_id))
    return pages, issues


def _audit_baseline(conn: sqlite3.Connection) -> dict[str, Any]:
    total_pages = conn.execute("select count(*) from pages").fetchone()[0]
    total_documents = conn.execute("select count(distinct document_id) from pages").fetchone()[0]
    locale_rows = {
        row["locale"]: int(row["count"])
        for row in conn.execute("select locale, count(*) as count from pages group by locale order by locale").fetchall()
    }
    publish_rows = {
        ("published" if row["published_at"] else "draft"): int(row["count"])
        for row in conn.execute(
            """
            select case when published_at is not null then 1 else 0 end as published_at, count(*) as count
            from pages
            group by case when published_at is not null then 1 else 0 end
            """
        ).fetchall()
    }
    template_rows = {
        (row["template_id"] or "__null__"): int(row["count"])
        for row in conn.execute(
            "select template_id, count(*) as count from pages group by template_id order by count desc, template_id"
        ).fetchall()
    }
    return {
        "pageRowCount": int(total_pages),
        "documentCount": int(total_documents),
        "localeRowCounts": locale_rows,
        "publishStateCounts": publish_rows,
        "templateRowCounts": template_rows,
    }


def _audit_pair_parity(
    conn: sqlite3.Connection,
    logical_pages: list[LogicalPage],
    component_counts: dict[int, Counter[tuple[str, str]]],
) -> dict[str, Any]:
    rows_by_id = {
        int(row["id"]): dict(row)
        for row in conn.execute(f"select id, {', '.join(LEGACY_SCALAR_FIELDS)} from pages").fetchall()
    }
    scalar_mismatches: list[dict[str, Any]] = []
    component_mismatches: list[dict[str, Any]] = []
    non_pairs: list[dict[str, Any]] = []

    for page in logical_pages:
        if len(page.row_ids) != 2 or not (page.has_draft and page.has_published):
            non_pairs.append(
                {
                    "documentId": page.document_id,
                    "locale": page.locale,
                    "rowIds": list(page.row_ids),
                    "hasDraft": page.has_draft,
                    "hasPublished": page.has_published,
                }
            )
            continue

        left = rows_by_id[page.row_ids[0]]
        right = rows_by_id[page.row_ids[1]]
        for field in LEGACY_SCALAR_FIELDS:
            if left.get(field) != right.get(field):
                scalar_mismatches.append(
                    {
                        "documentId": page.document_id,
                        "locale": page.locale,
                        "field": field,
                        "rowIds": list(page.row_ids),
                    }
                )

        left_components = component_counts.get(page.row_ids[0], Counter())
        right_components = component_counts.get(page.row_ids[1], Counter())
        if left_components != right_components:
            component_mismatches.append(
                {
                    "documentId": page.document_id,
                    "locale": page.locale,
                    "rowIds": list(page.row_ids),
                    "left": {f"{field}:{component}": count for (field, component), count in left_components.items()},
                    "right": {f"{field}:{component}": count for (field, component), count in right_components.items()},
                }
            )

    return {
        "pairCount": len(logical_pages),
        "nonDraftPublishedPairs": non_pairs,
        "scalarMismatchCount": len(scalar_mismatches),
        "componentMismatchCount": len(component_mismatches),
        "scalarMismatches": scalar_mismatches[:25],
        "componentMismatches": component_mismatches[:25],
    }


def _section_items(blocks: list[dict[str, Any]], component_type: str) -> list[dict[str, Any]]:
    return [dict(block["item"]) for block in blocks if block["componentType"] == component_type]


def _build_home_sections(blocks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    sections: list[dict[str, Any]] = []
    section_index: dict[str, dict[str, Any]] = {}

    for block in blocks:
        section_meta = HOME_SECTION_MAP.get(block["componentType"])
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
        if item_key not in section:
            section[item_key] = []
        section[item_key].append(dict(block["item"]))

    return sections


def _empty_structured_payload() -> dict[str, Any]:
    return {
        "pageSections": [],
        "faqSection": None,
        "accordionSection": None,
        "tabsSection": None,
        "gallerySection": None,
        "contactSection": None,
    }


def _classify_page(page: LogicalPage, blocks: list[dict[str, Any]]) -> tuple[dict[str, Any] | None, str | None]:
    template_id = page.template_id
    block_types = {block["componentType"] for block in blocks}
    unknown_block_types = sorted(block_type for block_type in block_types if block_type not in SUPPORTED_BLOCK_TYPES)
    if unknown_block_types:
        return None, f"unsupported legacy block types: {', '.join(unknown_block_types)}"

    payload = _empty_structured_payload()

    if template_id == "template_1":
        payload["pageType"] = "home"
        payload["layoutVariant"] = "home"
        payload["pageSections"] = _build_home_sections(blocks)
        return payload, None

    if template_id == "template_6":
        payload["pageType"] = "contact"
        payload["layoutVariant"] = "contact"
        payload["contactSection"] = {
            "details": _section_items(blocks, "blocks.contact-detail"),
            "clinics": _section_items(blocks, "blocks.clinic"),
        }
        return payload, None

    if template_id == "template_11":
        payload["pageType"] = "gallery"
        payload["layoutVariant"] = "clinic-gallery"
        payload["gallerySection"] = {"items": _section_items(blocks, "blocks.gallery-image")}
        return payload, None

    if template_id == "template_13":
        payload["pageType"] = "gallery"
        payload["layoutVariant"] = "office-gallery"
        payload["gallerySection"] = {"items": _section_items(blocks, "blocks.gallery-image")}
        return payload, None

    if template_id == "template_15":
        payload["pageType"] = "tabs"
        payload["layoutVariant"] = "service-tabs"
        payload["tabsSection"] = {"items": _section_items(blocks, "blocks.tab-item")}
        return payload, None

    if template_id == "template_8":
        has_faq = "blocks.faq-item" in block_types
        has_accordion = "blocks.accordion-item" in block_types
        has_tabs = "blocks.tab-item" in block_types
        if sum(1 for flag in (has_faq, has_accordion, has_tabs) if flag) > 1:
            return None, "template_8 mixes multiple structured block families"
        if has_faq:
            payload["pageType"] = "faq"
            payload["layoutVariant"] = "service-faq"
            payload["faqSection"] = {"items": _section_items(blocks, "blocks.faq-item")}
            return payload, None
        if has_accordion:
            payload["pageType"] = "accordion"
            payload["layoutVariant"] = "service-accordion"
            payload["accordionSection"] = {"items": _section_items(blocks, "blocks.accordion-item")}
            return payload, None
        if has_tabs:
            payload["pageType"] = "tabs"
            payload["layoutVariant"] = "service-tabs"
            payload["tabsSection"] = {"items": _section_items(blocks, "blocks.tab-item")}
            return payload, None
        if block_types:
            return None, "template_8 contains unexpected pageBlocks"
        payload["pageType"] = "content"
        payload["layoutVariant"] = "service-article"
        return payload, None

    if template_id == "template_18":
        payload["pageType"] = "content"
        payload["layoutVariant"] = "encyclopedia-article"
        return payload, None

    if template_id == "template_20":
        has_tabs = "blocks.tab-item" in block_types
        if has_tabs:
            payload["pageType"] = "tabs"
            payload["layoutVariant"] = "service-tabs"
            payload["tabsSection"] = {"items": _section_items(blocks, "blocks.tab-item")}
            return payload, None
        if block_types:
            return None, "template_20 contains unexpected pageBlocks"
        payload["pageType"] = "content"
        payload["layoutVariant"] = "specialized-article"
        return payload, None

    if template_id == "template_5":
        payload["pageType"] = "content"
        payload["layoutVariant"] = "standard"
        return payload, None

    if template_id == "template_7":
        payload["pageType"] = "content"
        payload["layoutVariant"] = "section-index"
        return payload, None

    if template_id == "template_10":
        payload["pageType"] = "content"
        payload["layoutVariant"] = "clinic-index"
        return payload, None

    if template_id == "template_16":
        payload["pageType"] = "content"
        payload["layoutVariant"] = "video-index"
        return payload, None

    if template_id == "template_17":
        payload["pageType"] = "content"
        payload["layoutVariant"] = "encyclopedia-index"
        return payload, None

    if template_id == "template_2":
        payload["pageType"] = "system"
        payload["layoutVariant"] = "not-found"
        return payload, None

    if template_id == "template_3":
        payload["pageType"] = "system"
        payload["layoutVariant"] = "search-results"
        return payload, None

    if template_id == "template_12":
        payload["pageType"] = "system"
        payload["layoutVariant"] = "sitemap"
        return payload, None

    if template_id == "template_14":
        payload["pageType"] = "system"
        payload["layoutVariant"] = "appointment-form"
        return payload, None

    return None, f"template {template_id or '__null__'} is not mapped in this migration"


def _section_stats(payload: dict[str, Any]) -> dict[str, int]:
    stats: dict[str, int] = {}
    stats["pageSections"] = len(payload.get("pageSections") or [])
    for field_name in ("faqSection", "accordionSection", "tabsSection", "gallerySection", "contactSection"):
        field_value = payload.get(field_name)
        stats[field_name] = 1 if field_value else 0
    if payload.get("faqSection"):
        stats["faqItems"] = len(payload["faqSection"].get("items") or [])
    if payload.get("accordionSection"):
        stats["accordionItems"] = len(payload["accordionSection"].get("items") or [])
    if payload.get("tabsSection"):
        stats["tabItems"] = len(payload["tabsSection"].get("items") or [])
    if payload.get("gallerySection"):
        stats["galleryItems"] = len(payload["gallerySection"].get("items") or [])
    if payload.get("contactSection"):
        stats["contactDetails"] = len(payload["contactSection"].get("details") or [])
        stats["clinics"] = len(payload["contactSection"].get("clinics") or [])
    if payload.get("pageSections"):
        stats["homeSectionItems"] = sum(
            len(section.get(key) or [])
            for section in payload["pageSections"]
            for key in ("slides", "items", "links", "videos", "details", "clinics")
        )
    return stats


def _plan_updates(
    logical_pages: list[LogicalPage],
    page_blocks: dict[int, list[dict[str, Any]]],
    *,
    locale_filter: str,
    document_id_filter: str | None,
    limit: int,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    planned: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    counts_by_page_type: Counter[str] = Counter()
    counts_by_layout_variant: Counter[str] = Counter()
    counts_by_contract: Counter[str] = Counter()
    aggregate_stats: Counter[str] = Counter()

    for page in logical_pages:
        if locale_filter != "all" and page.locale != locale_filter:
            continue
        if document_id_filter and page.document_id != document_id_filter:
            continue

        payload, reason = _classify_page(page, page_blocks.get(page.entity_id, []))
        if reason is not None or payload is None:
            skipped.append(
                {
                    "documentId": page.document_id,
                    "locale": page.locale,
                    "entityId": page.entity_id,
                    "templateId": page.template_id,
                    "title": page.title,
                    "reason": reason or "unknown classification failure",
                }
            )
            continue

        stats = _section_stats(payload)
        counts_by_page_type[payload["pageType"]] += 1
        counts_by_layout_variant[payload["layoutVariant"]] += 1
        counts_by_contract[f'{payload["pageType"]}/{payload["layoutVariant"]}'] += 1
        aggregate_stats.update(stats)

        planned.append(
            {
                "documentId": page.document_id,
                "locale": page.locale,
                "entityId": page.entity_id,
                "templateId": page.template_id,
                "title": page.title,
                "hasDraft": page.has_draft,
                "hasPublished": page.has_published,
                "sectionStats": stats,
                "payload": payload,
            }
        )
        if limit and len(planned) >= limit:
            break

    summary = {
        "plannedCount": len(planned),
        "skippedCount": len(skipped),
        "countsByPageType": dict(counts_by_page_type),
        "countsByLayoutVariant": dict(counts_by_layout_variant),
        "countsByContract": dict(counts_by_contract),
        "aggregateSectionStats": dict(aggregate_stats),
    }
    return planned, skipped, summary


def _apply_updates_via_strapi(report_path: Path, *, sleep_ms: int) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    if not APPLY_SCRIPT_PATH.is_file():
        raise RuntimeError(f"Strapi apply script not found: {APPLY_SCRIPT_PATH}")

    result_path = report_path.with_name(f"{report_path.stem}.apply-results.json")
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
    logger.info("Applying migration plan through Strapi document service")
    proc = subprocess.run(cmd, cwd=ROOT / "backend", check=False)
    if proc.returncode not in (0, 1):
        raise RuntimeError(f"Apply script exited with code {proc.returncode}")
    if not result_path.is_file():
        raise RuntimeError(f"Apply result file not found: {result_path}")

    result = json.loads(result_path.read_text(encoding="utf-8"))
    return result.get("ok", []), result.get("errors", [])


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Write the new fields through Strapi. Default is audit/dry-run only.")
    parser.add_argument("--db-path", type=Path, default=DEFAULT_DB_PATH, help="Path to the local SQLite database.")
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT_PATH, help="Where to write the JSON audit/backfill report.")
    parser.add_argument("--snapshot-dir", type=Path, default=DEFAULT_SNAPSHOT_DIR, help="Directory used for read-only DB snapshots.")
    parser.add_argument("--snapshot-db", action="store_true", help="Create a read-only SQLite snapshot before running the audit.")
    parser.add_argument("--no-snapshot", action="store_true", help="Disable the automatic pre-apply snapshot.")
    parser.add_argument("--locale", choices=("el", "ru", "all"), default="all", help="Restrict the migration to one locale.")
    parser.add_argument("--document-id", help="Restrict the migration to one Strapi documentId.")
    parser.add_argument("--limit", type=int, default=0, help="Only plan or apply the first N logical pages after filtering.")
    parser.add_argument("--sleep-ms", type=int, default=50, help="Pause between API writes when --apply is used.")
    args = parser.parse_args()

    if not args.db_path.is_file():
        parser.error(f"SQLite database not found: {args.db_path}")

    snapshot_path: Path | None = None
    if args.snapshot_db or (args.apply and not args.no_snapshot):
        snapshot_path = _snapshot_database(args.db_path, args.snapshot_dir)
        logger.info("Created read-only DB snapshot at %s", snapshot_path)

    conn = _sqlite_connect(args.db_path)
    try:
        baseline = _audit_baseline(conn)
        logical_pages, logical_page_issues = _load_logical_pages(conn)
        component_counts = _load_component_count_by_entity(conn)
        parity = _audit_pair_parity(conn, logical_pages, component_counts)
        page_blocks, block_issues = _load_page_blocks(conn)

        planned, skipped, plan_summary = _plan_updates(
            logical_pages,
            page_blocks,
            locale_filter=args.locale,
            document_id_filter=args.document_id,
            limit=args.limit,
        )

        report = {
            "mode": "apply" if args.apply else "dry-run",
            "dbPath": str(args.db_path),
            "snapshotPath": str(snapshot_path) if snapshot_path else None,
            "baselineAudit": baseline,
            "logicalPageAudit": {
                "logicalPageCount": len(logical_pages),
                "issues": logical_page_issues,
            },
            "draftPublishedParity": parity,
            "legacyBlockIssues": block_issues,
            "planSummary": plan_summary,
            "plannedUpdates": planned,
            "skipped": skipped,
            "applyResults": {
                "okCount": 0,
                "errorCount": 0,
                "ok": [],
                "errors": [],
            },
        }

        if args.apply:
            _save_json(args.report, report)
            applied_ok, applied_errors = _apply_updates_via_strapi(args.report, sleep_ms=args.sleep_ms)
            report["applyResults"] = {
                "okCount": len(applied_ok),
                "errorCount": len(applied_errors),
                "ok": applied_ok,
                "errors": applied_errors,
            }

        _save_json(args.report, report)
        logger.info("Wrote migration report to %s", args.report)
    finally:
        conn.close()

    if args.apply and applied_errors:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
