"""
Issue #78 — Agent & Developer Onboarding Docs
Acceptance test suite verifying onboarding documentation deliverables.
"""

import os
import re
import unittest

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read_file(*parts: str) -> str:
    with open(os.path.join(PROJECT_ROOT, *parts), "r", encoding="utf-8") as f:
        return f.read()


class TestAgentEntryPointsConsolidated(unittest.TestCase):
    """AC-1: AGENTS.md, CLAUDE.md, GEMINI.MD consolidated; stale refs fixed."""

    def test_agents_md_exists_and_has_no_stale_context_reference(self):
        content = read_file("AGENTS.md")
        self.assertNotIn(
            "not yet created",
            content.lower(),
            "AGENTS.md still claims CONTEXT.md is 'not yet created'",
        )

    def test_agents_md_has_explicit_reading_order(self):
        content = read_file("AGENTS.md")
        # Should mention CONTEXT.md explicitly as an existing file to read
        self.assertIn(
            "CONTEXT.md",
            content,
            "AGENTS.md should explicitly reference CONTEXT.md",
        )

    def test_claude_md_is_redirect_only_not_duplicate(self):
        content = read_file("CLAUDE.md")
        lines = content.strip().splitlines()
        # Should be a short redirect, not a full duplicate of AGENTS.md
        self.assertLessEqual(
            len(lines),
            3,
            f"CLAUDE.md should be a short redirect (≤3 lines), got {len(lines)} lines",
        )
        self.assertIn(
            "AGENTS.md",
            content,
            "CLAUDE.md should reference AGENTS.md",
        )
        # Must NOT contain the GitNexus block duplicated
        self.assertNotIn(
            "gitnexus:start",
            content,
            "CLAUDE.md should not duplicate the GitNexus block from AGENTS.md",
        )

    def test_gemini_md_is_redirect_only(self):
        content = read_file("GEMINI.MD")
        lines = content.strip().splitlines()
        self.assertLessEqual(
            len(lines),
            3,
            f"GEMINI.MD should be a short redirect (≤3 lines), got {len(lines)} lines",
        )
        self.assertIn(
            "AGENTS.md",
            content,
            "GEMINI.MD should reference AGENTS.md",
        )

    def test_domain_md_has_no_stale_context_reference(self):
        content = read_file("docs", "agents", "domain.md")
        self.assertNotIn(
            "not yet created",
            content.lower(),
            "docs/agents/domain.md still claims CONTEXT.md is 'not yet created'",
        )


class TestRootReadmeExists(unittest.TestCase):
    """AC-2: Root README.md with identity, stack, quick start, pointers."""

    def test_root_readme_exists(self):
        path = os.path.join(PROJECT_ROOT, "README.md")
        self.assertTrue(
            os.path.isfile(path),
            "Root README.md does not exist",
        )

    def test_readme_has_project_identity(self):
        content = read_file("README.md")
        self.assertIn(
            "myORL",
            content,
            "README.md should name the project (myORL)",
        )

    def test_readme_has_tech_stack(self):
        content = read_file("README.md")
        self.assertIn(
            "Strapi",
            content,
            "README.md should mention Strapi in tech stack",
        )
        self.assertIn(
            "Next.js",
            content,
            "README.md should mention Next.js in tech stack",
        )

    def test_readme_has_quick_start_command(self):
        content = read_file("README.md")
        self.assertIn(
            "npm run dev",
            content,
            "README.md should document the one-command quick start",
        )

    def test_readme_has_pointer_to_adrs(self):
        content = read_file("README.md")
        self.assertRegex(
            content,
            r"docs[/\\]adr",
            "README.md should point to docs/adr/",
        )

    def test_readme_has_pointer_to_runbooks(self):
        content = read_file("README.md")
        self.assertRegex(
            content,
            r"docs[/\\]runbooks",
            "README.md should point to docs/runbooks/",
        )

    def test_readme_has_pointer_to_context_md(self):
        content = read_file("README.md")
        self.assertIn(
            "CONTEXT.md",
            content,
            "README.md should point to CONTEXT.md",
        )


