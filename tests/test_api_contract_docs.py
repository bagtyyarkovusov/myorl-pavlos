"""
Issue #88 — API Contract Documentation
Acceptance test suite verifying API contract documentation deliverables.
"""

import os
import re
import unittest

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read_file(*parts: str) -> str:
    with open(os.path.join(PROJECT_ROOT, *parts), "r", encoding="utf-8") as f:
        return f.read()


class TestApiContractDocumentExists(unittest.TestCase):
    """AC-1: Formal API contract document at docs/api-contract.md."""

    def test_api_contract_md_exists(self):
        path = os.path.join(PROJECT_ROOT, "docs", "api-contract.md")
        self.assertTrue(
            os.path.isfile(path),
            "docs/api-contract.md does not exist",
        )

    def test_api_contract_documents_endpoints(self):
        content = read_file("docs", "api-contract.md")
        self.assertIn(
            "/api/pages",
            content,
            "API contract should document /api/pages endpoint",
        )
        self.assertIn(
            "/api/global",
            content,
            "API contract should document /api/global endpoint",
        )

    def test_api_contract_documents_query_parameters(self):
        content = read_file("docs", "api-contract.md")
        self.assertIn(
            "locale",
            content,
            "API contract should document 'locale' query parameter",
        )
        self.assertIn(
            "populate",
            content,
            "API contract should document 'populate' query parameter",
        )

    def test_api_contract_documents_error_contract(self):
        content = read_file("docs", "api-contract.md")
        # Should document CmsPageError kinds
        error_kinds = ["not_found", "network", "timeout", "server_error", "validation"]
        for kind in error_kinds:
            self.assertIn(
                kind,
                content,
                f"API contract should document error kind '{kind}'",
            )

    def test_api_contract_documents_populate_contract(self):
        content = read_file("docs", "api-contract.md")
        self.assertIn(
            "PAGE_POPULATE",
            content,
            "API contract should document the PAGE_POPULATE contract",
        )

    def test_api_contract_documents_dto_boundary(self):
        content = read_file("docs", "api-contract.md")
        self.assertIn(
            "PageDTO",
            content,
            "API contract should document PageDTO",
        )
        self.assertIn(
            "ADR-001",
            content,
            "API contract should reference ADR-001",
        )

    def test_api_contract_has_request_response_examples(self):
        content = read_file("docs", "api-contract.md")
        # Should have JSON code blocks showing request/response examples
        self.assertRegex(
            content,
            r"```(?:json|ts|typescript)",
            "API contract should include code examples",
        )


class TestExampleDtoIsCurrent(unittest.TestCase):
    """AC-2: examples/next_page_dto.ts reflects current implementation."""

    def test_example_contains_current_page_dto_fields(self):
        content = read_file("examples", "next_page_dto.ts")
        # These fields were added after the example was written
        current_fields = ["alternateUrls", "seoTitle", "renderMode"]
        for field in current_fields:
            self.assertIn(
                field,
                content,
                f"examples/next_page_dto.ts should contain current field '{field}'",
            )

    def test_example_does_not_have_stale_top_level_section_fields(self):
        content = read_file("examples", "next_page_dto.ts")
        # Pre-ADR-006: these were top-level page fields. Now they are in pageSections dynamic zone.
        stale_fields = ["faqSection:", "accordionSection:", "tabsSection:", "gallerySection:"]
        for field in stale_fields:
            self.assertNotIn(
                field,
                content,
                f"examples/next_page_dto.ts should not contain stale field '{field}' — sections now live in pageSections",
            )

    def test_example_contact_is_not_top_level(self):
        """Contact should be inside sections, not a top-level PageDTO field."""
        content = read_file("examples", "next_page_dto.ts")
        # The stale example had `contact?: { details, clinics }` at the PageDTO top level.
        # We check that it's NOT there as a direct property of PageDTO.
        # A simple check: look for "contact?:" near "PageDTO"
        page_dto_match = re.search(
            r"export\s+type\s+PageDTO\s*=\s*\{([^}]+)\}",
            content,
            re.DOTALL,
        )
        if page_dto_match:
            page_dto_body = page_dto_match.group(1)
            self.assertNotIn(
                "contact",
                page_dto_body,
                "PageDTO should not have 'contact' as a top-level field — it belongs in sections",
            )

    def test_example_has_section_dto_union(self):
        content = read_file("examples", "next_page_dto.ts")
        # Should reference SectionDTO or sections.sections
        has_section_dto = "SectionDTO" in content
        has_sections_array = re.search(r"sections\s*:\s*(?:SectionDTO|unknown)\[\]", content)
        self.assertTrue(
            has_section_dto or has_sections_array,
            "examples/next_page_dto.ts should reference SectionDTO or a sections array",
        )


class TestDtoChangelogExists(unittest.TestCase):
    """AC-3: DTO changelog or versioning note exists."""

    def test_changelog_or_version_note_in_api_contract(self):
        content = read_file("docs", "api-contract.md")
        has_changelog = "Changelog" in content or "changelog" in content.lower()
        has_version = "Version" in content or "version" in content.lower()
        has_history = "History" in content or "history" in content.lower()
        self.assertTrue(
            has_changelog or has_version or has_history,
            "API contract should include a changelog, version note, or history section",
        )


if __name__ == "__main__":
    unittest.main()
