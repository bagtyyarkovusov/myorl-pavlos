#!/usr/bin/env python3
"""Run a strict MODX-to-Strapi injection readiness check.

This script is the source of truth for migration readiness. It intentionally
prefers `context_key` plus strict Babel validation over URI-based heuristics so
that localization readiness reflects the actual dataset and not path patterns.
"""

from __future__ import annotations

import json
import sqlite3
from collections import Counter
from pathlib import Path

from cms_audit import CHECKPOINT_SOURCE_DIR, MANIFESTS_DIR, MODX_SOURCE_DIR, REPORTS_DIR, ROOT
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
RESOURCES_PATH = MODX_SOURCE_DIR / "published_resources_flat.json"
TRANSFORMED_RESOURCES_PATH = MODX_SOURCE_DIR / "transformed_resources.json"
ASSET_MAP_PATH = CHECKPOINT_SOURCE_DIR / "asset_map.json"
PAGE_SCHEMA_PATH = ROOT / "backend" / "src" / "api" / "page" / "content-types" / "page" / "schema.json"
TAG_SCHEMA_PATH = ROOT / "backend" / "src" / "api" / "tag" / "content-types" / "tag" / "schema.json"
SQLITE_PATH = ROOT / "backend" / ".tmp" / "data.db"

PAIR_FIELD_NAMES = ("pagetitle", "alias", "description", "introtext", "content", "menutitle")
MIGX_FIELD_NAMES = (
    "migxGallery",
    "migxAccordion",
    "migxSocial",
    "migxResources",
    "migxPromoSlider",
    "migxContacts",
    "migxLocation",
    "migxLocation2",
    "migxFaq",
    "migxVideo",
    "migxTabs",
    "migxTabsLink",
    "migxAdvantages",
)
LOSS_CANDIDATE_FIELDS = (
    ("longtitle", "core"),
    ("menutitle", "core"),
    ("metaKeywords", "tv"),
    ("class", "tv"),
    ("migxResources", "tv"),
    ("migxLocation2", "tv"),
    ("AffiliateAddress", "tv"),
    ("AffiliatePhone", "tv"),
    ("AffiliateEmail", "tv"),
    ("AffiliateCoords", "tv"),
    ("migxAdvantages", "tv"),
)


def load_json(path: Path) -> Any:
    """Load JSON from disk and raise a clear error when it is missing."""

    if not path.exists():
        raise FileNotFoundError(f"Required file not found: {path}")

    with path.open("r", encoding="utf-8") as file_handle:
        return json.load(file_handle)


def parse_babel_links(raw_value: Any) -> dict[str, int]:
    """Parse a MODX Babel TV value into a context-to-resource-id mapping."""

    if not raw_value or not isinstance(raw_value, str):
        return {}

    links: dict[str, int] = {}

    for part in raw_value.split(";"):
        if ":" not in part:
            continue

        context_key, resource_id = part.split(":", 1)
        if resource_id.isdigit():
            links[context_key] = int(resource_id)

    return links


def get_tv(resource: dict[str, Any], field_name: str) -> Any:
    """Return a template-variable value from a resource."""

    return (resource.get("template_variables") or {}).get(field_name)


def has_value(value: Any) -> bool:
    """Return True when a value should be treated as present."""

    return value not in (None, "", [], {})


def summarize_inventory(resources: list[dict[str, Any]]) -> dict[str, Any]:
    """Collect top-level inventory counts for the source dataset."""

    context_counts = Counter(resource.get("context_key") for resource in resources)
    non_empty_tvs = Counter()

    for resource in resources:
        for field_name, value in (resource.get("template_variables") or {}).items():
            if has_value(value):
                non_empty_tvs[field_name] += 1

    return {
        "resources": len(resources),
        "contexts": dict(context_counts),
        "non_empty_tvs": len(non_empty_tvs),
    }


def validate_schema_alignment(resources: list[dict[str, Any]], page_schema: dict[str, Any], tag_schema: dict[str, Any]) -> dict[str, Any]:
    """Validate template enums, boolean shapes, and i18n flags."""

    page_attributes = page_schema.get("attributes", {})
    valid_templates = set(page_attributes.get("templateId", {}).get("enum", []))

    invalid_templates: list[int] = []
    invalid_booleans: list[tuple[int, str, Any]] = []

    for resource in resources:
        template_value = resource.get("template")
        if template_value is not None and f"template_{template_value}" not in valid_templates:
            invalid_templates.append(resource["id"])

        for boolean_name in ("isfolder", "hidemenu"):
            boolean_value = resource.get(boolean_name)
            if boolean_value not in (0, 1, None):
                invalid_booleans.append((resource["id"], boolean_name, boolean_value))

    return {
        "page_i18n_enabled": page_schema.get("pluginOptions", {}).get("i18n", {}).get("localized") is True,
        "tag_i18n_enabled": tag_schema.get("pluginOptions", {}).get("i18n", {}).get("localized") is True,
        "invalid_templates": invalid_templates,
        "invalid_booleans": invalid_booleans,
    }


