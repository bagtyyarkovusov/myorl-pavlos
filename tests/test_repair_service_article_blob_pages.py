#!/usr/bin/env python3
"""Unit tests for service-blob layout gate helpers (offline, no Strapi)."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

_TOOLS = Path(__file__).resolve().parents[1] / "tools"
if str(_TOOLS) not in sys.path:
    sys.path.insert(0, str(_TOOLS))

from repair_service_article_blob_pages import (  # noqa: E402
    layout_promotion_gate,
    page_sections_empty,
)


class PageSectionsEmpty(unittest.TestCase):
    def test_none_and_empty(self) -> None:
        self.assertTrue(page_sections_empty({}))
        self.assertTrue(page_sections_empty({"pageSections": None}))
        self.assertTrue(page_sections_empty({"pageSections": []}))
        self.assertFalse(page_sections_empty({"pageSections": [{"__component": "sections.faq"}]}))


class LayoutPromotionGate(unittest.TestCase):
    def test_allows_when_service_article_and_empty_sections(self) -> None:
        ok, reason = layout_promotion_gate(
            {"layoutVariant": "service-article", "pageSections": []},
            new_layout="encyclopedia-article",
        )
        self.assertTrue(ok)
        self.assertEqual(reason, "")

    def test_blocks_non_service(self) -> None:
        ok, reason = layout_promotion_gate(
            {"layoutVariant": "encyclopedia-article", "pageSections": []},
            new_layout="encyclopedia-article",
        )
        self.assertFalse(ok)
        self.assertIn("layoutVariant", reason)

    def test_blocks_sections_present(self) -> None:
        ok, reason = layout_promotion_gate(
            {
                "layoutVariant": "service-article",
                "pageSections": [{"__component": "sections.faq", "heading": "x", "items": []}],
            },
            new_layout="encyclopedia-article",
        )
        self.assertFalse(ok)

    def test_blocks_unknown_layout(self) -> None:
        ok, _ = layout_promotion_gate(
            {"layoutVariant": "service-article", "pageSections": []},
            new_layout="home",
        )
        self.assertFalse(ok)


if __name__ == "__main__":
    unittest.main()
