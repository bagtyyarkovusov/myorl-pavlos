#!/usr/bin/env python3
"""Import historical MODX video library cards into Strapi video-entry records."""

from __future__ import annotations

import argparse
import html as htmlmod
import json
import logging
import re
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any
from urllib import request
from urllib.error import URLError

from strapi_client import StrapiClient, load_strapi_env_from_dotenv
from video_entry_related_article import (
    ArticleLinkInput,
    build_alias_to_document_id,
    fetch_pages_by_slug,
    load_redirect_targets,
    normalize_legacy_article_url,
    resolve_related_article,
)

logger = logging.getLogger("import_video_entries")

ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT_PATH = ROOT / "data" / "source" / "checkpoints" / "video_entries_modx.json"

MODX_URLS = {
    "el": "https://myorl.gr/video",
    "ru": "https://myorl.gr/ru/video/",
}


@dataclass
class ModxVideoCard:
    locale: str
    youtube_id: str
    title: str
    article_url: str
    categories: list[str]
    sort_order: int


def _fetch_html(url: str) -> str:
    req = request.Request(url, headers={"User-Agent": "myorl-video-import/1.0"})
    with request.urlopen(req, timeout=30) as response:
        return response.read().decode("utf-8", errors="replace")


def _normalize_categories(raw: str) -> list[str]:
    labels: list[str] = []
    seen: set[str] = set()
    for token in re.split(r"\s+", raw.strip()):
        label = htmlmod.unescape(token).strip()
        if not label or label in seen:
            continue
        seen.add(label)
        labels.append(label)
    return labels


def scrape_modx_video_page(url: str, locale: str) -> list[ModxVideoCard]:
    html = _fetch_html(url)
    chunks = re.split(r'(?=<div class="span6 bottom-padding-mini )', html)
    cards: list[ModxVideoCard] = []
    order = 0

    for chunk in chunks:
        if "<lite-youtube" not in chunk:
            continue
        order += 1
        title_match = re.search(r'<h2 class="title">([\s\S]*?)</h2>', chunk, re.I)
        vid_match = re.search(r'<lite-youtube\s+videoid="?([^"\s>]+)"?', chunk, re.I)
        btn_match = re.search(
            r'<div class="text-center">\s*<a\b[^>]*href="([^"]+)"',
            chunk,
            re.I,
        )
        class_match = re.search(
            r'<div class="span6 bottom-padding-mini ([^"]+)"',
            chunk,
            re.I,
        )
        title = htmlmod.unescape(re.sub(r"<[^>]+>", " ", title_match.group(1))).strip() if title_match else ""
        youtube_id = (vid_match.group(1) if vid_match else "").strip()
        if not youtube_id:
            continue
        article_url = btn_match.group(1).strip() if btn_match else ""
        categories = _normalize_categories(class_match.group(1) if class_match else "")
        cards.append(
            ModxVideoCard(
                locale=locale,
                youtube_id=youtube_id,
                title=title or youtube_id,
                article_url=article_url,
                categories=categories,
                sort_order=order,
            )
        )

    return cards


def _extract_document_id(response: dict[str, Any]) -> str:
    data = response.get("data") or {}
    document_id = data.get("documentId") or data.get("id")
    if not document_id:
        raise RuntimeError(f"Missing documentId in Strapi response: {response}")
    return str(document_id)


def _entry_payload(card: ModxVideoCard, related_article: str | None) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "title": card.title,
        "youtubeId": card.youtube_id,
        "youtubeUrl": f"https://www.youtube.com/watch?v={card.youtube_id}",
        "categories": card.categories,
        "sortOrder": card.sort_order,
        "legacyArticleUrl": normalize_legacy_article_url(card.article_url),
    }
    if related_article:
        payload["relatedArticle"] = related_article
    return payload


def _fetch_existing_by_youtube(client: StrapiClient) -> dict[str, str]:
    existing: dict[str, str] = {}
    for locale in ("el", "ru"):
        page = 1
        while True:
            resp = client.get(
                "/api/video-entries",
                **{
                    "locale": locale,
                    "pagination[page]": page,
                    "pagination[pageSize]": 100,
                    "fields[0]": "youtubeId",
                    "fields[1]": "documentId",
                    "status": "published",
                },
            )
            for entry in resp.get("data") or []:
                youtube_id = entry.get("youtubeId")
                document_id = entry.get("documentId")
                if youtube_id and document_id:
                    existing[youtube_id] = document_id
            pagination = (resp.get("meta") or {}).get("pagination") or {}
            if page >= int(pagination.get("pageCount") or 1):
                break
            page += 1
    return existing


