"""Tests for Video Entry related-article resolution."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))

from video_entry_related_article import (  # noqa: E402
    ArticleLinkInput,
    is_hash_only_article_url,
    resolve_related_article,
    slug_from_article_url,
)


LEGACY_REDIRECTS = {
    "el": {
        "αμυγδαλές-αδενοειδείς-εκβλαστήσεις": "kreatakia-egxeirisi",
    },
    "ru": {},
}


class VideoEntryRelatedArticleTest(unittest.TestCase):
    def test_slug_from_article_url_ignores_fragment(self) -> None:
        self.assertEqual(
            slug_from_article_url(
                "http://myorl.gr/αμυγδαλές-αδενοειδείς-εκβλαστήσεις#tab3",
            ),
            "αμυγδαλές-αδενοειδείς-εκβλαστήσεις",
        )
        self.assertIsNone(slug_from_article_url("http://myorl.gr/#"))

    def test_is_hash_only_article_url(self) -> None:
        self.assertTrue(is_hash_only_article_url("http://myorl.gr/#"))
        self.assertFalse(is_hash_only_article_url("https://myorl.gr/roxalito-ypniki-apnoia"))

    def test_resolve_via_alias_index(self) -> None:
        greek_slug = "αμυγδαλές-αδενοειδείς-εκβλαστήσεις"
        result = resolve_related_article(
            ArticleLinkInput(
                locale="el",
                article_url=f"https://myorl.gr/{greek_slug}",
            ),
            pages_by_slug={"el": {}, "ru": {}},
            redirects={"el": {}, "ru": {}},
            alias_index={
                "el": {greek_slug: "doc-el-1"},
                "ru": {},
            },
            slug_by_document_id={"el": {"doc-el-1": "afairesi-amygdalwn"}, "ru": {}},
        )
        self.assertEqual(result.document_id, "doc-el-1")
        self.assertEqual(result.resolved_slug, "afairesi-amygdalwn")
        self.assertEqual(result.source, "alias_index")

    def test_redirect_wins_over_wrong_direct_slug(self) -> None:
        result = resolve_related_article(
            ArticleLinkInput(locale="el", article_url="https://myorl.gr/vlefaroplastiki"),
            pages_by_slug={"el": {"blefaroplastika-v-athinah": "doc-bleph"}, "ru": {}},
            redirects={"el": {"vlefaroplastiki": "blefaroplastika-v-athinah"}, "ru": {}},
            alias_index={"el": {"vlefaroplastiki": "doc-wrong"}, "ru": {}},
        )
        self.assertEqual(result.document_id, "doc-bleph")
        self.assertEqual(result.source, "redirect")

    def test_legacy_slug_redirect_cache_resolves_greek_to_ascii(self) -> None:
        greek_slug = "αμυγδαλές-αδενοειδείς-εκβλαστήσεις"
        result = resolve_related_article(
            ArticleLinkInput(
                locale="el",
                article_url=f"https://myorl.gr/{greek_slug}",
            ),
            pages_by_slug={"el": {}, "ru": {}},
            redirects={"el": {}, "ru": {}},
            alias_index={
                "el": {"kreatakia-egxeirisi": "doc-kreata"},
                "ru": {},
            },
            legacy_slug_redirects=LEGACY_REDIRECTS,
            slug_by_document_id={"el": {"doc-kreata": "kreatakia-egxeirisi"}, "ru": {}},
        )
        self.assertEqual(result.document_id, "doc-kreata")
        self.assertEqual(result.source, "legacy_redirect")

    def test_unresolved_when_no_match(self) -> None:
        result = resolve_related_article(
            ArticleLinkInput(locale="el", article_url="https://myorl.gr/missing-page"),
            pages_by_slug={"el": {}, "ru": {}},
            redirects={"el": {}, "ru": {}},
            alias_index={"el": {}, "ru": {}},
        )
        self.assertIsNone(result.document_id)
        self.assertEqual(result.source, "unresolved")


if __name__ == "__main__":
    unittest.main()
