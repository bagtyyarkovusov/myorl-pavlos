import sys
import unittest
from pathlib import Path

_TOOLS = Path(__file__).resolve().parents[1] / "tools"
if str(_TOOLS) not in sys.path:
    sys.path.insert(0, str(_TOOLS))

# Functions under test will be added as we implement them.
# Import here to ensure early failure if a name is misspelled.


class StripExtraH1TagsTests(unittest.TestCase):
    """Tests for tools/strip_extra_h1_tags.py — strip_extra_h1_tags()."""

    def setUp(self) -> None:
        from strip_extra_h1_tags import strip_extra_h1_tags

        self.fn = strip_extra_h1_tags

    def test_idempotent_on_no_h1(self) -> None:
        html = "<p>Hello</p><h2>Subhead</h2>"
        out, count = self.fn(html)
        self.assertEqual(out, html)
        self.assertEqual(count, 0)

    def test_idempotent_on_single_h1(self) -> None:
        html = "<h1>Main heading</h1><p>Content</p>"
        out, count = self.fn(html)
        self.assertEqual(out, html)
        self.assertEqual(count, 0)

    def test_demotes_second_h1_to_h2(self) -> None:
        html = "<h1>First</h1><p>Body</p><h1>Second</h1>"
        out, count = self.fn(html)
        self.assertEqual(count, 1)
        self.assertEqual(out.count("<h1>"), 1)
        self.assertEqual(out.count("<h2>"), 1)
        self.assertIn("<h2>Second</h2>", out)

    def test_demotes_third_and_beyond(self) -> None:
        html = "<h1>A</h1><h1>B</h1><h1>C</h1><h1>D</h1>"
        out, count = self.fn(html)
        self.assertEqual(count, 3)
        self.assertEqual(out.count("<h1>"), 1)
        self.assertEqual(out.count("<h2>"), 3)

    def test_preserves_attributes_on_demoted(self) -> None:
        html = (
            '<h1 id="main">Title</h1>'
            '<p>Body</p>'
            '<h1 class="sub" id="extra">Other</h1>'
        )
        out, count = self.fn(html)
        self.assertEqual(count, 1)
        self.assertIn('<h2 class="sub" id="extra">Other</h2>', out)
        self.assertIn('<h1 id="main">Title</h1>', out)

    def test_preserves_inner_html(self) -> None:
        html = (
            "<h1>Hello</h1>"
            "<h1>World <em>italic</em> and <a href='/'>link</a></h1>"
        )
        out, count = self.fn(html)
        self.assertEqual(count, 1)
        self.assertIn("<h2>World <em>italic</em> and <a href=\"/\">link</a></h2>", out)

    def test_nested_h1_not_counted_twice(self) -> None:
        """BeautifulSoup doesn't nest h1 in h1, but h1 inside a div inside content works."""
        html = "<h1>Outer</h1><div><h1>Inner</h1></div><h1>Sibling</h1>"
        out, count = self.fn(html)
        # First h1 kept, the next two demoted
        self.assertEqual(count, 2)
        self.assertEqual(out.count("<h1>"), 1)

    def test_mixed_headings_untouched(self) -> None:
        html = "<h1>Main</h1><h2>Sub</h2><h3>Subsub</h3><h1>Another</h1>"
        out, count = self.fn(html)
        self.assertEqual(count, 1)
        self.assertEqual(out.count("<h1>"), 1)
        self.assertEqual(out.count("<h2>"), 2)  # original h2 + demoted h1
        self.assertEqual(out.count("<h3>"), 1)

    def test_idempotent_re_run_on_fixed_content(self) -> None:
        html = "<h1>A</h1><h1>B</h1><h1>C</h1>"
        first_pass, count1 = self.fn(html)
        self.assertGreater(count1, 0)
        second_pass, count2 = self.fn(first_pass)
        self.assertEqual(count2, 0)
        self.assertEqual(second_pass, first_pass)

    def test_none_input(self) -> None:
        out, count = self.fn(None)
        self.assertEqual(out, "")
        self.assertEqual(count, 0)

    def test_empty_string(self) -> None:
        out, count = self.fn("")
        self.assertEqual(out, "")
        self.assertEqual(count, 0)

    def test_no_html_headings(self) -> None:
        html = "<p>Just a paragraph</p><ul><li>Item</li></ul>"
        out, count = self.fn(html)
        self.assertEqual(out, html)
        self.assertEqual(count, 0)

    def test_self_closing_h1_not_a_heading(self) -> None:
        """<h1/> is not a real heading — bs4 parses it oddly, but shouldn't crash."""
        html = "<h1>Real</h1><h1/>"
        out, count = self.fn(html)
        # Should not crash
        self.assertEqual(out.count("<h1>"), 1)

    def test_h1_with_only_whitespace(self) -> None:
        html = "<h1>  </h1><h1>Real</h1>"
        out, count = self.fn(html)
        # Both are h1 elements; the second gets demoted
        self.assertEqual(count, 1)


