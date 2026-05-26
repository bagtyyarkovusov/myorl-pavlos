import sys
import unittest
from pathlib import Path

_TOOLS = Path(__file__).resolve().parents[1] / "tools"
if str(_TOOLS) not in sys.path:
    sys.path.insert(0, str(_TOOLS))

from cms_html_cleanup import (
    convert_prose_pre_to_p,
    count_legacy_markup_issues,
    flag_deprecated_semantic_tags,
    flag_essential_style_attrs,
    flag_mixed_semantic_presentational,
    html_has_broken_images,
    is_valid_img_src,
    normalize_legacy_modx_markup,
    normalize_youtube_iframes,
    promote_h3_to_h2,
    remove_broken_images,
    split_long_paragraphs,
    split_multi_image_paragraphs,
    strip_font_tags,
    strip_modx_snippets,
    strip_nbsp_from_html,
    unwrap_legacy_wrappers,
)


class RemoveBrokenImagesTests(unittest.TestCase):
    def test_keeps_uploaded_images(self) -> None:
        html = '<p><img alt="" src="/uploads/img2_edc7c6173c.jpg" width="800"></p>'
        cleaned = remove_broken_images(html)
        self.assertIn("/uploads/img2_edc7c6173c.jpg", cleaned)
        self.assertEqual(cleaned.count("<img"), 1)

    def test_removes_word_msohtmlclip_artifact(self) -> None:
        html = (
            '<p><img alt="" height="15" '
            'src="file:///C:/Users/D603~1/AppData/Local/Temp/msohtmlclip1/01/clip_image003.gif" '
            'title="Нажмите и перетащите" width="15"/></p>'
            '<p><img alt="" src="/uploads/img2_edc7c6173c.jpg" width="800"/></p>'
        )
        cleaned = remove_broken_images(html)
        self.assertNotIn("msohtmlclip", cleaned)
        self.assertNotIn("перетащите", cleaned)
        self.assertIn("/uploads/img2_edc7c6173c.jpg", cleaned)

    def test_removes_img_without_src(self) -> None:
        html = '<p><img alt="" height="15" title="Нажмите и перетащите" width="15"></p>'
        self.assertEqual(remove_broken_images(html), "")

    def test_removes_empty_src(self) -> None:
        html = '<p><img alt="" src="" width="15"></p><p>Body</p>'
        cleaned = remove_broken_images(html)
        self.assertNotIn("<img", cleaned)
        self.assertIn("Body", cleaned)


class IsValidImgSrcTests(unittest.TestCase):
    def test_rejects_blank_and_local_paths(self) -> None:
        self.assertFalse(is_valid_img_src(None))
        self.assertFalse(is_valid_img_src(""))
        self.assertFalse(is_valid_img_src("file:///tmp/x.gif"))
        self.assertFalse(is_valid_img_src("/Temp/msohtmlclip1/clip.gif"))

    def test_accepts_upload_paths(self) -> None:
        self.assertTrue(is_valid_img_src("/uploads/img2_edc7c6173c.jpg"))


class HtmlHasBrokenImagesTests(unittest.TestCase):
    def test_detects_word_clip_and_srcless_tags(self) -> None:
        html = (
            '<p><img alt="" height="15" '
            'src="file:///C:/Temp/msohtmlclip1/01/clip.gif" width="15"/></p>'
        )
        self.assertTrue(html_has_broken_images(html))

    def test_ignores_valid_upload_images(self) -> None:
        html = '<p><img alt="" src="/uploads/img2.jpg" width="800"/></p>'
        self.assertFalse(html_has_broken_images(html))


class StripNbspTests(unittest.TestCase):
    def test_replaces_nbsp_text_nodes(self) -> None:
        html = '<p>x\xa0y</p><p>a&nbsp;b</p>'
        out, cnt = strip_nbsp_from_html(html)
        self.assertNotIn("\xa0", out)
        self.assertIn("x y", out)
        self.assertGreater(cnt, 0)


class SplitLongParagraphs(unittest.TestCase):
    def test_splits_plain_overflow_paragraph(self) -> None:
        long_sentence = ("word " * 200).strip() + "."
        chunk = ("short bit. ") * 3
        html = f"<p>{chunk}{long_sentence}</p>"
        out, splits = split_long_paragraphs(html, max_chars=120)
        self.assertGreater(splits, 0)
        self.assertGreater(out.count("<p>"), 1)


class PromoteHeadingTests(unittest.TestCase):
    def test_renames_all_h3(self) -> None:
        html = "<article><p>a</p><h3>F</h3><p>m</p><h3>Z</h3></article>"
        out, n = promote_h3_to_h2(html)
        self.assertEqual(n, 2)
        self.assertNotIn("<h3>", out.lower())
        self.assertGreaterEqual(out.lower().count("<h2"), 2)


