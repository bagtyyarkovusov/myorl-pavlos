"""Tests for tools/audit_slug_quality.py — surgical-fix slug audit."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

_TOOLS = Path(__file__).resolve().parents[1] / "tools"
if str(_TOOLS) not in sys.path:
    sys.path.insert(0, str(_TOOLS))

from audit_slug_quality import (
    SlugFinding,
    _collision_suffix_re,
    _cyrillic_re,
    _greek_re,
    _slug_words,
    flag_broken_typos,
    flag_collision_suffixes,
    flag_duplicates,
    flag_garbage,
    flag_locale_mismatch,
    flag_near_duplicates,
    levenshtein,
    normalize_for_comparison,
)

FixturePage = tuple[str, str, str, str]  # (locale, slug, document_id, title)


def _page(locale: str, slug: str, doc_id: str = "", title: str = "") -> FixturePage:
    return (locale, slug, doc_id or f"doc-{slug}", title or slug)


class LevenshteinTests(unittest.TestCase):
    def test_identical(self) -> None:
        self.assertEqual(levenshtein("abc", "abc"), 0)

    def test_one_substitution(self) -> None:
        self.assertEqual(levenshtein("abc", "abd"), 1)

    def test_one_insertion(self) -> None:
        self.assertEqual(levenshtein("abc", "abcd"), 1)

    def test_one_deletion(self) -> None:
        self.assertEqual(levenshtein("abcd", "abc"), 1)

    def test_empty_string(self) -> None:
        self.assertEqual(levenshtein("", "abc"), 3)
        self.assertEqual(levenshtein("abc", ""), 3)

    def test_slug_typo_distance(self) -> None:
        # "prosopou" vs "prospou" (missing 'o')
        self.assertEqual(levenshtein("prosopou", "prospou"), 1)
        # "lftynnk" vs "lifting" (multiple subs)
        self.assertEqual(levenshtein("lftynnk", "lifting"), 4)


class NormalizeForComparisonTests(unittest.TestCase):
    def test_removes_hyphens(self) -> None:
        self.assertEqual(normalize_for_comparison("brow-lift"), "browlift")

    def test_removes_underscores_and_dots(self) -> None:
        self.assertEqual(normalize_for_comparison("brow_lift.v1"), "browliftv1")

    def test_lowercases(self) -> None:
        self.assertEqual(normalize_for_comparison("Brow-Lift"), "browlift")

    def test_empty_returns_empty(self) -> None:
        self.assertEqual(normalize_for_comparison(""), "")


class SlugWordsTests(unittest.TestCase):
    def test_splits_on_hyphens(self) -> None:
        self.assertEqual(_slug_words("brow-lift-surgery"), ["brow", "lift", "surgery"])

    def test_splits_on_underscores(self) -> None:
        self.assertEqual(_slug_words("brow_lift"), ["brow", "lift"])

    def test_splits_on_dots(self) -> None:
        self.assertEqual(_slug_words("page.v1"), ["page", "v1"])

    def test_single_word(self) -> None:
        self.assertEqual(_slug_words("rinoplastiki"), ["rinoplastiki"])

    def test_empty_string(self) -> None:
        self.assertEqual(_slug_words(""), [])


class BrokenTyposTests(unittest.TestCase):
    def test_flags_consonant_only_segment(self) -> None:
        # "lftynnk" is all consonants, no vowels
        pages: list[FixturePage] = [_page("el", "lftynnk-prospou-2")]
        findings = flag_broken_typos(pages)
        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].slug, "lftynnk-prospou-2")
        self.assertIn("consonant-only", findings[0].detail)

    def test_ignores_normal_slugs(self) -> None:
        pages: list[FixturePage] = [
            _page("el", "rinoplastiki"),
            _page("el", "vlefaroplastiki"),
            _page("ru", "rinoplastika"),
        ]
        findings = flag_broken_typos(pages)
        self.assertEqual(len(findings), 0)

    def test_flags_repeated_character_run(self) -> None:
        # "testaaabbb" has runs of 3+ same char
        pages: list[FixturePage] = [_page("el", "testaaabbb-slug")]
        findings = flag_broken_typos(pages)
        self.assertEqual(len(findings), 1)
        self.assertIn("repeated character", findings[0].detail)

    def test_ignores_valid_double_letters(self) -> None:
        # "hello" has 'll' but that's a normal double letter
        pages: list[FixturePage] = [_page("el", "hello-world")]
        findings = flag_broken_typos(pages)
        self.assertEqual(len(findings), 0)

    def test_ignores_valid_english_medical_term(self) -> None:
        # "cyst" is an English medical term, not a typo
        pages: list[FixturePage] = [_page("el", "preauricular-cyst")]
        findings = flag_broken_typos(pages)
        self.assertEqual(len(findings), 0)

    def test_flags_short_gibberish_segment(self) -> None:
        # "xqkz" is only consonants and short
        pages: list[FixturePage] = [_page("el", "xqkz-page")]
        findings = flag_broken_typos(pages)
        self.assertEqual(len(findings), 1)

    def test_flags_sibling_levenshtein_typo(self) -> None:
        """Two slugs in the same locale separated by edit distance 1-2."""
        pages: list[FixturePage] = [
            _page("el", "prosopou", "d1", "Proswpou"),
            _page("el", "prospou", "d2", "Prospou"),
        ]
        findings = flag_broken_typos(pages)
        self.assertTrue(any("Levenshtein" in f.detail for f in findings))

    def test_ignores_distant_sibling_slugs(self) -> None:
        """Slugs in the same locale with edit distance > 2 are not flagged."""
        pages: list[FixturePage] = [
            _page("el", "rinoplastiki"),
            _page("el", "otoplastiki"),
        ]
        findings = flag_broken_typos(pages)
        self.assertFalse(any("Levenshtein" in f.detail for f in findings))

    def test_levenshtein_respects_locale_boundary(self) -> None:
        """Slugs in different locales are not compared even if they're close."""
        pages: list[FixturePage] = [
            _page("el", "rinoplastiki"),
            _page("ru", "rinoplastika"),  # distance 1, but different locale
        ]
        findings = flag_broken_typos(pages)
        self.assertFalse(any("Levenshtein" in f.detail for f in findings))


