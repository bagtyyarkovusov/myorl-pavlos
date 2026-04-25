#!/usr/bin/env python3
"""Build alignment manifests for the Next.js migration handoff.

This pass treats Strapi as the runtime CMS and legacy MODX data as a repair
source only. The generated artifacts are intentionally operational:

- `nextjs_menu_title_backfill_plan.json`
- `nextjs_seo_review_manifest.json`
- `nextjs_source_alignment_manifest.json`
- `nextjs_parent_fix_plan.json`
- `nextjs_page_contract_fix_plan.json`
- `nextjs_pageblocks_cleanup_batch_a.json`
- `nextjs_pageblocks_cleanup_batch_b.json`
"""

from __future__ import annotations

import json
import sqlite3
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

import migrate_page_model as page_model

ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "backend" / ".tmp" / "data.db"
TRANSFORMED_PATH = ROOT / "transformed_resources.json"
CHECKPOINT_PATH = ROOT / "checkpoint.json"

MENU_TITLE_PLAN_PATH = ROOT / "nextjs_menu_title_backfill_plan.json"
SEO_REVIEW_PATH = ROOT / "nextjs_seo_review_manifest.json"
SOURCE_ALIGNMENT_PATH = ROOT / "nextjs_source_alignment_manifest.json"
PARENT_FIX_PLAN_PATH = ROOT / "nextjs_parent_fix_plan.json"
CONTRACT_FIX_PLAN_PATH = ROOT / "nextjs_page_contract_fix_plan.json"
PAGEBLOCKS_BATCH_A_PATH = ROOT / "nextjs_pageblocks_cleanup_batch_a.json"
PAGEBLOCKS_BATCH_B_PATH = ROOT / "nextjs_pageblocks_cleanup_batch_b.json"