class NormalizeLegacyModxMarkupTests(unittest.TestCase):
    def test_unwraps_tab_content_and_strips_alignment(self) -> None:
        html = (
            '<div class="tab-content">'
            '<p align="center"><img alt="" height="444" src="/uploads/x.png" width="784"/></p>'
            '<p align="center"><iframe height="360" src="//www.youtube.com/embed/abc" width="640"></iframe></p>'
            "</div>"
        )
        out, stats = normalize_legacy_modx_markup(html)
        self.assertNotIn("tab-content", out)
        self.assertNotIn('align="center"', out)
        self.assertNotIn('height="360"', out)
        self.assertIn('src="https://www.youtube.com/embed/abc"', out)
        self.assertGreater(stats.get("unwrap_wrappers", 0), 0)

    def test_splits_multi_image_paragraph(self) -> None:
        html = (
            '<p><img alt="a" src="/uploads/a.jpg" width="400"/>'
            '<img alt="b" src="/uploads/b.jpg" width="400"/></p>'
        )
        out, stats = normalize_legacy_modx_markup(html)
        self.assertEqual(out.count("<img"), 2)
        self.assertEqual(out.count("<p>"), 2)
        self.assertGreaterEqual(stats.get("split_multi_image_paragraphs", 0), 1)

    def test_converts_prose_pre_to_paragraph(self) -> None:
        html = "<pre>PDS plate description text for readers.</pre>"
        out, stats = normalize_legacy_modx_markup(html)
        self.assertIn("<p>PDS plate description text for readers.</p>", out)
        self.assertNotIn("<pre>", out)
        self.assertGreaterEqual(stats.get("convert_prose_pre_to_p", 0), 1)

    def test_removes_legacy_video_tags(self) -> None:
        html = '<p><video controls="controls"><source src="files/video/x.mp4" type="video/mp4"/></video></p>'
        out, stats = normalize_legacy_modx_markup(html)
        self.assertNotIn("<video", out)
        self.assertGreaterEqual(stats.get("remove_legacy_video_tags", 0), 1)


class LegacyMarkupAuditTests(unittest.TestCase):
    def test_counts_legacy_patterns(self) -> None:
        html = '<div class="tab-content"><p style="text-align:center" align="center"><img width="1" src="file://x"/></p></div>'
        counts = count_legacy_markup_issues(html)
        self.assertGreater(counts["tab_content_wrapper"], 0)
        self.assertGreater(counts["inline_style"], 0)
        self.assertGreater(counts["align_attr"], 0)
        self.assertGreater(counts["file_or_msohtmlclip"], 0)


class StripFontTagsTests(unittest.TestCase):
    def test_unwraps_font_tags_preserving_inner_content(self) -> None:
        html = '<p><font color="red">Important text</font> and normal</p>'
        out, count = strip_font_tags(html)
        self.assertEqual(count, 1)
        self.assertNotIn("<font", out.lower())
        self.assertIn("Important text", out)
        self.assertIn("and normal", out)

    def test_unwraps_nested_font_tags(self) -> None:
        html = '<p><font size="4"><font color="blue">Nested</font></font></p>'
        out, count = strip_font_tags(html)
        self.assertNotIn("<font", out.lower())
        self.assertIn("Nested", out)
        self.assertEqual(count, 2)

    def test_noop_when_no_font_tags(self) -> None:
        html = "<p>Plain paragraph with <strong>bold</strong> text.</p>"
        out, count = strip_font_tags(html)
        self.assertEqual(count, 0)
        self.assertEqual(out, html)

    def test_handles_none_input(self) -> None:
        out, count = strip_font_tags(None)
        self.assertEqual(out, "")
        self.assertEqual(count, 0)


class StripModxSnippetsTests(unittest.TestCase):
    def test_strips_simple_snippet(self) -> None:
        html = "<p>Before [[MySnippet]] after</p>"
        out, count = strip_modx_snippets(html)
        self.assertEqual(count, 1)
        self.assertNotIn("[[MySnippet]]", out)
        self.assertIn("Before  after", out)

    def test_strips_multiple_snippets(self) -> None:
        html = "<p>[[Header]] body [[Footer]] end</p>"
        out, count = strip_modx_snippets(html)
        self.assertEqual(count, 2)
        self.assertNotIn("[[Header]]", out)
        self.assertNotIn("[[Footer]]", out)

    def test_strips_snippet_inside_paragraph(self) -> None:
        html = "<p>Text [[inlineSnippet]] more text</p>"
        out, count = strip_modx_snippets(html)
        self.assertEqual(count, 1)
        self.assertNotIn("[[inlineSnippet]]", out)
        self.assertIn("Text  more text", out)

    def test_noop_when_no_snippets(self) -> None:
        html = "<p>Plain text with [single brackets] and no double brackets.</p>"
        out, count = strip_modx_snippets(html)
        self.assertEqual(count, 0)
        self.assertEqual(out, html)

    def test_handles_empty_input(self) -> None:
        out, count = strip_modx_snippets("")
        self.assertEqual(out, "")
        self.assertEqual(count, 0)


