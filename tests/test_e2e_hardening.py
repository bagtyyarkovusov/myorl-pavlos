#!/usr/bin/env python3
"""E2E hardening acceptance tests — verifies Playwright specs meet quality criteria."""

from __future__ import annotations

import ast
import re
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
E2E_DIR = ROOT / "frontend" / "e2e"
PLAYWRIGHT_CONFIG = ROOT / "frontend" / "playwright.config.ts"


def _read_spec_files() -> dict[Path, str]:
    specs = {}
    for path in E2E_DIR.rglob("*.spec.ts"):
        specs[path] = path.read_text()
    return specs


class TestNoWaitForTimeout(unittest.TestCase):
    def test_no_waitForTimeout_in_specs(self):
        specs = _read_spec_files()
        self.assertTrue(specs, "Must have at least one spec file")
        occurrences = []
        for path, content in specs.items():
            for lineno, line in enumerate(content.splitlines(), 1):
                if "waitForTimeout" in line:
                    occurrences.append(f"{path.name}:{lineno}: {line.strip()}")
        if occurrences:
            self.fail(
                f"Found {len(occurrences)} waitForTimeout call(s). Replace with "
                f"waitForLoadState('networkidle') or expect(locator).toBeVisible():\n"
                + "\n".join(occurrences)
            )


class TestFunctionalAssertionsBeforeScreenshots(unittest.TestCase):
    def test_every_screenshot_has_functional_assertion_before_it(self):
        specs = _read_spec_files()
        violations = []
        for path, content in specs.items():
            lines = content.splitlines()
            for lineno, line in enumerate(lines, 1):
                if "toHaveScreenshot" not in line:
                    continue
                preceding = lines[max(0, lineno - 6) : lineno]
                has_assertion = any(
                    pattern in "\n".join(preceding)
                    for pattern in ["toBeVisible()", "toHaveText(", "toContainText(", "toHaveCount("]
                )
                has_conditional_guard = "isVisible()" in "\n".join(preceding)
                if not has_assertion and not has_conditional_guard:
                    violations.append(f"{path.name}:{lineno}: {line.strip()}")
        if violations:
            self.fail(
                f"Found {len(violations)} screenshot(s) without preceding functional assertion:\n"
                + "\n".join(violations)
            )


class TestSnapshotStrategy(unittest.TestCase):
    def test_snapshot_path_template_is_platform_agnostic(self):
        self.assertTrue(PLAYWRIGHT_CONFIG.exists(), "playwright.config.ts must exist")
        content = PLAYWRIGHT_CONFIG.read_text()
        self.assertIn("snapshotPathTemplate", content, "Must configure snapshotPathTemplate for platform-agnostic snapshots")

    def test_no_darwin_only_snapshots_committed(self):
        snapshot_dirs = list((ROOT / "frontend" / "e2e").rglob("*.spec.ts-snapshots"))
        for snap_dir in snapshot_dirs:
            darwin_files = list(snap_dir.glob("*-darwin.png"))
            if darwin_files:
                self.fail(
                    f"Found {len(darwin_files)} darwin-only snapshot(s) in {snap_dir.relative_to(ROOT)}. "
                    "Either regenerate on Ubuntu or use platform-agnostic snapshotPathTemplate."
                )


class TestSkipPatterns(unittest.TestCase):
    def test_no_deprecated_test_skip_true(self):
        specs = _read_spec_files()
        violations = []
        for path, content in specs.items():
            for lineno, line in enumerate(content.splitlines(), 1):
                if 'test.skip(true' in line:
                    violations.append(f"{path.name}:{lineno}: {line.strip()}")
        if violations:
            self.fail(
                f"Found {len(violations)} deprecated test.skip(true) call(s). "
                f"Use test.info().skip() instead:\n"
                + "\n".join(violations)
            )


class TestWorkersConfig(unittest.TestCase):
    def test_ci_workers_at_least_2(self):
        self.assertTrue(PLAYWRIGHT_CONFIG.exists(), "playwright.config.ts must exist")
        content = PLAYWRIGHT_CONFIG.read_text()
        # Find workers config — expect something like: workers: process.env.CI ? 2 : undefined
        match = re.search(r"workers:\s*process\.env\.CI\s*\?\s*(\d+)", content)
        self.assertIsNotNone(match, "Must configure workers for CI")
        workers = int(match.group(1))
        self.assertGreaterEqual(workers, 2, f"CI workers must be >= 2, got {workers}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
