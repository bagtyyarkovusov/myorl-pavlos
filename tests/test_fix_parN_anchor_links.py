import sys
import unittest
from pathlib import Path

_TOOLS = Path(__file__).resolve().parents[1] / "tools"
if str(_TOOLS) not in sys.path:
    sys.path.insert(0, str(_TOOLS))

from fix_parN_anchor_links import fix_par_anchors

# Real content structure extracted from the repair plan
_SAMPLE_CONTENT = """<div>
<div class="accordion-heading"><a href="#par1">Link 1</a></div>
<div class="accordion-heading"><a href="#par2">Link 2</a></div>
<div class="accordion-heading"><a href="#par3">Link 3</a></div>
</div>
<h4>Heading 1</h4>
<p>Content 1</p>
<h4>Heading 2</h4>
<p>Content 2</p>
<h4>Heading 3</h4>
<p>Content 3</p>
<h4>Extra heading</h4>
<p>Extra content</p>"""


class FixParAnchorsTests(unittest.TestCase):
    def test_adds_par_ids_to_first_n_h4_tags(self) -> None:
        result, count = fix_par_anchors(_SAMPLE_CONTENT)
        self.assertEqual(count, 3)
        self.assertIn('<h4 id="par1">Heading 1</h4>', result)
        self.assertIn('<h4 id="par2">Heading 2</h4>', result)
        self.assertIn('<h4 id="par3">Heading 3</h4>', result)

    def test_does_not_add_id_to_h4_beyond_par_count(self) -> None:
        result, count = fix_par_anchors(_SAMPLE_CONTENT)
        self.assertEqual(count, 3)
        # The 4th h4 should NOT get an id
        self.assertIn("<h4>Extra heading</h4>", result)

    def test_skips_h4_that_already_has_an_id(self) -> None:
        html = """<div>
<div class="accordion-heading"><a href="#par1">Link 1</a></div>
<div class="accordion-heading"><a href="#par2">Link 2</a></div>
</div>
<h4 id="already-set">Heading 1</h4>
<h4>Heading 2</h4>"""
        result, count = fix_par_anchors(html)
        # Only 1 ID was added: par1 is skipped (h4 already has id), par2 is added
        self.assertEqual(count, 1)
        self.assertIn('<h4 id="already-set">Heading 1</h4>', result)
        self.assertIn('<h4 id="par2">Heading 2</h4>', result)

    def test_returns_zero_for_no_accordion_div(self) -> None:
        html = "<h4>Heading 1</h4><h4>Heading 2</h4>"
        result, count = fix_par_anchors(html)
        self.assertEqual(count, 0)
        self.assertEqual(result, html)

    def test_returns_zero_for_empty_string(self) -> None:
        result, count = fix_par_anchors("")
        self.assertEqual(count, 0)
        self.assertEqual(result, "")

    def test_returns_zero_for_none(self) -> None:
        result, count = fix_par_anchors(None)
        self.assertEqual(count, 0)
        self.assertEqual(result, "")

    def test_returns_zero_when_no_par_links_in_accordion(self) -> None:
        html = """<div>
<div class="accordion-heading"><a href="/other-page">Not a par link</a></div>
</div>
<h4>Heading 1</h4>"""
        result, count = fix_par_anchors(html)
        self.assertEqual(count, 0)

    def test_preserves_other_attributes_on_h4(self) -> None:
        html = """<div>
<div class="accordion-heading"><a href="#par1">Link 1</a></div>
</div>
<h4 class="section-title" data-foo="bar">Heading 1</h4>"""
        result, count = fix_par_anchors(html)
        self.assertEqual(count, 1)
        self.assertIn('class="section-title"', result)
        self.assertIn('data-foo="bar"', result)
        self.assertIn('id="par1"', result)

    def test_idempotent_second_run_produces_same_output(self) -> None:
        result1, count1 = fix_par_anchors(_SAMPLE_CONTENT)
        result2, count2 = fix_par_anchors(result1)
        self.assertEqual(count1, 3)
        self.assertEqual(count2, 0)
        self.assertEqual(result1, result2)


if __name__ == "__main__":
    unittest.main()
