#!/usr/bin/env python3
"""Build Greek/legacy slug -> ASCII slug cache by following live myorl.gr redirects."""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path

from video_entry_related_article import (
    LEGACY_SLUG_REDIRECT_CACHE_PATH,
    build_legacy_slug_redirect_cache,
    is_hash_only_article_url,
)

logger = logging.getLogger("build_video_legacy_slug_redirects")

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SNAPSHOT = ROOT / "data" / "source" / "checkpoints" / "video_entries_modx.json"


def collect_article_urls(snapshot_path: Path) -> list[tuple[str, str]]:
    payload = json.loads(snapshot_path.read_text(encoding="utf-8"))
    pairs: list[tuple[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for locale, rows in payload.items():
        for row in rows:
            url = row.get("article_url") or ""
            if is_hash_only_article_url(url):
                continue
            key = (str(locale), url)
            if key in seen:
                continue
            seen.add(key)
            pairs.append(key)
    return pairs


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot", type=Path, default=DEFAULT_SNAPSHOT)
    parser.add_argument("--output", type=Path, default=LEGACY_SLUG_REDIRECT_CACHE_PATH)
    parser.add_argument("--delay", type=float, default=0.2, help="Seconds between HTTP lookups")
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    pairs = collect_article_urls(args.snapshot)
    if args.limit is not None:
        pairs = pairs[: args.limit]

    cache = build_legacy_slug_redirect_cache(
        pairs,
        cache_path=args.output,
        delay_s=args.delay,
    )
    counts = {loc: len(cache.get(loc) or {}) for loc in ("el", "ru")}
    print(json.dumps({"mapped": counts, "output": str(args.output)}, indent=2))


if __name__ == "__main__":
    main()
