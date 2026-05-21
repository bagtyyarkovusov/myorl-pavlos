import unittest

from cms_html_cleanup import html_has_broken_images, is_valid_img_src, remove_broken_images


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


if __name__ == "__main__":
    unittest.main()
