"""Tests for MODX video scrape and article resolution helpers."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))

from import_video_entries import (  # noqa: E402
    ModxVideoCard,
    _normalize_categories,
    scrape_modx_video_page,
)
from video_entry_related_article import (  # noqa: E402
    ArticleLinkInput,
    resolve_related_article,
    slug_from_article_url,
)

SAMPLE_HTML = """
<div class="row filter-elements videos">
  <div class="span6 bottom-padding-mini ενδοσκοπική-χειρουργική ρινός">
    <div class="title-box"><h2 class="title">Ενδοσκοπική διαφραγματοπλαστική</h2></div>
    <div class="video-box youtube">
      <lite-youtube videoid="abc123"></lite-youtube>
    </div>
    <div class="text-center">
      <a href="https://myorl.gr/skoliosi-rinikou-diafragmatos-stravo-dafragma">Διαβάστε περισσότερα</a>
    </div>
  </div>
  <div class="span6 bottom-padding-mini παιδο-ωρλ">
    <div class="title-box"><h2 class="title">Χρόνια αμυγδαλίτιδα</h2></div>
    <div class="video-box youtube">
      <lite-youtube videoid="def456"></lite-youtube>
    </div>
    <div class="text-center">
      <a href="http://myorl.gr/#">Διαβάστε περισσότερα</a>
    </div>
  </div>
</div>
"""


class ImportVideoEntriesTest(unittest.TestCase):
    def test_slug_from_article_url_decodes_path(self) -> None:
        self.assertEqual(
            slug_from_article_url("https://myorl.gr/roxalito-ypniki-apnoia"),
            "roxalito-ypniki-apnoia",
        )
        self.assertIsNone(slug_from_article_url("http://myorl.gr/#"))

    def test_normalize_categories_splits_tokens(self) -> None:
        self.assertEqual(
            _normalize_categories("ενδοσκοπική-χειρουργική ρινός"),
            ["ενδοσκοπική-χειρουργική", "ρινός"],
        )

    def test_scrape_modx_video_page_parses_cards(self) -> None:
        with patch("import_video_entries._fetch_html", return_value=SAMPLE_HTML):
            cards = scrape_modx_video_page("https://myorl.gr/video", "el")
        self.assertEqual(len(cards), 2)
        self.assertEqual(cards[0].youtube_id, "abc123")
        self.assertEqual(cards[0].title, "Ενδοσκοπική διαφραγματοπλαστική")
        self.assertTrue(cards[1].article_url.endswith("#"))

    def test_resolve_related_article_uses_locale_pages(self) -> None:
        card = ModxVideoCard(
            locale="ru",
            youtube_id="abc123",
            title="Test",
            article_url="https://myorl.gr/roxalito-ypniki-apnoia",
            categories=[],
            sort_order=1,
        )
        pages = {
            "el": {},
            "ru": {"roxalito-ypniki-apnoia": "doc-ru"},
        }
        result = resolve_related_article(
            ArticleLinkInput(locale=card.locale, article_url=card.article_url),
            pages_by_slug=pages,
            redirects={"el": {}, "ru": {}},
            alias_index={"el": {}, "ru": {}},
        )
        self.assertEqual(result.document_id, "doc-ru")
        self.assertEqual(result.legacy_url, card.article_url)


if __name__ == "__main__":
    unittest.main()
