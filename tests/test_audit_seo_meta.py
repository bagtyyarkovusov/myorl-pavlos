import argparse
import sys
import unittest
from pathlib import Path

_TOOLS = Path(__file__).resolve().parents[1] / "tools"
if str(_TOOLS) not in sys.path:
    sys.path.insert(0, str(_TOOLS))

from audit_seo_meta import (
    BRAND_SUFFIX,
    DESCRIPTION_MAX,
    DESCRIPTION_MIN,
    TITLE_MAX,
    TITLE_MIN,
    Finding,
    PageMeta,
    build_markdown_report,
    check_brand_suffix,
    check_meta_description_length,
    check_meta_description_present,
    check_meta_description_uniqueness,
    check_title_contains_slug_keyword,
    check_title_length,
    check_title_not_generic,
    check_title_not_meta_description,
    check_title_uniqueness,
    compute_gate_exit_code,
    run_all_checks,
)


def _page(
    locale: str,
    slug: str,
    title: str,
    meta_title: str | None = None,
    meta_description: str | None = None,
) -> PageMeta:
    return PageMeta(
        locale=locale,
        slug=slug,
        title=title,
        meta_title=meta_title,
        meta_description=meta_description,
    )


# ---------------------------------------------------------------------------
# Check 1: Title length
# ---------------------------------------------------------------------------

class TitleLengthTests(unittest.TestCase):
    def test_short_title_warns(self) -> None:
        pages = [_page("el", "short", "Hi")]
        findings = check_title_length(pages)
        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].check, "title-length")
        self.assertIn("lengthen", findings[0].suggestion or "")

    def test_long_title_warns(self) -> None:
        pages = [_page("el", "verbose", "A" * (TITLE_MAX + 1))]
        findings = check_title_length(pages)
        self.assertEqual(len(findings), 1)
        self.assertIn("shorten", findings[0].suggestion or "")

    def test_title_in_range_passes(self) -> None:
        pages = [_page("el", "good", "A" * 45)]
        findings = check_title_length(pages)
        self.assertEqual(len(findings), 0)

    def test_boundary_values_pass(self) -> None:
        pages = [
            _page("el", "min", "A" * TITLE_MIN),
            _page("el", "max", "B" * TITLE_MAX),
        ]
        findings = check_title_length(pages)
        self.assertEqual(len(findings), 0)

    def test_uses_effective_title(self) -> None:
        # meta_title takes precedence over title
        pages = [
            _page("el", "pg", "Short page title here ok", meta_title="Hi"),
            _page("el", "pg2", "Hi", meta_title="A properly sized meta title here"),
        ]
        findings = check_title_length(pages)
        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].slug, "pg")


# ---------------------------------------------------------------------------
# Check 2: Title uniqueness
# ---------------------------------------------------------------------------

class TitleUniquenessTests(unittest.TestCase):
    def test_unique_titles_pass(self) -> None:
        pages = [
            _page("el", "a", "Title One"),
            _page("el", "b", "Title Two"),
            _page("ru", "c", "Title Three"),
        ]
        findings = check_title_uniqueness(pages)
        self.assertEqual(len(findings), 0)

    def test_duplicate_titles_warn(self) -> None:
        pages = [
            _page("el", "a", "Same Title"),
            _page("el", "b", "Same Title"),
            _page("ru", "c", "Unique"),
        ]
        findings = check_title_uniqueness(pages)
        self.assertEqual(len(findings), 2)
        self.assertEqual(findings[0].severity, "warn")

    def test_many_duplicates_block(self) -> None:
        pages = [
            _page("el", "a", "Dup"),
            _page("el", "b", "Dup"),
            _page("el", "c", "Dup"),
            _page("el", "d", "Dup"),
            _page("el", "e", "Dup"),
            _page("el", "f", "Dup"),  # 6 copies of "Dup"
        ]
        findings = check_title_uniqueness(pages)
        self.assertEqual(len(findings), 6)
        self.assertEqual(findings[0].severity, "block")

    def test_exactly_five_duplicates_stays_warn(self) -> None:
        # 5 duplicates = warn, not block (>5 is block)
        pages = [_page("el", chr(97 + i), "Dup") for i in range(5)]
        findings = check_title_uniqueness(pages)
        self.assertEqual(findings[0].severity, "warn")


# ---------------------------------------------------------------------------
# Check 3: Title contains slug-derived keyword
# ---------------------------------------------------------------------------

