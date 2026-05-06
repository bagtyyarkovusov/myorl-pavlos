#!/usr/bin/env python3
"""Tests for migration_runner.py — run with `python3 tests/test_migration_runner.py`"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

# Add repo root to path so imports work
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))

from migration_runner import (
    Migration,
    discover_migrations,
    _compute_checksum,
    validate_migrations_against_history,
    plan_up,
    plan_down,
)


class TestDiscoverMigrations(unittest.TestCase):
    def test_discovers_real_migrations(self):
        migs = discover_migrations()
        self.assertGreaterEqual(len(migs), 4, "Should find at least the 4 existing migrations")

        basenames = {m.basename for m in migs}
        self.assertIn("20260425_001_pages_lookup_indexes", basenames)
        self.assertIn("20260425_002_tag_slug_indexes", basenames)

    def test_up_and_down_paths_present(self):
        migs = discover_migrations()
        for m in migs:
            self.assertTrue(m.up_path.exists(), f"{m.up_path} should exist")
            if m.down_path is not None:
                self.assertTrue(m.down_path.exists(), f"{m.down_path} should exist")

    def test_sorted_by_basename(self):
        migs = discover_migrations()
        basenames = [m.basename for m in migs]
        self.assertEqual(basenames, sorted(basenames))


class TestChecksums(unittest.TestCase):
    def test_checksum_stable(self):
        migs = discover_migrations()
        self.assertTrue(migs)
        first = migs[0]
        c1 = first.up_checksum()
        c2 = _compute_checksum(first.up_path)
        self.assertEqual(c1, c2)
        self.assertEqual(len(c1), 64)  # SHA-256 hex


class TestValidateAgainstHistory(unittest.TestCase):
    def test_no_errors_when_empty_history(self):
        migs = [
            Migration(basename="a", up_path=Path("/fake/a.up.sql"), down_path=None),
        ]
        errors = validate_migrations_against_history(migs, {})
        self.assertEqual(errors, [])

    def test_no_errors_when_checksum_matches(self):
        migs = [
            Migration(basename="a", up_path=Path(__file__), down_path=None),
        ]
        checksum = _compute_checksum(Path(__file__))
        history = {"a": checksum}
        errors = validate_migrations_against_history(migs, history)
        self.assertEqual(errors, [])

    def test_error_on_edited_migration(self):
        migs = [
            Migration(basename="a", up_path=Path(__file__), down_path=None),
        ]
        history = {"a": "deadbeef" * 8}
        errors = validate_migrations_against_history(migs, history)
        self.assertEqual(len(errors), 1)
        self.assertIn("EDITED MIGRATION", errors[0])
        self.assertIn("Forward-Only policy", errors[0])


class TestPlanUp(unittest.TestCase):
    def test_applies_only_pending(self):
        migs = [
            Migration(basename="001", up_path=Path("/fake/001.up.sql"), down_path=None),
            Migration(basename="002", up_path=Path("/fake/002.up.sql"), down_path=None),
            Migration(basename="003", up_path=Path("/fake/003.up.sql"), down_path=None),
        ]
        history = {"001": "abc"}
        pending = plan_up(migs, history)
        self.assertEqual([m.basename for m in pending], ["002", "003"])

    def test_all_pending_when_empty_history(self):
        migs = [
            Migration(basename="001", up_path=Path("/fake/001.up.sql"), down_path=None),
        ]
        self.assertEqual(plan_up(migs, {}), migs)


class TestPlanDown(unittest.TestCase):
    def test_reverse_order_with_down_files(self):
        migs = [
            Migration(basename="001", up_path=Path("/fake/001.up.sql"), down_path=Path("/fake/001.down.sql")),
            Migration(basename="002", up_path=Path("/fake/002.up.sql"), down_path=Path("/fake/002.down.sql")),
            Migration(basename="003", up_path=Path("/fake/003.up.sql"), down_path=None),
        ]
        history = {"001": "a", "002": "b"}
        rollback = plan_down(migs, history)
        self.assertEqual([m.basename for m in rollback], ["002", "001"])

    def test_skips_missing_down_files(self):
        migs = [
            Migration(basename="001", up_path=Path("/fake/001.up.sql"), down_path=Path("/fake/001.down.sql")),
            Migration(basename="002", up_path=Path("/fake/002.up.sql"), down_path=None),
        ]
        history = {"001": "a", "002": "b"}
        rollback = plan_down(migs, history)
        self.assertEqual([m.basename for m in rollback], ["001"])

    def test_empty_when_nothing_applied(self):
        migs = [
            Migration(basename="001", up_path=Path("/fake/001.up.sql"), down_path=Path("/fake/001.down.sql")),
        ]
        self.assertEqual(plan_down(migs, {}), [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
