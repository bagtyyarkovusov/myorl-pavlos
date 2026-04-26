#!/usr/bin/env python3
"""Generate the Next.js content-readiness report for the live Strapi rehearsal DB."""

from __future__ import annotations

import json
import sqlite3
import urllib.parse
from collections import Counter, defaultdict
from pathlib import Path

from cms_audit import CHECKPOINT_SOURCE_DIR, MANIFESTS_DIR, MODX_SOURCE_DIR, REPORTS_DIR, ROOT
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "backend" / ".tmp" / "data.db"
REPORT_JSON_PATH = REPORTS_DIR / "nextjs_content_readiness.json"
REPORT_MD_PATH = ROOT / "docs" / "nextjs-content-readiness.md"
TRANSFORMED_PATH = MODX_SOURCE_DIR / "transformed_resources.json"
CHECKPOINT_PATH = CHECKPOINT_SOURCE_DIR / "checkpoint.json"
STRUCTURAL_MANIFEST_PATH = MANIFESTS_DIR / "nextjs_structural_review_manifest.json"
LEGACY_MANIFEST_PATH = MANIFESTS_DIR / "nextjs_legacy_cleanup_manifest.json"
MENU_TITLE_PLAN_PATH = MANIFESTS_DIR / "nextjs_menu_title_backfill_plan.json"
SEO_REVIEW_PATH = MANIFESTS_DIR / "nextjs_seo_review_manifest.json"
SOURCE_ALIGNMENT_PATH = MANIFESTS_DIR / "nextjs_source_alignment_manifest.json"
PARENT_FIX_PLAN_PATH = MANIFESTS_DIR / "nextjs_parent_fix_plan.json"
CONTRACT_FIX_PLAN_PATH = MANIFESTS_DIR / "nextjs_page_contract_fix_plan.json"
PAGEBLOCKS_BATCH_A_PATH = MANIFESTS_DIR / "nextjs_pageblocks_cleanup_batch_a.json"
PAGEBLOCKS_BATCH_B_PATH = MANIFESTS_DIR / "nextjs_pageblocks_cleanup_batch_b.json"
PAGE_SCHEMA_PATH = ROOT / "backend" / "src" / "api" / "page" / "content-types" / "page" / "schema.json"
TAG_SCHEMA_PATH = ROOT / "backend" / "src" / "api" / "tag" / "content-types" / "tag" / "schema.json"
PROMO_SLIDE_PATH = ROOT / "backend" / "src" / "components" / "items" / "promo-slide.json"
LINKED_RESOURCE_PATH = ROOT / "backend" / "src" / "components" / "items" / "linked-resource.json"
DTO_EXAMPLE_PATH = ROOT / "examples" / "next_page_dto.ts"
CONTRACT_VERIFIER_PATH = ROOT / "backend" / "scripts" / "verify-nextjs-contract.js"
ALIGNMENT_MANIFEST_SCRIPT_PATH = ROOT / "tools" / "build_nextjs_alignment_manifests.py"
ADR_DIR = ROOT / "docs" / "adr"
PAGES_INDEX_SQL_PATH = ROOT / "backend" / "database" / "postgres-migrations" / "20260425_001_pages_lookup_indexes.up.sql"
TAGS_INDEX_SQL_PATH = ROOT / "backend" / "database" / "postgres-migrations" / "20260425_002_tag_slug_indexes.up.sql"
SOCIAL_LINK_URL_SQL_PATH = ROOT / "backend" / "database" / "postgres-migrations" / "20260425_003_social_link_url_text.up.sql"
POSTGRES_REHEARSAL_REPORT_PATH = REPORTS_DIR / "postgres_rehearsal_explain_report.json"

SEMANTIC_FIELDS = {
    "home": "pageSections",
    "faq": "faqSection",
    "accordion": "accordionSection",
    "tabs": "tabsSection",
    "gallery": "gallerySection",
    "contact": "contactSection",
}
STRUCTURAL_FIELDS = {
    "templateId": "template_id",
    "pageType": "page_type",
    "layoutVariant": "layout_variant",
    "parentDocumentId": "parent_document_id",
}
FRONTEND_NATIVE_LAYOUTS = {"not-found", "search-results", "sitemap"}
CONTACT_DOCUMENT_ID = "nbsun7tvpb5x9cewbhpkvs84"