class TitleSlugKeywordTests(unittest.TestCase):
    def test_keyword_in_title_passes(self) -> None:
        pages = [_page("el", "rinoplastiki-athina", "Rinoplastiki stin Athina")]
        findings = check_title_contains_slug_keyword(pages)
        self.assertEqual(len(findings), 0)

    def test_missing_keyword_info(self) -> None:
        pages = [_page("el", "rinoplastiki", "Plastiki mitis")]
        findings = check_title_contains_slug_keyword(pages)
        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].severity, "info")

    def test_short_slug_skipped(self) -> None:
        # Keywords < 3 chars are filtered out
        pages = [_page("el", "el", "Hello")]
        findings = check_title_contains_slug_keyword(pages)
        self.assertEqual(len(findings), 0)

    def test_no_match_triggers_info(self) -> None:
        # Keywords from slug: "partial", "match", "test"
        # Title has none of them
        pages = [_page("el", "partial-match-test", "Rinoplastiki Athina")]
        findings = check_title_contains_slug_keyword(pages)
        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].severity, "info")


# ---------------------------------------------------------------------------
# Check 4: Meta description length
# ---------------------------------------------------------------------------

class MetaDescriptionLengthTests(unittest.TestCase):
    def test_short_description_warns(self) -> None:
        pages = [_page("el", "pg", "Title", meta_description="Too short")]
        findings = check_meta_description_length(pages)
        self.assertEqual(len(findings), 1)
        self.assertIn("lengthen", findings[0].suggestion or "")

    def test_long_description_warns(self) -> None:
        pages = [_page("el", "pg", "Title", meta_description="X" * (DESCRIPTION_MAX + 1))]
        findings = check_meta_description_length(pages)
        self.assertEqual(len(findings), 1)
        self.assertIn("shorten", findings[0].suggestion or "")

    def test_description_in_range_passes(self) -> None:
        pages = [_page("el", "pg", "Title", meta_description="X" * 120)]
        findings = check_meta_description_length(pages)
        self.assertEqual(len(findings), 0)

    def test_missing_description_skipped(self) -> None:
        pages = [_page("el", "pg", "Title", meta_description=None)]
        findings = check_meta_description_length(pages)
        self.assertEqual(len(findings), 0)

    def test_empty_description_skipped(self) -> None:
        pages = [_page("el", "pg", "Title", meta_description="  ")]
        findings = check_meta_description_length(pages)
        self.assertEqual(len(findings), 0)


# ---------------------------------------------------------------------------
# Check 5: Meta description present
# ---------------------------------------------------------------------------

class MetaDescriptionPresentTests(unittest.TestCase):
    def test_missing_description_blocks(self) -> None:
        pages = [_page("el", "no-desc", "Title", meta_description=None)]
        findings = check_meta_description_present(pages)
        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].severity, "block")

    def test_empty_description_blocks(self) -> None:
        pages = [_page("el", "empty", "Title", meta_description="")]
        findings = check_meta_description_present(pages)
        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].severity, "block")

    def test_whitespace_only_description_blocks(self) -> None:
        pages = [_page("el", "spaces", "Title", meta_description="   ")]
        findings = check_meta_description_present(pages)
        self.assertEqual(len(findings), 1)

    def test_present_description_passes(self) -> None:
        pages = [_page("el", "has-desc", "Title", meta_description="A proper description")]
        findings = check_meta_description_present(pages)
        self.assertEqual(len(findings), 0)

    def test_multiple_missing(self) -> None:
        pages = [
            _page("el", "a", "A", meta_description=None),
            _page("el", "b", "B", meta_description="Has one"),
            _page("ru", "c", "C", meta_description=None),
        ]
        findings = check_meta_description_present(pages)
        self.assertEqual(len(findings), 2)


# ---------------------------------------------------------------------------
# Check 6: Meta description uniqueness
# ---------------------------------------------------------------------------

class MetaDescriptionUniquenessTests(unittest.TestCase):
    def test_unique_descriptions_pass(self) -> None:
        pages = [
            _page("el", "a", "A", meta_description="First unique description here."),
            _page("el", "b", "B", meta_description="Second unique description here."),
        ]
        findings = check_meta_description_uniqueness(pages)
        self.assertEqual(len(findings), 0)

    def test_duplicate_descriptions_warn(self) -> None:
        pages = [
            _page("el", "a", "A", meta_description="Same description"),
            _page("el", "b", "B", meta_description="Same description"),
        ]
        findings = check_meta_description_uniqueness(pages)
        self.assertEqual(len(findings), 2)

    def test_missing_descriptions_not_counted(self) -> None:
        pages = [
            _page("el", "a", "A", meta_description=None),
            _page("el", "b", "B", meta_description=None),
        ]
        findings = check_meta_description_uniqueness(pages)
        self.assertEqual(len(findings), 0)