def inspect_runtime_state() -> dict[str, Any]:
    """Inspect live Strapi runtime artifacts that affect migration execution."""

    runtime: dict[str, Any] = {
        "sqlite_present": SQLITE_PATH.exists(),
        "asset_map_present": ASSET_MAP_PATH.exists(),
        "transformed_resources_present": TRANSFORMED_RESOURCES_PATH.exists(),
        "page_rows": None,
        "tag_rows": None,
        "locales": [],
    }

    if runtime["asset_map_present"]:
        runtime["asset_map_entries"] = len(load_json(ASSET_MAP_PATH))
    else:
        runtime["asset_map_entries"] = 0

    if runtime["transformed_resources_present"]:
        runtime["transformed_resource_count"] = len(load_json(TRANSFORMED_RESOURCES_PATH))
    else:
        runtime["transformed_resource_count"] = 0

    if not runtime["sqlite_present"]:
        return runtime

    connection = sqlite3.connect(SQLITE_PATH)

    try:
        cursor = connection.cursor()
        cursor.execute("SELECT COUNT(*) FROM pages")
        runtime["page_rows"] = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM tags")
        runtime["tag_rows"] = cursor.fetchone()[0]

        cursor.execute("SELECT code FROM i18n_locale ORDER BY code")
        runtime["locales"] = cursor.fetchall()
    finally:
        connection.close()

    return runtime


def classify_localization(resources: list[dict[str, Any]]) -> dict[str, Any]:
    """Classify strict Greek/Russian localization readiness."""

    by_id = {resource["id"]: resource for resource in resources}
    strict_pairs: list[tuple[dict[str, Any], dict[str, Any]]] = []
    self_consistent_missing_targets: list[tuple[int, int, str]] = []
    web_without_rus_link: list[tuple[int, str]] = []
    malformed_rows: list[tuple[int, dict[str, int], str]] = []
    linked_rus_ids: set[int] = set()

    for resource in resources:
        if resource.get("context_key") != "web":
            continue

        links = parse_babel_links(get_tv(resource, "babelLanguageLinks"))
        web_id = links.get("web")
        rus_id = links.get("rus")

        if web_id == resource["id"] and rus_id in by_id:
            strict_pairs.append((resource, by_id[rus_id]))
            linked_rus_ids.add(rus_id)
            continue

        if web_id == resource["id"] and rus_id and rus_id not in by_id:
            self_consistent_missing_targets.append((resource["id"], rus_id, resource.get("pagetitle", "")))
            continue

        if web_id == resource["id"] and not rus_id:
            web_without_rus_link.append((resource["id"], resource.get("pagetitle", "")))
            continue

        malformed_rows.append((resource["id"], links, resource.get("pagetitle", "")))

    rus_ids = {resource["id"] for resource in resources if resource.get("context_key") == "rus"}
    strict_orphan_rus = sorted(rus_ids - linked_rus_ids)

    return {
        "strict_pairs": strict_pairs,
        "strict_pair_count": len(strict_pairs),
        "web_without_rus_link": web_without_rus_link,
        "missing_rus_targets": self_consistent_missing_targets,
        "malformed_rows": malformed_rows,
        "strict_orphan_rus": strict_orphan_rus,
    }