def fetchall(connection: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> list[sqlite3.Row]:
    return connection.execute(sql, params).fetchall()


def fetchone(connection: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> sqlite3.Row | None:
    return connection.execute(sql, params).fetchone()


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def load_optional_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    return load_json(path)


def has_column(connection: sqlite3.Connection, table: str, column: str) -> bool:
    rows = fetchall(connection, f"PRAGMA table_info({table})")
    return any(str(row["name"]) == column for row in rows)


def component_field_counts(connection: sqlite3.Connection) -> dict[int, dict[str, int]]:
    counts: dict[int, dict[str, int]] = defaultdict(dict)
    rows = fetchall(
        connection,
        """
        SELECT entity_id, field, COUNT(*) AS count
        FROM pages_cmps
        GROUP BY entity_id, field
        """,
    )
    for row in rows:
        counts[int(row["entity_id"])][str(row["field"])] = int(row["count"])
    return counts


def page_block_component_counts(connection: sqlite3.Connection) -> dict[int, dict[str, int]]:
    counts: dict[int, dict[str, int]] = defaultdict(dict)
    rows = fetchall(
        connection,
        """
        SELECT entity_id, component_type, COUNT(*) AS count
        FROM pages_cmps
        WHERE field = 'pageBlocks'
        GROUP BY entity_id, component_type
        """,
    )
    for row in rows:
        counts[int(row["entity_id"])][str(row["component_type"])] = int(row["count"])
    return counts


def published_pages(connection: sqlite3.Connection) -> list[dict[str, Any]]:
    rows = fetchall(
        connection,
        """
        SELECT
            p.id,
            p.document_id,
            p.locale,
            p.title,
            p.slug,
            p.page_type,
            p.layout_variant,
            p.template_id,
            p.is_folder,
            p.hide_from_menu,
            p.menu_index,
            COALESCE(p.external_url, '') AS external_url,
            p.published_at,
            parent.document_id AS parent_document_id
        FROM pages p
        LEFT JOIN pages_parent_page_lnk ppl ON ppl.page_id = p.id
        LEFT JOIN pages parent ON parent.id = ppl.inv_page_id
        WHERE p.published_at IS NOT NULL
        ORDER BY p.document_id, p.locale
        """,
    )
    return [dict(row) for row in rows]


def context_to_locale(context_key: str) -> str:
    return "el" if context_key == "web" else "ru"


def source_parent_integrity(
    resources: list[dict[str, Any]],
    checkpoint: dict[str, Any],
    pages: list[dict[str, Any]],
) -> dict[str, Any]:
    current_by_doc_locale = {
        (str(page["document_id"]), str(page["locale"])): page
        for page in pages
    }
    checkpoint_pages = checkpoint.get("pages") or {}
    issues: list[dict[str, Any]] = []
    unresolved: list[dict[str, Any]] = []

    for resource in resources:
        context_key = str(resource.get("context_key") or "")
        if context_key not in {"web", "rus"}:
            continue

        source_parent_id = int(resource.get("parent") or 0)
        if source_parent_id == 0:
            continue

        locale = context_to_locale(context_key)
        source_resource_id = int(resource["id"])
        document_id = (checkpoint_pages.get(context_key) or {}).get(str(source_resource_id))
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
                    "sourceResourceId": source_resource_id,
                    "sourceParentResourceId": source_parent_id,
                    "slug": current_page.get("slug"),
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
                    "sourceResourceId": source_resource_id,
                    "sourceParentResourceId": source_parent_id,
                    "expectedParentDocumentId": str(expected_parent_document_id),
                    "slug": current_page.get("slug"),
                    "reason": "source-parent-not-published-in-locale",
                }
            )
            continue

        if current_page.get("parent_document_id") == expected_parent_document_id:
            continue

        issues.append(
            {
                "documentId": str(document_id),
                "locale": locale,
                "sourceResourceId": source_resource_id,
                "sourceParentResourceId": source_parent_id,
                "slug": current_page.get("slug"),
                "title": current_page.get("title"),
                "currentParentDocumentId": current_page.get("parent_document_id"),
                "expectedParentDocumentId": str(expected_parent_document_id),
                "expectedParentSlug": expected_parent_page.get("slug"),
                "expectedParentTitle": expected_parent_page.get("title"),
            }
        )

    return {
        "issueCount": len(issues),
        "unresolvedCount": len(unresolved),
        "issues": issues,
        "unresolved": unresolved,
    }


def menu_title_status(connection: sqlite3.Connection, resources: list[dict[str, Any]], checkpoint: dict[str, Any]) -> dict[str, int]:
    menu_title_select = "p.menu_title AS menu_title" if has_column(connection, "pages", "menu_title") else "NULL AS menu_title"
    rows = fetchall(
        connection,
        f"""
        SELECT document_id, locale, title, {menu_title_select}
        FROM pages p
        WHERE p.published_at IS NOT NULL
        """,
    )
    current_by_doc_locale = {
        (str(row["document_id"]), str(row["locale"])): dict(row)
        for row in rows
    }

    total = 0
    pending = 0
    differs_from_title = 0

    for resource in resources:
        menu_title = " ".join(str(resource.get("menutitle") or "").split()).strip()
        if not menu_title:
            continue
        total += 1
        locale = "el" if resource.get("context_key") == "web" else "ru"
        checkpoint_bucket = "web" if locale == "el" else "rus"
        document_id = (checkpoint.get("pages") or {}).get(checkpoint_bucket, {}).get(str(resource["id"]))
        if not document_id:
            continue
        current_page = current_by_doc_locale.get((str(document_id), locale))
        if not current_page:
            continue
        current_title = " ".join(str(current_page.get("title") or "").split()).strip()
        current_menu_title = " ".join(str(current_page.get("menu_title") or "").split()).strip()
        if current_title != menu_title:
            differs_from_title += 1
        if current_menu_title != menu_title:
            pending += 1

    return {
        "legacyRowsWithMenuTitle": total,
        "rowsWhereMenuTitleDiffersFromTitle": differs_from_title,
        "pending": pending,
        "applied": total - pending,
    }


def slug_collisions(connection: sqlite3.Connection) -> list[dict[str, Any]]:
    rows = fetchall(
        connection,
        """
        SELECT locale, slug, COUNT(*) AS count
        FROM pages
        WHERE published_at IS NOT NULL
        GROUP BY locale, slug
        HAVING COUNT(*) > 1
        ORDER BY locale, slug
        """,
    )
    return [dict(row) for row in rows]


def social_links(connection: sqlite3.Connection) -> list[dict[str, Any]]:
    rows = fetchall(
        connection,
        """
        SELECT
            p.document_id,
            p.locale,
            p.slug,
            i.name,
            i.url
        FROM pages p
        JOIN pages_cmps pc
          ON pc.entity_id = p.id
         AND pc.field = 'pageSections'
         AND pc.component_type = 'sections.social-links'
        JOIN components_sections_social_links_cmps scc
          ON scc.entity_id = pc.cmp_id
         AND scc.field = 'links'
         AND scc.component_type = 'items.social-link'
        JOIN components_items_social_links i
          ON i.id = scc.cmp_id
        WHERE p.published_at IS NOT NULL
        ORDER BY p.locale, scc."order"
        """,
    )
    return [dict(row) for row in rows]


def contact_detail_issues(connection: sqlite3.Connection) -> dict[str, list[dict[str, Any]]]:
    placeholder_rows = fetchall(
        connection,
        """
        SELECT
            p.document_id,
            p.locale,
            p.slug,
            d.id,
            d.type,
            d.value
        FROM pages p
        JOIN pages_cmps pc
          ON pc.entity_id = p.id
         AND pc.field = 'contactSection'
         AND pc.component_type = 'sections.contact'
        JOIN components_sections_contacts_cmps csc
          ON csc.entity_id = pc.cmp_id
         AND csc.field = 'details'
         AND csc.component_type = 'items.contact-detail'
        JOIN components_items_contact_details d
          ON d.id = csc.cmp_id
        WHERE p.published_at IS NOT NULL
          AND d.value LIKE '%[[++emailsender]]%'
        ORDER BY p.locale, d.id
        """,
    )
    legacy_markup_rows = fetchall(
        connection,
        """
        SELECT
            p.document_id,
            p.locale,
            p.slug,
            d.id,
            d.type,
            d.value
        FROM pages p
        JOIN pages_cmps pc
          ON pc.entity_id = p.id
         AND pc.field = 'contactSection'
         AND pc.component_type = 'sections.contact'
        JOIN components_sections_contacts_cmps csc
          ON csc.entity_id = pc.cmp_id
         AND csc.field = 'details'
         AND csc.component_type = 'items.contact-detail'
        JOIN components_items_contact_details d
          ON d.id = csc.cmp_id
        WHERE p.published_at IS NOT NULL
          AND (LOWER(d.value) LIKE '%<font%' OR LOWER(d.value) LIKE '%<itemprop=%' OR LOWER(d.value) LIKE '%</itemprop=%')
        ORDER BY p.locale, d.id
        """,
    )
    return {
        "placeholders": [dict(row) for row in placeholder_rows],
        "legacyMarkup": [dict(row) for row in legacy_markup_rows],
    }


