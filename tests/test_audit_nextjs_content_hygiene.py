import sys
import unittest
from pathlib import Path

_TOOLS = Path(__file__).resolve().parents[1] / "tools"
if str(_TOOLS) not in sys.path:
    sys.path.insert(0, str(_TOOLS))

from audit_nextjs_content_hygiene import (
    TextSource,
    _extract_anchor_ids,
    _extract_anchor_hrefs,
    _page_path,
    find_broken_anchor_links,
)


class ExtractAnchorIdsTests(unittest.TestCase):
    def test_extracts_ids_from_h_tags(self) -> None:
        html = '<h2 id="section-name">Title</h2><h3 id="sub">Sub</h3>'
        self.assertEqual(_extract_anchor_ids(html), {"section-name", "sub"})

    def test_extracts_ids_from_section_and_div(self) -> None:
        html = '<section id="features"><div id="content">text</div></section>'
        self.assertEqual(_extract_anchor_ids(html), {"features", "content"})

    def test_extracts_ids_with_single_quotes(self) -> None:
        html = "<h2 id='single-quoted'>Title</h2>"
        self.assertEqual(_extract_anchor_ids(html), {"single-quoted"})

    def test_returns_empty_set_when_no_ids(self) -> None:
        html = "<p>No ids here</p><h2>Just a heading</h2>"
        self.assertEqual(_extract_anchor_ids(html), set())

    def test_returns_empty_set_for_empty_string(self) -> None:
        self.assertEqual(_extract_anchor_ids(""), set())

    def test_preserves_case_of_ids(self) -> None:
        html = '<h2 id="FooBar">Title</h2>'
        self.assertEqual(_extract_anchor_ids(html), {"FooBar"})


class ExtractAnchorHrefsTests(unittest.TestCase):
    def test_extracts_fragment_hrefs(self) -> None:
        html = '<a href="#section-1">Link</a><a href="#section-2">Link</a>'
        self.assertEqual(_extract_anchor_hrefs(html), ["section-1", "section-2"])

    def test_extracts_fragment_hrefs_with_single_quotes(self) -> None:
        html = "<a href='#target'>Link</a>"
        self.assertEqual(_extract_anchor_hrefs(html), ["target"])

    def test_ignores_empty_fragment(self) -> None:
        html = '<a href="#">Top</a>'
        self.assertEqual(_extract_anchor_hrefs(html), [])

    def test_ignores_full_urls_with_fragments(self) -> None:
        html = '<a href="/el/page#section">Page link</a>'
        self.assertEqual(_extract_anchor_hrefs(html), [])

    def test_returns_empty_list_when_no_anchor_links(self) -> None:
        html = "<p>No links</p><a href='/about'>About</a>"
        self.assertEqual(_extract_anchor_hrefs(html), [])

    def test_returns_empty_list_for_empty_string(self) -> None:
        self.assertEqual(_extract_anchor_hrefs(""), [])

    def test_preserves_case_of_fragment(self) -> None:
        html = '<a href="#FooBar">Link</a>'
        self.assertEqual(_extract_anchor_hrefs(html), ["FooBar"])


class PagePathTests(unittest.TestCase):
    def test_derives_path_from_page_source(self) -> None:
        self.assertEqual(_page_path("page:el:amygdales:abc123"), "/el/amygdales")

    def test_derives_path_from_ru_page_source(self) -> None:
        self.assertEqual(_page_path("page:ru:udalenie-mindalin:xyz"), "/ru/udalenie-mindalin")

    def test_returns_source_for_component_source(self) -> None:
        self.assertEqual(
            _page_path("component:components_items_accordion_items:42"),
            "component:components_items_accordion_items:42",
        )


