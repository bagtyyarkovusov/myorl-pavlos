#!/usr/bin/env python3
"""Migrate article `sections.linked-resources` blocks into `relatedPages`.

Dry-run by default. Only touches published pages whose layout variant is a
long-form medical article. Home and other layouts are skipped.

Usage:
  python tools/migrate_article_linked_resources_to_related_pages.py
  python tools/migrate_article_linked_resources_to_related_pages.py --apply --locale el
"""

from __future__ import annotations

import argparse
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from strapi_client import StrapiClient, load_strapi_env_from_dotenv

logger = logging.getLogger("migrate_article_linked_resources_to_related_pages")

ROOT = Path(__file__).resolve().parents[1]
RESULT_PATH = ROOT / "tools" / "data" / "manual-repairs" / "article-linked-resources-migration-result.json"

ARTICLE_LAYOUTS = {
    "encyclopedia-article",
    "specialized-article",
    "service-article",
}
LOCALES = ("el", "ru")


def fetch_pages(client: StrapiClient, *, locale: str) -> list[dict[str, Any]]:
    pages: list[dict[str, Any]] = []
    page_num = 1
    while True:
        resp = client.get(
            "/api/pages",
            **{
                "locale": locale,
                "status": "published",
                "pagination[page]": page_num,
                "pagination[pageSize]": 100,
                "fields[0]": "documentId",
                "fields[1]": "slug",
                "fields[2]": "title",
                "fields[3]": "layoutVariant",
                "populate[relatedPages][fields][0]": "documentId",
                "populate[relatedPages][fields][1]": "slug",
                "populate[pageSections][on][sections.linked-resources][populate][items][populate][targetPage][fields][0]": "documentId",
                "populate[pageSections][on][sections.linked-resources][populate][items][populate][targetPage][fields][1]": "slug",
            },
        )
        batch = resp.get("data") or []
        pages.extend(batch)
        pagination = (resp.get("meta") or {}).get("pagination") or {}
        if page_num >= int(pagination.get("pageCount") or 1):
            break
        page_num += 1
    return pages


def linked_resource_targets(page: dict[str, Any]) -> list[str]:
    targets: list[str] = []
    for section in page.get("pageSections") or []:
        if section.get("__component") != "sections.linked-resources":
            continue
        for item in section.get("items") or []:
            target = item.get("targetPage")
            if isinstance(target, dict) and target.get("documentId"):
                targets.append(str(target["documentId"]))
    return targets


def existing_related_ids(page: dict[str, Any]) -> list[str]:
    ids: list[str] = []
    for ref in page.get("relatedPages") or []:
        if isinstance(ref, dict) and ref.get("documentId"):
            ids.append(str(ref["documentId"]))
    return ids


def build_plan(pages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    plan: list[dict[str, Any]] = []
    for page in pages:
        layout = page.get("layoutVariant")
        if layout not in ARTICLE_LAYOUTS:
            continue
        targets = linked_resource_targets(page)
        if not targets:
            continue
        merged = list(dict.fromkeys([*existing_related_ids(page), *targets]))
        plan.append(
            {
                "documentId": page.get("documentId"),
                "slug": page.get("slug"),
                "layoutVariant": layout,
                "linkedResourceTargets": targets,
                "relatedPagesAfter": merged,
            }
        )
    return plan


def apply_plan(client: StrapiClient, plan: list[dict[str, Any]], *, locale: str) -> None:
    for entry in plan:
        document_id = entry["documentId"]
        client.put(
            f"/api/pages/{document_id}",
            {
                "data": {
                    "relatedPages": entry["relatedPagesAfter"],
                    "pageSections": [
                        section
                        for section in (entry.get("pageSectionsBefore") or [])
                        if section.get("__component") != "sections.linked-resources"
                    ],
                }
            },
            locale=locale,
        )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--locale", choices=LOCALES, action="append")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    load_strapi_env_from_dotenv()
    client = StrapiClient()

    locales = tuple(args.locale or LOCALES)
    plan_by_locale: dict[str, list[dict[str, Any]]] = {}

    for locale in locales:
        pages = fetch_pages(client, locale=locale)
        plan = build_plan(pages)
        for entry in plan:
            page = next(p for p in pages if p.get("documentId") == entry["documentId"])
            entry["pageSectionsBefore"] = page.get("pageSections") or []
        plan_by_locale[locale] = plan
        logger.info("%s: %s article page(s) with linked-resources targets", locale, len(plan))

    result = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "apply": args.apply,
        "planByLocale": plan_by_locale,
    }
    RESULT_PATH.parent.mkdir(parents=True, exist_ok=True)
    RESULT_PATH.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    logger.info("Wrote plan to %s", RESULT_PATH)

    if args.apply:
        for locale, plan in plan_by_locale.items():
            apply_plan(client, plan, locale=locale)
            logger.info("Applied %s update(s) for locale %s", len(plan), locale)
    else:
        logger.info("Dry run only; pass --apply to write relatedPages and remove article linked-resources sections")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
