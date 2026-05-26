#!/usr/bin/env python3
"""Strip MODX-era HTML residues from all Strapi text sources (pages + components).

Dry-run writes ``tools/data/manual-repairs/legacy-html-patterns-plan.json`` and
the two markdown reports.  ``--apply`` pushes the plan through the Strapi
Documents API inside the ``myorl-strapi-dev`` container.

Usage:
  PYTHONPATH=tools python tools/strip_legacy_html_patterns.py
  PYTHONPATH=tools python tools/strip_legacy_html_patterns.py --apply
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_TOOLS_DIR = Path(__file__).resolve().parent
if str(_TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(_TOOLS_DIR))

from cms_html_cleanup import (  # noqa: E402
    flag_deprecated_semantic_tags,
    flag_essential_style_attrs,
    flag_mixed_semantic_presentational,
    normalize_legacy_modx_markup,
)

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PLAN_PATH = ROOT / "tools/data/manual-repairs/legacy-html-patterns-plan.json"
DEFAULT_RESULT_PATH = ROOT / "tools/data/manual-repairs/legacy-html-patterns-result.json"
STRAPI_PLAN_PATH = ROOT / "backend/.tmp/legacy-html-patterns-plan.json"
STRAPI_RESULT_PATH = ROOT / "backend/.tmp/legacy-html-patterns-result.json"
REPORT_APPLIED_PATH = ROOT / "artifacts/reports/legacy-html-strip-result.md"
REPORT_MANUAL_PATH = ROOT / "artifacts/reports/legacy-html-residue-manual-review.md"
POSTGRES_CONTAINER = "myorl-pg"

PAGE_TEXT_FIELDS: tuple[tuple[str, str], ...] = (
    ("content", "content"),
    ("excerpt", "excerpt"),
    ("info_block_bottom", "infoBlockBottom"),
    ("sources", "sources"),
)

COMPONENT_TABLES: dict[str, tuple[str, ...]] = {
    "components_items_accordion_items": ("content",),
    "components_items_faq_items": ("answer",),
    "components_items_tab_items": ("content", "link"),
    "components_items_contact_details": ("value",),
    "components_items_clinics": ("address", "phone", "email"),
    "components_items_linked_resources": ("description", "target_url"),
    "components_items_promo_slides": ("description", "target_url"),
    "components_sections_accordions": ("intro",),
    "components_sections_faqs": ("intro",),
    "components_sections_galleries": ("intro",),
    "components_sections_tabs": ("intro",),
    "components_sections_contacts": ("intro",),
    "components_sections_linked_resources": ("intro",),
}


def psql_json(query: str) -> Any:
    raw = subprocess.check_output(
        [
            "docker", "exec", POSTGRES_CONTAINER, "psql",
            "-U", "strapi", "-d", "strapi", "-At", "-c", query,
        ],
        text=True,
    ).strip()
    if not raw:
        return []
    return json.loads(raw)


def fetch_pages() -> list[dict[str, Any]]:
    return psql_json(
        """
        SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
        FROM (
          SELECT document_id, locale, slug,
                 (published_at IS NOT NULL) AS has_published,
                 content, excerpt, info_block_bottom, sources
          FROM pages
          WHERE published_at IS NOT NULL
          ORDER BY locale, slug
        ) t;
        """
    )


def fetch_components() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for table, fields in COMPONENT_TABLES.items():
        col_list = ", ".join(fields)
        result = psql_json(
            f"""
            SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
            FROM (SELECT id, {col_list} FROM {table}) t;
            """
        )
        for row in result:
            row["_table"] = table
            rows.append(row)
    return rows


def _normalize_field(raw: str | None) -> tuple[str | None, dict[str, int]]:
    if not raw or not isinstance(raw, str):
        return raw, {}
    cleaned, stats = normalize_legacy_modx_markup(raw)
    if cleaned == raw:
        return raw, {}
    return cleaned, stats


def _collect_manual_review_flags(
    raw: str,
    source_id: str,
    field_name: str,
    manual_review: dict[str, list[dict[str, Any]]],
    manual_source_ids: set[str],
) -> None:
    field_id = f"{source_id}/{field_name}"

    for finding in flag_deprecated_semantic_tags(raw):
        if field_id not in manual_source_ids:
            manual_review["deprecatedSemanticTags"].append({
                "source": source_id, "field": field_name,
                "tag": finding["tag"], "reason": finding["reason"],
                "textPreview": finding["textPreview"],
            })
            manual_source_ids.add(field_id)

    for finding in flag_essential_style_attrs(raw):
        manual_review["essentialStyleAttrs"].append({
            "source": source_id, "field": field_name,
            "tag": finding["tag"], "style": finding["style"],
            "textPreview": finding["textPreview"],
        })

    for finding in flag_mixed_semantic_presentational(raw):
        manual_review["mixedSemanticPresentational"].append({
            "source": source_id, "field": field_name,
            "tag": finding["tag"], "reason": finding["reason"],
            "children": finding.get("children", ""),
            "textPreview": finding["textPreview"],
        })


def build_plan() -> dict[str, Any]:
    pages = fetch_pages()
    components = fetch_components()

    planned_updates: list[dict[str, Any]] = []
    skipped: list[dict[str, str]] = []
    manual_review: dict[str, list[dict[str, Any]]] = {
        "deprecatedSemanticTags": [],
        "essentialStyleAttrs": [],
        "mixedSemanticPresentational": [],
    }
    manual_source_ids: set[str] = set()

    # --- Pages ---
    for page in pages:
        page_changes: dict[str, str] = {}
        page_stats: dict[str, int] = {}
        source_id = f"page:{page['locale']}:{page['slug']}:{page['document_id']}"

        for db_field, api_field in PAGE_TEXT_FIELDS:
            raw = page.get(db_field)
            cleaned, stats = _normalize_field(raw)
            if stats:
                page_changes[api_field] = cleaned
                for k, v in stats.items():
                    page_stats[k] = page_stats.get(k, 0) + v

            if not raw or not isinstance(raw, str):
                continue
            _collect_manual_review_flags(
                raw, source_id, db_field, manual_review, manual_source_ids,
            )

        if page_changes:
            planned_updates.append({
                "documentId": page["document_id"],
                "locale": page["locale"],
                "slug": page["slug"],
                "hasPublished": bool(page.get("has_published")),
                "repairKind": "legacy-html-patterns",
                "itemCount": sum(page_stats.values()) or len(page_changes),
                "stats": page_stats,
                "changedFields": sorted(page_changes.keys()),
                "payload": page_changes,
            })
        else:
            skipped.append({
                "documentId": page["document_id"],
                "locale": page["locale"],
                "slug": page["slug"],
            })

    # --- Components (flag only; no apply for components via this pipeline) ---
    component_sources = 0
    for comp in components:
        table = comp.get("_table", "?")
        for field in COMPONENT_TABLES.get(table, ()):
            raw = comp.get(field)
            if not raw or not isinstance(raw, str):
                continue
            component_sources += 1
            source_id = f"component:{table}:{comp.get('id', '?')}"
            _collect_manual_review_flags(
                raw, source_id, field, manual_review, manual_source_ids,
            )

    total_sources = len(pages) + component_sources

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "totalSources": total_sources,
            "pageCount": len(pages),
            "componentSourceCount": component_sources,
            "plannedCount": len(planned_updates),
            "skippedCount": len(skipped),
            "transformTotal": sum(entry["itemCount"] for entry in planned_updates),
            "manualReviewFlags": {
                "deprecatedSemanticTags": len(manual_review["deprecatedSemanticTags"]),
                "essentialStyleAttrs": len(manual_review["essentialStyleAttrs"]),
                "mixedSemanticPresentational": len(manual_review["mixedSemanticPresentational"]),
            },
        },
        "plannedUpdates": planned_updates,
        "skipped": skipped,
        "manualReview": manual_review,
        "errors": [],
    }


def write_markdown_reports(plan: dict[str, Any]) -> None:
    summary = plan["summary"]
    updates = plan["plannedUpdates"]
    manual = plan["manualReview"]

    REPORT_APPLIED_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_MANUAL_PATH.parent.mkdir(parents=True, exist_ok=True)

    # --- Applied changes report ---
    applied_lines = [
        "# Legacy HTML Strip Result",
        "",
        f"Generated: {plan['generatedAt']}",
        "",
        "## Summary",
        "",
        f"- **Total sources scanned**: {summary['totalSources']}",
        f"- **Pages**: {summary['pageCount']}",
        f"- **Component text sources**: {summary['componentSourceCount']}",
        f"- **Pages with changes**: {summary['plannedCount']}",
        f"- **Pages skipped (clean)**: {summary['skippedCount']}",
        f"- **Total transforms applied**: {summary['transformTotal']}",
        "",
        "## Changes per page",
        "",
    ]

    if updates:
        for entry in updates:
            stats_preview = ", ".join(
                f"{k}={v}" for k, v in sorted(entry.get("stats", {}).items())
            )
            applied_lines.append(
                f"- **{entry['locale']}/{entry['slug']}** "
                f"({entry['itemCount']} change(s) in {', '.join(entry['changedFields'])})"
            )
            if stats_preview:
                applied_lines.append(f"  - Stats: {stats_preview}")
    else:
        applied_lines.append("_No changes needed — all sources are clean._")

    applied_lines.append("")
    REPORT_APPLIED_PATH.write_text("\n".join(applied_lines) + "\n", encoding="utf-8")

    # --- Manual review report ---
    manual_lines = [
        "# Legacy HTML Residue — Manual Review",
        "",
        f"Generated: {plan['generatedAt']}",
        "",
        "These patterns were flagged but NOT auto-stripped. They require editorial review.",
        "",
        "## Summary",
        "",
        f"- **Deprecated semantic tags**: {summary['manualReviewFlags']['deprecatedSemanticTags']}",
        f"- **Essential style attrs (table cells)**: {summary['manualReviewFlags']['essentialStyleAttrs']}",
        f"- **Mixed semantic + presentational**: {summary['manualReviewFlags']['mixedSemanticPresentational']}",
        "",
    ]

    for section, title in (
        ("deprecatedSemanticTags", "## Deprecated Semantic Tags"),
        ("essentialStyleAttrs", "## Essential Style Attributes"),
        ("mixedSemanticPresentational", "## Mixed Semantic + Presentational Markup"),
    ):
        items = manual.get(section, [])
        manual_lines.append(title)
        manual_lines.append("")
        if items:
            for item in items:
                if section == "essentialStyleAttrs":
                    extra = f" — `{item['style'][:120]}`"
                elif section == "mixedSemanticPresentational":
                    extra = f" — children: {item.get('children', '')}"
                else:
                    extra = ""
                manual_lines.append(
                    f"- **{item['source']}/{item['field']}**: "
                    f"`<{item['tag']}>{extra}` — {item['textPreview'][:120]}"
                )
        else:
            manual_lines.append("_None._")
        manual_lines.append("")

    REPORT_MANUAL_PATH.write_text("\n".join(manual_lines) + "\n", encoding="utf-8")


def apply_plan(plan_path: Path, result_path: Path) -> None:
    STRAPI_PLAN_PATH.parent.mkdir(parents=True, exist_ok=True)
    STRAPI_PLAN_PATH.write_text(plan_path.read_text(encoding="utf-8"), encoding="utf-8")

    subprocess.run(
        [
            "docker", "exec", "myorl-strapi-dev", "node",
            "scripts/apply-accordion-repair-plan.js",
            "--plan", ".tmp/legacy-html-patterns-plan.json",
            "--result", ".tmp/legacy-html-patterns-result.json",
        ],
        cwd=ROOT / "backend",
        check=True,
    )

    if STRAPI_RESULT_PATH.exists():
        result_path.parent.mkdir(parents=True, exist_ok=True)
        result_path.write_text(
            STRAPI_RESULT_PATH.read_text(encoding="utf-8"), encoding="utf-8"
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", type=Path, default=DEFAULT_PLAN_PATH)
    parser.add_argument("--result", type=Path, default=DEFAULT_RESULT_PATH)
    parser.add_argument("--apply", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    print("Scanning all Strapi text sources (pages + components)...")
    plan = build_plan()
    summary = plan["summary"]

    args.plan.parent.mkdir(parents=True, exist_ok=True)
    args.plan.write_text(
        json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print(
        f"Plan written to {args.plan}: "
        f"{summary['plannedCount']} pages, "
        f"{summary['transformTotal']} transform(s)."
    )
    for entry in plan["plannedUpdates"][:20]:
        stats_preview = ", ".join(
            f"{k}={v}" for k, v in sorted(entry.get("stats", {}).items())
        )
        print(
            f"  - {entry['locale']}/{entry['slug']}: "
            f"{entry['itemCount']} in {', '.join(entry['changedFields'])}"
            + (f" ({stats_preview})" if stats_preview else "")
        )
    if len(plan["plannedUpdates"]) > 20:
        print(f"  ... and {len(plan['plannedUpdates']) - 20} more")

    print()

    manual_flags = summary["manualReviewFlags"]
    total_flags = sum(manual_flags.values())
    print(f"Manual review flags: {total_flags} ("
          f"{manual_flags['deprecatedSemanticTags']} deprecated tags, "
          f"{manual_flags['essentialStyleAttrs']} essential style attrs, "
          f"{manual_flags['mixedSemanticPresentational']} mixed markup)")

    write_markdown_reports(plan)
    print(f"\nReports written to:")
    print(f"  {REPORT_APPLIED_PATH}")
    print(f"  {REPORT_MANUAL_PATH}")

    if args.apply:
        if summary["plannedCount"] == 0:
            print("\nNothing to apply.")
            return 0
        apply_plan(args.plan, args.result)
        print(f"Apply result written to {args.result}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
