"""
Issue #91 — Shared Types Package: Auto-Generated Schema Literals
Acceptance test suite verifying the shared types package deliverables.
"""

import os
import subprocess
import unittest

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read_file(*parts: str) -> str:
    with open(os.path.join(PROJECT_ROOT, *parts), "r", encoding="utf-8") as f:
        return f.read()


def file_exists(*parts: str) -> bool:
    return os.path.isfile(os.path.join(PROJECT_ROOT, *parts))


def dir_exists(*parts: str) -> bool:
    return os.path.isdir(os.path.join(PROJECT_ROOT, *parts))


class TestSharedTypesPackageExists(unittest.TestCase):
    """AC-1: packages/shared-types/ exists with required files."""

    def test_packages_directory_exists(self):
        self.assertTrue(
            dir_exists("packages"),
            "packages/ directory should exist at project root",
        )

    def test_shared_types_directory_exists(self):
        self.assertTrue(
            dir_exists("packages", "shared-types"),
            "packages/shared-types/ should exist",
        )

    def test_package_json_exists(self):
        self.assertTrue(
            file_exists("packages", "shared-types", "package.json"),
            "packages/shared-types/package.json should exist",
        )

    def test_tsconfig_json_exists(self):
        self.assertTrue(
            file_exists("packages", "shared-types", "tsconfig.json"),
            "packages/shared-types/tsconfig.json should exist",
        )

    def test_src_index_ts_exists(self):
        self.assertTrue(
            file_exists("packages", "shared-types", "src", "index.ts"),
            "packages/shared-types/src/index.ts should exist",
        )


class TestGeneratedTypesContent(unittest.TestCase):
    """AC-2/3: Generated index.ts contains expected literal unions."""

    def test_page_type_union_present(self):
        content = read_file("packages", "shared-types", "src", "index.ts")
        self.assertIn('export type PageType', content)
        self.assertIn('"home"', content)
        self.assertIn('"system"', content)

    def test_layout_variant_union_present(self):
        content = read_file("packages", "shared-types", "src", "index.ts")
        self.assertIn('export type LayoutVariant', content)
        self.assertIn('"home"', content)
        self.assertIn('"testimonials-index"', content)

    def test_section_component_union_present(self):
        content = read_file("packages", "shared-types", "src", "index.ts")
        self.assertIn('export type SectionComponent', content)
        self.assertIn('"sections.promo-slider"', content)
        self.assertIn('"sections.contact"', content)

    def test_render_mode_present(self):
        content = read_file("packages", "shared-types", "src", "index.ts")
        self.assertIn('export type RenderMode', content)

    def test_auto_generated_header_present(self):
        content = read_file("packages", "shared-types", "src", "index.ts")
        self.assertIn("Auto-generated", content)


class TestGeneratorScriptExists(unittest.TestCase):
    """AC-2: Generator script reads schema.json and emits TypeScript."""

    def test_generator_script_exists(self):
        self.assertTrue(
            file_exists("packages", "shared-types", "scripts", "generate.ts"),
            "Generator script should exist",
        )

    def test_generator_script_reads_page_schema(self):
        content = read_file("packages", "shared-types", "scripts", "generate.ts")
        self.assertIn("schema.json", content)

    def test_generator_script_writes_index_ts(self):
        content = read_file("packages", "shared-types", "scripts", "generate.ts")
        self.assertIn("index.ts", content)


class TestFrontendUsesSharedPackage(unittest.TestCase):
    """AC-3: Frontend imports types from shared package."""

    def test_frontend_imports_page_type_from_shared(self):
        result = subprocess.run(
            ["grep", "-rn", r"from.*@gemini/shared-types", "frontend/src/"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
        )
        self.assertTrue(
            result.returncode == 0 and len(result.stdout.strip()) > 0,
            "Frontend should import from @gemini/shared-types",
        )

    def test_frontend_page_type_no_longer_defined_locally(self):
        content = read_file("frontend", "src", "lib", "cms", "types", "page.ts")
        # The file may still contain the type name in comments or re-exports,
        # but should not define PageType as a literal union anymore.
        lines = [l for l in content.splitlines() if 'export type PageType' in l]
        self.assertEqual(
            len(lines),
            0,
            "PageType should no longer be defined locally in types/page.ts",
        )


class TestPreCommitHook(unittest.TestCase):
    """AC-4: Pre-commit or build hook regenerates schema literals."""

    def test_pre_commit_checks_schema_sync(self):
        hook_path = os.path.join(PROJECT_ROOT, ".husky", "pre-commit")
        if not os.path.isfile(hook_path):
            self.skipTest("No pre-commit hook found")
        content = read_file(".husky", "pre-commit")
        self.assertIn(
            "shared-types",
            content,
            "pre-commit hook should reference shared-types generation",
        )


class TestSharedTypesTestsPass(unittest.TestCase):
    """AC-5: Tests verify generated output from mock schema.json."""

    def test_shared_types_test_file_exists(self):
        self.assertTrue(
            file_exists("packages", "shared-types", "src", "index.test.ts"),
            "Shared types should have a test file",
        )

    def test_shared_types_tests_pass(self):
        result = subprocess.run(
            ["npm", "test", "--prefix", "packages/shared-types"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
        )
        self.assertEqual(
            result.returncode,
            0,
            f"Shared types tests must pass.\nSTDOUT:\n{result.stdout[-2000:]}\nSTDERR:\n{result.stderr[-2000:]}",
        )


class TestFrontendPathAliasConfigured(unittest.TestCase):
    """Implicit: frontend must resolve @gemini/shared-types via path alias."""

    def test_frontend_tsconfig_has_shared_types_path(self):
        content = read_file("frontend", "tsconfig.json")
        self.assertIn("@gemini/shared-types", content)

    def test_frontend_vitest_config_has_shared_types_alias(self):
        content = read_file("frontend", "vitest.config.ts")
        self.assertIn("@gemini/shared-types", content)


if __name__ == "__main__":
    unittest.main()
