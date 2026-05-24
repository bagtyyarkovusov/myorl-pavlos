#!/usr/bin/env python3
"""Backfill missing relatedArticle relations on Strapi Video Entries.

Usage:
  python tools/backfill_video_entry_related_articles.py
  python tools/backfill_video_entry_related_articles.py --apply --locale el
  python tools/backfill_video_entry_related_articles.py --resolve-via-http --limit 5
"""

from __future__ import annotations

import argparse
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from strapi_client import StrapiClient, load_strapi_env_from_dotenv
from video_entry_related_article import (
    ALIAS_INDEX_CACHE_PATH,
    LOCALES,
    ArticleLinkInput,
    build_alias_to_document_id,
    fetch_pages_by_slug,
    invert_pages_by_slug,
    is_hash_only_article_url,
    load_legacy_slug_redirect_cache,
    load_redirect_targets,
    resolve_article_url_via_http,
    resolve_related_article,
)

logger = logging.getLogger("backfill_video_entry_related_articles")

ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT_PATH = ROOT / "data" / "source" / "checkpoints" / "video_entries_modx.json"
PLAN_PATH = ROOT / "tools" / "data" / "manual-repairs" / "video-entry-related-article-plan.json"
RESULT_PATH = ROOT / "tools" / "data" / "manual-repairs" / "video-entry-related-article-result.json"


def _load_modx_snapshot(snapshot_path: Path) -> dict[tuple[str, str], dict[str, Any]]:
    if not snapshot_path.is_file():
        return {}
    payload = json.loads(snapshot_path.read_text(encoding="utf-8"))
    out: dict[tuple[str, str], dict[str, Any]] = {}
    for locale, rows in payload.items():
        for row in rows:
            youtube_id = row.get("youtube_id")
            if youtube_id:
                out[(str(locale), str(youtube_id))] = row
    return out


def fetch_video_entries(
    client: StrapiClient,
    *,
    locales: tuple[str, ...],
) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for locale in locales:
        page = 1
        while True:
            resp = client.get(
                "/api/video-entries",
                **{
                    "locale": locale,
                    "pagination[page]": page,
                    "pagination[pageSize]": 100,
                    "fields[0]": "documentId",
                    "fields[1]": "youtubeId",
                    "fields[2]": "title",
                    "fields[3]": "legacyArticleUrl",
                    "populate[relatedArticle][fields][0]": "documentId",
                    "populate[relatedArticle][fields][1]": "slug",
                    "status": "published",
                },
            )
            for entry in resp.get("data") or []:
                related = entry.get("relatedArticle")
                entries.append(
                    {
                        "documentId": entry.get("documentId"),
                        "locale": locale,
                        "youtubeId": entry.get("youtubeId"),
                        "title": entry.get("title"),
                        "legacyArticleUrl": entry.get("legacyArticleUrl"),
                        "relatedArticleDocumentId": (
                            related.get("documentId") if isinstance(related, dict) else None
                        ),
                        "relatedArticleSlug": related.get("slug") if isinstance(related, dict) else None,
                    },
                )
            pagination = (resp.get("meta") or {}).get("pagination") or {}
            if page >= int(pagination.get("pageCount") or 1):
                break
            page += 1
    return entries


def build_offline_plan_from_snapshot(
    *,
    locales: tuple[str, ...],
    limit: int | None,
    snapshot_path: Path,
    use_alias_cache: bool = True,
) -> dict[str, Any]:
    """Build a link plan from the MODX video snapshot without calling Strapi."""

    alias_index = build_alias_to_document_id(use_cache=use_alias_cache)
    legacy_slug_redirects = load_legacy_slug_redirect_cache()
    redirects = load_redirect_targets()
    modx_snapshot = _load_modx_snapshot(snapshot_path)

    rows: list[dict[str, Any]] = []
    counts = {"link": 0, "skip_hash_only": 0, "manual_review": 0}

    for (locale, youtube_id), snapshot_row in sorted(modx_snapshot.items()):
        if locale not in locales:
            continue
        if limit is not None and len(rows) >= limit:
            break

        legacy_url = snapshot_row.get("article_url") or ""
        title = snapshot_row.get("title")

        if is_hash_only_article_url(legacy_url):
            rows.append(
                {
                    "locale": locale,
                    "youtubeId": youtube_id,
                    "title": title,
                    "legacyArticleUrl": legacy_url,
                    "extractedSlug": None,
                    "resolvedDocumentId": None,
                    "resolvedSlug": None,
                    "resolutionSource": "unresolved",
                    "action": "skip_hash_only",
                    "note": "offline snapshot plan",
                },
            )
            counts["skip_hash_only"] += 1
            continue

        result = resolve_related_article(
            ArticleLinkInput(locale=locale, article_url=legacy_url),
            pages_by_slug={"el": {}, "ru": {}},
            redirects=redirects,
            alias_index=alias_index,
            legacy_slug_redirects=legacy_slug_redirects,
        )

        if result.document_id:
            action = "link"
            counts["link"] += 1
        else:
            action = "manual_review"
            counts["manual_review"] += 1

        rows.append(
            {
                "locale": locale,
                "youtubeId": youtube_id,
                "title": title,
                "legacyArticleUrl": legacy_url,
                "extractedSlug": result.extracted_slug,
                "resolvedDocumentId": result.document_id,
                "resolvedSlug": result.resolved_slug,
                "resolutionSource": result.source,
                "action": action,
                "note": "offline snapshot plan; match Strapi video-entry by youtubeId before apply",
            },
        )

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "mode": "offline_snapshot",
        "summary": {
            "entryCount": len(rows),
            **counts,
            "legacySlugRedirects": {loc: len(legacy_slug_redirects.get(loc) or {}) for loc in LOCALES},
        },
        "rows": rows,
    }