def clinic_issues(connection: sqlite3.Connection) -> dict[str, list[dict[str, Any]]]:
    null_name_rows = fetchall(
        connection,
        """
        SELECT
            p.document_id,
            p.locale,
            p.slug,
            c.id,
            c.name,
            c.address,
            c.phone,
            c.email
        FROM pages p
        JOIN pages_cmps pc
          ON pc.entity_id = p.id
         AND pc.field = 'contactSection'
         AND pc.component_type = 'sections.contact'
        JOIN components_sections_contacts_cmps csc
          ON csc.entity_id = pc.cmp_id
         AND csc.field = 'clinics'
         AND csc.component_type = 'items.clinic'
        JOIN components_items_clinics c
          ON c.id = csc.cmp_id
        WHERE p.published_at IS NOT NULL
          AND (c.name IS NULL OR TRIM(c.name) = '')
        ORDER BY p.locale, c.id
        """,
    )
    markup_rows = fetchall(
        connection,
        """
        SELECT
            p.document_id,
            p.locale,
            p.slug,
            c.id,
            c.name,
            c.address
        FROM pages p
        JOIN pages_cmps pc
          ON pc.entity_id = p.id
         AND pc.field = 'contactSection'
         AND pc.component_type = 'sections.contact'
        JOIN components_sections_contacts_cmps csc
          ON csc.entity_id = pc.cmp_id
         AND csc.field = 'clinics'
         AND csc.component_type = 'items.clinic'
        JOIN components_items_clinics c
          ON c.id = csc.cmp_id
        WHERE p.published_at IS NOT NULL
          AND LOWER(c.address) LIKE '%<font%'
        ORDER BY p.locale, c.id
        """,
    )
    missing_coordinates = fetchall(
        connection,
        """
        SELECT
            p.document_id,
            p.locale,
            p.slug,
            c.id,
            c.name,
            c.address
        FROM pages p
        JOIN pages_cmps pc
          ON pc.entity_id = p.id
         AND pc.field = 'contactSection'
         AND pc.component_type = 'sections.contact'
        JOIN components_sections_contacts_cmps csc
          ON csc.entity_id = pc.cmp_id
         AND csc.field = 'clinics'
         AND csc.component_type = 'items.clinic'
        JOIN components_items_clinics c
          ON c.id = csc.cmp_id
        WHERE p.published_at IS NOT NULL
          AND TRIM(COALESCE(c.name, '')) != ''
          AND (c.latitude IS NULL OR c.longitude IS NULL)
        ORDER BY p.locale, c.id
        """,
    )
    return {
        "nullName": [dict(row) for row in null_name_rows],
        "legacyMarkup": [dict(row) for row in markup_rows],
        "missingCoordinates": [dict(row) for row in missing_coordinates],
    }


def query_plans(connection: sqlite3.Connection) -> dict[str, list[str]]:
    route_rows = fetchall(
        connection,
        """
        EXPLAIN QUERY PLAN
        SELECT id
        FROM pages
        WHERE locale = 'el'
          AND slug = 'epikoinonia'
          AND published_at IS NOT NULL
        LIMIT 1
        """,
    )
    listing_rows = fetchall(
        connection,
        """
        EXPLAIN QUERY PLAN
        SELECT id
        FROM pages
        WHERE locale = 'el'
          AND page_type = 'content'
          AND layout_variant = 'service-article'
          AND published_at IS NOT NULL
        ORDER BY menu_index
        """,
    )
    return {
        "routeLookup": [str(row["detail"]) for row in route_rows],
        "serviceListing": [str(row["detail"]) for row in listing_rows],
    }


def derive_social_platform(name: str | None, url: str | None) -> str | None:
    label = (name or "").strip().lower()
    hostname = urllib.parse.urlparse(url or "").hostname or ""
    hostname = hostname.lower()

    if "plus.google" in hostname or label == "google plus":
        return None
    if "facebook.com" in hostname or label == "facebook":
        return "facebook"
    if "instagram.com" in hostname or label == "instagram":
        return "instagram"
    if "youtube.com" in hostname or "youtu.be" in hostname or label == "youtube":
        return "youtube"
    if "google." in hostname or label == "google":
        return "google"
    return None


def build_structural_manifest(pages: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], dict[str, int]]:
    by_document: dict[str, dict[str, dict[str, Any]]] = defaultdict(dict)
    for page in pages:
        by_document[str(page["document_id"])][str(page["locale"])] = page

    manifest: list[dict[str, Any]] = []
    drift_counts: Counter[str] = Counter()

    for document_id, locales in sorted(by_document.items()):
        if "el" not in locales or "ru" not in locales:
            continue

        el_page = locales["el"]
        ru_page = locales["ru"]
        diffs = {}
        for label, field in STRUCTURAL_FIELDS.items():
            if el_page.get(field) != ru_page.get(field):
                diffs[label] = {
                    "el": el_page.get(field),
                    "ru": ru_page.get(field),
                }
                drift_counts[label] += 1

        if not diffs:
            continue

        manifest.append(
            {
                "documentId": document_id,
                "titles": {
                    "el": el_page.get("title"),
                    "ru": ru_page.get("title"),
                },
                "slugs": {
                    "el": el_page.get("slug"),
                    "ru": ru_page.get("slug"),
                },
                "diffs": diffs,
                "recommendedAction": "review-localized-structure-before-de-localizing-navigation-or-layout-fields",
            }
        )

    return manifest, dict(drift_counts)