def analyze_pair_mismatches(strict_pairs: list[tuple[dict[str, Any], dict[str, Any]]], resources: list[dict[str, Any]]) -> dict[str, Any]:
    """Measure structural drift inside strict Greek/Russian pairs."""

    by_id = {resource["id"]: resource for resource in resources}
    template_mismatches: list[tuple[int, int, int, int, str, str]] = []
    parent_mismatches: list[tuple[int, int, int, int, int]] = []
    tv_key_mismatches = 0
    field_presence_counter: Counter[str] = Counter()
    missing_tv_in_rus: Counter[str] = Counter()
    extra_tv_in_rus: Counter[str] = Counter()

    for greek_resource, russian_resource in strict_pairs:
        if greek_resource.get("template") != russian_resource.get("template"):
            template_mismatches.append(
                (
                    greek_resource["id"],
                    russian_resource["id"],
                    greek_resource.get("template"),
                    russian_resource.get("template"),
                    greek_resource.get("pagetitle", ""),
                    russian_resource.get("pagetitle", ""),
                )
            )

        if greek_resource.get("parent") and russian_resource.get("parent"):
            greek_parent = by_id.get(greek_resource["parent"])
            russian_parent = by_id.get(russian_resource["parent"])

            if greek_parent and russian_parent:
                expected_russian_parent = parse_babel_links(get_tv(greek_parent, "babelLanguageLinks")).get("rus")
                if expected_russian_parent and expected_russian_parent != russian_parent["id"]:
                    parent_mismatches.append(
                        (
                            greek_resource["id"],
                            russian_resource["id"],
                            greek_resource["parent"],
                            russian_resource["parent"],
                            expected_russian_parent,
                        )
                    )

        greek_tvs = set((greek_resource.get("template_variables") or {}).keys()) - {"babelLanguageLinks"}
        russian_tvs = set((russian_resource.get("template_variables") or {}).keys()) - {"babelLanguageLinks"}

        if greek_tvs != russian_tvs:
            tv_key_mismatches += 1
            for tv_name in sorted(greek_tvs - russian_tvs):
                missing_tv_in_rus[tv_name] += 1
            for tv_name in sorted(russian_tvs - greek_tvs):
                extra_tv_in_rus[tv_name] += 1

        for field_name in PAIR_FIELD_NAMES:
            greek_has_value = bool(greek_resource.get(field_name))
            russian_has_value = bool(russian_resource.get(field_name))
            if greek_has_value != russian_has_value:
                field_presence_counter[field_name] += 1

    return {
        "template_mismatches": template_mismatches,
        "parent_mismatches": parent_mismatches,
        "tv_key_mismatch_count": tv_key_mismatches,
        "field_presence_counter": field_presence_counter,
        "missing_tv_in_rus": missing_tv_in_rus,
        "extra_tv_in_rus": extra_tv_in_rus,
    }


def analyze_loss_candidates(resources: list[dict[str, Any]]) -> list[tuple[str, int, int]]:
    """Count source fields that currently have no safe zero-loss destination."""

    results: list[tuple[str, int, int]] = []

    for field_name, field_type in LOSS_CANDIDATE_FIELDS:
        web_count = 0
        rus_count = 0

        for resource in resources:
            value = resource.get(field_name) if field_type == "core" else get_tv(resource, field_name)
            if not has_value(value):
                continue

            if resource.get("context_key") == "web":
                web_count += 1
            elif resource.get("context_key") == "rus":
                rus_count += 1

        results.append((field_name, web_count, rus_count))

    return results


def analyze_migx_parseability(resources: list[dict[str, Any]]) -> dict[str, tuple[int, int]]:
    """Count how many resources contain MIGX payloads that fail plain JSON parsing."""

    results: dict[str, tuple[int, int]] = {}

    for field_name in MIGX_FIELD_NAMES:
        total_resources = 0
        parse_errors = 0

        for resource in resources:
            raw_value = get_tv(resource, field_name)
            if not has_value(raw_value):
                continue

            total_resources += 1
            try:
                json.loads(raw_value)
            except Exception:
                parse_errors += 1

        results[field_name] = (total_resources, parse_errors)

    return results


def print_section(title: str) -> None:
    """Print a consistently formatted section heading."""

    print(f"\n=== {title} ===")


def print_runtime_summary(runtime: dict[str, Any]) -> None:
    """Print the runtime readiness summary."""

    print_section("Runtime")
    print(f"SQLite DB present: {runtime['sqlite_present']}")
    print(f"Asset map present: {runtime['asset_map_present']} ({runtime['asset_map_entries']} entries)")
    print(
        "Transformed resources present: "
        f"{runtime['transformed_resources_present']} ({runtime['transformed_resource_count']} rows)"
    )
    print(f"Current Strapi page rows: {runtime['page_rows']}")
    print(f"Current Strapi tag rows: {runtime['tag_rows']}")
    locale_summary = ", ".join(code for (code,) in runtime["locales"])
    print(f"Configured locales: {locale_summary or 'none'}")


