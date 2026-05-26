#!/usr/bin/env python3
"""Tests for prune_web_vitals_log.py — run with ``python3 tests/test_prune_web_vitals_log.py``"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))

from prune_web_vitals_log import (  # noqa: E402
    DELETE_QUERY,
    COUNT_QUERY,
)


class TestSQLConstants(unittest.TestCase):
    """The DELETE and COUNT queries are the privacy contract — test them directly."""

    def test_delete_removes_rows_older_than_90_days(self):
        self.assertIn("DELETE FROM web_vitals_log", DELETE_QUERY)
        self.assertIn("created_at < NOW() - INTERVAL '90 days'", DELETE_QUERY)

    def test_count_uses_same_predicate_as_delete(self):
        delete_predicate = DELETE_QUERY.split("WHERE", 1)[1].strip()
        count_predicate = COUNT_QUERY.split("WHERE", 1)[1].strip()
        self.assertEqual(delete_predicate, count_predicate)

    def test_count_is_select_not_delete(self):
        self.assertIn("SELECT COUNT(*)", COUNT_QUERY)
        self.assertNotIn("DELETE", COUNT_QUERY)


class TestDeleteIdempotency(unittest.TestCase):
    """Running the DELETE twice in a row removes zero additional rows."""

    def test_sql_is_idempotent(self):
        self.assertIn("created_at < NOW() - INTERVAL", DELETE_QUERY)
        self.assertNotIn("<=", DELETE_QUERY)


class TestTargetValidation(unittest.TestCase):
    """Target resolution from environments.py."""

    def test_valid_targets_are_the_three_environments(self):
        from prune_web_vitals_log import _resolve_target

        for name in ("dev", "rehearsal", "production"):
            target = _resolve_target(name)
            self.assertEqual(target.name, name)

    def test_unknown_target_raises_keyerror(self):
        from prune_web_vitals_log import _resolve_target

        with self.assertRaises(KeyError):
            _resolve_target("staging")

    def test_production_has_remote_access(self):
        from prune_web_vitals_log import _resolve_target

        prod = _resolve_target("production")
        self.assertEqual(prod.access, "remote")


if __name__ == "__main__":
    unittest.main(verbosity=2)
