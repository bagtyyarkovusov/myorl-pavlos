#!/usr/bin/env python3
"""Normalize HTML blobs on ``service-article`` pages + optional encyclopedia layout.

Phase **B**: strip NBSP-heavy spacing, optionally split oversized *plain* ``<p>`` blocks,
and optionally promote ``h3`` → ``h2`` after editors confirm typography.

Phase **C**: set ``layoutVariant`` from ``service-article`` → ``encyclopedia-article`` when
the page has **no** ``pageSections`` (empty Dynamic Zone). This changes reader UX (hero
and layout shell); verify in Strapi preview before bulk apply.

Dry-run writes a JSON snapshot to ``tools/data/manual-repairs/service-blob-repair-result.json``
unless ``--quiet-json``.

Requirements: ``STRAPI_URL`` + ``STRAPI_TOKEN`` in env (usually via ``backend/.env``).

Run from repo root with tools on PYTHONPATH::

  PYTHONPATH=tools python3 tools/repair_service_article_blob_pages.py --locale ru \\
    --slug laryngofaringiki-palindromisi \\
    --split-paragraphs-chars 900 --promote-h3-to-h2 \\
    --set-layout encyclopedia-article --apply

  PYTHONPATH=tools python3 tools/repair_service_article_blob_pages.py \\
    --scan-service-empty-sections --locale el --locale ru
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_TOOLS_DIR = Path(__file__).resolve().parent
if str(_TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(_TOOLS_DIR))

from cms_html_cleanup import (  # noqa: E402
    promote_h3_to_h2,
    split_long_paragraphs,
    strip_nbsp_from_html,
)
from strapi_client import StrapiClient, load_strapi_env_from_dotenv  # noqa: E402

logger = logging.getLogger("repair_service_article_blob_pages")

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SLUG_PILOTS = ("laryngofaringiki-palindromisi",)
ALLOWED_LAYOUT_TARGETS = frozenset({"encyclopedia-article"})
SERVICE_LAYOUT = "service-article"
LOCALES_DEFAULT = ("el", "ru")
RESULT_PATH = ROOT / "tools" / "data" / "manual-repairs" / "service-blob-repair-result.json"


@dataclass(frozen=True)
class PageJob:
    locale: str
    slug: str
    document_id: str
    page: dict[str, Any]


def paginate_locale_pages(client: StrapiClient, locale: str) -> list[dict[str, Any]]:
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
                "populate[pageSections]": "true",
            },
        )
        batch = resp.get("data") or []
        pages.extend(batch)
        pagination = (resp.get("meta") or {}).get("pagination") or {}
        if page_num >= int(pagination.get("pageCount") or 1):
            break
        page_num += 1
    return pages


def fetch_document_by_slug(
    client: StrapiClient, *, locale: str, slug: str
) -> dict[str, Any] | None:
    resp = client.get(
        "/api/pages",
        **{
            "locale": locale,
            "status": "published",
            "pagination[page]": 1,
            "pagination[pageSize]": 5,
            "filters[slug][$eq]": slug,
            "populate[pageSections]": "true",
        },
    )
    batch = resp.get("data") or []
    return batch[0] if batch else None


def page_sections_empty(page: dict[str, Any]) -> bool:
    sections = page.get("pageSections")
    if sections is None:
        return True
    return isinstance(sections, list) and len(sections) == 0


def normalize_content(
    raw_html: str,
    *,
    strip_nbsp: bool,
    split_chars: int,
    promote_h3: bool,
) -> tuple[str, dict[str, int]]:
    out = raw_html
    stats: dict[str, int] = {}
    if strip_nbsp:
        out, nb = strip_nbsp_from_html(out)
        stats["nbsp_chars_replaced"] = nb
    if split_chars > 0:
        out, splits = split_long_paragraphs(out, max_chars=split_chars)
        stats["paragraph_splits"] = splits
    if promote_h3:
        out, heads = promote_h3_to_h2(out)
        stats["h3_promoted_to_h2"] = heads
    return out, stats


def layout_promotion_gate(
    page: dict[str, Any], *, new_layout: str
) -> tuple[bool, str]:
    layout = page.get("layoutVariant")
    if layout != SERVICE_LAYOUT:
        return False, f"layoutVariant={layout!r} (need {SERVICE_LAYOUT})"
    if not page_sections_empty(page):
        return False, "pageSections is non-empty"
    if new_layout not in ALLOWED_LAYOUT_TARGETS:
        return False, f"unsupported --set-layout {new_layout!r}"
    return True, ""


def collect_jobs(
    client: StrapiClient,
    *,
    locales: tuple[str, ...],
    slugs: tuple[str, ...],
    scan_service_empty_sections: bool,
) -> tuple[list[PageJob], dict[str, Any]]:
    jobs: list[PageJob] = []
    diagnostics: dict[str, Any] = {"mode": "", "missed": []}

    if scan_service_empty_sections:
        diagnostics["mode"] = "scan_service_empty_sections"
        for locale in locales:
            for page in paginate_locale_pages(client, locale):
                if page.get("layoutVariant") != SERVICE_LAYOUT:
                    continue
                if not page_sections_empty(page):
                    continue
                document_id = str(page["documentId"])
                slug_val = str(page.get("slug") or "")
                jobs.append(PageJob(locale=locale, slug=slug_val, document_id=document_id, page=dict(page)))
        return jobs, diagnostics

    diagnostics["mode"] = "slug_list"
    for locale in locales:
        for slug in slugs:
            page = fetch_document_by_slug(client, locale=locale, slug=slug)
            if page is None:
                diagnostics["missed"].append({"locale": locale, "slug": slug})
                continue
            jobs.append(
                PageJob(
                    locale=locale,
                    slug=str(page.get("slug") or ""),
                    document_id=str(page["documentId"]),
                    page=dict(page),
                ),
            )
    return jobs, diagnostics


def main() -> int:
    parser = argparse.ArgumentParser(description="Repair service-article HTML blobs + optional layout flip.")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--quiet-json", action="store_true")
    parser.add_argument("--locale", choices=LOCALES_DEFAULT, action="append")
    parser.add_argument(
        "--slug",
        action="append",
        metavar="SLUG",
        help="Repeat per slug. Defaults to Ru LPR pilot when slug mode.",
    )
    parser.add_argument(
        "--scan-service-empty-sections",
        action="store_true",
        help="Process every locale page that is service-article with empty pageSections.",
    )
    parser.add_argument(
        "--no-strip-nbsp",
        dest="strip_nbsp",
        action="store_false",
        default=True,
        help="Disable NBSP → space normalization",
    )
    parser.add_argument("--split-paragraphs-chars", type=int, default=900)
    parser.add_argument("--promote-h3-to-h2", action="store_true")
    parser.add_argument(
        "--set-layout",
        metavar="VARIANT",
        help='Use "encyclopedia-article" (requires empty pageSections + service-article).',
    )
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    locales = tuple(args.locale) if args.locale else ("ru",)
    slugs = tuple(args.slug) if args.slug else DEFAULT_SLUG_PILOTS

    new_layout_requested = args.set_layout
    if new_layout_requested and new_layout_requested not in ALLOWED_LAYOUT_TARGETS:
        parser.error(f"--set-layout must be one of {sorted(ALLOWED_LAYOUT_TARGETS)}")

    load_strapi_env_from_dotenv()
    client = StrapiClient()

    jobs, diagnostics = collect_jobs(
        client,
        locales=locales,
        slugs=slugs,
        scan_service_empty_sections=args.scan_service_empty_sections,
    )
    logger.info("Queued %s page(s)", len(jobs))
    if diagnostics.get("missed"):
        logger.warning("Missing snapshots: %s", diagnostics["missed"])

    plan_rows: list[dict[str, Any]] = []

    for job in jobs:
        page_detail = job.page
        html_raw = page_detail.get("content")
        html_before = html_raw if isinstance(html_raw, str) else ""

        normalized, counters = normalize_content(
            html_before,
            strip_nbsp=args.strip_nbsp,
            split_chars=args.split_paragraphs_chars,
            promote_h3=args.promote_h3_to_h2,
        )

        layout_before = page_detail.get("layoutVariant")
        promotion_ok = False
        promo_reason = ""
        if new_layout_requested:
            promotion_ok, promo_reason = layout_promotion_gate(page_detail, new_layout=new_layout_requested)

        layout_preview = layout_before
        if promotion_ok:
            layout_preview = new_layout_requested

        swap_ok_layout = promotion_ok is True and new_layout_requested is not None
        payload: dict[str, Any] = {}
        if normalized != html_before:
            payload["content"] = normalized
        if swap_ok_layout and new_layout_requested != layout_before:
            payload["layoutVariant"] = new_layout_requested

        dirt = bool(payload)
        applied = False
        if payload and args.apply:
            logger.info("%s/%s PUT %s", job.locale, job.slug, sorted(payload.keys()))
            client.put(f"/api/pages/{job.document_id}", {"data": payload}, locale=job.locale)
            applied = True
        elif payload:
            logger.info("%s/%s dry-run patch %s", job.locale, job.slug, sorted(payload.keys()))
        else:
            logger.info("%s/%s unchanged", job.locale, job.slug)

        plan_rows.append(
            {
                "locale": job.locale,
                "slug": job.slug,
                "documentId": job.document_id,
                "dirty": dirt,
                "contentLengthBefore": len(html_before),
                "contentLengthAfter": len(normalized),
                "transformStats": counters,
                "layoutBefore": layout_before,
                "layoutPreviewAfter": layout_preview,
                "layoutPromotionEligible": promotion_ok if new_layout_requested else None,
                "layoutPromotionBlocked": promo_reason if new_layout_requested and not promotion_ok else None,
                "applied": applied,
            },
        )

    result = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "apply": args.apply,
        "diagnostics": diagnostics,
        "planRows": plan_rows,
    }

    RESULT_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not args.quiet_json:
        RESULT_PATH.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        logger.info("Wrote %s", RESULT_PATH)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
