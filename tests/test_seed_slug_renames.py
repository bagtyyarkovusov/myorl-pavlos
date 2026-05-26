"""Tests for tools/seed_slug_renames_to_url_mappings.py."""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

_TOOLS = Path(__file__).resolve().parents[1] / "tools"
if str(_TOOLS) not in sys.path:
    sys.path.insert(0, str(_TOOLS))

from seed_slug_renames_to_url_mappings import _as_path, build_url_mappings


class AsPathTests(unittest.TestCase):
    def test_bare_slug(self) -> None:
        self.assertEqual(_as_path("rinoplastiki"), "/rinoplastiki")

    def test_locale_prefixed(self) -> None:
        self.assertEqual(_as_path("el/rinoplastiki"), "/el/rinoplastiki")

    def test_strips_leading_slash(self) -> None:
        self.assertEqual(_as_path("/el/rinoplastiki"), "/el/rinoplastiki")

    def test_strips_trailing_slash(self) -> None:
        self.assertEqual(_as_path("el/rinoplastiki/"), "/el/rinoplastiki")

    def test_empty_returns_empty(self) -> None:
        self.assertEqual(_as_path(""), "")


class BuildUrlMappingsTests(unittest.TestCase):
    def test_rename_produces_internal_301(self) -> None:
        entries = [
            {"locale": "el", "old_slug": "lftynnk-prospou-2", "new_slug": "lifting-prosopou", "notes": "Fixed typo"}
        ]
        rows = build_url_mappings(entries)
        self.assertEqual(len(rows), 1)
        r = rows[0]
        self.assertEqual(r["legacyPath"], "/el/lftynnk-prospou-2")
        self.assertEqual(r["destinationPath"], "/el/lifting-prosopou")
        self.assertEqual(r["destinationKind"], "internal-301")
        self.assertEqual(r["locale"], "el")
        self.assertIn("Fixed typo", r["notes"])

    def test_empty_new_slug_produces_gone_410(self) -> None:
        entries = [
            {"locale": "el", "old_slug": "1", "new_slug": "", "notes": "Garbage slug"}
        ]
        rows = build_url_mappings(entries)
        self.assertEqual(len(rows), 1)
        r = rows[0]
        self.assertEqual(r["legacyPath"], "/el/1")
        self.assertEqual(r["destinationPath"], "")
        self.assertEqual(r["destinationKind"], "gone-410")
        self.assertEqual(r["locale"], "el")
        self.assertIn("Garbage slug", r["notes"])

    def test_multiple_entries(self) -> None:
        entries = [
            {"locale": "el", "old_slug": "browlift", "new_slug": "brow-lift"},
            {"locale": "el", "old_slug": "atrisia", "new_slug": "atrisia-1"},
            {"locale": "ru", "old_slug": "ринопластика", "new_slug": "rinoplastika"},
        ]
        rows = build_url_mappings(entries)
        self.assertEqual(len(rows), 3)
        self.assertTrue(all(r["destinationKind"] == "internal-301" for r in rows))

    def test_skips_missing_locale(self) -> None:
        entries = [
            {"old_slug": "something", "new_slug": "else"},
        ]
        rows = build_url_mappings(entries)
        self.assertEqual(len(rows), 0)

    def test_skips_missing_old_slug(self) -> None:
        entries = [
            {"locale": "el", "new_slug": "else"},
        ]
        rows = build_url_mappings(entries)
        self.assertEqual(len(rows), 0)

    def test_deduplicates_same_old_slug(self) -> None:
        entries = [
            {"locale": "el", "old_slug": "dup", "new_slug": "fixed"},
            {"locale": "el", "old_slug": "dup", "new_slug": "fixed2"},
        ]
        rows = build_url_mappings(entries)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["destinationPath"], "/el/fixed")

    def test_ru_locale_path(self) -> None:
        entries = [
            {"locale": "ru", "old_slug": "test-page", "new_slug": "fixed-page"}
        ]
        rows = build_url_mappings(entries)
        self.assertEqual(rows[0]["legacyPath"], "/ru/test-page")
        self.assertEqual(rows[0]["destinationPath"], "/ru/fixed-page")

    def test_auto_notes_when_missing(self) -> None:
        entries = [
            {"locale": "el", "old_slug": "bad", "new_slug": "good"},
            {"locale": "el", "old_slug": "retired", "new_slug": ""},
        ]
        rows = build_url_mappings(entries)
        self.assertIn("Renamed slug", rows[0]["notes"])
        self.assertIn("Retired slug", rows[1]["notes"])


class EndToEndTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = Path(tempfile.mkdtemp())

    def tearDown(self) -> None:
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_full_pipeline(self) -> None:
        """Simulate the full pipeline: input JSON → script → output JSON."""
        input_data = [
            {"locale": "el", "old_slug": "browlift", "new_slug": "brow-lift", "notes": "Dash consistency"},
            {"locale": "el", "old_slug": "1", "new_slug": "", "notes": "Garbage"},
        ]
        input_path = self.temp_dir / "approved-renames.json"
        output_path = self.temp_dir / "url-mappings.json"

        input_path.write_text(json.dumps(input_data, indent=2), encoding="utf-8")

        rows = build_url_mappings(input_data)
        output_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

        # Verify output
        output = json.loads(output_path.read_text(encoding="utf-8"))
        self.assertEqual(len(output), 2)

        # First row: internal-301
        self.assertEqual(output[0]["destinationKind"], "internal-301")
        self.assertEqual(output[0]["destinationPath"], "/el/brow-lift")

        # Second row: gone-410
        self.assertEqual(output[1]["destinationKind"], "gone-410")
        self.assertEqual(output[1]["destinationPath"], "")


if __name__ == "__main__":
    unittest.main()