STRUCTURAL_FIELDS = {
    "templateId": "template_id",
    "pageType": "page_type",
    "layoutVariant": "layout_variant",
    "parentDocumentId": "parent_document_id",
}
SEMANTIC_FIELDS = {
    "home": "pageSections",
    "faq": "faqSection",
    "accordion": "accordionSection",
    "tabs": "tabsSection",
    "gallery": "gallerySection",
    "contact": "contactSection",
}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def dump_json(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def connect() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def has_column(connection: sqlite3.Connection, table: str, column: str) -> bool:
    rows = connection.execute(f"PRAGMA table_info({table})").fetchall()
    return any(str(row["name"]) == column for row in rows)


def current_pages(connection: sqlite3.Connection) -> list[dict[str, Any]]:
    menu_title_select = "p.menu_title AS menu_title" if has_column(connection, "pages", "menu_title") else "NULL AS menu_title"
    rows = connection.execute(
        f"""
        SELECT
            p.id,
            p.document_id,
            p.locale,
            p.title,
            p.slug,
            p.page_type,
            p.layout_variant,
            p.template_id,
            p.menu_index,
            {menu_title_select},
            COALESCE(seo.meta_title, '') AS seo_meta_title,
            parent.document_id AS parent_document_id,
            p.published_at IS NOT NULL AS has_published
        FROM pages p
        LEFT JOIN pages_parent_page_lnk ppl
          ON ppl.page_id = p.id
        LEFT JOIN pages parent
          ON parent.id = ppl.inv_page_id
        LEFT JOIN pages_cmps seo_link
          ON seo_link.entity_id = p.id
         AND seo_link.field = 'seo'
         AND seo_link.component_type = 'shared.seo'
        LEFT JOIN components_shared_seos seo
          ON seo.id = seo_link.cmp_id
        WHERE p.published_at IS NOT NULL
        ORDER BY p.document_id, p.locale
        """
    ).fetchall()
    return [dict(row) for row in rows]


def component_field_counts(connection: sqlite3.Connection) -> dict[int, dict[str, int]]:
    counts: dict[int, dict[str, int]] = defaultdict(dict)
    rows = connection.execute(
        """
        SELECT entity_id, field, COUNT(*) AS count
        FROM pages_cmps
        GROUP BY entity_id, field
        """
    ).fetchall()
    for row in rows:
        counts[int(row["entity_id"])][str(row["field"])] = int(row["count"])
    return counts


def page_block_component_counts(connection: sqlite3.Connection) -> dict[int, dict[str, int]]:
    counts: dict[int, dict[str, int]] = defaultdict(dict)
    rows = connection.execute(
        """
        SELECT entity_id, component_type, COUNT(*) AS count
        FROM pages_cmps
        WHERE field = 'pageBlocks'
        GROUP BY entity_id, component_type
        """
    ).fetchall()
    for row in rows:
        counts[int(row["entity_id"])][str(row["component_type"])] = int(row["count"])
    return counts


def strip_text(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    return " ".join(value.split()).strip()


def context_to_locale(context_key: str) -> str:
    return "el" if context_key == "web" else "ru"


def template_to_strapi(value: Any) -> str | None:
    if value in (None, ""):
        return None
    if isinstance(value, str) and value.startswith("template_"):
        return value
    try:
        return f"template_{int(value)}"
    except (TypeError, ValueError):
        return None


def build_structural_manifest(pages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_document: dict[str, dict[str, dict[str, Any]]] = defaultdict(dict)
    for page in pages:
        by_document[str(page["document_id"])][str(page["locale"])] = page

    manifest: list[dict[str, Any]] = []
    for document_id, locales in sorted(by_document.items()):
        if "el" not in locales or "ru" not in locales:
            continue
        el_page = locales["el"]
        ru_page = locales["ru"]
        diffs = {}
        for label, field in STRUCTURAL_FIELDS.items():
            if el_page.get(field) != ru_page.get(field):
                diffs[label] = {"el": el_page.get(field), "ru": ru_page.get(field)}
        if not diffs:
            continue
        manifest.append(
            {
                "documentId": document_id,
                "titles": {"el": el_page.get("title"), "ru": ru_page.get("title")},
                "slugs": {"el": el_page.get("slug"), "ru": ru_page.get("slug")},
                "diffs": diffs,
            }
        )
    return manifest


def build_legacy_duplication_manifest(
    pages: list[dict[str, Any]],
    field_counts: dict[int, dict[str, int]],
    block_counts: dict[int, dict[str, int]],
) -> list[dict[str, Any]]:
    manifest_by_document: dict[str, dict[str, Any]] = {}

    for page in pages:
        page_type = str(page["page_type"])
        semantic_field = SEMANTIC_FIELDS.get(page_type)
        if not semantic_field:
            continue

        fields = field_counts.get(int(page["id"]), {})
        if fields.get(semantic_field, 0) <= 0 or fields.get("pageBlocks", 0) <= 0:
            continue

        entry = manifest_by_document.setdefault(
            str(page["document_id"]),
            {
                "documentId": page["document_id"],
                "pageType": page_type,
                "semanticField": semantic_field,
                "locales": {},
                "recommendedAction": "verify semantic section parity, then remove pageBlocks for this document",
            },
        )
        entry["locales"][str(page["locale"])] = {
            "title": page["title"],
            "slug": page["slug"],
            "semanticCount": fields.get(semantic_field, 0),
            "pageBlocksCount": fields.get("pageBlocks", 0),
            "pageBlockComponents": block_counts.get(int(page["id"]), {}),
        }

    return sorted(manifest_by_document.values(), key=lambda item: item["documentId"])


def build_parent_fix_plan(
    resources: list[dict[str, Any]],
    checkpoint: dict[str, Any],
    current_by_doc_locale: dict[tuple[str, str], dict[str, Any]],
) -> dict[str, Any]:
    planned_updates: list[dict[str, Any]] = []
    unresolved: list[dict[str, Any]] = []
    checkpoint_pages = checkpoint.get("pages") or {}

    for resource in resources:
        context_key = str(resource.get("context_key") or "")
        if context_key not in {"web", "rus"}:
            continue

        locale = context_to_locale(context_key)
        resource_id = int(resource["id"])
        source_parent_id = int(resource.get("parent") or 0)
        if source_parent_id == 0:
            continue

        document_id = (checkpoint_pages.get(context_key) or {}).get(str(resource_id))
        if not document_id:
            continue

        current_page = current_by_doc_locale.get((str(document_id), locale))
        if not current_page:
            continue

        expected_parent_document_id = (checkpoint_pages.get(context_key) or {}).get(
            str(source_parent_id)
        )
        if not expected_parent_document_id:
            unresolved.append(
                {
                    "documentId": str(document_id),
                    "locale": locale,
                    "sourceResourceId": resource_id,
                    "sourceParentResourceId": source_parent_id,
                    "slug": current_page.get("slug"),
                    "title": current_page.get("title"),
                    "reason": "source-parent-not-imported",
                }
            )
            continue

        expected_parent_page = current_by_doc_locale.get((str(expected_parent_document_id), locale))
        if not expected_parent_page:
            unresolved.append(
                {
                    "documentId": str(document_id),
                    "locale": locale,
                    "sourceResourceId": resource_id,
                    "sourceParentResourceId": source_parent_id,
                    "expectedParentDocumentId": str(expected_parent_document_id),
                    "slug": current_page.get("slug"),
                    "title": current_page.get("title"),
                    "reason": "source-parent-not-published-in-locale",
                }
            )
            continue

        current_parent_document_id = current_page.get("parent_document_id")
        if current_parent_document_id == expected_parent_document_id:
            continue

        planned_updates.append(
            {
                "documentId": str(document_id),
                "locale": locale,
                "sourceResourceId": resource_id,
                "sourceParentResourceId": source_parent_id,
                "slug": current_page.get("slug"),
                "title": current_page.get("title"),
                "currentParentDocumentId": current_parent_document_id,
                "expectedParentDocumentId": str(expected_parent_document_id),
                "expectedParentSlug": expected_parent_page.get("slug"),
                "expectedParentTitle": expected_parent_page.get("title"),
                "menuIndex": current_page.get("menu_index"),
                "hasPublished": bool(current_page.get("has_published")),
                "payload": {
                    "parentPage": str(expected_parent_document_id),
                },
            }
        )

    by_expected_parent = Counter(
        update["expectedParentDocumentId"] for update in planned_updates
    )
    by_locale = Counter(update["locale"] for update in planned_updates)

    return {
        "summary": {
            "plannedCount": len(planned_updates),
            "unresolvedCount": len(unresolved),
            "byLocale": dict(by_locale),
            "byExpectedParentDocumentId": dict(by_expected_parent),
            "note": (
                "Plan covers published pages whose original source parent is non-root but "
                "whose current Strapi parent relation is missing or different."
            ),
        },
        "plannedUpdates": planned_updates,
        "unresolved": unresolved,
    }


def expected_contract_for_current_page(
    logical_page: page_model.LogicalPage,
    current_page: dict[str, Any] | None,
    page_blocks: list[dict[str, Any]],
    field_counts: dict[int, dict[str, int]],
) -> tuple[dict[str, Any] | None, str | None]:
    if current_page is not None:
        current_page_type = str(current_page.get("page_type") or "")
        semantic_field = SEMANTIC_FIELDS.get(current_page_type)
        if semantic_field and field_counts.get(logical_page.entity_id, {}).get(semantic_field, 0) > 0:
            return {
                "pageType": current_page_type,
                "layoutVariant": current_page.get("layout_variant"),
            }, None

    return page_model._classify_page(logical_page, page_blocks)


def main() -> int:
    resources = load_json(TRANSFORMED_PATH)
    checkpoint = load_json(CHECKPOINT_PATH)
    resources_by_id = {int(resource["id"]): resource for resource in resources}

    connection = connect()
    current = current_pages(connection)
    current_by_doc_locale = {
        (str(page["document_id"]), str(page["locale"])): page
        for page in current
    }

    logical_pages, logical_page_issues = page_model._load_logical_pages(connection)
    logical_by_doc_locale = {
        (page.document_id, page.locale): page
        for page in logical_pages
    }
    page_blocks, block_issues = page_model._load_page_blocks(connection)

    field_counts = component_field_counts(connection)
    block_counts = page_block_component_counts(connection)
    structural_manifest = build_structural_manifest(current)
    legacy_duplication_manifest = build_legacy_duplication_manifest(current, field_counts, block_counts)

    menu_updates: list[dict[str, Any]] = []
    menu_candidates = 0
    menu_differs_from_title = 0
    for resource in resources:
        menu_title = strip_text(resource.get("menutitle"))
        if not menu_title:
            continue
        menu_candidates += 1
        locale = context_to_locale(str(resource.get("context_key") or ""))
        checkpoint_bucket = "web" if locale == "el" else "rus"
        document_id = (checkpoint.get("pages") or {}).get(checkpoint_bucket, {}).get(str(resource["id"]))
        if not document_id:
            continue
        current_page = current_by_doc_locale.get((str(document_id), locale))
        if not current_page:
            continue
        if strip_text(current_page.get("title")) != menu_title:
            menu_differs_from_title += 1
        if strip_text(current_page.get("menu_title")) == menu_title:
            continue
        logical_page = logical_by_doc_locale.get((str(document_id), locale))
        menu_updates.append(
            {
                "documentId": str(document_id),
                "locale": locale,
                "sourceResourceId": int(resource["id"]),
                "title": current_page.get("title"),
                "currentMenuTitle": current_page.get("menu_title"),
                "legacyMenuTitle": menu_title,
                "hasPublished": bool(logical_page.has_published if logical_page else current_page.get("has_published")),
                "payload": {
                    "menuTitle": menu_title,
                },
            }
        )

    dump_json(
        MENU_TITLE_PLAN_PATH,
        {
            "summary": {
                "legacyRowsWithMenuTitle": menu_candidates,
                "rowsWhereMenuTitleDiffersFromTitle": menu_differs_from_title,
                "plannedCount": len(menu_updates),
            },
            "plannedUpdates": menu_updates,
        },
    )

    seo_review: list[dict[str, Any]] = []
    for resource in resources:
        legacy_longtitle = strip_text(resource.get("longtitle"))
        if not legacy_longtitle:
            continue
        locale = context_to_locale(str(resource.get("context_key") or ""))
        checkpoint_bucket = "web" if locale == "el" else "rus"
        document_id = (checkpoint.get("pages") or {}).get(checkpoint_bucket, {}).get(str(resource["id"]))
        if not document_id:
            continue
        current_page = current_by_doc_locale.get((str(document_id), locale))
        if not current_page:
            continue
        current_title = strip_text(current_page.get("title"))
        current_seo_title = strip_text(current_page.get("seo_meta_title"))
        if not current_seo_title or current_seo_title != current_title:
            continue
        if legacy_longtitle == current_title:
            continue
        seo_review.append(
            {
                "documentId": str(document_id),
                "locale": locale,
                "sourceResourceId": int(resource["id"]),
                "slug": current_page.get("slug"),
                "title": current_page.get("title"),
                "currentSeoMetaTitle": current_page.get("seo_meta_title"),
                "legacyLongTitle": legacy_longtitle,
                "recommendedAction": "editorial-review-longtitle-for-seo-meta-title",
            }
        )

    dump_json(
        SEO_REVIEW_PATH,
        {
            "summary": {
                "count": len(seo_review),
            },
            "documents": seo_review,
        },
    )

    contract_plan_updates: list[dict[str, Any]] = []
    contract_sources: list[dict[str, Any]] = []
    contract_skipped: list[dict[str, Any]] = []
    for logical_page in logical_pages:
        current_page = current_by_doc_locale.get((logical_page.document_id, logical_page.locale))
        if not current_page:
            continue
        payload, reason = expected_contract_for_current_page(
            logical_page,
            current_page,
            page_blocks.get(logical_page.entity_id, []),
            field_counts,
        )
        if payload is None or reason is not None:
            contract_skipped.append(
                {
                    "documentId": logical_page.document_id,
                    "locale": logical_page.locale,
                    "reason": reason or "classification-failed",
                }
            )
            continue
        expected_page_type = payload["pageType"]
        expected_layout_variant = payload["layoutVariant"]
        matches = (
            current_page.get("page_type") == expected_page_type
            and current_page.get("layout_variant") == expected_layout_variant
        )
        contract_sources.append(
            {
                "documentId": logical_page.document_id,
                "locale": logical_page.locale,
                "templateId": logical_page.template_id,
                "currentPageType": current_page.get("page_type"),
                "currentLayoutVariant": current_page.get("layout_variant"),
                "expectedPageType": expected_page_type,
                "expectedLayoutVariant": expected_layout_variant,
                "matchesExpected": matches,
            }
        )
        if matches:
            continue
        contract_plan_updates.append(
            {
                "documentId": logical_page.document_id,
                "locale": logical_page.locale,
                "title": current_page.get("title"),
                "hasPublished": bool(logical_page.has_published),
                "payload": {
                    "pageType": expected_page_type,
                    "layoutVariant": expected_layout_variant,
                },
            }
        )

    dump_json(
        CONTRACT_FIX_PLAN_PATH,
        {
            "summary": {
                "logicalPageCount": len(contract_sources),
                "plannedCount": len(contract_plan_updates),
                "skippedCount": len(contract_skipped),
                "note": (
                    "Current Strapi pageType/layoutVariant values match the semantic section contract "
                    "or the remaining legacy-block classifier for every classifiable locale. "
                    "Cross-locale differences are not safe bulk-fix targets."
                ),
            },
            "logicalPageIssues": logical_page_issues,
            "legacyBlockIssues": block_issues,
            "plannedUpdates": contract_plan_updates,
            "sourceChecks": contract_sources,
            "skipped": contract_skipped,
        },
    )

    source_alignment_documents: list[dict[str, Any]] = []
    authenticated_document_count = 0
    authenticated_field_counts: Counter[str] = Counter()
    requires_manual_review = 0

    for drift in structural_manifest:
        document_id = str(drift["documentId"])
        per_locale: dict[str, Any] = {}
        authenticated_fields: list[str] = []
        review_fields: list[str] = []
        for locale, context_key in (("el", "web"), ("ru", "rus")):
            current_page = current_by_doc_locale.get((document_id, locale))
            logical_page = logical_by_doc_locale.get((document_id, locale))
            source_resource = None
            for resource_id, mapped_document_id in (checkpoint.get("pages") or {}).get(context_key, {}).items():
                if mapped_document_id == document_id:
                    resource = resources_by_id.get(int(resource_id))
                    if resource and context_to_locale(str(resource.get("context_key") or "")) == locale:
                        source_resource = resource
                        break
            source_template_id = template_to_strapi(source_resource.get("template") if source_resource else None)
            source_parent_document_id = None
            if source_resource:
                source_parent_id = source_resource.get("parent")
                if source_parent_id not in (None, 0, "0"):
                    source_parent_document_id = (checkpoint.get("pages") or {}).get(context_key, {}).get(str(source_parent_id))
            expected_contract = None
            contract_reason = None
            if logical_page is not None:
                expected_contract, contract_reason = expected_contract_for_current_page(
                    logical_page,
                    current_page,
                    page_blocks.get(logical_page.entity_id, []),
                    field_counts,
                )
            per_locale[locale] = {
                "sourceResourceId": int(source_resource["id"]) if source_resource else None,
                "sourceTemplateId": source_template_id,
                "currentTemplateId": current_page.get("template_id") if current_page else None,
                "sourceParentDocumentId": source_parent_document_id,
                "currentParentDocumentId": current_page.get("parent_document_id") if current_page else None,
                "expectedPageType": expected_contract.get("pageType") if expected_contract else None,
                "currentPageType": current_page.get("page_type") if current_page else None,
                "expectedLayoutVariant": expected_contract.get("layoutVariant") if expected_contract else None,
                "currentLayoutVariant": current_page.get("layout_variant") if current_page else None,
                "classificationIssue": contract_reason,
            }

        for field_name in drift["diffs"]:
            field_is_authenticated = True
            for locale in ("el", "ru"):
                locale_entry = per_locale[locale]
                if field_name == "templateId":
                    matches = locale_entry["sourceTemplateId"] == locale_entry["currentTemplateId"]
                elif field_name == "parentDocumentId":
                    matches = locale_entry["sourceParentDocumentId"] == locale_entry["currentParentDocumentId"]
                elif field_name == "pageType":
                    matches = locale_entry["expectedPageType"] == locale_entry["currentPageType"]
                elif field_name == "layoutVariant":
                    matches = locale_entry["expectedLayoutVariant"] == locale_entry["currentLayoutVariant"]
                else:
                    matches = False
                if not matches:
                    field_is_authenticated = False
                    break
            if field_is_authenticated:
                authenticated_fields.append(field_name)
                authenticated_field_counts[field_name] += 1
            else:
                review_fields.append(field_name)

        fully_authenticated = len(review_fields) == 0
        if fully_authenticated:
            authenticated_document_count += 1
        else:
            requires_manual_review += 1

        source_alignment_documents.append(
            {
                "documentId": document_id,
                "titles": drift["titles"],
                "slugs": drift["slugs"],
                "diffs": drift["diffs"],
                "sourceEvidence": per_locale,
                "sourceAuthenticatedFields": authenticated_fields,
                "reviewFields": review_fields,
                "recommendedAction": (
                    "preserve-localized-structure-and-keep-fields-localized"
                    if fully_authenticated
                    else "manual-review-before-normalizing-localized-structure"
                ),
            }
        )

    dump_json(
        SOURCE_ALIGNMENT_PATH,
        {
            "summary": {
                "documentCount": len(source_alignment_documents),
                "sourceAuthenticatedDocumentCount": authenticated_document_count,
                "manualReviewDocumentCount": requires_manual_review,
                "sourceAuthenticatedFieldCounts": dict(authenticated_field_counts),
                "note": (
                    "This manifest compares current Strapi structure to the original localized source inputs. "
                    "The remaining cross-locale drift is largely source-authentic, so it should stay localized "
                    "instead of being auto-normalized for Next.js."
                ),
            },
            "documents": source_alignment_documents,
        },
    )

    dump_json(
        PARENT_FIX_PLAN_PATH,
        build_parent_fix_plan(resources, checkpoint, current_by_doc_locale),
    )

    batch_a_documents = [item for item in legacy_duplication_manifest if len(item["locales"]) == 1]
    batch_b_documents = [item for item in legacy_duplication_manifest if len(item["locales"]) == 2]

    def batch_payload(name: str, documents: list[dict[str, Any]]) -> dict[str, Any]:
        page_type_counts = Counter(item["pageType"] for item in documents)
        localized_count = sum(len(item["locales"]) for item in documents)
        return {
            "batch": name,
            "summary": {
                "canonicalCount": len(documents),
                "localizedCount": localized_count,
                "pageTypeCounts": dict(page_type_counts),
            },
            "documents": documents,
        }

    dump_json(PAGEBLOCKS_BATCH_A_PATH, batch_payload("batch-a-single-locale", batch_a_documents))
    dump_json(PAGEBLOCKS_BATCH_B_PATH, batch_payload("batch-b-bilingual", batch_b_documents))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