class TestBackendReadmeIsProjectSpecific(unittest.TestCase):
    """AC-3: backend/README.md replaces generic Strapi template."""

    def test_backend_readme_is_not_generic_strapi_template(self):
        content = read_file("backend", "README.md")
        generic_markers = [
            "Strapi comes with a full featured",
            "Command Line Interface",
            "Strapi Cloud",
            "Strapi is hiring",
            "Discord",
            "Forum",
            "Awesome Strapi",
        ]
        for marker in generic_markers:
            self.assertNotIn(
                marker,
                content,
                f"backend/README.md still contains generic Strapi template marker: '{marker}'",
            )

    def test_backend_readme_mentions_docker_or_postgres(self):
        content = read_file("backend", "README.md")
        has_docker = "docker" in content.lower() or "Docker Compose" in content
        has_postgres = "postgres" in content.lower() or "PostgreSQL" in content
        self.assertTrue(
            has_docker or has_postgres,
            "backend/README.md should mention Docker Compose or PostgreSQL",
        )

    def test_backend_readme_mentions_environment_variables(self):
        content = read_file("backend", "README.md")
        self.assertIn(
            ".env",
            content,
            "backend/README.md should mention environment variables / .env",
        )

    def test_backend_readme_mentions_migration_or_bootstrap(self):
        content = read_file("backend", "README.md")
        has_migration = "migration" in content.lower()
        has_bootstrap = "bootstrap" in content.lower()
        self.assertTrue(
            has_migration or has_bootstrap,
            "backend/README.md should mention migrations or bootstrap scripts",
        )


class TestAdr006StatusAccepted(unittest.TestCase):
    """AC-4: ADR-006 status updated from Proposed to Accepted."""

    def test_adr_006_status_is_accepted(self):
        content = read_file(
            "docs",
            "adr",
            "ADR-006-dynamiczone-single-section-container.md",
        )
        # Look for Status: Accepted (case-insensitive for "Accepted", but status label is capitalized)
        match = re.search(r"\*\*Status:\*\*\s*(\w+)", content)
        self.assertIsNotNone(
            match,
            "ADR-006 should have a Status field",
        )
        status = match.group(1)
        self.assertEqual(
            status,
            "Accepted",
            f"ADR-006 status should be 'Accepted', got '{status}'",
        )


class TestLegacyManifestsArchived(unittest.TestCase):
    """AC-5: Legacy MODX migration artifacts in data/manifests/ archived."""

    # These are the clearly historical nextjs_* migration artifacts
    HISTORICAL_MANIFESTS = [
        "nextjs_page_contract_fix_plan.json",
        "nextjs_source_alignment_manifest.json",
        "nextjs_structural_review_manifest.json",
        "nextjs_seo_review_manifest.json",
        "nextjs_menu_title_backfill_plan.json",
        "nextjs_pageblocks_cleanup_batch_a.json",
        "nextjs_pageblocks_cleanup_batch_b.json",
        "nextjs_parent_fix_plan.json",
        "nextjs_legacy_cleanup_manifest.json",
        "nextjs_internal_link_repair_manifest.json",
        "locale_pair_audit.json",
        "tag_plan.json",
        "orphan_assets.json",
        "homepage_link_exceptions.json",
    ]

    # These must remain in the main manifests directory (actively used)
    ACTIVE_MANIFESTS = [
        "slug_redirects_next.json",
        "README.md",
    ]

    def test_historical_manifests_are_not_in_root_manifests_dir(self):
        manifests_dir = os.path.join(PROJECT_ROOT, "data", "manifests")
        for filename in self.HISTORICAL_MANIFESTS:
            path = os.path.join(manifests_dir, filename)
            self.assertFalse(
                os.path.exists(path),
                f"Historical manifest '{filename}' should be archived, not in data/manifests/",
            )

    def test_active_manifests_remain_in_manifests_dir(self):
        manifests_dir = os.path.join(PROJECT_ROOT, "data", "manifests")
        for filename in self.ACTIVE_MANIFESTS:
            path = os.path.join(manifests_dir, filename)
            self.assertTrue(
                os.path.exists(path),
                f"Active manifest '{filename}' must remain in data/manifests/",
            )

    def test_historical_manifests_are_in_archive_or_gitignored(self):
        """Historical manifests should either be in archive/ or listed in .gitignore."""
        archive_dir = os.path.join(PROJECT_ROOT, "data", "manifests", "archive")
        gitignore_path = os.path.join(PROJECT_ROOT, "data", "manifests", ".gitignore")

        gitignore_patterns = set()
        if os.path.isfile(gitignore_path):
            with open(gitignore_path, "r", encoding="utf-8") as f:
                gitignore_patterns = {line.strip() for line in f if line.strip() and not line.startswith("#")}

        for filename in self.HISTORICAL_MANIFESTS:
            in_archive = os.path.isfile(os.path.join(archive_dir, filename))
            in_gitignore = filename in gitignore_patterns
            self.assertTrue(
                in_archive or in_gitignore,
                f"Historical manifest '{filename}' should be in data/manifests/archive/ or in .gitignore",
            )


if __name__ == "__main__":
    unittest.main()
