#!/usr/bin/env python3
"""Plan and optionally apply Strapi-owned canonical homepage sections.

Dry-run is the default:
  python3 tools/homepage_backfill.py

Apply reviewed changes:
  python3 tools/homepage_backfill.py --apply
"""

from __future__ import annotations

import argparse
import json
import sys
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from tools.strapi_client import StrapiClient
MODX_FLAT_PATH = ROOT / "data/source/modx/published_resources_flat.json"
DEFAULT_PLAN_PATH = ROOT / "artifacts/reports/homepage_backfill_plan.json"

CONTEXT_TO_LOCALE = {"web": "el", "rus": "ru"}
LOCALES = ("el", "ru")

SECTION_SPECS = {
    "hero": "sections.home-hero",
    "testimonials": "sections.home-testimonials-teaser",
    "notice": "sections.home-notice",
}

FALLBACK_TESTIMONIALS = {
    "el": {
        "heading": "Τι γράφουν στο Google Maps",
        "intro": "Σύντομα αποσπάσματα από δημόσιες κριτικές· πηγή: Google Maps.",
    },
    "ru": {
        "heading": "Отзывы в Google Maps",
        "intro": "Короткие цитаты из публичных отзывов; источник: Google Maps.",
    },
}


def build_homepage_backfill_plan(
    sources: list[dict[str, Any]],
    current_pages: list[dict[str, Any]],
    *,
    approved_overwrites: set[tuple[str, str, str]] | None = None,
) -> dict[str, Any]:
    approved_overwrites = approved_overwrites or set()
    source_by_locale = {source["locale"]: source for source in sources}
    updates: list[dict[str, Any]] = []
    conflicts: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    created_count = 0
    updated_count = 0

    for page in current_pages:
        locale = page.get("locale")
        source = source_by_locale.get(locale)
        if not source:
            skipped.append({"locale": locale, "reason": "source-not-found"})
            continue

        sections = deepcopy(page.get("pageSections") or [])
        if not isinstance(sections, list):
            sections = []

        for source_key, component in SECTION_SPECS.items():
            source_section = source.get(source_key) or {}
            if not source_section:
                continue

            existing = find_section(sections, component)
            if existing is None:
                sections.append(build_section(component, source_section))
                created_count += 1
                continue

            updated = False
            for field, source_value in build_section_fields(component, source_section).items():
                if is_blank(source_value):
                    continue
                current_value = existing.get(field)
                if is_blank(current_value):
                    existing[field] = source_value
                    updated = True
                    continue
                if normalize(current_value) == normalize(source_value):
                    continue
                if (locale, component, field) in approved_overwrites:
                    existing[field] = source_value
                    updated = True
                    continue
                conflicts.append(
                    {
                        "locale": locale,
                        "documentId": page.get("documentId"),
                        "component": component,
                        "field": field,
                        "current": current_value,
                        "source": source_value,
                    }
                )
            if updated:
                updated_count += 1

        updates.append(
            {
                "documentId": page.get("documentId"),
                "locale": locale,
                "payload": {"pageSections": sections},
            }
        )

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "pageCount": len(current_pages),
            "createdCount": created_count,
            "updatedCount": updated_count,
            "conflictCount": len(conflicts),
            "skippedCount": len(skipped),
        },
        "updates": updates,
        "conflicts": conflicts,
        "skipped": skipped,
    }


def build_section(component: str, source: dict[str, Any]) -> dict[str, Any]:
    return {"__component": component, **build_section_fields(component, source)}


def build_section_fields(component: str, source: dict[str, Any]) -> dict[str, Any]:
    if component == "sections.home-hero":
        return {
            "kicker": source.get("kicker"),
            "heading": source.get("heading"),
            "intro": source.get("intro"),
            "media": source.get("media"),
            "ctaLabel": source.get("ctaLabel"),
            "ctaUrl": source.get("ctaUrl"),
        }
    return {
        "heading": source.get("heading"),
        "intro": source.get("intro"),
    }


def find_section(sections: list[dict[str, Any]], component: str) -> dict[str, Any] | None:
    for section in sections:
        if isinstance(section, dict) and section.get("__component") == component:
            return section
    return None


def is_blank(value: Any) -> bool:
    return value is None or (isinstance(value, str) and value.strip() == "")


def normalize(value: Any) -> str:
    return str(value).strip()


def load_home_sources(path: Path = MODX_FLAT_PATH) -> list[dict[str, Any]]:
    resources = json.loads(path.read_text(encoding="utf-8"))
    sources: list[dict[str, Any]] = []
    for resource in resources:
        if not isinstance(resource, dict):
            continue
        locale = CONTEXT_TO_LOCALE.get(str(resource.get("context_key")))
        if locale not in LOCALES or resource.get("alias") != "index":
            continue
        tvs = resource.get("template_variables") or {}
        hero_intro = (resource.get("introtext") or "").strip()
        notice_intro = (tvs.get("infoBlockBottom") or hero_intro or "").strip()
        sources.append(
            {
                "locale": locale,
                "hero": {
                    "kicker": tvs.get("articleAuthor") or None,
                    "heading": (resource.get("longtitle") or resource.get("description") or "").strip(),
                    "intro": hero_intro,
                    "media": tvs.get("imageVideo") or None,
                    "ctaLabel": None,
                    "ctaUrl": f"/{locale}/rantevou" if locale == "el" else f"/{locale}/zapis",
                },
                "testimonials": FALLBACK_TESTIMONIALS[locale],
                "notice": {
                    "heading": None,
                    "intro": notice_intro,
                },
            }
        )
    return sources


def fetch_current_home_pages(client: StrapiClient) -> list[dict[str, Any]]:
    pages: list[dict[str, Any]] = []
    for locale in LOCALES:
        response = client.get(
            "/api/pages",
            **{
                "locale": locale,
                "filters[slug][$eq]": "index",
                "populate[pageSections][populate]": "*",
            },
        )
        data = response.get("data") or []
        if data:
            pages.append(data[0])
    return pages


def apply_plan(client: StrapiClient, plan: dict[str, Any]) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for update in plan.get("updates", []):
        document_id = update["documentId"]
        locale = update["locale"]
        result = client.put(
            f"/api/pages/{document_id}",
            {"data": update["payload"]},
            locale=locale,
        )
        results.append({"documentId": document_id, "locale": locale, "result": result})
    return results


def parse_overwrite(value: str) -> tuple[str, str, str]:
    locale, component, field = value.split(":", 2)
    return locale, component, field


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", type=Path, default=DEFAULT_PLAN_PATH)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument(
        "--approve-overwrite",
        action="append",
        default=[],
        help="Approve one conflict as locale:component:field",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    client = StrapiClient(dry_run=not args.apply)
    sources = load_home_sources()
    pages = fetch_current_home_pages(client)
    approved = {parse_overwrite(value) for value in args.approve_overwrite}
    plan = build_homepage_backfill_plan(sources, pages, approved_overwrites=approved)

    args.plan.parent.mkdir(parents=True, exist_ok=True)
    args.plan.write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote plan: {args.plan}")

    if args.apply:
        results = apply_plan(client, plan)
        result_path = args.plan.with_suffix(".apply-results.json")
        result_path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Wrote apply results: {result_path}")


if __name__ == "__main__":
    main()