class AuditH1HierarchyTests(unittest.TestCase):
    """Tests for the audit_h1_hierarchy() function."""

    def setUp(self) -> None:
        from audit_nextjs_content_hygiene import audit_h1_hierarchy

        self.fn = audit_h1_hierarchy

    def _make_source(self, source_id: str, field: str, text: str) -> "TextSource":
        from audit_nextjs_content_hygiene import TextSource

        return TextSource(source=source_id, field=field, text=text)

    def test_single_h1_clean(self) -> None:
        sources = [
            self._make_source("page:el:test:doc1", "content", "<h1>Title</h1><p>Body</p>"),
        ]
        result = self.fn(sources)
        self.assertEqual(len(result), 0)

    def test_zero_h1_warns(self) -> None:
        sources = [
            self._make_source("page:el:test:doc1", "content", "<p>No heading here</p>"),
        ]
        result = self.fn(sources)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["h1Count"], 0)
        self.assertEqual(result[0]["severity"], "warn")

    def test_two_h1_flags(self) -> None:
        sources = [
            self._make_source(
                "page:el:test:doc1",
                "content",
                "<h1>First</h1><p>Body</p><h1>Second</h1>",
            ),
        ]
        result = self.fn(sources)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["h1Count"], 2)
        self.assertEqual(result[0]["severity"], "flag")

    def test_three_h1_flags(self) -> None:
        sources = [
            self._make_source(
                "page:el:test:doc1",
                "content",
                "<h1>A</h1><h1>B</h1><h1>C</h1>",
            ),
        ]
        result = self.fn(sources)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["h1Count"], 3)
        self.assertEqual(result[0]["severity"], "flag")

    def test_h1_across_multiple_fields(self) -> None:
        sources = [
            self._make_source("page:el:test:doc1", "content", "<h1>Main</h1>"),
            self._make_source("page:el:test:doc1", "excerpt", "<h1>Also H1</h1>"),
        ]
        result = self.fn(sources)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["h1Count"], 2)
        self.assertEqual(result[0]["severity"], "flag")

    def test_multiple_pages(self) -> None:
        sources = [
            self._make_source("page:el:good:doc1", "content", "<h1>One</h1>"),
            self._make_source("page:el:bad:doc2", "content", "<h1>A</h1><h1>B</h1>"),
            self._make_source("page:el:missing:doc3", "content", "<p>None</p>"),
        ]
        result = self.fn(sources)
        self.assertEqual(len(result), 2)
        severities = {r["page"]: r["severity"] for r in result}
        self.assertEqual(severities.get("page:el:bad"), "flag")
        self.assertEqual(severities.get("page:el:missing"), "warn")

    def test_page_key_collapses_document_id(self) -> None:
        """Page key should strip the document_id suffix from the source."""
        sources = [
            self._make_source(
                "page:el:slug:doc-id-123",
                "content",
                "<h1>One</h1><h1>Two</h1>",
            ),
        ]
        result = self.fn(sources)
        self.assertEqual(len(result), 1)
        # Page key collapses the document_id
        self.assertEqual(result[0]["page"], "page:el:slug")

    def test_component_source_not_treated_as_page(self) -> None:
        sources = [
            self._make_source(
                "component:components_items_accordion_items:42",
                "content",
                "<h1>In component</h1><h1>Another</h1>",
            ),
        ]
        result = self.fn(sources)
        # Component sources have different prefix; they should still be reported
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["h1Count"], 2)

    def test_no_sources(self) -> None:
        result = self.fn([])
        self.assertEqual(len(result), 0)

    def test_sources_without_h1_tags(self) -> None:
        sources = [
            self._make_source("page:el:x:doc1", "content", "<p>Text</p>"),
            self._make_source("page:el:x:doc1", "excerpt", "<p>More text</p>"),
        ]
        result = self.fn(sources)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["severity"], "warn")

    def test_page_with_only_non_html_fields(self) -> None:
        sources = [
            self._make_source("page:el:slug:doc1", "excerpt", "Plain text, no HTML"),
        ]
        result = self.fn(sources)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["severity"], "warn")
        self.assertEqual(result[0]["h1Count"], 0)

    # ── title-aware H1 audit (virtual H1 from page.title) ────────────

    def test_title_only_page_passes(self) -> None:
        """Page with a title but zero <h1> in content has 1 virtual H1 → clean."""
        sources = [
            self._make_source("page:el:slug:doc1", "content", "<p>No H1 here</p>"),
        ]
        titles = {"page:el:slug": "My Page Title"}
        result = self.fn(sources, page_titles=titles)
        self.assertEqual(len(result), 0)

    def test_title_plus_body_h1_flags_multiple(self) -> None:
        """Title (virtual H1) + one <h1> in body = 2 → flag."""
        sources = [
            self._make_source(
                "page:el:slug:doc1",
                "content",
                "<h1>Body H1</h1><p>Text</p>",
            ),
        ]
        titles = {"page:el:slug": "My Page Title"}
        result = self.fn(sources, page_titles=titles)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["h1Count"], 2)
        self.assertEqual(result[0]["severity"], "flag")
        self.assertIn("title", [f["field"] for f in result[0]["fields"]])

    def test_title_plus_two_body_h1_flags(self) -> None:
        """Title (virtual H1) + two <h1> in body = 3 → flag."""
        sources = [
            self._make_source(
                "page:el:slug:doc1",
                "content",
                "<h1>A</h1><p>Body</p><h1>B</h1>",
            ),
        ]
        titles = {"page:el:slug": "Extra H1s"}
        result = self.fn(sources, page_titles=titles)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["h1Count"], 3)
        self.assertEqual(result[0]["severity"], "flag")

    def test_empty_title_no_h1_warns(self) -> None:
        """Page without a title and without content H1 → warn (no H1 at all)."""
        sources = [
            self._make_source("page:el:slug:doc1", "content", "<p>Just text</p>"),
        ]
        titles: dict[str, str] = {}
        result = self.fn(sources, page_titles=titles)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["h1Count"], 0)
        self.assertEqual(result[0]["severity"], "warn")

    def test_title_only_page_no_sources_still_virtual(self) -> None:
        """Page with a title but no text sources; still 1 virtual H1 → clean."""
        titles = {"page:el:slug": "Only a title"}
        result = self.fn([], page_titles=titles)
        # No sources → page_h1 is empty → nothing to report
        self.assertEqual(len(result), 0)

    def test_multiple_pages_mixed_titles(self) -> None:
        sources = [
            self._make_source("page:el:good:doc1", "content", "<p>No H1</p>"),
            self._make_source("page:el:bad:doc2", "content", "<h1>Extra</h1>"),
            self._make_source("page:el:none:doc3", "content", "<p>None</p>"),
        ]
        titles = {"page:el:good": "Has Title", "page:el:bad": "Also Has Title"}
        result = self.fn(sources, page_titles=titles)
        # good: title + no content H1 = 1 → clean
        # bad: title + 1 content H1 = 2 → flag
        # none: no title + no content H1 = 0 → warn
        self.assertEqual(len(result), 2)
        severities = {r["page"]: r["severity"] for r in result}
        self.assertEqual(severities.get("page:el:bad"), "flag")
        self.assertEqual(severities.get("page:el:none"), "warn")

    def test_component_not_affected_by_titles(self) -> None:
        """Components don't have titles in page_titles and are unaffected."""
        sources = [
            self._make_source(
                "component:components_items_accordion_items:42",
                "content",
                "<h1>One</h1><h1>Two</h1>",
            ),
        ]
        titles = {"page:el:slug": "Has Title"}
        result = self.fn(sources, page_titles=titles)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["h1Count"], 2)
        self.assertEqual(result[0]["severity"], "flag")