def print_localization_summary(localization: dict[str, Any]) -> None:
    """Print strict localization readiness details."""

    print_section("Strict Localization")
    print(f"Self-consistent Greek/Russian pairs: {localization['strict_pair_count']}")
    print(f"Greek pages with no Russian target in Babel: {len(localization['web_without_rus_link'])}")
    print(f"Greek pages whose Russian target is missing from the dataset: {len(localization['missing_rus_targets'])}")
    print(f"Malformed Greek Babel rows: {len(localization['malformed_rows'])}")
    print(f"Strict orphan Russian pages: {len(localization['strict_orphan_rus'])}")


def print_mismatch_summary(mismatches: dict[str, Any]) -> None:
    """Print pair-level mismatch metrics."""

    print_section("Pair Mismatches")
    print(f"Template mismatches: {len(mismatches['template_mismatches'])}")
    print(f"Parent mismatches: {len(mismatches['parent_mismatches'])}")
    print(f"TV key mismatches: {mismatches['tv_key_mismatch_count']}")
    total_field_mismatch_events = sum(mismatches["field_presence_counter"].values())
    print(f"Field presence mismatch events: {total_field_mismatch_events}")
    print(f"Field presence breakdown: {dict(mismatches['field_presence_counter'])}")
    print(f"Most common TVs missing in Russian: {mismatches['missing_tv_in_rus'].most_common(10)}")
    print(f"Most common TVs only present in Russian: {mismatches['extra_tv_in_rus'].most_common(10)}")


def print_loss_candidates(loss_candidates: list[tuple[str, int, int]]) -> None:
    """Print source fields that still threaten zero-loss import."""

    print_section("Loss Candidates")
    for field_name, web_count, rus_count in loss_candidates:
        print(f"{field_name}: web={web_count}, rus={rus_count}")


def print_migx_summary(migx_summary: dict[str, tuple[int, int]]) -> None:
    """Print MIGX parseability results."""

    print_section("MIGX Parseability")
    for field_name, (resource_count, parse_errors) in migx_summary.items():
        if resource_count == 0:
            continue
        print(f"{field_name}: resources={resource_count}, parse_errors={parse_errors}")


def print_overall_status(localization: dict[str, Any], mismatches: dict[str, Any], loss_candidates: list[tuple[str, int, int]], migx_summary: dict[str, tuple[int, int]]) -> None:
    """Print the overall go/no-go decision."""

    blocking_loss_fields = [field_name for field_name, web_count, rus_count in loss_candidates if web_count or rus_count]
    migx_blockers = [field_name for field_name, (resource_count, parse_errors) in migx_summary.items() if resource_count and parse_errors]

    print_section("Overall Status")
    print("Decision: NO-GO for full localized injection")
    print(f"Blocking localization issues: {len(localization['web_without_rus_link']) + len(localization['missing_rus_targets']) + len(localization['malformed_rows'])}")
    print(f"Blocking template mismatches: {len(mismatches['template_mismatches'])}")
    print(f"Blocking parent mismatches: {len(mismatches['parent_mismatches'])}")
    print(f"Blocking unmapped/loss fields: {blocking_loss_fields}")
    print(f"Blocking MIGX parse failures: {migx_blockers}")


def main() -> None:
    """Execute the readiness audit and print a deterministic report."""

    resources = load_json(RESOURCES_PATH)
    page_schema = load_json(PAGE_SCHEMA_PATH)
    tag_schema = load_json(TAG_SCHEMA_PATH)

    inventory = summarize_inventory(resources)
    schema_alignment = validate_schema_alignment(resources, page_schema, tag_schema)
    runtime = inspect_runtime_state()
    localization = classify_localization(resources)
    mismatches = analyze_pair_mismatches(localization["strict_pairs"], resources)
    loss_candidates = analyze_loss_candidates(resources)
    migx_summary = analyze_migx_parseability(resources)

    print("MODX -> Strapi Full Ready Check")
    print_section("Inventory")
    print(f"Resources: {inventory['resources']}")
    print(f"Contexts: {inventory['contexts']}")
    print(f"Non-empty TVs: {inventory['non_empty_tvs']}")

    print_section("Schema Alignment")
    print(f"Page i18n enabled: {schema_alignment['page_i18n_enabled']}")
    print(f"Tag i18n enabled: {schema_alignment['tag_i18n_enabled']}")
    print(f"Invalid template references: {len(schema_alignment['invalid_templates'])}")
    print(f"Invalid boolean values: {len(schema_alignment['invalid_booleans'])}")

    print_runtime_summary(runtime)
    print_localization_summary(localization)
    print_mismatch_summary(mismatches)
    print_loss_candidates(loss_candidates)
    print_migx_summary(migx_summary)
    print_overall_status(localization, mismatches, loss_candidates, migx_summary)


if __name__ == "__main__":
    main()
