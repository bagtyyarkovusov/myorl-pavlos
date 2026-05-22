import sys
import unittest
from pathlib import Path

_TOOLS = Path(__file__).resolve().parents[1] / "tools"
if str(_TOOLS) not in sys.path:
    sys.path.insert(0, str(_TOOLS))

from cms_html_cleanup import (
    html_has_broken_images,
    is_valid_img_src,
    promote_h3_to_h2,
    remove_broken_images,
    split_long_paragraphs,
    strip_nbsp_from_html,
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


if __name__ == "__main__":
    unittest.main()