class DuplicatesTests(unittest.TestCase):
    def test_flags_exact_duplicate_within_locale(self) -> None:
        pages: list[FixturePage] = [
            _page("el", "atrisia", "doc1", "Atresia 1"),
            _page("el", "atrisia", "doc2", "Atresia 2"),
            _page("el", "atrisia", "doc3", "Atresia 3"),
        ]
        findings = flag_duplicates(pages)
        self.assertEqual(len(findings), 3)
        self.assertTrue(all(f.criterion == "duplicate" for f in findings))

    def test_same_slug_across_locales_not_flagged(self) -> None:
        pages: list[FixturePage] = [
            _page("el", "laser", "doc1"),
            _page("ru", "laser", "doc2"),
        ]
        findings = flag_duplicates(pages)
        self.assertEqual(len(findings), 0)

    def test_unique_slugs_not_flagged(self) -> None:
        pages: list[FixturePage] = [
            _page("el", "rinoplastiki"),
            _page("el", "vlefaroplastiki"),
        ]
        findings = flag_duplicates(pages)
        self.assertEqual(len(findings), 0)


class NearDuplicatesTests(unittest.TestCase):
    def test_flags_dash_vs_no_dash(self) -> None:
        pages: list[FixturePage] = [
            _page("el", "brow-lift", "doc1"),
            _page("el", "browlift", "doc2"),
        ]
        findings = flag_near_duplicates(pages)
        self.assertEqual(len(findings), 2)
        self.assertTrue(all(f.criterion == "near-duplicate" for f in findings))

    def test_flags_underscore_variants(self) -> None:
        pages: list[FixturePage] = [
            _page("el", "face-lift", "doc1"),
            _page("el", "face_lift", "doc2"),
        ]
        findings = flag_near_duplicates(pages)
        self.assertEqual(len(findings), 2)

    def test_different_locales_not_flagged(self) -> None:
        pages: list[FixturePage] = [
            _page("el", "laser-hair-removal"),
            _page("ru", "laserhairremoval"),
        ]
        findings = flag_near_duplicates(pages)
        self.assertEqual(len(findings), 0)

    def test_genuinely_different_slugs_not_flagged(self) -> None:
        pages: list[FixturePage] = [
            _page("el", "rinoplastiki"),
            _page("el", "vlefaroplastiki"),
            _page("el", "otoplastiki"),
        ]
        findings = flag_near_duplicates(pages)
        self.assertEqual(len(findings), 0)

    def test_proposed_slug_uses_first_variant(self) -> None:
        pages: list[FixturePage] = [
            _page("el", "brow-lift", "doc1"),
            _page("el", "browlift", "doc2"),
        ]
        findings = flag_near_duplicates(pages)
        # The shorter or canonical form should be proposed
        self.assertTrue(any(f.proposed_slug for f in findings))