def build_plan(
    client: StrapiClient,
    *,
    locales: tuple[str, ...],
    limit: int | None,
    resolve_via_http: bool,
    use_alias_cache: bool,
    snapshot_path: Path,
) -> dict[str, Any]:
    pages_by_slug = fetch_pages_by_slug(client)
    redirects = load_redirect_targets()
    alias_index = build_alias_to_document_id(use_cache=use_alias_cache)
    legacy_slug_redirects = load_legacy_slug_redirect_cache()
    slug_by_document_id = invert_pages_by_slug(pages_by_slug)
    modx_snapshot = _load_modx_snapshot(snapshot_path)

    rows: list[dict[str, Any]] = []
    counts = {
        "link": 0,
        "skip_already_linked": 0,
        "skip_hash_only": 0,
        "manual_review": 0,
    }

    for entry in fetch_video_entries(client, locales=locales):
        if limit is not None and len(rows) >= limit:
            break

        locale = str(entry["locale"])
        document_id = str(entry["documentId"])
        youtube_id = str(entry.get("youtubeId") or "")
        title = entry.get("title")
        legacy_url = entry.get("legacyArticleUrl")
        if not legacy_url:
            snapshot_row = modx_snapshot.get((locale, youtube_id))
            if snapshot_row:
                legacy_url = snapshot_row.get("article_url")

        if entry.get("relatedArticleDocumentId"):
            rows.append(
                {
                    "documentId": document_id,
                    "locale": locale,
                    "youtubeId": youtube_id,
                    "title": title,
                    "legacyArticleUrl": legacy_url,
                    "extractedSlug": None,
                    "resolvedDocumentId": entry.get("relatedArticleDocumentId"),
                    "resolvedSlug": entry.get("relatedArticleSlug"),
                    "resolutionSource": "existing",
                    "action": "skip_already_linked",
                },
            )
            counts["skip_already_linked"] += 1
            continue

        if is_hash_only_article_url(legacy_url):
            rows.append(
                {
                    "documentId": document_id,
                    "locale": locale,
                    "youtubeId": youtube_id,
                    "title": title,
                    "legacyArticleUrl": legacy_url,
                    "extractedSlug": None,
                    "resolvedDocumentId": None,
                    "resolvedSlug": None,
                    "resolutionSource": "unresolved",
                    "action": "skip_hash_only",
                },
            )
            counts["skip_hash_only"] += 1
            continue

        http_slug = None
        if resolve_via_http and legacy_url:
            http_slug = resolve_article_url_via_http(legacy_url)

        result = resolve_related_article(
            ArticleLinkInput(locale=locale, article_url=legacy_url or ""),
            pages_by_slug=pages_by_slug,
            redirects=redirects,
            alias_index=alias_index,
            slug_by_document_id=slug_by_document_id,
            legacy_slug_redirects=legacy_slug_redirects,
            http_slug=http_slug,
        )

        if result.document_id:
            action = "link"
            counts["link"] += 1
        else:
            action = "manual_review"
            counts["manual_review"] += 1

        rows.append(
            {
                "documentId": document_id,
                "locale": locale,
                "youtubeId": youtube_id,
                "title": title,
                "legacyArticleUrl": legacy_url,
                "extractedSlug": result.extracted_slug,
                "resolvedDocumentId": result.document_id,
                "resolvedSlug": result.resolved_slug,
                "resolutionSource": result.source,
                "action": action,
            },
        )

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "entryCount": len(rows),
            **counts,
            "aliasIndexKeys": {loc: len(alias_index.get(loc) or {}) for loc in LOCALES},
            "legacySlugRedirects": {loc: len(legacy_slug_redirects.get(loc) or {}) for loc in LOCALES},
            "aliasIndexCache": str(ALIAS_INDEX_CACHE_PATH.relative_to(ROOT)),
        },
        "rows": rows,
    }