# ---------------------------------------------------------------------------
# Check 7: Title not equal to meta description
# ---------------------------------------------------------------------------

class TitleNotDescriptionTests(unittest.TestCase):
    def test_identical_text_warns(self) -> None:
        pages = [_page("el", "pg", "Same text", meta_description="Same text")]
        findings = check_title_not_meta_description(pages)
        self.assertEqual(len(findings), 1)

    def test_different_text_passes(self) -> None:
        pages = [_page("el", "pg", "My Title", meta_description="A different description")]
        findings = check_title_not_meta_description(pages)
        self.assertEqual(len(findings), 0)

    def test_case_insensitive_match(self) -> None:
        pages = [_page("el", "pg", "SAME TEXT", meta_description="same text")]
        findings = check_title_not_meta_description(pages)
        self.assertEqual(len(findings), 1)

    def test_missing_description_skipped(self) -> None:
        pages = [_page("el", "pg", "Title", meta_description=None)]
        findings = check_title_not_meta_description(pages)
        self.assertEqual(len(findings), 0)


# ---------------------------------------------------------------------------
# Check 8: Title not generic
# ---------------------------------------------------------------------------

class TitleNotGenericTests(unittest.TestCase):
    def test_myorl_generic_warns(self) -> None:
        pages = [_page("el", "home", "MyORL")]
        findings = check_title_not_generic(pages)
        self.assertEqual(len(findings), 1)

    def test_normal_title_passes(self) -> None:
        pages = [_page("el", "about", "About Dr. Pavlos")]
        findings = check_title_not_generic(pages)
        self.assertEqual(len(findings), 0)

    def test_case_insensitive_generic(self) -> None:
        pages = [_page("el", "home", "myorl")]
        findings = check_title_not_generic(pages)
        self.assertEqual(len(findings), 1)


# ---------------------------------------------------------------------------
# Check 9: Brand suffix
# ---------------------------------------------------------------------------

class BrandSuffixTests(unittest.TestCase):
    def test_el_correct_suffix_passes(self) -> None:
        pages = [_page("el", "pg", f"Rinoplastiki Athina{BRAND_SUFFIX['el']}")]
        findings = check_brand_suffix(pages)
        self.assertEqual(len(findings), 0)

    def test_ru_correct_suffix_passes(self) -> None:
        pages = [_page("ru", "pg", f"Rinoplastika Afiny{BRAND_SUFFIX['ru']}")]
        findings = check_brand_suffix(pages)
        self.assertEqual(len(findings), 0)

    def test_missing_suffix_warns(self) -> None:
        pages = [_page("el", "pg", "Rinoplastiki without suffix")]
        findings = check_brand_suffix(pages)
        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].check, "brand-suffix")

    def test_case_insensitive_suffix_ok(self) -> None:
        pages = [_page("el", "pg", f"Rinoplastiki{BRAND_SUFFIX['el'].lower()}")]
        findings = check_brand_suffix(pages)
        self.assertEqual(len(findings), 0)

    def test_unknown_locale_skipped(self) -> None:
        pages = [_page("en", "pg", "Some Title")]
        findings = check_brand_suffix(pages)
        self.assertEqual(len(findings), 0)

    def test_both_locales_checked(self) -> None:
        pages = [
            _page("el", "el-pg", f"Greek title{BRAND_SUFFIX['el']}"),
            _page("ru", "ru-pg", f"Russian title{BRAND_SUFFIX['ru']}"),
        ]
        findings = check_brand_suffix(pages)
        self.assertEqual(len(findings), 0)


# ---------------------------------------------------------------------------
# Integration tests
# ---------------------------------------------------------------------------

class RunAllChecksTests(unittest.TestCase):
    def test_all_checks_return_lists(self) -> None:
        pages = [
            _page("el", "a", "Title A", meta_description="Description A is long enough for this check"),
            _page("ru", "b", "Title B", meta_description="Description B is also long enough here"),
        ]
        results = run_all_checks(pages)
        self.assertEqual(len(results), 9)
        for name, findings in results.items():
            self.assertIsInstance(findings, list, f"{name} should return a list")