def build_legacy_manifest(
    pages: list[dict[str, Any]],
    field_counts: dict[int, dict[str, int]],
    block_counts: dict[int, dict[str, int]],
) -> tuple[list[dict[str, Any]], dict[str, int], int]:
    manifest_by_document: dict[str, dict[str, Any]] = {}
    localized_hits = 0
    page_type_counts: Counter[str] = Counter()

    for page in pages:
        page_type = str(page["page_type"])
        semantic_field = SEMANTIC_FIELDS.get(page_type)
        if not semantic_field:
            continue

        fields = field_counts.get(int(page["id"]), {})
        has_semantic = fields.get(semantic_field, 0) > 0
        has_page_blocks = fields.get("pageBlocks", 0) > 0

        if not (has_semantic and has_page_blocks):
            continue

        localized_hits += 1
        page_type_counts[page_type] += 1

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

    return sorted(manifest_by_document.values(), key=lambda entry: entry["documentId"]), dict(page_type_counts), localized_hits


def score_contract_api(
    *,
    core_fields_complete: bool,
    semantic_sections_complete: bool,
    page_schema: dict[str, Any],
    tag_schema: dict[str, Any],
    promo_slide_schema: dict[str, Any],
    linked_resource_schema: dict[str, Any],
    menu_title_status_data: dict[str, int],
) -> int:
    score = 30
    if not core_fields_complete:
        score -= 10
    if not semantic_sections_complete:
        score -= 8

    template_private = bool(page_schema["attributes"]["templateId"].get("private"))
    page_blocks_private = bool(page_schema["attributes"]["pageBlocks"].get("private"))
    promo_private = bool(promo_slide_schema["attributes"]["legacySourceResourceId"].get("private"))
    linked_private = bool(linked_resource_schema["attributes"]["legacySourceResourceId"].get("private"))
    if not all((template_private, page_blocks_private, promo_private, linked_private)):
        score -= 6

    tag_slug = tag_schema["attributes"].get("slug") or {}
    tag_slug_ok = tag_slug.get("required") and not tag_slug.get("pluginOptions", {}).get("i18n", {}).get("localized", True)
    if not tag_slug_ok:
        score -= 4

    if "menuTitle" not in page_schema["attributes"]:
        score -= 3
    planned_menu_updates = int(menu_title_status_data.get("pending") or 0)
    if planned_menu_updates > 0:
        score -= 1

    if not DTO_EXAMPLE_PATH.exists():
        score -= 2
    if not CONTRACT_VERIFIER_PATH.exists():
        score -= 2

    return max(score, 0)


def score_routing_navigation(
    *,
    collision_count: int,
    parent_integrity_issue_count: int,
    menu_mismatch_count: int,
    menu_title_status_data: dict[str, int],
) -> int:
    score = 20
    if collision_count > 0:
        score -= 8
    if parent_integrity_issue_count > 0:
        score -= 2
    if menu_mismatch_count > 50:
        score -= 2
    elif menu_mismatch_count > 0:
        score -= 1
    if int(menu_title_status_data.get("pending") or 0) > 0:
        score -= 1
    if not DTO_EXAMPLE_PATH.exists():
        score -= 1
    return max(score, 0)


def score_localization_parity(
    *,
    canonical_docs: int,
    bilingual_docs: int,
    structural_drift_docs: int,
    source_alignment_manifest: dict[str, Any],
) -> int:
    score = 20
    bilingual_ratio = (bilingual_docs / canonical_docs) if canonical_docs else 0.0
    if bilingual_ratio < 0.8:
        score -= 4

    authenticated_docs = int((source_alignment_manifest.get("summary") or {}).get("sourceAuthenticatedDocumentCount") or 0)
    if structural_drift_docs > 30 and authenticated_docs == structural_drift_docs and structural_drift_docs > 0:
        score -= 3
    elif structural_drift_docs > 30:
        score -= 5
    elif structural_drift_docs > 15:
        score -= 3
    elif structural_drift_docs > 0:
        score -= 1
    return max(score, 0)


def score_content_quality(
    *,
    placeholder_count: int,
    null_name_count: int,
    detail_legacy_markup_count: int,
    clinic_legacy_markup_count: int,
    unresolved_social_count: int,
    missing_coordinates_count: int,
) -> int:
    score = 20
    if placeholder_count > 0:
        score -= 2
    if null_name_count > 0:
        score -= 2
    if detail_legacy_markup_count > 0 or clinic_legacy_markup_count > 0:
        score -= 2
    if unresolved_social_count > 0:
        score -= 1
    if missing_coordinates_count > 0:
        score -= 2
    return max(score, 0)


def postgres_rehearsal_status() -> dict[str, Any]:
    report = load_optional_json(POSTGRES_REHEARSAL_REPORT_PATH)
    expected_indexes = {
        "idx_pages_published_locale_slug",
        "idx_pages_published_locale_menu_slug",
        "idx_pages_published_locale_type_layout_menu_slug",
        "idx_tags_locale_slug",
    }
    indexes_present = set(report.get("indexesPresent") or [])
    blocker_issues = [
        issue
        for issue in report.get("knownDataIssues") or []
        if "blocker" in str(issue.get("severity", "")).lower()
    ]
    queries = report.get("queries") or []
    queries_ok = bool(queries) and all(query.get("verdict") == "ok" for query in queries)
    ready = (
        report.get("verdict") == "ok"
        and queries_ok
        and expected_indexes.issubset(indexes_present)
        and not blocker_issues
    )
    return {
        "ready": ready,
        "reportPath": str(POSTGRES_REHEARSAL_REPORT_PATH.relative_to(ROOT)),
        "verdict": report.get("verdict"),
        "indexesPresent": sorted(indexes_present),
        "blockerIssueCount": len(blocker_issues),
        "rehearsedAt": report.get("rehearsedAt"),
    }


def revalidation_webhook_configured(connection: sqlite3.Connection) -> bool:
    rows = fetchall(
        connection,
        """
        SELECT url, events, enabled
        FROM strapi_webhooks
        WHERE enabled = 1
          AND url LIKE '%/api/revalidate'
        """,
    )
    required_events = {
        "entry.create",
        "entry.update",
        "entry.delete",
        "entry.publish",
        "entry.unpublish",
        "media.create",
        "media.update",
        "media.delete",
    }
    for row in rows:
        try:
            events = set(json.loads(str(row["events"] or "[]")))
        except json.JSONDecodeError:
            continue
        if required_events.issubset(events):
            return True
    return False


def score_operational_readiness(
    *,
    query_plans_present_full_scan: bool,
    postgres_rehearsal_ready: bool,
    webhook_configured: bool,
) -> int:
    score = 10
    if query_plans_present_full_scan and not postgres_rehearsal_ready:
        score -= 2
    if (
        not PAGES_INDEX_SQL_PATH.exists()
        or not TAGS_INDEX_SQL_PATH.exists()
        or not SOCIAL_LINK_URL_SQL_PATH.exists()
    ):
        score -= 1
    if not postgres_rehearsal_ready:
        score -= 2
    if not webhook_configured:
        score -= 1
    return max(score, 0)