class CollisionSuffixTests(unittest.TestCase):
    def _make_pages(self, *slugs: str) -> list[FixturePage]:
        return [_page("el", s, f"doc-{s}") for s in slugs]

    def test_flags_numeric_2_suffix_when_base_exists(self) -> None:
        pages = self._make_pages("rinoplastiki", "rinoplastiki-2")
        findings = flag_collision_suffixes(pages)
        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].slug, "rinoplastiki-2")

    def test_flags_copy_suffix(self) -> None:
        pages = self._make_pages("rinoplastiki", "rinoplastiki-copy")
        findings = flag_collision_suffixes(pages)
        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].slug, "rinoplastiki-copy")

    def test_flags_test_suffix(self) -> None:
        pages = self._make_pages("rinoplastiki", "rinoplastiki-test")
        findings = flag_collision_suffixes(pages)
        self.assertEqual(len(findings), 1)

    def test_flags_numeric_1_suffix(self) -> None:
        pages = self._make_pages("service", "service-1")
        findings = flag_collision_suffixes(pages)
        self.assertEqual(len(findings), 1)

    def test_no_flag_when_base_does_not_exist(self) -> None:
        pages = self._make_pages("some-other-page", "orphan-2")
        findings = flag_collision_suffixes(pages)
        self.assertEqual(len(findings), 0)

    def test_base_slug_itself_not_flagged(self) -> None:
        pages = self._make_pages("rinoplastiki", "rinoplastiki-2")
        findings = flag_collision_suffixes(pages)
        self.assertNotIn("rinoplastiki", [f.slug for f in findings])

    def test_proposed_slug_is_base(self) -> None:
        pages = self._make_pages("rinoplastiki", "rinoplastiki-copy")
        findings = flag_collision_suffixes(pages)
        self.assertEqual(findings[0].proposed_slug, "rinoplastiki")

    def test_flags_duplicate_suffix_across_locales(self) -> None:
        pages: list[FixturePage] = [
            _page("el", "laser", "doc-el"),
            _page("el", "laser-2", "doc-el-2"),
            _page("ru", "laser-2", "doc-ru-2"),  # Russian copy with suffix
        ]
        findings = flag_collision_suffixes(pages)
        self.assertTrue(any(f.slug == "laser-2" and f.locale == "ru" for f in findings))


class LocaleMismatchTests(unittest.TestCase):
    def test_flags_cyrillic_in_el_slug(self) -> None:
        pages: list[FixturePage] = [_page("el", "ринопластика")]
        findings = flag_locale_mismatch(pages)
        self.assertEqual(len(findings), 1)
        self.assertIn("Cyrillic", findings[0].detail)
        self.assertIn("el", findings[0].detail)

    def test_flags_greek_in_ru_slug(self) -> None:
        pages: list[FixturePage] = [_page("ru", "ρινοπλαστική")]
        findings = flag_locale_mismatch(pages)
        self.assertEqual(len(findings), 1)
        self.assertIn("Greek", findings[0].detail)
        self.assertIn("ru", findings[0].detail)

    def test_ignores_greek_in_el_slug(self) -> None:
        # Normal: Greek chars in Greek locale slug (if not Strapi-enforced)
        pages: list[FixturePage] = [_page("el", "ρινοπλαστική")]
        findings = flag_locale_mismatch(pages)
        self.assertEqual(len(findings), 0)

    def test_ignores_cyrillic_in_ru_slug(self) -> None:
        pages: list[FixturePage] = [_page("ru", "ринопластика")]
        findings = flag_locale_mismatch(pages)
        self.assertEqual(len(findings), 0)

    def test_ignores_ascii_only_slugs(self) -> None:
        pages: list[FixturePage] = [
            _page("el", "rinoplastiki"),
            _page("ru", "rinoplastika"),
        ]
        findings = flag_locale_mismatch(pages)
        self.assertEqual(len(findings), 0)

    def test_mixed_script_flagged(self) -> None:
        pages: list[FixturePage] = [_page("el", "rinoplastiki-ринопластика")]
        findings = flag_locale_mismatch(pages)
        self.assertEqual(len(findings), 1)


