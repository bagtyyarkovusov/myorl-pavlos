"""
Issue #85 — Backend Type Safety & Bootstrap Tests
Acceptance test suite verifying backend type safety and test scaffold.
"""

import os
import re
import subprocess
import unittest

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read_file(*parts: str) -> str:
    with open(os.path.join(PROJECT_ROOT, *parts), "r", encoding="utf-8") as f:
        return f.read()


def file_exists(*parts: str) -> bool:
    return os.path.isfile(os.path.join(PROJECT_ROOT, *parts))


def grep_any_in_file(*parts: str) -> list[str]:
    content = read_file(*parts)
    lines = []
    for i, line in enumerate(content.splitlines(), 1):
        # Match standalone `any` keywords (not in comments, strings, or as part of words)
        if re.search(r"\bany\b", line):
            stripped = line.strip()
            if not stripped.startswith("//") and not stripped.startswith("*"):
                lines.append(f"{i}: {stripped}")
    return lines


class TestCoreStrapiUsage(unittest.TestCase):
    """AC-1: Bootstrap scripts use Core.Strapi instead of AnyStrapi."""

    BOOTSTRAP_FILES = [
        ("backend", "src", "bootstrap", "migrate-sections.ts"),
        ("backend", "src", "bootstrap", "navigation-permissions.ts"),
        ("backend", "src", "bootstrap", "navigation-config.ts"),
        ("backend", "src", "bootstrap", "content-manager-config.ts"),
    ]

    def test_no_anystrapi_type_definition(self):
        for parts in self.BOOTSTRAP_FILES:
            with self.subTest(file=os.path.join(*parts)):
                content = read_file(*parts)
                self.assertNotIn(
                    "type AnyStrapi",
                    content,
                    f"{os.path.join(*parts)} should not define AnyStrapi",
                )

    def test_core_strapi_imported(self):
        for parts in self.BOOTSTRAP_FILES:
            with self.subTest(file=os.path.join(*parts)):
                content = read_file(*parts)
                self.assertIn(
                    "Core.Strapi",
                    content,
                    f"{os.path.join(*parts)} should reference Core.Strapi",
                )

    def test_anystrapi_not_used_in_signatures(self):
        for parts in self.BOOTSTRAP_FILES:
            with self.subTest(file=os.path.join(*parts)):
                content = read_file(*parts)
                self.assertNotIn(
                    "AnyStrapi",
                    content,
                    f"{os.path.join(*parts)} should not use AnyStrapi",
                )


class TestAnyUsagesEliminated(unittest.TestCase):
    """AC-2: 21+ `any` usages are eliminated or narrowed."""

    def test_migrate_sections_has_no_any(self):
        lines = grep_any_in_file("backend", "src", "bootstrap", "migrate-sections.ts")
        self.assertEqual(lines, [], f"migrate-sections.ts has `any` usages:\n" + "\n".join(lines))

    def test_navigation_permissions_has_no_any(self):
        lines = grep_any_in_file("backend", "src", "bootstrap", "navigation-permissions.ts")
        self.assertEqual(lines, [], f"navigation-permissions.ts has `any` usages:\n" + "\n".join(lines))

    def test_navigation_config_has_no_any(self):
        lines = grep_any_in_file("backend", "src", "bootstrap", "navigation-config.ts")
        self.assertEqual(lines, [], f"navigation-config.ts has `any` usages:\n" + "\n".join(lines))

    def test_content_manager_config_has_no_any(self):
        lines = grep_any_in_file("backend", "src", "bootstrap", "content-manager-config.ts")
        # Allow `any` inside `Record<string, any>` for contentTypes if needed
        # but we flag it so the implementation must justify or eliminate it.
        self.assertEqual(lines, [], f"content-manager-config.ts has `any` usages:\n" + "\n".join(lines))


class TestTestScriptExists(unittest.TestCase):
    """AC-3: backend/package.json has a test script."""

    def test_backend_package_json_has_test_script(self):
        content = read_file("backend", "package.json")
        pkg = __import__("json").loads(content)
        self.assertIn("test", pkg.get("scripts", {}), "backend/package.json should have a 'test' script")


class TestBootstrapUnitTests(unittest.TestCase):
    """AC-4/5: Bootstrap unit tests exist and cover idempotency + role seeding."""

    def test_backend_test_directory_exists(self):
        self.assertTrue(
            os.path.isdir(os.path.join(PROJECT_ROOT, "backend", "src", "bootstrap", "__tests__")),
            "backend/src/bootstrap/__tests__/ should exist",
        )

    def test_migrate_sections_test_exists(self):
        self.assertTrue(
            file_exists("backend", "src", "bootstrap", "__tests__", "migrate-sections.test.ts"),
            "migrate-sections bootstrap test should exist",
        )

    def test_navigation_permissions_test_exists(self):
        self.assertTrue(
            file_exists("backend", "src", "bootstrap", "__tests__", "navigation-permissions.test.ts"),
            "navigation-permissions bootstrap test should exist",
        )

    def test_migrate_sections_test_covers_idempotency(self):
        content = read_file("backend", "src", "bootstrap", "__tests__", "migrate-sections.test.ts")
        self.assertIn("idempotent", content.lower(), "Test should mention idempotency/idempotent")
        self.assertIn("marker", content.lower(), "Test should mention marker key")

    def test_migrate_sections_test_covers_empty_run(self):
        content = read_file("backend", "src", "bootstrap", "__tests__", "migrate-sections.test.ts")
        self.assertIn("empty", content.lower(), "Test should mention empty-run safety")

    def test_navigation_permissions_test_covers_editor_role(self):
        content = read_file("backend", "src", "bootstrap", "__tests__", "navigation-permissions.test.ts")
        self.assertIn("editor", content.lower(), "Test should mention Editor role")

    def test_navigation_permissions_test_covers_author_role(self):
        content = read_file("backend", "src", "bootstrap", "__tests__", "navigation-permissions.test.ts")
        self.assertIn("author", content.lower(), "Test should mention Author role")


class TestBackendTestsRun(unittest.TestCase):
    """AC-6: Tests run with npm test in the backend directory."""

    def test_backend_tests_pass(self):
        result = subprocess.run(
            ["npm", "test", "--prefix", "backend"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
        )
        self.assertEqual(
            result.returncode,
            0,
            f"Backend tests must pass.\nSTDOUT:\n{result.stdout[-2000:]}\nSTDERR:\n{result.stderr[-2000:]}",
        )


if __name__ == "__main__":
    unittest.main()