def _lookup_video_entry_document_id(
    client: StrapiClient,
    locale: str,
    youtube_id: str,
) -> str | None:
    resp = client.get(
        "/api/video-entries",
        **{
            "locale": locale,
            "filters[youtubeId][$eq]": youtube_id,
            "fields[0]": "documentId",
            "pagination[pageSize]": 1,
            "status": "published",
        },
    )
    data = resp.get("data") or []
    if not data:
        return None
    document_id = data[0].get("documentId")
    return str(document_id) if document_id else None


def apply_plan(client: StrapiClient, plan: dict[str, Any]) -> dict[str, Any]:
    applied = 0
    skipped = 0
    errors: list[dict[str, str]] = []

    for row in plan.get("rows") or []:
        if row.get("action") != "link":
            skipped += 1
            continue
        document_id = row.get("documentId")
        locale = row.get("locale")
        target = row.get("resolvedDocumentId")
        youtube_id = row.get("youtubeId")
        if not document_id and locale and youtube_id:
            document_id = _lookup_video_entry_document_id(client, str(locale), str(youtube_id))
        if not document_id or not locale or not target:
            skipped += 1
            continue
        try:
            client.put(
                f"/api/video-entries/{document_id}",
                {"data": {"relatedArticle": target}},
                locale=locale,
                status="published",
            )
            applied += 1
            logger.info(
                "Linked %s [%s] -> %s (%s)",
                row.get("youtubeId"),
                locale,
                target,
                row.get("resolutionSource"),
            )
        except Exception as exc:  # noqa: BLE001
            errors.append(
                {
                    "documentId": str(document_id),
                    "locale": str(locale),
                    "error": str(exc),
                },
            )

    return {
        "appliedAt": datetime.now(timezone.utc).isoformat(),
        "summary": {"applied": applied, "skipped": skipped, "errors": len(errors)},
        "errors": errors,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Apply link actions from the plan")
    parser.add_argument("--dry-run", action="store_true", help="Alias for default plan-only mode")
    parser.add_argument("--locale", choices=[*LOCALES, "all"], default="all")
    parser.add_argument("--limit", type=int, default=None, help="Limit planned rows")
    parser.add_argument(
        "--resolve-via-http",
        action="store_true",
        help="Follow legacy myorl.gr URLs to discover final slugs",
    )
    parser.add_argument(
        "--offline",
        action="store_true",
        help="Do not use HTTP; rebuild alias index without cache when MODX flat exists",
    )
    parser.add_argument(
        "--plan",
        type=Path,
        default=PLAN_PATH,
        help="Path for plan JSON output (or input for --apply)",
    )
    parser.add_argument(
        "--snapshot",
        type=Path,
        default=SNAPSHOT_PATH,
        help="MODX video snapshot for legacyArticleUrl fallback",
    )
    parser.add_argument(
        "--offline-plan",
        action="store_true",
        help="Build plan from MODX snapshot + redirect caches only (no Strapi API)",
    )
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    load_strapi_env_from_dotenv()
    client = StrapiClient(dry_run=not args.apply)
    locales: tuple[str, ...] = LOCALES if args.locale == "all" else (args.locale,)

    if args.apply:
        if not args.plan.is_file():
            raise SystemExit(f"Plan not found: {args.plan}")
        plan = json.loads(args.plan.read_text(encoding="utf-8"))
        result = apply_plan(client, plan)
        RESULT_PATH.parent.mkdir(parents=True, exist_ok=True)
        RESULT_PATH.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps(result, indent=2))
        return

    if args.offline_plan:
        plan = build_offline_plan_from_snapshot(
            locales=locales,
            limit=args.limit,
            snapshot_path=args.snapshot,
            use_alias_cache=not args.offline,
        )
        args.plan.parent.mkdir(parents=True, exist_ok=True)
        args.plan.write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps(plan["summary"], indent=2))
        print(f"Offline plan written to {args.plan}")
        return

    plan = build_plan(
        client,
        locales=locales,
        limit=args.limit,
        resolve_via_http=args.resolve_via_http,
        use_alias_cache=not args.offline,
        snapshot_path=args.snapshot,
    )
    args.plan.parent.mkdir(parents=True, exist_ok=True)
    args.plan.write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(plan["summary"], indent=2))
    print(f"Plan written to {args.plan}")


if __name__ == "__main__":
    main()