class GarbageTests(unittest.TestCase):
    def test_flags_single_character(self) -> None:
        pages: list[FixturePage] = [_page("el", "1")]
        findings = flag_garbage(pages)
        self.assertEqual(len(findings), 1)
        self.assertIn("single character", findings[0].detail.lower())

    def test_flags_two_character_nonword(self) -> None:
        pages: list[FixturePage] = [_page("el", "ab")]
        findings = flag_garbage(pages)
        self.assertEqual(len(findings), 1)

    def test_flags_question_mark_containing(self) -> None:
        pages: list[FixturePage] = [_page("el", "test?page")]
        findings = flag_garbage(pages)
        self.assertEqual(len(findings), 1)
        self.assertIn("invalid character", findings[0].detail.lower())

    def test_flags_comma_containing(self) -> None:
        pages: list[FixturePage] = [_page("el", "test,page")]
        findings = flag_garbage(pages)
        self.assertEqual(len(findings), 1)

    def test_ignores_normal_slugs(self) -> None:
        pages: list[FixturePage] = [
            _page("el", "rinoplastiki-athina"),
            _page("ru", "udalenie-mindalin"),
        ]
        findings = flag_garbage(pages)
        self.assertEqual(len(findings), 0)

    def test_flags_only_numeric(self) -> None:
        pages: list[FixturePage] = [_page("el", "123")]
        findings = flag_garbage(pages)
        self.assertEqual(len(findings), 1)

    def test_flags_leading_hyphen(self) -> None:
        pages: list[FixturePage] = [_page("el", "-bad-slug")]
        findings = flag_garbage(pages)
        self.assertEqual(len(findings), 1)
        self.assertIn("starts with", findings[0].detail.lower())

    def test_flags_trailing_hyphen(self) -> None:
        pages: list[FixturePage] = [_page("el", "bad-slug-")]
        findings = flag_garbage(pages)
        self.assertEqual(len(findings), 1)
        self.assertIn("ends with", findings[0].detail.lower())


class CompileRegexTests(unittest.TestCase):
    """Sanity-check the compiled regex patterns used by the audit."""

    def test_collision_suffix_re_matches_expected(self) -> None:
        cases = ["test-2", "page-copy", "slug-test", "thing-1", "item-0"]
        for case in cases:
            self.assertIsNotNone(
                _collision_suffix_re.search(case),
                f"Expected '{case}' to match collision suffix regex",
            )

    def test_collision_suffix_re_rejects_normal(self) -> None:
        cases = ["rinoplastiki", "brow-lift", "page-2024", "v1", "test-page"]
        for case in cases:
            with self.subTest(case=case):
                self.assertIsNone(_collision_suffix_re.search(case))

    def test_cyrillic_re_matches_cyrillic(self) -> None:
        self.assertTrue(_cyrillic_re.search("ринопластика"))
        self.assertTrue(_cyrillic_re.search("удаление-миндалин"))

    def test_cyrillic_re_rejects_non_cyrillic(self) -> None:
        self.assertFalse(_cyrillic_re.search("rinoplastiki"))
        self.assertFalse(_cyrillic_re.search("ρινοπλαστική"))

    def test_greek_re_matches_greek(self) -> None:
        self.assertTrue(_greek_re.search("ρινοπλαστική"))

    def test_greek_re_rejects_non_greek(self) -> None:
        self.assertFalse(_greek_re.search("rinoplastiki"))
        self.assertFalse(_greek_re.search("ринопластика"))


class SlugFindingTests(unittest.TestCase):
    def test_finding_has_expected_fields(self) -> None:
        f = SlugFinding(
            locale="el",
            slug="bad-slug",
            document_id="doc123",
            title="Bad Slug",
            criterion="typo",
            detail="Test detail",
            proposed_slug="good-slug",
        )
        self.assertEqual(f.locale, "el")
        self.assertEqual(f.slug, "bad-slug")
        self.assertEqual(f.document_id, "doc123")
        self.assertEqual(f.criterion, "typo")
        self.assertEqual(f.proposed_slug, "good-slug")