class GateExitCodeTests(unittest.TestCase):
    def setUp(self) -> None:
        self.args = argparse.Namespace(
            max_missing_descriptions=0,
            max_overlong_titles=30,
        )

    def test_all_clean_passes(self) -> None:
        pages = [_page("el", "a", "Title A", meta_description="A proper description")]
        results = run_all_checks(pages)
        code = compute_gate_exit_code(results, self.args)
        self.assertEqual(code, 0)

    def test_missing_description_blocks(self) -> None:
        pages = [_page("el", "a", "Title", meta_description=None)]
        results = run_all_checks(pages)
        code = compute_gate_exit_code(results, self.args)
        self.assertEqual(code, 1)

    def test_overlong_title_blocks(self) -> None:
        pages = [_page("el", "a", "A" * (TITLE_MAX + 1), meta_description="A proper description")]
        results = run_all_checks(pages)
        args = argparse.Namespace(max_missing_descriptions=0, max_overlong_titles=0)
        code = compute_gate_exit_code(results, args)
        self.assertEqual(code, 1)

    def test_duplicate_title_block_blocks(self) -> None:
        pages = [
            _page("el", chr(97 + i), f"Dup Title{' enough text' * 3}", meta_description=f"Desc {i} " + "x" * 100)
            for i in range(6)
        ]
        results = run_all_checks(pages)
        code = compute_gate_exit_code(results, self.args)
        self.assertEqual(code, 1)

    def test_custom_thresholds_respected(self) -> None:
        args = argparse.Namespace(max_missing_descriptions=5, max_overlong_titles=5)
        pages = [
            _page("el", "a", "Title A", meta_description=None),
            _page("el", "b", "Title B", meta_description=None),
        ]
        results = run_all_checks(pages)
        code = compute_gate_exit_code(results, args)
        self.assertEqual(code, 0)  # threshold is 5, only 2 missing


class MarkdownReportTests(unittest.TestCase):
    def setUp(self) -> None:
        self.args = argparse.Namespace(
            max_missing_descriptions=0,
            max_overlong_titles=30,
        )

    def test_report_includes_summary(self) -> None:
        pages = [_page("el", "a", "Title", meta_description="A description long enough for meta tag purposes")]
        results = run_all_checks(pages)
        report = build_markdown_report(results, pages, self.args)
        self.assertIn("Pages audited", report)
        self.assertIn("Total findings", report)

    def test_report_includes_check_tables(self) -> None:
        pages = [_page("el", "a", "Title", meta_description="A description long enough for meta tag purposes")]
        results = run_all_checks(pages)
        report = build_markdown_report(results, pages, self.args)
        for label_part in ["Title length", "Brand suffix", "BLOCK LAUNCH"]:
            self.assertIn(label_part, report)

    def test_report_shows_findings(self) -> None:
        pages = [_page("el", "no-desc", "Title", meta_description=None)]
        results = run_all_checks(pages)
        report = build_markdown_report(results, pages, self.args)
        self.assertIn("BLOCK", report)
        self.assertIn("NOT READY", report)

    def test_report_shows_ready_when_clean(self) -> None:
        pages = [_page("el", "a", "Title is long enough", meta_description="Description long enough for a proper meta description tag")]
        results = run_all_checks(pages)
        report = build_markdown_report(results, pages, self.args)
        self.assertIn("READY", report)

    def test_markdown_pipes_escaped(self) -> None:
        pages = [_page("el", "pg", "Title | With Pipe", meta_description="Desc | with pipe content is long enough for meta")]
        results = run_all_checks(pages)
        report = build_markdown_report(results, pages, self.args)
        self.assertIn("\\|", report)


# ---------------------------------------------------------------------------
# PageMeta properties
# ---------------------------------------------------------------------------

class PageMetaTests(unittest.TestCase):
    def test_effective_title_uses_meta_title(self) -> None:
        p = _page("el", "pg", "Page Title", meta_title="SEO Title")
        self.assertEqual(p.effective_title, "SEO Title")

    def test_effective_title_falls_back_to_title(self) -> None:
        p = _page("el", "pg", "Page Title", meta_title=None)
        self.assertEqual(p.effective_title, "Page Title")

    def test_effective_title_falls_back_when_meta_title_empty(self) -> None:
        p = _page("el", "pg", "Page Title", meta_title="")
        self.assertEqual(p.effective_title, "Page Title")

    def test_description_strips_whitespace(self) -> None:
        p = _page("el", "pg", "Title", meta_description="  hello  ")
        self.assertEqual(p.description, "hello")

    def test_empty_description_is_none(self) -> None:
        p = _page("el", "pg", "Title", meta_description="")
        self.assertIsNone(p.description)

    def test_whitespace_only_description_is_none(self) -> None:
        p = _page("el", "pg", "Title", meta_description="   ")
        self.assertIsNone(p.description)


if __name__ == "__main__":
    unittest.main()
