#!/usr/bin/env python3
"""Tests for audit_site_assets.py alt text coverage audit.

Run with: ``python3 -m unittest tests.test_audit_site_assets -v``
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))

from audit_site_assets import (  # noqa: E402
    classify_img_alt,
    calculate_alt_coverage,
    generate_alt_text_markdown_report,
    audit_inline_image_alt_text,
    AltTextEntry,
    PageAltTextStats,
)


class TestClassifyImgAltHasAlt(unittest.TestCase):
    """Images with non-empty alt text."""

    def test_standard_alt_with_double_quotes(self):
        status, value = classify_img_alt('<img src="/uploads/x.jpg" alt="A doctor performing rhinoplasty">')
        self.assertEqual(status, "has-alt")
        self.assertEqual(value, "A doctor performing rhinoplasty")

    def test_standard_alt_with_single_quotes(self):
        status, value = classify_img_alt("<img src='/uploads/x.jpg' alt='Medical diagram of the ear'>")
        self.assertEqual(status, "has-alt")
        self.assertEqual(value, "Medical diagram of the ear")

    def test_alt_before_src(self):
        status, value = classify_img_alt('<img alt="Portrait of Dr. Pavlos" src="/uploads/portrait.jpg">')
        self.assertEqual(status, "has-alt")
        self.assertEqual(value, "Portrait of Dr. Pavlos")

    def test_alt_with_special_characters(self):
        status, value = classify_img_alt('<img src="/uploads/x.jpg" alt="Ρινοπλαστική — πριν & μετά">')
        self.assertEqual(status, "has-alt")
        self.assertEqual(value, "Ρινοπλαστική — πριν & μετά")

    def test_alt_with_numeric_entity(self):
        status, value = classify_img_alt('<img src="/uploads/x.jpg" alt="&#917;&#955;&#955;">')
        self.assertEqual(status, "has-alt")
        self.assertEqual(value, "&#917;&#955;&#955;")

    def test_alt_with_newlines(self):
        status, value = classify_img_alt('<img src="/uploads/x.jpg"\n     alt="Line 1\nLine 2">')
        self.assertEqual(status, "has-alt")
        self.assertEqual(value, "Line 1\nLine 2")

    def test_alt_with_leading_trailing_whitespace_is_trimmed(self):
        status, value = classify_img_alt('<img src="/uploads/x.jpg" alt="   hello   ">')
        self.assertEqual(status, "has-alt")
        self.assertEqual(value, "hello")


class TestClassifyImgAltEmptyAlt(unittest.TestCase):
    """Images with empty alt attribute (decorative)."""

    def test_explicitly_empty_alt_double_quotes(self):
        status, value = classify_img_alt('<img src="/uploads/divider.jpg" alt="">')
        self.assertEqual(status, "empty-alt")
        self.assertEqual(value, "")

    def test_explicitly_empty_alt_single_quotes(self):
        status, value = classify_img_alt("<img src='/uploads/spacer.jpg' alt=''>")
        self.assertEqual(status, "empty-alt")
        self.assertEqual(value, "")

    def test_whitespace_only_alt_is_treated_as_empty(self):
        status, value = classify_img_alt('<img src="/uploads/x.jpg" alt="   ">')
        self.assertEqual(status, "empty-alt")
        self.assertEqual(value, "   ")


class TestClassifyImgAltMissingAlt(unittest.TestCase):
    """Images with no alt attribute at all (broken)."""

    def test_no_alt_attribute_at_all(self):
        status, value = classify_img_alt('<img src="/uploads/x.jpg">')
        self.assertEqual(status, "missing-alt")
        self.assertEqual(value, "")

    def test_no_alt_with_other_attributes(self):
        status, value = classify_img_alt('<img src="/uploads/x.jpg" width="300" height="200" class="photo">')
        self.assertEqual(status, "missing-alt")
        self.assertEqual(value, "")

    def test_no_alt_self_closing(self):
        status, value = classify_img_alt('<img src="/uploads/x.jpg" />')
        self.assertEqual(status, "missing-alt")
        self.assertEqual(value, "")

    def test_no_alt_with_data_attributes(self):
        status, value = classify_img_alt('<img src="/uploads/x.jpg" data-caption="A photo" data-index="1">')
        self.assertEqual(status, "missing-alt")
        self.assertEqual(value, "")


class TestCalculateAltCoverage(unittest.TestCase):
    """Coverage percentage calculation."""

    def test_all_has_alt_is_100_percent(self):
        self.assertEqual(calculate_alt_coverage({"has-alt": 10, "empty-alt": 0, "missing-alt": 0, "total": 10}), 100.0)

    def test_mixed_coverage(self):
        # 7 with alt out of 10 total = 70%
        self.assertEqual(calculate_alt_coverage({"has-alt": 7, "empty-alt": 2, "missing-alt": 1, "total": 10}), 70.0)

    def test_no_images_is_100_percent(self):
        self.assertEqual(calculate_alt_coverage({"has-alt": 0, "empty-alt": 0, "missing-alt": 0, "total": 0}), 100.0)

    def test_all_missing_is_0_percent(self):
        self.assertEqual(calculate_alt_coverage({"has-alt": 0, "empty-alt": 0, "missing-alt": 5, "total": 5}), 0.0)

    def test_empty_alt_does_not_count_as_coverage(self):
        self.assertEqual(calculate_alt_coverage({"has-alt": 0, "empty-alt": 10, "missing-alt": 0, "total": 10}), 0.0)

    def test_fractional_coverage_rounded(self):
        # 1 out of 3 = 33.33...%
        coverage = calculate_alt_coverage({"has-alt": 1, "empty-alt": 1, "missing-alt": 1, "total": 3})
        self.assertAlmostEqual(coverage, 33.33, places=1)


class TestAuditInlineImageAltText(unittest.TestCase):
    """End-to-end: classify img tags from fixture page data."""

    def test_has_alt_single_image(self):
        pages = [
            {
                "locale": "el",
                "slug": "test-page",
                "title": "Test Page",
                "content": '<p>Some text <img src="/uploads/img1.jpg" alt="A test image"></p>',
                "excerpt": "",
                "info_block_bottom": "",
                "sources": "",
            }
        ]
        stats = audit_inline_image_alt_text(pages)
        self.assertEqual(len(stats), 1)
        self.assertEqual(stats[0].total, 1)
        self.assertEqual(stats[0].has_alt, 1)
        self.assertEqual(stats[0].empty_alt, 0)
        self.assertEqual(stats[0].missing_alt, 0)

    def test_missing_alt_single_image(self):
        pages = [
            {
                "locale": "el",
                "slug": "test-page",
                "title": "Test Page",
                "content": '<p>Text <img src="/uploads/img1.jpg"></p>',
                "excerpt": "",
                "info_block_bottom": "",
                "sources": "",
            }
        ]
        stats = audit_inline_image_alt_text(pages)
        self.assertEqual(len(stats), 1)
        self.assertEqual(stats[0].total, 1)
        self.assertEqual(stats[0].has_alt, 0)
        self.assertEqual(stats[0].empty_alt, 0)
        self.assertEqual(stats[0].missing_alt, 1)

    def test_empty_alt_single_image(self):
        pages = [
            {
                "locale": "el",
                "slug": "test-page",
                "title": "Test Page",
                "content": '<p>Text <img src="/uploads/spacer.jpg" alt=""></p>',
                "excerpt": "",
                "info_block_bottom": "",
                "sources": "",
            }
        ]
        stats = audit_inline_image_alt_text(pages)
        self.assertEqual(len(stats), 1)
        self.assertEqual(stats[0].total, 1)
        self.assertEqual(stats[0].has_alt, 0)
        self.assertEqual(stats[0].empty_alt, 1)
        self.assertEqual(stats[0].missing_alt, 0)

    def test_all_three_states_in_one_page(self):
        pages = [
            {
                "locale": "el",
                "slug": "mixed-page",
                "title": "Mixed Alt Text Page",
                "content": (
                    '<img src="/uploads/good.jpg" alt="Good alt">'
                    '<img src="/uploads/decorative.jpg" alt="">'
                    '<img src="/uploads/broken.jpg">'
                ),
                "excerpt": "",
                "info_block_bottom": "",
                "sources": "",
            }
        ]
        stats = audit_inline_image_alt_text(pages)
        self.assertEqual(len(stats), 1)
        self.assertEqual(stats[0].total, 3)
        self.assertEqual(stats[0].has_alt, 1)
        self.assertEqual(stats[0].empty_alt, 1)
        self.assertEqual(stats[0].missing_alt, 1)

    def test_images_across_multiple_fields(self):
        pages = [
            {
                "locale": "el",
                "slug": "multi-field",
                "title": "Multi Field Page",
                "content": '<img src="/uploads/a.jpg" alt="Content image">',
                "excerpt": '<img src="/uploads/b.jpg" alt="Excerpt image">',
                "info_block_bottom": '<img src="/uploads/c.jpg">',
                "sources": '<img src="/uploads/d.jpg" alt="">',
            }
        ]
        stats = audit_inline_image_alt_text(pages)
        self.assertEqual(len(stats), 1)
        self.assertEqual(stats[0].total, 4)
        self.assertEqual(stats[0].has_alt, 2)
        self.assertEqual(stats[0].empty_alt, 1)
        self.assertEqual(stats[0].missing_alt, 1)

    def test_page_with_no_images(self):
        pages = [
            {
                "locale": "el",
                "slug": "text-only",
                "title": "Text Only Page",
                "content": "<p>Just some text, no images here.</p>",
                "excerpt": "",
                "info_block_bottom": "",
                "sources": "",
            }
        ]
        stats = audit_inline_image_alt_text(pages)
        self.assertEqual(len(stats), 0)

    def test_multiple_pages(self):
        pages = [
            {
                "locale": "el",
                "slug": "page-1",
                "title": "Page 1",
                "content": '<img src="/uploads/a.jpg" alt="A">',
                "excerpt": "",
                "info_block_bottom": "",
                "sources": "",
            },
            {
                "locale": "ru",
                "slug": "page-2",
                "title": "Page 2",
                "content": '<img src="/uploads/b.jpg">',
                "excerpt": "",
                "info_block_bottom": "",
                "sources": "",
            },
        ]
        stats = audit_inline_image_alt_text(pages)
        self.assertEqual(len(stats), 2)
        self.assertEqual(stats[0].has_alt, 1)
        self.assertEqual(stats[1].missing_alt, 1)

    def test_null_html_fields_are_treated_as_empty(self):
        pages = [
            {
                "locale": "el",
                "slug": "null-fields",
                "title": "Null Fields Page",
                "content": None,
                "excerpt": None,
                "info_block_bottom": None,
                "sources": None,
            }
        ]
        stats = audit_inline_image_alt_text(pages)
        self.assertEqual(len(stats), 0)


class TestGenerateAltTextMarkdownReport(unittest.TestCase):
    """Markdown report generation."""

    def setUp(self):
        self.entries_1 = [
            AltTextEntry(status="has-alt", alt_value="A nice photo", src="/uploads/1.jpg", field="content"),
            AltTextEntry(status="empty-alt", alt_value="", src="/uploads/2.jpg", field="content"),
            AltTextEntry(status="missing-alt", alt_value="", src="/uploads/3.jpg", field="content"),
        ]
        self.entries_2 = [
            AltTextEntry(status="has-alt", alt_value="Another photo", src="/uploads/4.jpg", field="excerpt"),
        ]
        self.stats = [
            PageAltTextStats(
                locale="el",
                slug="test-page",
                title="Test Page",
                entries=self.entries_1,
                total=3,
                has_alt=1,
                empty_alt=1,
                missing_alt=1,
            ),
            PageAltTextStats(
                locale="ru",
                slug="another-page",
                title="Another Page",
                entries=self.entries_2,
                total=1,
                has_alt=1,
                empty_alt=0,
                missing_alt=0,
            ),
        ]
        self.report = generate_alt_text_markdown_report(self.stats, min_coverage=95.0)

    def test_report_includes_title(self):
        self.assertIn("# Alt Text Audit Report", self.report)

    def test_report_includes_summary_section(self):
        self.assertIn("## Summary", self.report)

    def test_report_includes_coverage_statistics(self):
        # 2 has-alt out of 4 total = 50%
        self.assertIn("Has alt text: 2", self.report)
        self.assertIn("50.0%", self.report)

    def test_report_includes_gate_status(self):
        self.assertIn("FAIL", self.report)

    def test_report_includes_per_page_breakdown(self):
        self.assertIn("## Per-Page Breakdown", self.report)

    def test_report_includes_page_slug_and_title(self):
        self.assertIn("test-page", self.report)
        self.assertIn("Test Page", self.report)
        self.assertIn("another-page", self.report)
        self.assertIn("Another Page", self.report)

    def test_report_includes_alt_status_classification(self):
        self.assertIn("has-alt", self.report)
        self.assertIn("empty-alt", self.report)
        self.assertIn("missing-alt", self.report)

    def test_report_includes_image_src(self):
        self.assertIn("/uploads/1.jpg", self.report)
        self.assertIn("/uploads/3.jpg", self.report)

    def test_report_includes_alt_value_for_has_alt(self):
        self.assertIn("A nice photo", self.report)

    def test_report_passing_gate(self):
        all_has_alt_stats = [
            PageAltTextStats(
                locale="el", slug="good", title="Good Page",
                entries=[AltTextEntry(status="has-alt", alt_value="X", src="/x.jpg", field="content")],
                total=1, has_alt=1, empty_alt=0, missing_alt=0,
            )
        ]
        report = generate_alt_text_markdown_report(all_has_alt_stats, min_coverage=95.0)
        self.assertIn("PASS", report)

    def test_report_no_images(self):
        report = generate_alt_text_markdown_report([], min_coverage=95.0)
        self.assertIn("100.0%", report)
        self.assertIn("PASS", report)


if __name__ == "__main__":
    unittest.main(verbosity=2)