class IntegrationTests(unittest.TestCase):
    """End-to-end: run all criteria against a realistic fixture set."""

    def setUp(self) -> None:
        self.pages: list[FixturePage] = [
            # Normal
            ("el", "rinoplastiki", "d1", "Ρινοπλαστική"),
            ("el", "vlefaroplastiki", "d2", "Βλεφαροπλαστική"),
            ("el", "otoplastiki", "d3", "Ωτοπλαστική"),
            ("ru", "rinoplastika", "d4", "Ринопластика"),
            ("ru", "blefaroplastika", "d5", "Блефаропластика"),
            # Criterion 1: typos
            ("el", "lftynnk-prospou-2", "d6", "Lifting Προσώπου"),
            ("el", "xqkz-service", "d7", "Unknown Service"),
            # Criterion 2: duplicates
            ("el", "atrisia", "d8", "Ατρησία A"),
            ("el", "atrisia", "d9", "Ατρησία B"),
            # Criterion 2b: near-duplicates
            ("el", "brow-lift", "d10", "Brow Lift"),
            ("el", "browlift", "d11", "Browlift"),
            # Criterion 3: collision suffixes
            ("el", "rinoplastiki-2", "d12", "Ρινοπλαστική 2"),
            ("el", "service-copy", "d13", "Service Copy"),
            ("el", "service", "d14", "Service"),  # base for -copy
            # Criterion 4: locale mismatch
            ("el", "ринопластика", "d15", "Ринопластика"),
            ("ru", "ρινοπλαστική", "d16", "Ρινοπλαστική"),
            # Criterion 5: garbage
            ("el", "1", "d17", "1"),
            ("ru", "ab", "d18", "AB"),
            ("el", "test?slug", "d19", "Test Slug"),
        ]

    def test_all_criteria_find_issues(self) -> None:
        typos = flag_broken_typos(self.pages)
        dupes = flag_duplicates(self.pages)
        near = flag_near_duplicates(self.pages)
        suffixes = flag_collision_suffixes(self.pages)
        mismatches = flag_locale_mismatch(self.pages)
        garbage = flag_garbage(self.pages)

        self.assertGreater(len(typos), 0, "Should find at least one typo")
        self.assertGreater(len(dupes), 0, "Should find at least one duplicate")
        self.assertGreater(len(near), 0, "Should find at least one near-duplicate")
        self.assertGreater(len(suffixes), 0, "Should find at least one collision suffix")
        self.assertGreater(len(mismatches), 0, "Should find at least one locale mismatch")
        self.assertGreater(len(garbage), 0, "Should find at least one garbage slug")

    def test_total_findings_in_expected_range(self) -> None:
        all_findings = (
            flag_broken_typos(self.pages)
            + flag_duplicates(self.pages)
            + flag_near_duplicates(self.pages)
            + flag_collision_suffixes(self.pages)
            + flag_locale_mismatch(self.pages)
            + flag_garbage(self.pages)
        )
        # With 19 fixture pages we expect 10-16 findings
        self.assertGreater(len(all_findings), 0)
        self.assertLessEqual(len(all_findings), len(self.pages))


class Issue180RegressionTests(unittest.TestCase):
    """Verify the 6 slug-quality findings from issue #180 are resolved."""

    def test_cyst_not_flagged_as_consonant_only(self) -> None:
        """preauricular-cyst: 'cyst' is a valid English medical term."""
        pages: list[FixturePage] = [_page("el", "preauricular-cyst")]
        findings = flag_broken_typos(pages)
        self.assertEqual(len(findings), 0,
                         "preauricular-cyst should not be flagged; 'cyst' is a valid English word")

    def test_lifting_prosopou_not_flagged(self) -> None:
        """lifting-prosopou (renamed from lftynnk-prospou-2) should be clean."""
        pages: list[FixturePage] = [_page("el", "lifting-prosopou")]
        findings = flag_broken_typos(pages)
        self.assertEqual(len(findings), 0,
                         "lifting-prosopou should not be flagged; typo was fixed")

    def test_rinorragia_enilikoi_and_paidia_not_levenshtein_flagged(self) -> None:
        """Renamed adult/paediatric slugs should not be flagged as near each other."""
        pages: list[FixturePage] = [
            _page("el", "rinorragia-enilikoi", "d1", "Ρινορραγία"),
            _page("el", "rinorragia-paidia", "d2", "Ρινορραγίες στα παιδιά"),
        ]
        findings = flag_broken_typos(pages)
        levenshtein_findings = [f for f in findings if "Levenshtein" in f.detail]
        self.assertEqual(len(levenshtein_findings), 0,
                         "rinorragia-enilikoi and rinorragia-paidia are far enough apart")

    def test_rinorragia_ru_pair_not_levenshtein_flagged(self) -> None:
        """Same fix for the Russian locale pair."""
        pages: list[FixturePage] = [
            _page("ru", "rinorragia-enilikoi", "d1", "Носовое кровотечение"),
            _page("ru", "rinorragia-paidia", "d2", "Носовые кровотечения у детей"),
        ]
        findings = flag_broken_typos(pages)
        levenshtein_findings = [f for f in findings if "Levenshtein" in f.detail]
        self.assertEqual(len(levenshtein_findings), 0,
                         "Russian rinorragia-enilikoi and rinorragia-paidia are far enough apart")

    def test_original_lftynnk_still_flagged(self) -> None:
        """Sanity check: the original typo slug is still flaggable by the tool."""
        pages: list[FixturePage] = [_page("el", "lftynnk-prospou-2")]
        findings = flag_broken_typos(pages)
        consonant_findings = [f for f in findings if "consonant-only" in f.detail]
        self.assertEqual(len(consonant_findings), 1,
                         "Original typo lftynnk-prospou-2 should still be detectable")


if __name__ == "__main__":
    unittest.main()
