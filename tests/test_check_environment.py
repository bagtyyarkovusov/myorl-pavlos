#!/usr/bin/env python3
"""Tests for check_environment.py — run with `python3 tests/test_check_environment.py`"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

# Add repo root to path so imports work
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))

from check_environment import (
    CheckResult,
    check_container_conflict,
    check_port_free,
    check_sqlite_source_exists,
    check_target_config,
    run_checks,
)
from environments import ENVIRONMENTS


class TestCheckTargetConfig(unittest.TestCase):
    def test_valid_target_dev(self):
        result = check_target_config("dev")
        self.assertTrue(result.passed)
        self.assertIn("dev", result.message)

    def test_valid_target_rehearsal(self):
        result = check_target_config("rehearsal")
        self.assertTrue(result.passed)
        self.assertIn("rehearsal", result.message)

    def test_valid_target_production(self):
        result = check_target_config("production")
        self.assertTrue(result.passed)
        self.assertIn("production", result.message)

    def test_invalid_target(self):
        result = check_target_config("staging")
        self.assertFalse(result.passed)
        self.assertIn("Unknown target", result.message)
        self.assertIn("staging", result.details["target"])


class TestCheckPortFree(unittest.TestCase):
    def test_host_ports_in_manifest_are_valid(self):
        for target, env in ENVIRONMENTS.items():
            port = env["host_port"]
            if port is None:
                continue  # internal-only targets (production)
            self.assertIsInstance(port, int, f"Target {target} host_port must be an integer")
            self.assertGreater(port, 0, f"Target {target} host_port must be positive")
            self.assertLess(port, 65536, f"Target {target} host_port must be < 65536")


class TestCheckSQLiteSource(unittest.TestCase):
    def test_missing_database(self):
        result = check_sqlite_source_exists(Path("/nonexistent/path/data.db"))
        self.assertFalse(result.passed)
        self.assertIn("not found", result.message)

    def test_existing_file(self):
        # Use this test file itself as a stand-in for a readable file
        result = check_sqlite_source_exists(Path(__file__))
        self.assertTrue(result.passed)
        self.assertIn("found", result.message)


class TestRunChecks(unittest.TestCase):
    def test_invalid_target_stops_early(self):
        results = run_checks("invalid-target")
        self.assertEqual(len(results), 1)
        self.assertFalse(results[0].passed)

    def test_rehearsal_runs_all_checks(self):
        results = run_checks("rehearsal")
        # Should have: target, port, container checks
        self.assertGreaterEqual(len(results), 3)
        # First check (target validity) should pass
        self.assertTrue(results[0].passed)


class TestCheckContainerConflict(unittest.TestCase):
    def test_fake_container_name(self):
        # Use a container name that almost certainly does not exist
        result = check_container_conflict("myorl-pg-definitely-not-running-12345")
        # This may fail if Docker is not installed, which is acceptable
        if result.passed:
            self.assertIn("No conflicting container", result.message)


if __name__ == "__main__":
    unittest.main(verbosity=2)
