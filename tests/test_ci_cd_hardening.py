#!/usr/bin/env python3
"""CI/CD hardening acceptance tests — run with `python3 tests/test_ci_cd_hardening.py`"""

from __future__ import annotations

import json
import os
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class TestPreCommitHook(unittest.TestCase):
    def test_pre_commit_hook_exists_and_runs_lint_staged(self):
        hook = ROOT / ".husky" / "pre-commit"
        self.assertTrue(hook.exists(), ".husky/pre-commit must exist")
        self.assertTrue(os.access(hook, os.X_OK), ".husky/pre-commit must be executable")
        content = hook.read_text()
        self.assertIn("lint-staged", content, "pre-commit must run lint-staged")


class TestBackendCI(unittest.TestCase):
    def test_backend_job_runs_tsc_noEmit(self):
        ci = ROOT / ".github" / "workflows" / "ci.yml"
        self.assertTrue(ci.exists(), "ci.yml must exist")
        content = ci.read_text()
        self.assertIn("tsc --noEmit", content, "backend CI must run tsc --noEmit")


class TestManifestCI(unittest.TestCase):
    def test_manifest_job_runs_all_python_tests(self):
        ci = ROOT / ".github" / "workflows" / "ci.yml"
        self.assertTrue(ci.exists(), "ci.yml must exist")
        content = ci.read_text()
        for test_file in (
            "test_environments.py",
            "test_check_environment.py",
            "test_backup_runner.py",
            "test_migration_runner.py",
        ):
            self.assertIn(test_file, content, f"manifest CI must run {test_file}")


class TestDockerCI(unittest.TestCase):
    def test_docker_build_job_exists(self):
        ci = ROOT / ".github" / "workflows" / "ci.yml"
        self.assertTrue(ci.exists(), "ci.yml must exist")
        content = ci.read_text()
        self.assertIn("docker build", content, "CI must build docker images")
        self.assertIn("./backend", content, "CI must build backend image")
        self.assertIn("frontend/Dockerfile", content, "CI must build frontend image")


class TestVitestCoverage(unittest.TestCase):
    def test_coverage_provider_configured(self):
        vitest = ROOT / "frontend" / "vitest.config.ts"
        self.assertTrue(vitest.exists(), "vitest.config.ts must exist")
        content = vitest.read_text()
        self.assertIn("coverage", content, "vitest config must include coverage")
        self.assertIn("v8", content, "vitest coverage must use v8 provider")

    def test_coverage_artifacts_uploaded_in_ci(self):
        ci = ROOT / ".github" / "workflows" / "ci.yml"
        self.assertTrue(ci.exists(), "ci.yml must exist")
        content = ci.read_text()
        self.assertIn("coverage", content, "CI must reference coverage")
        self.assertIn("upload-artifact", content, "CI must upload coverage artifacts")


if __name__ == "__main__":
    unittest.main(verbosity=2)
