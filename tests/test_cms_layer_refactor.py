"""
Issue #84 — CMS Layer Refactor: Split Normalizer & Decouple Gateway
Acceptance test suite verifying the refactor deliverables.
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


class TestModuleSplit(unittest.TestCase):
    """AC-1: Populate constants live in cms-populate.ts."""

    def test_cms_populate_module_exists(self):
        self.assertTrue(
            file_exists("frontend", "src", "lib", "cms", "cms-populate.ts"),
            "cms-populate.ts module should exist",
        )

    def test_page_populate_in_cms_populate(self):
        content = read_file("frontend", "src", "lib", "cms", "cms-populate.ts")
        self.assertIn(
            "PAGE_POPULATE",
            content,
            "PAGE_POPULATE should be exported from cms-populate.ts",
        )

    def test_navigation_populate_in_cms_populate(self):
        content = read_file("frontend", "src", "lib", "cms", "cms-populate.ts")
        self.assertIn(
            "NAVIGATION_POPULATE",
            content,
            "NAVIGATION_POPULATE should be exported from cms-populate.ts",
        )

    def test_sitemap_populate_in_cms_populate(self):
        content = read_file("frontend", "src", "lib", "cms", "cms-populate.ts")
        self.assertIn(
            "SITEMAP_POPULATE",
            content,
            "SITEMAP_POPULATE should be exported from cms-populate.ts",
        )

    def test_page_populate_not_in_page_normalizer(self):
        content = read_file("frontend", "src", "lib", "cms", "page-normalizer.ts")
        # Allow import from cms-populate but not a local definition
        if "export const PAGE_POPULATE" in content:
            self.fail(
                "PAGE_POPULATE should not be defined in page-normalizer.ts after refactor"
            )


class TestStrapiValidators(unittest.TestCase):
    """AC-2: Zod schemas live in strapi-validators.ts."""

    def test_strapi_validators_exists(self):
        self.assertTrue(
            file_exists("frontend", "src", "lib", "cms", "strapi-validators.ts"),
            "strapi-validators.ts should exist",
        )

    def test_page_response_schema_in_validators_or_parsers(self):
        validators = read_file("frontend", "src", "lib", "cms", "strapi-validators.ts")
        parsers = read_file("frontend", "src", "lib", "cms", "page-parsers.ts")
        self.assertTrue(
            "pageResponseSchema" in validators or "pageResponseSchema" in parsers,
            "pageResponseSchema should be in strapi-validators.ts or page-parsers.ts",
        )

    def test_global_response_schema_in_validators(self):
        content = read_file("frontend", "src", "lib", "cms", "strapi-validators.ts")
        self.assertIn(
            "globalResponseSchema",
            content,
            "globalResponseSchema should be in strapi-validators.ts",
        )

    def test_page_response_schema_not_in_page_normalizer(self):
        content = read_file("frontend", "src", "lib", "cms", "page-normalizer.ts")
        if "export const pageResponseSchema" in content:
            self.fail(
                "pageResponseSchema should not be defined in page-normalizer.ts after refactor"
            )


class TestPageNormalizerReduced(unittest.TestCase):
    """AC-3: page-normalizer.ts contains only DTO transforms."""

    def test_page_normalizer_still_exports_key_functions(self):
        content = read_file("frontend", "src", "lib", "cms", "page-normalizer.ts")
        required = [
            "export function toPageDTO",
            "export function toSeoDTO",
            "export function toMediaDTO",
            "export function toPageRefDTO",
            "export function toTagDTO",
            "export function deriveSeoTitle",
            "export function isFrontendNativeSystemLayout",
        ]
        for fn in required:
            with self.subTest(fn=fn):
                self.assertIn(fn, content, f"{fn} should remain exported")

    def test_page_normalizer_no_zod_schemas(self):
        content = read_file("frontend", "src", "lib", "cms", "page-normalizer.ts")
        zod_exports = re.findall(r"export const zod\w+", content)
        self.assertEqual(
            zod_exports,
            [],
            "page-normalizer.ts should not export Zod schemas after refactor",
        )

    def test_page_normalizer_no_populate_definitions(self):
        content = read_file("frontend", "src", "lib", "cms", "page-normalizer.ts")
        self.assertNotIn(
            "export const PAGE_POPULATE",
            content,
            "page-normalizer.ts should not define populate constants",
        )


class TestSectionNormalizersDeleted(unittest.TestCase):
    """AC-4: section-normalizers.ts is deleted and imports migrated."""

    def test_section_normalizers_file_deleted(self):
        self.assertFalse(
            file_exists("frontend", "src", "lib", "cms", "section-normalizers.ts"),
            "section-normalizers.ts should be deleted after refactor",
        )

    def test_no_imports_from_section_normalizers(self):
        result = subprocess.run(
            [
                "grep",
                "-rn",
                r"from.*section-normalizers",
                os.path.join(PROJECT_ROOT, "frontend", "src"),
            ],
            capture_output=True,
            text=True,
        )
        # Filter out test files that may reference the old module in their name
        non_test_lines = [
            line
            for line in result.stdout.splitlines()
            if ".test." not in line and "/__tests__/" not in line
        ]
        self.assertEqual(
            non_test_lines,
            [],
            f"No production code should import from section-normalizers: {non_test_lines}",
        )


class TestPureFunctions(unittest.TestCase):
    """AC-5: toPageDTO and toMediaDTO are pure (no hidden getCmsConfig)."""

    def test_to_media_dto_requires_strapi_url_param(self):
        content = read_file("frontend", "src", "lib", "cms", "page-normalizer.ts")
        sig = re.search(
            r"export function toMediaDTO\([^)]*\)", content, re.DOTALL
        )
        self.assertIsNotNone(sig, "toMediaDTO signature not found")
        self.assertIn(
            "strapiUrl",
            sig.group(0),
            "toMediaDTO should require strapiUrl parameter (no hidden env fallback)",
        )

    def test_to_page_dto_requires_config_param(self):
        content = read_file("frontend", "src", "lib", "cms", "page-normalizer.ts")
        sig = re.search(
            r"export function toPageDTO\([^)]*\)", content, re.DOTALL
        )
        self.assertIsNotNone(sig, "toPageDTO signature not found")
        self.assertIn(
            "config",
            sig.group(0),
            "toPageDTO should require config parameter (no hidden getCmsConfig fallback)",
        )

    def test_resolve_media_url_is_pure(self):
        content = read_file("frontend", "src", "lib", "cms", "page-normalizer.ts")
        # resolveMediaUrl should not call getCmsConfig
        self.assertNotIn(
            "getCmsConfig",
            content,
            "page-normalizer.ts should not reference getCmsConfig after refactor",
        )

    def test_build_alternate_urls_is_pure(self):
        content = read_file("frontend", "src", "lib", "cms", "page-normalizer.ts")
        # Already checked via getCmsConfig absence above
        pass


class TestGatewayDecoupled(unittest.TestCase):
    """AC-6: cms-gateway.ts no longer imports page-specific normalizers."""

    def test_gateway_does_not_import_page_response_schema_from_page_normalizer(self):
        content = read_file("frontend", "src", "lib", "cms", "cms-gateway.ts")
        import_line = re.search(
            r'import .*pageResponseSchema.* from "\\./page-normalizer"', content
        )
        self.assertIsNone(
            import_line,
            "cms-gateway.ts should not import pageResponseSchema from page-normalizer",
        )

    def test_gateway_does_not_import_to_page_dto(self):
        content = read_file("frontend", "src", "lib", "cms", "cms-gateway.ts")
        self.assertNotIn(
            "toPageDTO",
            content,
            "cms-gateway.ts should not import toPageDTO",
        )

    def test_gateway_does_not_import_from_page_normalizer(self):
        content = read_file("frontend", "src", "lib", "cms", "cms-gateway.ts")
        import_match = re.search(
            r'import .* from "\./page-normalizer"', content
        )
        self.assertIsNone(
            import_match,
            "cms-gateway.ts should not import from page-normalizer at all",
        )


class TestFacadeModulesStillWork(unittest.TestCase):
    """AC-7 (implicit): Re-export facade modules still resolve."""

    def test_dto_module_exports_to_page_dto(self):
        content = read_file("frontend", "src", "lib", "cms", "dto.ts")
        self.assertIn("toPageDTO", content)

    def test_media_module_exports_to_media_dto(self):
        content = read_file("frontend", "src", "lib", "cms", "media.ts")
        self.assertIn("toMediaDTO", content)

    def test_seo_module_exports_to_seo_dto(self):
        content = read_file("frontend", "src", "lib", "cms", "seo.ts")
        self.assertIn("toSeoDTO", content)

    def test_references_module_exports_to_page_ref_dto(self):
        content = read_file("frontend", "src", "lib", "cms", "references.ts")
        self.assertIn("toPageRefDTO", content)

    def test_text_module_exports_normalize_optional_text(self):
        content = read_file("frontend", "src", "lib", "cms", "text.ts")
        self.assertIn("normalizeOptionalText", content)


class TestFrontendTestsPass(unittest.TestCase):
    """AC-7: All existing frontend tests pass without modification."""

    def test_frontend_unit_tests_pass(self):
        result = subprocess.run(
            ["npm", "run", "test", "--prefix", "frontend"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
        )
        self.assertEqual(
            result.returncode,
            0,
            f"Frontend unit tests must pass.\nSTDOUT:\n{result.stdout[-2000:]}\nSTDERR:\n{result.stderr[-2000:]}",
        )


if __name__ == "__main__":
    unittest.main()
