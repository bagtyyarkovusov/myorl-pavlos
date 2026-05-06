#!/usr/bin/env python3
"""Tests for backup_runner.py — run with `python3 tests/test_backup_runner.py`"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

# Add repo root to path so imports work
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))

from backup_runner import _resolve_target, _timestamp
from environments import ENVIRONMENTS


class TestResolveTarget(unittest.TestCase):
    def test_dev(self):
        t = _resolve_target("dev")
        self.assertEqual(t.name, "dev")
        self.assertEqual(t.container, "gemini-pg")
        self.assertEqual(t.db_name, "strapi")

    def test_rehearsal(self):
        t = _resolve_target("rehearsal")
        self.assertEqual(t.container, "gemini-pg-rehearsal")
        self.assertEqual(t.db_name, "strapi_rehearsal")

    def test_production(self):
        t = _resolve_target("production")
        self.assertEqual(t.container, "gemini-pg-prod")
        self.assertEqual(t.db_name, "strapi")


class TestTimestamp(unittest.TestCase):
    def test_format(self):
        ts = _timestamp()
        self.assertEqual(len(ts), 15)  # YYYYMMDD_HHMMSS
        self.assertEqual(ts[8], "_")


if __name__ == "__main__":
    unittest.main(verbosity=2)
