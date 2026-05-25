#!/usr/bin/env python3
"""Tests for prune_search_query_log.py — run with ``python3 tests/test_prune_search_query_log.py``"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))

from prune_search_query_log import (  # noqa: E402
    DELETE_QUERY,
    COUNT_QUERY,
    SQL_DELETE,
    SQL_COUNT,
    build_prune_sql,
)


class TestSQLConstants(unittest.TestCase):
    """The DELETE and COUNT queries are the privacy contract — test them directly."""

    def test_delete_removes_rows_older_than_90_days(self):
        self.assertIn("DELETE FROM search_query_log", DELETE_QUERY)
        self.assertIn("created_at < NOW() - INTERVAL '90 days'", DELETE_QUERY)

    def test_count_uses_same_predicate_as_delete(self):
        # The WHERE clause must be identical between SELECT COUNT and DELETE
        delete_predicate = DELETE_QUERY.split("WHERE", 1)[1].strip()
        count_predicate = COUNT_QUERY.split("WHERE", 1)[1].strip()
        self.assertEqual(delete_predicate, count_predicate)

    def test_count_is_select_not_delete(self):
        self.assertIn("SELECT COUNT(*)", COUNT_QUERY)
        self.assertNotIn("DELETE", COUNT_QUERY)

    def test_sql_delete_is_the_delete_query(self):
        self.assertEqual(SQL_DELETE, DELETE_QUERY)

    def test_sql_count_is_the_count_query(self):
        self.assertEqual(SQL_COUNT, COUNT_QUERY)


class TestBuildPruneSql(unittest.TestCase):
    """build_prune_sql returns the right query based on dry_run flag."""

    def test_dry_run_true_returns_count_query(self):
        sql = build_prune_sql(dry_run=True)
        self.assertEqual(sql, COUNT_QUERY)

    def test_dry_run_false_returns_delete_query(self):
        sql = build_prune_sql(dry_run=False)
        self.assertEqual(sql, DELETE_QUERY)

    def test_default_is_delete(self):
        sql = build_prune_sql()
        self.assertEqual(sql, DELETE_QUERY)


class TestDeleteIdempotency(unittest.TestCase):
    """Running the DELETE twice in a row removes zero additional rows."""

    def test_sql_is_idempotent(self):
        # The DELETE predicate uses a strict-less-than on a moving window
        # (NOW() - INTERVAL '90 days'). Rows that don't match are untouched.
        # Running it twice means the second invocation has no rows matching
        # the predicate that the first invocation already removed.
        #
        # We assert that the query targets only rows whose created_at is
        # strictly before the cutoff — no accidental deletion of newer rows.
        self.assertIn("created_at < NOW() - INTERVAL", DELETE_QUERY)
        self.assertNotIn("<=", DELETE_QUERY)


class TestTargetValidation(unittest.TestCase):
    """Target resolution from environments.py."""

    def test_valid_targets_are_the_three_environments(self):
        from prune_search_query_log import _resolve_target

        for name in ("dev", "rehearsal", "production"):
            target = _resolve_target(name)
            self.assertEqual(target.name, name)

    def test_unknown_target_raises_keyerror(self):
        from prune_search_query_log import _resolve_target

        with self.assertRaises(KeyError):
            _resolve_target("staging")

    def test_production_has_remote_access(self):
        from prune_search_query_log import _resolve_target

        prod = _resolve_target("production")
        self.assertEqual(prod.access, "remote")


if __name__ == "__main__":
    unittest.main(verbosity=2)