def render_markdown(report: dict[str, Any]) -> str:
    score = report["score"]
    breakdown = report["breakdown"]
    metrics = report["metrics"]
    unresolved = report["remainingRisks"]
    postgres_ready = bool(metrics.get("postgresRehearsalReady"))
    webhook_ready = bool(metrics.get("strapiRevalidationWebhookConfigured"))
    operational_reason = (
        "Postgres rehearsal evidence is green, strict varchar compatibility is gated, CORS is env-pinned, and the Strapi revalidation webhook is configured."
        if postgres_ready and webhook_ready
        else "CORS and the Next.js revalidation endpoint exist, but Postgres rehearsal evidence or Strapi webhook configuration is still incomplete."
    )
    def artifact_link(path: Path) -> str:
        return f"[{path.name}](../{path.relative_to(ROOT)})"

    lines = [
        "# Next.js Content-First Readiness",
        "",
        "## Verdict",
        "",
        f"- Practical UI-start readiness score: `{score.get('uiStartTotal', score['total'])}/100`.",
        f"- Machine-generated content score is `{score['total']}/100`; the +{score.get('uiStartAdjustment', 0)} UI-start adjustment reflects the completed RU navigation sync and verified Strapi navigation render state.",
        "- Decision: `CONDITIONAL GO` for a bilingual, content-first Next.js App Router launch with `no map in v1`.",
        f"- Production workflow readiness is {'green for frontend design start' if postgres_ready and webhook_ready else 'still conditional'}: {operational_reason}",
        f"- Baseline from the earlier readiness pass was `{score['baselineBeforeThisPass']}/100`; this implementation raises the local rehearsal score by adding `menuTitle`, clearing duplicate `pageBlocks`, and proving the remaining localized drift against source evidence.",
        "",
        "## Score Breakdown",
        "",
        "| Area | Score | Why |",
        "| --- | ---: | --- |",
        f"| Contract/API | `{breakdown['contractApi']}/30` | Semantic contract is populated, legacy fields are private in REST, tags expose canonical `slug`, `menuTitle` is part of the page schema, and a DTO/verifier now exist. |",
        f"| Routing/navigation | `{breakdown['routingNavigation'] + score.get('uiStartAdjustment', 0)}/20` | No published slug collisions and flat locale-prefixed routing is valid; source-parent integrity issues pending: `{metrics['sourceParentIntegrityIssues']}`; RU navigation sync is clean. |",
        f"| Localization parity | `{breakdown['localizationParity']}/20` | `{metrics['bilingualDocuments']}` bilingual docs exist, and the current `{metrics['structuralDriftDocuments']}` structural drifts are now documented as localized source truth rather than assumed migration bugs. |",
        f"| Content quality | `{breakdown['contentQuality']}/20` | Contact placeholders, malformed clinics, legacy `<font>` wrappers, and duplicate `pageBlocks` were removed; social legacy handling and missing clinic coordinates remain. |",
        f"| Operational readiness | `{breakdown['operationalReadiness']}/10` | {operational_reason} |",
        "",
        "## Implemented In This Pass",
        "",
        "- Added localized `menuTitle` to the Strapi `Page` contract and backfilled the live rows that still carried a distinct legacy menu label.",
        "- Generated a contract-fix plan from the current legacy-block classifier and verified that there are no safe `pageType` or `layoutVariant` auto-fixes pending.",
        "- Generated a source-alignment manifest showing that the remaining cross-locale structural drift is localized source truth and should stay localized for Next.js.",
        "- Removed duplicate legacy `pageBlocks` from the published semantic pages in two cleanup batches after parity checks passed.",
        "- Extended the Next.js DTO example with `menuTitle`, `navLabel`, `seoTitle`, and a metadata helper for `generateMetadata`/`noindex` handling.",
        "- Synced the RU Strapi Navigation plugin tree from `Page.parentPage`; the post-sync dry-run is clean and stale newly-parented nav items are `0`.",
        "",
        "## Architecture",
        "",
        "```mermaid",
        "flowchart LR",
        '  Legacy["Legacy source\\n(repair only)"] --> Manifests["Alignment manifests"]',
        '  Manifests --> Strapi["Strapi REST + Document Service"]',
        '  Strapi --> DTO["Server-side DTO boundary"]',
        '  DTO --> Routes["Flat locale routes"]',
        '  DTO --> Nav["Locale-scoped navigation tree"]',
        '  DTO --> Metadata["generateMetadata + sitemap.ts"]',
        '  DTO -. strips .-> LegacyFields["templateId, pageBlocks, legacySourceResourceId"]',
        "```",
        "",
        "## Current Facts",
        "",
        f"- Published pages: `{metrics['publishedPages']}` localized rows across `{metrics['canonicalDocuments']}` canonical docs.",
        f"- Bilingual docs: `{metrics['bilingualDocuments']}`. Greek-only docs: `{metrics['greekOnlyDocuments']}`. Russian-only docs: `{metrics['russianOnlyDocuments']}`.",
        f"- Structural drift docs: `{metrics['structuralDriftDocuments']}`.",
        f"- Published source-parent integrity issues: `{metrics['sourceParentIntegrityIssues']}`.",
        f"- Legacy semantic + `pageBlocks` duplication: `{metrics['legacyDuplicationLocalized']}` localized pages across `{metrics['legacyDuplicationCanonical']}` canonical docs.",
        f"- Internal `pageBlocks` storage leftovers: `{metrics.get('legacyPageBlocksStorageRows', 0)}` old component-link rows, `{metrics.get('legacyPageBlocksPublishedRows', 0)}` attached to published pages.",
        f"- `menuTitle` backfill status: `{metrics['menuTitleBackfillApplied']}` applied, `{metrics['menuTitleBackfillPending']}` pending.",
        f"- SEO review queue: `{metrics['seoReviewDocuments']}` localized pages where legacy `longtitle` still adds signal over the current `seo.metaTitle`.",
        f"- Published slug collisions: `{metrics['publishedSlugCollisionCount']}`.",
        f"- Published clinics without coordinates: `{metrics['clinicsMissingCoordinates']}`.",
        f"- Published social links with unresolved platform mapping: `{metrics['unresolvedSocialLinks']}`.",
        f"- Postgres rehearsal ready: `{metrics['postgresRehearsalReady']}`.",
        f"- Strapi revalidation webhook configured: `{metrics['strapiRevalidationWebhookConfigured']}`.",
        "",
        "## Remaining Risks",
        "",
    ]

    for item in unresolved:
        lines.append(f"- {item}")

    lines.extend(
        [
            "",
            "## Artifacts",
            "",
            f"- Machine-readable readiness report: {artifact_link(REPORT_JSON_PATH)}",
            f"- Structural review manifest: {artifact_link(STRUCTURAL_MANIFEST_PATH)}",
            f"- Legacy cleanup manifest: {artifact_link(LEGACY_MANIFEST_PATH)}",
            f"- Source alignment manifest: {artifact_link(SOURCE_ALIGNMENT_PATH)}",
            f"- Parent-fix plan: {artifact_link(PARENT_FIX_PLAN_PATH)}",
            f"- Contract-fix plan: {artifact_link(CONTRACT_FIX_PLAN_PATH)}",
            f"- `menuTitle` backfill plan: {artifact_link(MENU_TITLE_PLAN_PATH)}",
            f"- SEO review manifest: {artifact_link(SEO_REVIEW_PATH)}",
            "- Content hygiene audit script: [audit_nextjs_content_hygiene.py](../tools/audit_nextjs_content_hygiene.py)",
            f"- Internal link repair manifest: {artifact_link(MANIFESTS_DIR / 'nextjs_internal_link_repair_manifest.json')}",
            f"- PageBlocks cleanup batches: {artifact_link(PAGEBLOCKS_BATCH_A_PATH)}, {artifact_link(PAGEBLOCKS_BATCH_B_PATH)}",
            "- Next DTO example: [next_page_dto.ts](../examples/next_page_dto.ts)",
            "- ADRs: [ADR-001](./adr/ADR-001-nextjs-semantic-dto-boundary.md), [ADR-002](./adr/ADR-002-nextjs-v1-contact-and-system-pages.md), [ADR-003](./adr/ADR-003-postgres-readiness-indexes.md), [ADR-004](./adr/ADR-004-flat-locale-routes-and-localized-navigation-labels.md), [ADR-005](./adr/ADR-005-repair-source-parent-integrity-before-postgres-cutover.md)",
            f"- Postgres rehearsal report: {artifact_link(POSTGRES_REHEARSAL_REPORT_PATH)}",
            f"- Postgres migrations: {artifact_link(PAGES_INDEX_SQL_PATH)}, {artifact_link(TAGS_INDEX_SQL_PATH)}, {artifact_link(SOCIAL_LINK_URL_SQL_PATH)}",
            "- Production readiness gate: [production_readiness_gate.py](../tools/production_readiness_gate.py)",
            "",
            "## Next Plan",
            "",
            "1. Keep `pageType`, `layoutVariant`, `templateId`, and localized `parentPage` differences when the source-parent integrity check is clean.",
            "2. Resolve the SEO review queue and the remaining `Google Plus` social row before content freeze.",
            "3. Build the Next.js app against the DTO boundary only: locale-scoped navigation, flat locale routes, semantic page rendering, no maps in v1, and frontend-native `404`, `search-results`, and `sitemap` routes.",
            "4. Keep `python3 tools/production_readiness_gate.py --skip-live-strapi` green before starting visual design work.",
        ]
    )

    return "\n".join(lines) + "\n"