class FindBrokenAnchorLinksTests(unittest.TestCase):
    def test_valid_anchor_no_findings(self) -> None:
        sources = [
            TextSource(
                source="page:el:test:doc1",
                field="content",
                text='<h2 id="intro">Intro</h2><a href="#intro">Go to intro</a>',
            )
        ]
        findings = find_broken_anchor_links(sources)
        self.assertEqual(len(findings), 0)

    def test_missing_anchor_flagged(self) -> None:
        sources = [
            TextSource(
                source="page:el:test:doc1",
                field="content",
                text='<h2 id="intro">Intro</h2><a href="#missing">Broken link</a>',
            )
        ]
        findings = find_broken_anchor_links(sources)
        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].page, "/el/test")
        self.assertEqual(findings[0].href, "#missing")
        self.assertEqual(findings[0].source, "page.content")

    def test_mixed_case_anchor_flagged(self) -> None:
        sources = [
            TextSource(
                source="page:el:test:doc1",
                field="content",
                text='<h2 id="Foo">Title</h2><a href="#foo">Broken case link</a>',
            )
        ]
        findings = find_broken_anchor_links(sources)
        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].href, "#foo")

    def test_mixed_case_matching_id_not_flagged(self) -> None:
        sources = [
            TextSource(
                source="page:el:test:doc1",
                field="content",
                text='<h2 id="Foo">Title</h2><a href="#Foo">Good case link</a>',
            )
        ]
        findings = find_broken_anchor_links(sources)
        self.assertEqual(len(findings), 0)

    def test_empty_fragment_not_flagged(self) -> None:
        sources = [
            TextSource(
                source="page:el:test:doc1",
                field="content",
                text='<a href="#">Top</a>',
            )
        ]
        findings = find_broken_anchor_links(sources)
        self.assertEqual(len(findings), 0)

    def test_multiple_valid_anchors_no_findings(self) -> None:
        sources = [
            TextSource(
                source="page:el:test:doc1",
                field="content",
                text='<h2 id="a">A</h2><h3 id="b">B</h3><a href="#a">A</a><a href="#b">B</a>',
            )
        ]
        findings = find_broken_anchor_links(sources)
        self.assertEqual(len(findings), 0)

    def test_mixed_valid_and_broken(self) -> None:
        sources = [
            TextSource(
                source="page:el:test:doc1",
                field="content",
                text='<h2 id="a">A</h2><a href="#a">OK</a><a href="#b">Broken</a>',
            )
        ]
        findings = find_broken_anchor_links(sources)
        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].href, "#b")

    def test_no_anchor_links_no_findings(self) -> None:
        sources = [
            TextSource(
                source="page:el:test:doc1",
                field="content",
                text="<h2 id='intro'>Intro</h2><p>Just text</p>",
            )
        ]
        findings = find_broken_anchor_links(sources)
        self.assertEqual(len(findings), 0)

    def test_no_ids_all_anchors_broken(self) -> None:
        sources = [
            TextSource(
                source="page:el:test:doc1",
                field="content",
                text='<a href="#a">A</a><a href="#b">B</a>',
            )
        ]
        findings = find_broken_anchor_links(sources)
        self.assertEqual(len(findings), 2)

    def test_cross_field_anchor_on_same_page_valid(self) -> None:
        sources = [
            TextSource(
                source="page:el:test:doc1",
                field="content",
                text='<h2 id="features">Features</h2>',
            ),
            TextSource(
                source="page:el:test:doc1",
                field="excerpt",
                text='<a href="#features">See features</a>',
            ),
        ]
        findings = find_broken_anchor_links(sources)
        self.assertEqual(len(findings), 0)

    def test_cross_field_missing_anchor_flagged(self) -> None:
        sources = [
            TextSource(
                source="page:el:test:doc1",
                field="content",
                text="<h2 id='intro'>Intro</h2>",
            ),
            TextSource(
                source="page:el:test:doc1",
                field="excerpt",
                text='<a href="#nonexistent">Broken</a>',
            ),
        ]
        findings = find_broken_anchor_links(sources)
        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].href, "#nonexistent")

    def test_self_closing_element_with_id_is_valid_target(self) -> None:
        sources = [
            TextSource(
                source="page:el:test:doc1",
                field="content",
                text='<img id="hero-image" src="x.jpg" /><a href="#hero-image">Hero</a>',
            )
        ]
        findings = find_broken_anchor_links(sources)
        self.assertEqual(len(findings), 0)

    def test_full_url_with_fragment_not_treated_as_anchor_link(self) -> None:
        sources = [
            TextSource(
                source="page:el:test:doc1",
                field="content",
                text='<a href="/el/other-page#section">Other page</a>',
            )
        ]
        findings = find_broken_anchor_links(sources)
        self.assertEqual(len(findings), 0)

    def test_component_source_checked_individually(self) -> None:
        sources = [
            TextSource(
                source="component:components_items_accordion_items:42",
                field="content",
                text='<h3 id="faq-1">Question</h3><a href="#faq-1">Link</a>',
            )
        ]
        findings = find_broken_anchor_links(sources)
        self.assertEqual(len(findings), 0)

    def test_component_source_with_broken_anchor(self) -> None:
        sources = [
            TextSource(
                source="component:components_items_accordion_items:42",
                field="content",
                text='<h3 id="faq-1">Question</h3><a href="#faq-2">Missing</a>',
            )
        ]
        findings = find_broken_anchor_links(sources)
        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].page, "component:components_items_accordion_items:42")
        self.assertEqual(findings[0].href, "#faq-2")

    def test_duplicate_href_not_double_flagged(self) -> None:
        sources = [
            TextSource(
                source="page:el:test:doc1",
                field="content",
                text='<h2 id="a">A</h2><a href="#b">B</a><a href="#b">B again</a>',
            )
        ]
        findings = find_broken_anchor_links(sources)
        self.assertEqual(len(findings), 2)

    def test_anchor_target_with_additional_attributes(self) -> None:
        sources = [
            TextSource(
                source="page:el:test:doc1",
                field="content",
                text='<h2 class="heading" id="target" data-x="1">Title</h2><a href="#target">Link</a>',
            )
        ]
        findings = find_broken_anchor_links(sources)
        self.assertEqual(len(findings), 0)

    def test_empty_sources_returns_empty_list(self) -> None:
        self.assertEqual(find_broken_anchor_links([]), [])


if __name__ == "__main__":
    unittest.main()
