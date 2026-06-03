"""
Issue #187 — Client Remediation: Build verification matrix for PDF parity gaps
Acceptance test suite validating the verification matrix structure and completeness.
"""

import os
import re
import unittest

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MATRIX_PATH = os.path.join(
    PROJECT_ROOT,
    "artifacts",
    "reports",
    "myorl-client-requirements-verification-matrix.md",
)


def read_file(*parts: str) -> str:
    with open(os.path.join(PROJECT_ROOT, *parts), "r", encoding="utf-8") as f:
        return f.read()


class TestVerificationMatrixExists(unittest.TestCase):
    def test_matrix_file_exists(self):
        self.assertTrue(
            os.path.isfile(MATRIX_PATH),
            f"Verification matrix not found at {MATRIX_PATH}",
        )

    def test_matrix_is_not_empty(self):
        content = read_file(
            "artifacts", "reports", "myorl-client-requirements-verification-matrix.md"
        )
        self.assertGreater(
            len(content.strip()),
            200,
            "Verification matrix should have substantial content",
        )


class TestVerificationMatrixCoversAllComments(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.content = read_file(
            "artifacts", "reports", "myorl-client-requirements-verification-matrix.md"
        )

    def test_all_22_comments_referenced(self):
        for i in range(1, 23):
            with self.subTest(comment=i):
                self.assertIn(
                    str(i),
                    self.content,
                    f"Comment #{i} not found in verification matrix",
                )

    def test_comment_table_has_22_data_rows(self):
        # Count table rows that start with | followed by a number from 1-22
        rows = re.findall(r"^\|\s*(\d{1,2})\s*\|", self.content, re.MULTILINE)
        row_numbers = [int(n) for n in rows]
        self.assertEqual(
            sorted(row_numbers),
            list(range(1, 23)),
            f"Matrix table should have rows 1-22, got {sorted(row_numbers)}",
        )


class TestVerificationMatrixColumns(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.content = read_file(
            "artifacts", "reports", "myorl-client-requirements-verification-matrix.md"
        )

    def test_has_locale_route_column(self):
        self.assertIn("Route", self.content, "Matrix should have a Route column")

    def test_has_category_column(self):
        self.assertIn("Category", self.content, "Matrix should have a Category column")

    def test_has_legacy_evidence_column(self):
        self.assertRegex(
            self.content,
            r"Legacy\s*Evidence|Evidence\s*Source",
            "Matrix should have a legacy evidence column",
        )

    def test_has_current_status_column(self):
        self.assertIn(
            "Status",
            self.content,
            "Matrix should have a current status column",
        )

    def test_has_workstream_column(self):
        self.assertIn(
            "Workstream",
            self.content,
            "Matrix should have an owner workstream column",
        )

    def test_has_verification_column(self):
        self.assertRegex(
            self.content,
            r"Verif|verif",
            "Matrix should have a verification status column",
        )

    def test_distinguishes_category_types(self):
        categories = [
            "content parity",
            "CMS editability",
            "routing",
            "behavior",
            "readability",
            "design",
        ]
        found = {cat: cat.lower() in self.content.lower() for cat in categories}
        found_count = sum(1 for v in found.values() if v)
        self.assertGreaterEqual(
            found_count,
            4,
            f"Matrix should distinguish at least 4 of 5 issue categories. Found: {found}",
        )


class TestVerificationMatrixPRDReferences(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.content = read_file(
            "artifacts", "reports", "myorl-client-requirements-verification-matrix.md"
        )

    def test_references_prd_185(self):
        self.assertIn(
            "185",
            self.content,
            "Matrix should reference PRD #185 (homepage editability)",
        )

    def test_references_prd_186(self):
        self.assertIn(
            "186",
            self.content,
            "Matrix should reference PRD #186 (parent client requirements PRD)",
        )


class TestVerificationChecklistPresent(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.content = read_file(
            "artifacts", "reports", "myorl-client-requirements-verification-matrix.md"
        )

    def test_has_verification_checklist_section(self):
        self.assertRegex(
            self.content,
            r"[Vv]erification\s*[Cc]hecklist|[Cc]hecklist",
            "Matrix should include a verification checklist section",
        )

    def test_has_repeatable_command_or_script(self):
        has_command = "```" in self.content
        has_script = "script" in self.content.lower() or "python" in self.content.lower()
        self.assertTrue(
            has_command or has_script,
            "Matrix should document a repeatable verification command or script",
        )


class TestKeyRoutesMapped(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.content = read_file(
            "artifacts", "reports", "myorl-client-requirements-verification-matrix.md"
        )

    def test_home_routes_mapped(self):
        self.assertIn("/el", self.content, "Matrix should map /el home route")
        self.assertIn("/ru", self.content, "Matrix should map /ru home route")

    def test_appointment_routes_mapped(self):
        self.assertRegex(
            self.content,
            r"rantevou|zapis",
            "Matrix should map appointment routes",
        )

    def test_clinic_routes_mapped(self):
        self.assertIn(
            "klinikes",
            self.content,
            "Matrix should map clinic index routes",
        )

    def test_office_routes_mapped(self):
        self.assertIn(
            "iatreio",
            self.content,
            "Matrix should map office page routes",
        )

    def test_biography_routes_mapped(self):
        self.assertIn(
            "viografiko",
            self.content,
            "Matrix should map biography page routes",
        )

    def test_price_list_routes_mapped(self):
        self.assertIn(
            "timokatalogos",
            self.content,
            "Matrix should map price list routes",
        )

    def test_section_index_routes_mapped(self):
        self.assertIn(
            "pathiseis",
            self.content,
            "Matrix should map section index routes",
        )


if __name__ == "__main__":
    unittest.main()