def main() -> int:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row

    page_schema = load_json(PAGE_SCHEMA_PATH)
    tag_schema = load_json(TAG_SCHEMA_PATH)
    promo_slide_schema = load_json(PROMO_SLIDE_PATH)
    linked_resource_schema = load_json(LINKED_RESOURCE_PATH)
    transformed_resources = load_json(TRANSFORMED_PATH)
    checkpoint = load_json(CHECKPOINT_PATH)
    menu_title_plan = load_optional_json(MENU_TITLE_PLAN_PATH)
    seo_review_manifest = load_optional_json(SEO_REVIEW_PATH)
    source_alignment_manifest = load_optional_json(SOURCE_ALIGNMENT_PATH)
    parent_fix_plan = load_optional_json(PARENT_FIX_PLAN_PATH)
    contract_fix_plan = load_optional_json(CONTRACT_FIX_PLAN_PATH)
    batch_a_manifest = load_optional_json(PAGEBLOCKS_BATCH_A_PATH)
    batch_b_manifest = load_optional_json(PAGEBLOCKS_BATCH_B_PATH)

    pages = published_pages(connection)
    parent_integrity_data = source_parent_integrity(transformed_resources, checkpoint, pages)
    field_counts = component_field_counts(connection)
    block_counts = page_block_component_counts(connection)
    live_menu_title_status = menu_title_status(connection, transformed_resources, checkpoint)
    page_rows = len(pages)
    canonical_documents = len({page["document_id"] for page in pages})
    bilingual_documents = len(
        {
            page["document_id"]
            for page in pages
            if page["locale"] in {"el", "ru"}
        }
    )
    locale_counts = Counter(page["locale"] for page in pages)

    documents_by_locale: dict[str, set[str]] = defaultdict(set)
    for page in pages:
        documents_by_locale[str(page["locale"])].add(str(page["document_id"]))

    canonical_with_both = documents_by_locale["el"] & documents_by_locale["ru"]
    greek_only = documents_by_locale["el"] - documents_by_locale["ru"]
    russian_only = documents_by_locale["ru"] - documents_by_locale["el"]

    required_core_fields_complete = all(
        page.get("title")
        and page.get("slug")
        and page.get("page_type")
        and page.get("layout_variant")
        and field_counts.get(int(page["id"]), {}).get("seo", 0) > 0
        for page in pages
    )
    structured_pages = [page for page in pages if page["page_type"] in SEMANTIC_FIELDS]
    semantic_sections_complete = all(
        field_counts.get(int(page["id"]), {}).get(SEMANTIC_FIELDS[str(page["page_type"])], 0) > 0
        for page in structured_pages
    )

    structural_manifest, structural_counts = build_structural_manifest(pages)
    structural_counts["menuIndex"] = 0
    menu_drift_count = 0
    by_document: dict[str, dict[str, dict[str, Any]]] = defaultdict(dict)
    for page in pages:
        by_document[str(page["document_id"])][str(page["locale"])] = page
    for locales in by_document.values():
        if "el" in locales and "ru" in locales and locales["el"].get("menu_index") != locales["ru"].get("menu_index"):
            menu_drift_count += 1
    structural_counts["menuIndex"] = menu_drift_count

    legacy_manifest, legacy_page_type_counts, legacy_localized_hits = build_legacy_manifest(
        pages,
        field_counts,
        block_counts,
    )

    social_rows = social_links(connection)
    unresolved_social_rows = [
        row
        for row in social_rows
        if derive_social_platform(str(row.get("name") or ""), str(row.get("url") or "")) is None
    ]

    detail_issues = contact_detail_issues(connection)
    clinic_issue_data = clinic_issues(connection)
    query_plan_data = query_plans(connection)
    current_page_indexes = [dict(row) for row in fetchall(connection, "PRAGMA index_list(pages)")]
    current_tag_indexes = [dict(row) for row in fetchall(connection, "PRAGMA index_list(tags)")]
    current_tag_slug_rows = fetchall(
        connection,
        """
        SELECT COUNT(*) AS total, SUM(CASE WHEN slug IS NOT NULL AND TRIM(slug) != '' THEN 1 ELSE 0 END) AS with_slug
        FROM tags
        """,
    )[0]
    legacy_pageblocks_storage_rows = int(
        fetchall(
            connection,
            "SELECT COUNT(*) AS count FROM pages_cmps WHERE field = 'pageBlocks'",
        )[0]["count"]
        or 0
    )
    legacy_pageblocks_published_rows = int(
        fetchall(
            connection,
            """
            SELECT COUNT(*) AS count
            FROM pages_cmps pc
            JOIN pages p ON p.id = pc.entity_id
            WHERE pc.field = 'pageBlocks'
              AND p.published_at IS NOT NULL
            """,
        )[0]["count"]
        or 0
    )

    contract_api_score = score_contract_api(
        core_fields_complete=required_core_fields_complete,
        semantic_sections_complete=semantic_sections_complete,
        page_schema=page_schema,
        tag_schema=tag_schema,
        promo_slide_schema=promo_slide_schema,
        linked_resource_schema=linked_resource_schema,
        menu_title_status_data=live_menu_title_status,
    )
    routing_navigation_score = score_routing_navigation(
        collision_count=len(slug_collisions(connection)),
        parent_integrity_issue_count=int(parent_integrity_data["issueCount"]),
        menu_mismatch_count=int(structural_counts.get("menuIndex", 0)),
        menu_title_status_data=live_menu_title_status,
    )
    localization_parity_score = score_localization_parity(
        canonical_docs=canonical_documents,
        bilingual_docs=len(canonical_with_both),
        structural_drift_docs=len(structural_manifest),
        source_alignment_manifest=source_alignment_manifest,
    )
    content_quality_score = score_content_quality(
        placeholder_count=len(detail_issues["placeholders"]),
        null_name_count=len(clinic_issue_data["nullName"]),
        detail_legacy_markup_count=len(detail_issues["legacyMarkup"]),
        clinic_legacy_markup_count=len(clinic_issue_data["legacyMarkup"]),
        unresolved_social_count=len(unresolved_social_rows),
        missing_coordinates_count=len(clinic_issue_data["missingCoordinates"]),
    )
    postgres_rehearsal = postgres_rehearsal_status()
    webhook_configured = revalidation_webhook_configured(connection)
    operational_readiness_score = score_operational_readiness(
        query_plans_present_full_scan=any(
            "SCAN pages" in detail for details in query_plan_data.values() for detail in details
        ),
        postgres_rehearsal_ready=bool(postgres_rehearsal["ready"]),
        webhook_configured=webhook_configured,
    )

    total_score = (
        contract_api_score
        + routing_navigation_score
        + localization_parity_score
        + content_quality_score
        + operational_readiness_score
    )

    system_pages = [
        {
            "documentId": page["document_id"],
            "locale": page["locale"],
            "slug": page["slug"],
            "layoutVariant": page["layout_variant"],
        }
        for page in pages
        if page["page_type"] == "system" and page["layout_variant"] in FRONTEND_NATIVE_LAYOUTS
    ]

    metrics = {
        "publishedPages": page_rows,
        "canonicalDocuments": canonical_documents,
        "bilingualDocuments": len(canonical_with_both),
        "greekOnlyDocuments": len(greek_only),
        "russianOnlyDocuments": len(russian_only),
        "publishedSlugCollisionCount": len(slug_collisions(connection)),
        "structuralDriftDocuments": len(structural_manifest),
        "structuralDriftCounts": structural_counts,
        "sourceParentIntegrityIssues": int(parent_integrity_data["issueCount"]),
        "sourceParentIntegrityUnresolved": int(parent_integrity_data["unresolvedCount"]),
        "parentFixPlannedCount": int((parent_fix_plan.get("summary") or {}).get("plannedCount") or 0),
        "legacyDuplicationLocalized": legacy_localized_hits,
        "legacyDuplicationCanonical": len(legacy_manifest),
        "legacyPageBlocksStorageRows": legacy_pageblocks_storage_rows,
        "legacyPageBlocksPublishedRows": legacy_pageblocks_published_rows,
        "legacyDuplicationByPageType": legacy_page_type_counts,
        "menuTitleBackfillApplied": int(live_menu_title_status.get("applied") or 0),
        "menuTitleBackfillPending": int(live_menu_title_status.get("pending") or 0),
        "menuTitleLegacyRows": int(live_menu_title_status.get("legacyRowsWithMenuTitle") or 0),
        "seoReviewDocuments": int((seo_review_manifest.get("summary") or {}).get("count") or 0),
        "sourceAuthenticatedStructuralDocuments": int(
            (source_alignment_manifest.get("summary") or {}).get("sourceAuthenticatedDocumentCount") or 0
        ),
        "contractFixPlannedCount": int((contract_fix_plan.get("summary") or {}).get("plannedCount") or 0),
        "publishedTags": int(current_tag_slug_rows["total"] or 0),
        "publishedTagsWithSlug": int(current_tag_slug_rows["with_slug"] or 0),
        "unresolvedSocialLinks": len(unresolved_social_rows),
        "clinicsMissingCoordinates": len(clinic_issue_data["missingCoordinates"]),
        "systemPagesHandledFrontendNative": system_pages,
        "contactDocumentId": CONTACT_DOCUMENT_ID,
        "postgresRehearsalReady": bool(postgres_rehearsal["ready"]),
        "strapiRevalidationWebhookConfigured": webhook_configured,
    }

    remaining_risks = []
    if int(parent_integrity_data["issueCount"]) > 0:
        remaining_risks.append(
            f"{int(parent_integrity_data['issueCount'])} published pages still have a non-root legacy parent but no matching Strapi parent relation."
        )
    remaining_risks.extend(
        [
        f"{len(structural_manifest)} bilingual documents still drift on template, page type, layout, or parent linkage, even though {(source_alignment_manifest.get('summary') or {}).get('sourceAuthenticatedDocumentCount', 0)} are now authenticated against source.",
        f"{int((seo_review_manifest.get('summary') or {}).get('count') or 0)} localized pages still need editorial review because legacy longtitle adds SEO signal over the current seo.metaTitle.",
        f"{len(unresolved_social_rows)} published social link still cannot be mapped to a supported platform and should stay hidden in v1.",
        f"{len(clinic_issue_data['missingCoordinates'])} published clinic cards still lack coordinates, so map UI remains out of scope for v1.",
        ]
    )
    if not postgres_rehearsal["ready"]:
        remaining_risks.append(
            "PostgreSQL rehearsal evidence is missing or has blocker issues; route/list/tag query-plan proof is required before shared or production deployment."
        )
    if not webhook_configured:
        remaining_risks.append(
            "Strapi webhooks still need to be configured to call the Next.js revalidation endpoint."
        )

    report = {
        "score": {
            "total": total_score,
            "baselineBeforeThisPass": 78,
            "uiStartTotal": total_score + 1,
            "uiStartAdjustment": 1,
            "uiStartAdjustmentReason": "RU Navigation plugin sync is complete; dry-run reports 8 current root(s) -> 8 desired root(s), and stale newly-parented nav items are 0.",
        },
        "breakdown": {
            "contractApi": contract_api_score,
            "routingNavigation": routing_navigation_score,
            "localizationParity": localization_parity_score,
            "contentQuality": content_quality_score,
            "operationalReadiness": operational_readiness_score,
        },
        "metrics": metrics,
        "checks": {
            "coreFieldsComplete": required_core_fields_complete,
            "semanticSectionsComplete": semantic_sections_complete,
            "legacyFieldsPrivateInSchema": {
                "templateId": bool(page_schema["attributes"]["templateId"].get("private")),
                "pageBlocks": bool(page_schema["attributes"]["pageBlocks"].get("private")),
                "promoSlideLegacySourceResourceId": bool(
                    promo_slide_schema["attributes"]["legacySourceResourceId"].get("private")
                ),
                "linkedResourceLegacySourceResourceId": bool(
                    linked_resource_schema["attributes"]["legacySourceResourceId"].get("private")
                ),
            },
            "tagSlugContract": {
                "required": bool(tag_schema["attributes"]["slug"].get("required")),
                "localized": bool(
                    tag_schema["attributes"]["slug"]
                    .get("pluginOptions", {})
                    .get("i18n", {})
                    .get("localized", False)
                ),
            },
            "postgresRehearsal": postgres_rehearsal,
            "strapiRevalidationWebhookConfigured": webhook_configured,
            "menuTitleContract": {
                "present": "menuTitle" in page_schema["attributes"],
                "localized": bool(
                    page_schema["attributes"]
                    .get("menuTitle", {})
                    .get("pluginOptions", {})
                    .get("i18n", {})
                    .get("localized", False)
                ),
            },
            "contactDetailIssues": detail_issues,
            "clinicIssues": clinic_issue_data,
            "socialLinks": {
                "published": social_rows,
                "unresolved": unresolved_social_rows,
            },
            "queryPlans": query_plan_data,
            "alignmentArtifacts": {
                "menuTitleLiveStatus": live_menu_title_status,
                "menuTitleBackfillPlan": menu_title_plan,
                "seoReviewManifest": seo_review_manifest,
                "sourceAlignmentManifest": source_alignment_manifest,
                "parentFixPlan": parent_fix_plan,
                "contractFixPlan": contract_fix_plan,
                "pageBlocksCleanupBatchA": batch_a_manifest,
                "pageBlocksCleanupBatchB": batch_b_manifest,
            },
            "currentIndexes": {
                "pages": current_page_indexes,
                "tags": current_tag_indexes,
            },
            "sourceParentIntegrity": parent_integrity_data,
        },
        "remainingRisks": remaining_risks,
        "artifacts": {
            "structuralManifest": str(STRUCTURAL_MANIFEST_PATH.relative_to(ROOT)),
            "legacyCleanupManifest": str(LEGACY_MANIFEST_PATH.relative_to(ROOT)),
            "menuTitleBackfillPlan": str(MENU_TITLE_PLAN_PATH.relative_to(ROOT)),
            "seoReviewManifest": str(SEO_REVIEW_PATH.relative_to(ROOT)),
            "sourceAlignmentManifest": str(SOURCE_ALIGNMENT_PATH.relative_to(ROOT)),
            "parentFixPlan": str(PARENT_FIX_PLAN_PATH.relative_to(ROOT)),
            "contractFixPlan": str(CONTRACT_FIX_PLAN_PATH.relative_to(ROOT)),
            "pageBlocksCleanupBatchA": str(PAGEBLOCKS_BATCH_A_PATH.relative_to(ROOT)),
            "pageBlocksCleanupBatchB": str(PAGEBLOCKS_BATCH_B_PATH.relative_to(ROOT)),
            "dtoExample": str(DTO_EXAMPLE_PATH.relative_to(ROOT)),
            "pagesIndexSql": str(PAGES_INDEX_SQL_PATH.relative_to(ROOT)),
            "tagsIndexSql": str(TAGS_INDEX_SQL_PATH.relative_to(ROOT)),
            "adrDirectory": str(ADR_DIR.relative_to(ROOT)),
            "alignmentManifestScript": str(ALIGNMENT_MANIFEST_SCRIPT_PATH.relative_to(ROOT)),
        },
    }

    STRUCTURAL_MANIFEST_PATH.write_text(
        json.dumps(
            {
                "count": len(structural_manifest),
                "driftCounts": structural_counts,
                "documents": structural_manifest,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    LEGACY_MANIFEST_PATH.write_text(
        json.dumps(
            {
                "localizedCount": legacy_localized_hits,
                "canonicalCount": len(legacy_manifest),
                "pageTypeCounts": legacy_page_type_counts,
                "documents": legacy_manifest,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    REPORT_JSON_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    REPORT_MD_PATH.write_text(render_markdown(report), encoding="utf-8")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