class StripExtraH1TagsScriptTests(unittest.TestCase):
    """Integration-style tests for the strip_extra_h1_tags script module."""

    def test_strip_page_fields_demotes_h1(self) -> None:
        from strip_extra_h1_tags import strip_page_fields

        fields = {
            "content": "<h1>Main</h1><p>Body</p><h1>Extra</h1>",
            "excerpt": "<h1>Also</h1><h1>Too many</h1>",
        }
        result = strip_page_fields(fields)
        self.assertEqual(result["content"], "<h1>Main</h1><p>Body</p><h2>Extra</h2>")
        self.assertEqual(result["excerpt"], "<h1>Also</h1><h2>Too many</h2>")

    def test_strip_page_fields_skips_clean_fields(self) -> None:
        from strip_extra_h1_tags import strip_page_fields

        fields = {
            "content": "<h1>Main</h1><p>Body</p>",
            "excerpt": "Plain text",
        }
        result = strip_page_fields(fields)
        # No changes needed — returns empty dict
        self.assertEqual(len(result), 0)

    def test_strip_page_fields_returns_only_changed(self) -> None:
        from strip_extra_h1_tags import strip_page_fields

        fields = {
            "content": "<h1>A</h1><h1>B</h1>",
        }
        result = strip_page_fields(fields)
        self.assertEqual(len(result), 1)
        self.assertIn("content", result)
        self.assertEqual(result["content"], "<h1>A</h1><h2>B</h2>")

    def test_strip_page_fields_none_and_empty(self) -> None:
        from strip_extra_h1_tags import strip_page_fields

        fields: dict[str, str | None] = {
            "content": None,
            "excerpt": "",
        }
        result = strip_page_fields(fields)
        self.assertEqual(len(result), 0)


if __name__ == "__main__":
    unittest.main()