def import_video_entries(
    client: StrapiClient,
    *,
    use_network: bool = True,
    snapshot_path: Path | None = None,
) -> dict[str, Any]:
    if use_network:
        scraped = {
            locale: [asdict(card) for card in scrape_modx_video_page(url, locale)]
            for locale, url in MODX_URLS.items()
        }
        if snapshot_path:
            snapshot_path.parent.mkdir(parents=True, exist_ok=True)
            snapshot_path.write_text(json.dumps(scraped, ensure_ascii=False, indent=2), encoding="utf-8")
    else:
        source = snapshot_path or SNAPSHOT_PATH
        scraped = json.loads(source.read_text(encoding="utf-8"))

    by_id: dict[str, dict[str, ModxVideoCard]] = {}
    for locale, rows in scraped.items():
        for row in rows:
            card = ModxVideoCard(**row)
            by_id.setdefault(card.youtube_id, {})[locale] = card

    if client.dry_run:
        pages_by_slug = {"el": {}, "ru": {}}
        existing = {}
        alias_index = {"el": {}, "ru": {}}
    else:
        pages_by_slug = fetch_pages_by_slug(client)
        existing = _fetch_existing_by_youtube(client)
        alias_index = build_alias_to_document_id()
    redirects = load_redirect_targets()

    stats = {
        "created": 0,
        "localized": 0,
        "skipped": 0,
        "unresolved_articles": 0,
    }

    for youtube_id, locale_cards in sorted(
        by_id.items(),
        key=lambda item: min(card.sort_order for card in item[1].values()),
    ):
        if youtube_id in existing:
            stats["skipped"] += 1
            continue

        primary_locale = "el" if "el" in locale_cards else "ru"
        primary = locale_cards[primary_locale]
        primary_result = resolve_related_article(
            ArticleLinkInput(locale=primary.locale, article_url=primary.article_url),
            pages_by_slug=pages_by_slug,
            redirects=redirects,
            alias_index=alias_index,
        )
        related_primary = primary_result.document_id
        legacy = primary_result.legacy_url or primary.article_url or None
        if not related_primary and legacy and legacy not in ("#",):
            stats["unresolved_articles"] += 1

        created = client.post(
            "/api/video-entries",
            {"data": _entry_payload(primary, related_primary)},
            locale=primary_locale,
        )
        document_id = _extract_document_id(created)
        existing[youtube_id] = document_id
        stats["created"] += 1
        logger.info("Created %s [%s] %s", youtube_id, primary_locale, primary.title)

        for locale, card in locale_cards.items():
            if locale == primary_locale:
                continue
            locale_result = resolve_related_article(
                ArticleLinkInput(locale=card.locale, article_url=card.article_url),
                pages_by_slug=pages_by_slug,
                redirects=redirects,
                alias_index=alias_index,
            )
            related = locale_result.document_id
            legacy_other = locale_result.legacy_url or card.article_url or None
            if not related and legacy_other and legacy_other not in ("#",):
                stats["unresolved_articles"] += 1
            client.put(
                f"/api/video-entries/{document_id}",
                {"data": _entry_payload(card, related)},
                locale=locale,
            )
            stats["localized"] += 1
            logger.info("Localized %s [%s] %s", youtube_id, locale, card.title)

    return stats


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Log writes without calling Strapi")
    parser.add_argument(
        "--offline",
        action="store_true",
        help="Use cached MODX snapshot instead of scraping live pages",
    )
    parser.add_argument(
        "--snapshot",
        type=Path,
        default=SNAPSHOT_PATH,
        help="Path to read/write MODX scrape snapshot JSON",
    )
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    load_strapi_env_from_dotenv()
    client = StrapiClient(dry_run=args.dry_run)

    try:
        stats = import_video_entries(
            client,
            use_network=not args.offline,
            snapshot_path=args.snapshot,
        )
    except URLError as exc:
        raise SystemExit(f"Failed to scrape MODX pages: {exc}") from exc

    print(json.dumps(stats, indent=2))
    if args.dry_run:
        print(f"Dry-run payloads: {len(client.dry_run_log)}")


if __name__ == "__main__":
    main()