class FlagDeprecatedSemanticTagsTests(unittest.TestCase):
    def test_flags_center_tag(self) -> None:
        html = '<p>Intro</p><center>Centered content</center><p>Outro</p>'
        findings = flag_deprecated_semantic_tags(html)
        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0]["tag"], "center")
        self.assertIn("Centered content", findings[0]["textPreview"])

    def test_flags_u_tag(self) -> None:
        html = '<p>Some <u>underlined</u> text</p>'
        findings = flag_deprecated_semantic_tags(html)
        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0]["tag"], "u")

    def test_flags_multiple_deprecated_tags(self) -> None:
        html = '<center>Title</center><p><u>underline</u></p>'
        findings = flag_deprecated_semantic_tags(html)
        self.assertEqual(len(findings), 2)

    def test_no_findings_for_clean_html(self) -> None:
        html = "<p><strong>Bold</strong> and <em>italic</em></p>"
        findings = flag_deprecated_semantic_tags(html)
        self.assertEqual(len(findings), 0)


class FlagEssentialStyleAttrsTests(unittest.TestCase):
    def test_flags_td_with_style(self) -> None:
        html = '<table><tr><td style="width: 50%">Column 1</td></tr></table>'
        findings = flag_essential_style_attrs(html)
        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0]["tag"], "td")
        self.assertIn("width: 50%", findings[0]["style"])

    def test_flags_th_with_style(self) -> None:
        html = '<table><tr><th style="text-align: left">Header</th></tr></table>'
        findings = flag_essential_style_attrs(html)
        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0]["tag"], "th")

    def test_no_findings_for_td_without_style(self) -> None:
        html = "<table><tr><td>Plain cell</td></tr></table>"
        findings = flag_essential_style_attrs(html)
        self.assertEqual(len(findings), 0)

    def test_no_findings_for_style_on_non_essential_elements(self) -> None:
        html = '<p style="color: red">This style is auto-stripped elsewhere</p>'
        findings = flag_essential_style_attrs(html)
        self.assertEqual(len(findings), 0)


class FlagMixedSemanticPresentationalTests(unittest.TestCase):
    def test_flags_center_with_strong_inside(self) -> None:
        html = '<center><strong>Bold centered</strong></center>'
        findings = flag_mixed_semantic_presentational(html)
        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0]["tag"], "center")
        self.assertIn("strong", findings[0]["children"])

    def test_flags_u_with_style_attr(self) -> None:
        html = '<u style="color: blue">Styled underline</u>'
        findings = flag_mixed_semantic_presentational(html)
        self.assertEqual(len(findings), 1)

    def test_no_findings_for_simple_deprecated_tag(self) -> None:
        html = "<center>Plain centered text</center>"
        findings = flag_mixed_semantic_presentational(html)
        self.assertEqual(len(findings), 0)

    def test_no_findings_for_clean_html(self) -> None:
        html = "<p><strong>Semantic bold</strong></p>"
        findings = flag_mixed_semantic_presentational(html)
        self.assertEqual(len(findings), 0)


class FullPipelineWithNewPatternsTests(unittest.TestCase):
    def test_strips_font_tags_in_full_pipeline(self) -> None:
        html = (
            '<p>Text before</p>'
            '<p><font color="red">Legacy font text</font></p>'
            '<p>Text after</p>'
        )
        out, stats = normalize_legacy_modx_markup(html)
        self.assertNotIn("<font", out.lower())
        self.assertIn("Legacy font text", out)
        self.assertGreater(stats.get("strip_font_tags", 0), 0)

    def test_strips_modx_snippets_in_full_pipeline(self) -> None:
        html = "<p>Before [[MySnippet]] after</p>"
        out, stats = normalize_legacy_modx_markup(html)
        self.assertNotIn("[[MySnippet]]", out)
        self.assertGreater(stats.get("strip_modx_snippets", 0), 0)

    def test_idempotent_re_run_produces_zero_changes(self) -> None:
        html = (
            '<p><font color="red">Text</font> [[Snippet]] more &nbsp;text</p>'
            '<p></p><div></div>'
        )
        out, stats = normalize_legacy_modx_markup(html)
        self.assertGreater(sum(stats.values()), 0)

        second_out, second_stats = normalize_legacy_modx_markup(out)
        self.assertEqual(sum(second_stats.values()), 0,
                         f"Second pass should change nothing, got: {second_stats}")
        self.assertEqual(second_out, out)

    def test_counts_legacy_patterns_including_new_ones(self) -> None:
        html = (
            '<div class="tab-content">'
            '<center>Centered</center>'
            '<p><font color="red">Old font</font></p>'
            '<p>[[MySnippet]] text</p>'
            '<table><tr><td style="width:50%">Cell</td></tr></table>'
            "</div>"
        )
        counts = count_legacy_markup_issues(html)
        self.assertGreater(counts["tab_content_wrapper"], 0)
        self.assertGreater(counts["font_tags"], 0)
        self.assertGreater(counts["modx_snippets"], 0)
        self.assertGreater(counts["deprecated_tags"], 0)
        self.assertGreater(counts["essential_style_attrs"], 0)


if __name__ == "__main__":
    unittest.main()
