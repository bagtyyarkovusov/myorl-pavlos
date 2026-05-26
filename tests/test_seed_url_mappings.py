"""Unit tests for tools/seed_url_mappings.py."""

import io
import json
import sys
import unittest
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock, patch

_TOOLS = Path(__file__).resolve().parents[1] / "tools"
if str(_TOOLS) not in sys.path:
    sys.path.insert(0, str(_TOOLS))

from seed_url_mappings import (
    classify_action,
    load_seed_json,
    run_seed,
    build_markdown_summary,
)
from strapi_client import StrapiClient

# ---------------------------------------------------------------------------
# JSON loader
# ---------------------------------------------------------------------------


class LoadSeedJsonTests(unittest.TestCase):
    def test_loads_valid_json_array(self) -> None:
        data = json.dumps([
            {"legacyPath": "/old", "destinationPath": "/el/new",
             "destinationKind": "internal-301", "locale": "el", "notes": "test"},
        ])
        path = Path("/tmp/test_seed_input.json")
        path.write_text(data, encoding="utf-8")
        try:
            result = load_seed_json(path)
            self.assertEqual(len(result), 1)
            self.assertEqual(result[0]["legacyPath"], "/old")
        finally:
            path.unlink(missing_ok=True)

    def test_loads_empty_array(self) -> None:
        path = Path("/tmp/test_seed_empty.json")
        path.write_text("[]", encoding="utf-8")
        try:
            result = load_seed_json(path)
            self.assertEqual(result, [])
        finally:
            path.unlink(missing_ok=True)

    def test_rejects_non_list_json(self) -> None:
        path = Path("/tmp/test_seed_bad.json")
        path.write_text('{"not": "a list"}', encoding="utf-8")
        try:
            with self.assertRaises(ValueError):
                load_seed_json(path)
        finally:
            path.unlink(missing_ok=True)

    def test_handles_unicode_paths(self) -> None:
        data = json.dumps([
            {"legacyPath": "/αμυγδαλεκτομή", "destinationPath": "/el/amygdalektomi",
             "destinationKind": "internal-301", "locale": "el", "notes": "greek"},
        ])
        path = Path("/tmp/test_seed_unicode.json")
        path.write_text(data, encoding="utf-8")
        try:
            result = load_seed_json(path)
            self.assertEqual(result[0]["legacyPath"], "/αμυγδαλεκτομή")
        finally:
            path.unlink(missing_ok=True)


# ---------------------------------------------------------------------------
# Action classification
# ---------------------------------------------------------------------------


def _entry(**overrides: Any) -> dict[str, Any]:
    defaults: dict[str, Any] = {
        "legacyPath": "/old-path",
        "destinationPath": "/el/new-path",
        "destinationKind": "internal-301",
        "locale": "el",
        "notes": "test entry",
    }
    defaults.update(overrides)
    return defaults


def _existing(**overrides: Any) -> dict[str, Any]:
    defaults: dict[str, Any] = {
        "documentId": "doc-001",
        "legacyPath": "/old-path",
        "destinationPath": "/el/new-path",
        "destinationKind": "internal-301",
        "locale": "el",
        "notes": "existing row",
    }
    defaults.update(overrides)
    return defaults


class ClassifyActionCreateTests(unittest.TestCase):
    """Entries with no existing match → 'create'."""

    def test_no_existing_match_returns_create(self) -> None:
        action, _ = classify_action(_entry(legacyPath="/new-one"), {})
        self.assertEqual(action, "create")

    def test_existing_map_lacks_this_path(self) -> None:
        existing = {"/other-path": _existing(legacyPath="/other-path")}
        action, _ = classify_action(_entry(legacyPath="/my-path"), existing)
        self.assertEqual(action, "create")


class ClassifyActionSkipIdenticalTests(unittest.TestCase):
    """Identical entry already exists → 'skip-identical' (idempotency)."""

    def test_all_fields_identical(self) -> None:
        existing = {"/old-path": _existing()}
        action, ex = classify_action(_entry(), existing)
        self.assertEqual(action, "skip-identical")

    def test_destination_path_matches(self) -> None:
        existing = {"/old-path": _existing(destinationPath="/el/new-path")}
        action, ex = classify_action(
            _entry(legacyPath="/old-path", destinationPath="/el/new-path"),
            existing,
        )
        self.assertEqual(action, "skip-identical")

    def test_kind_matches_internal_301(self) -> None:
        existing = {"/old-path": _existing(destinationKind="internal-301")}
        action, ex = classify_action(
            _entry(legacyPath="/old-path", destinationKind="internal-301"),
            existing,
        )
        self.assertEqual(action, "skip-identical")

    def test_skip_identical_does_not_count_as_write(self) -> None:
        existing = {"/a": _existing(legacyPath="/a", destinationPath="/el/foo", destinationKind="internal-301")}
        action, _ = classify_action(
            _entry(legacyPath="/a", destinationPath="/el/foo", destinationKind="internal-301"),
            existing,
        )
        self.assertEqual(action, "skip-identical")


class ClassifyActionGone410RuleTests(unittest.TestCase):
    """Editor-curated gone-410 entries are protected from overwrite."""

    def test_gone_410_protected_even_when_input_differs(self) -> None:
        existing = {
            "/retired": _existing(
                legacyPath="/retired",
                destinationKind="gone-410",
                destinationPath="",
            )
        }
        action, ex = classify_action(
            _entry(legacyPath="/retired", destinationKind="internal-301", destinationPath="/el/new"),
            existing,
        )
        self.assertEqual(action, "skip-gone-410")

    def test_gone_410_existing_returned_for_report(self) -> None:
        existing = {
            "/retired": _existing(
                legacyPath="/retired",
                destinationKind="gone-410",
                documentId="doc-gone",
            )
        }
        _, ex = classify_action(
            _entry(legacyPath="/retired", destinationKind="internal-301",
                   destinationPath="/el/new"),
            existing,
        )
        self.assertIsNotNone(ex)
        self.assertEqual(ex["destinationKind"], "gone-410")

    def test_gone_410_not_overwritten_to_internal_301(self) -> None:
        # simulating: editor marked /page as gone-410
        # seed input says it should be internal-301 → prefer editor
        existing = {"/page": _existing(legacyPath="/page", destinationKind="gone-410")}
        action, ex = classify_action(
            _entry(legacyPath="/page", destinationKind="internal-301",
                   destinationPath="/el/page"),
            existing,
        )
        self.assertEqual(action, "skip-gone-410")

    def test_gone_410_not_overwritten_to_external_301(self) -> None:
        existing = {"/page": _existing(legacyPath="/page", destinationKind="gone-410")}
        action, ex = classify_action(
            _entry(legacyPath="/page", destinationKind="external-301",
                   destinationPath="https://example.com"),
            existing,
        )
        self.assertEqual(action, "skip-gone-410")


class ClassifyActionUpdateTests(unittest.TestCase):
    """When entry differs from existing and collision rule doesn't block → 'update'."""

    def test_destination_path_changed(self) -> None:
        existing = {"/old": _existing(legacyPath="/old", destinationPath="/el/v1")}
        action, ex = classify_action(
            _entry(legacyPath="/old", destinationPath="/el/v2"),
            existing,
        )
        self.assertEqual(action, "update")

    def test_destination_kind_changed_to_gone_410(self) -> None:
        existing = {"/old": _existing(legacyPath="/old", destinationKind="internal-301", destinationPath="/el/foo")}
        action, ex = classify_action(
            _entry(legacyPath="/old", destinationKind="gone-410", destinationPath=""),
            existing,
        )
        self.assertEqual(action, "update")

    def test_external_301_updated_to_internal_301(self) -> None:
        existing = {"/x": _existing(legacyPath="/x", destinationKind="external-301", destinationPath="https://ex.com")}
        action, ex = classify_action(
            _entry(legacyPath="/x", destinationKind="internal-301", destinationPath="/el/x"),
            existing,
        )
        self.assertEqual(action, "update")


# ---------------------------------------------------------------------------
# Full run_seed classification (dry-run path)
# ---------------------------------------------------------------------------


class RunSeedTests(unittest.TestCase):
    """Integration-level tests for run_seed classification logic."""

    def test_empty_input_zero_writes(self) -> None:
        result = run_seed([], {})
        self.assertEqual(result["added"], 0)
        self.assertEqual(result["updated"], 0)
        self.assertEqual(result["skipped"], 0)
        self.assertEqual(result["errors"], 0)

    def test_all_create_when_no_existing(self) -> None:
        entries = [
            _entry(legacyPath="/a", destinationPath="/el/a"),
            _entry(legacyPath="/b", destinationPath="/el/b"),
        ]
        result = run_seed(entries, {})
        self.assertEqual(result["added"], 2)
        self.assertEqual(result["updated"], 0)
        self.assertEqual(result["skipped"], 0)

    def test_all_skip_identical_when_idempotent_rerun(self) -> None:
        entries = [
            _entry(legacyPath="/a", destinationPath="/el/a"),
            _entry(legacyPath="/b", destinationPath="/el/b"),
        ]
        existing = {
            "/a": _existing(legacyPath="/a", destinationPath="/el/a"),
            "/b": _existing(legacyPath="/b", destinationPath="/el/b"),
        }
        result = run_seed(entries, existing)
        self.assertEqual(result["added"], 0)
        self.assertEqual(result["updated"], 0)
        self.assertEqual(result["skipped"], 2)
        self.assertEqual(result["errors"], 0)

    def test_idempotent_second_run_zero_new_rows(self) -> None:
        """Re-running the exact same seed produces zero added rows."""
        entries = [
            _entry(legacyPath="/x", destinationPath="/el/x", destinationKind="internal-301"),
            _entry(legacyPath="/y", destinationPath="/el/y", destinationKind="internal-301"),
        ]
        existing = {e["legacyPath"]: e for e in [
            _existing(legacyPath="/x", destinationPath="/el/x",
                       destinationKind="internal-301"),
            _existing(legacyPath="/y", destinationPath="/el/y",
                       destinationKind="internal-301"),
        ]}
        result = run_seed(entries, existing)
        self.assertEqual(result["added"], 0)

    def test_gone_410_blocks_update_in_full_run(self) -> None:
        entries = [_entry(legacyPath="/retired", destinationPath="/el/new",
                          destinationKind="internal-301")]
        existing = {
            "/retired": _existing(legacyPath="/retired", destinationKind="gone-410",
                                   destinationPath="")
        }
        result = run_seed(entries, existing)
        self.assertEqual(result["added"], 0)
        self.assertEqual(result["skipped"], 1)

    def test_mixed_actions(self) -> None:
        entries = [
            _entry(legacyPath="/new", destinationPath="/el/new"),        # create
            _entry(legacyPath="/same", destinationPath="/el/same"),      # skip-identical
            _entry(legacyPath="/changed", destinationPath="/el/v2"),     # update
        ]
        existing = {
            "/same": _existing(legacyPath="/same", destinationPath="/el/same"),
            "/changed": _existing(legacyPath="/changed", destinationPath="/el/v1"),
        }
        result = run_seed(entries, existing)
        self.assertEqual(result["added"], 1)
        self.assertEqual(result["updated"], 1)
        self.assertEqual(result["skipped"], 1)

    def test_create_entries_populated(self) -> None:
        entries = [_entry(legacyPath="/a")]
        result = run_seed(entries, {})
        creates = result.get("created", [])
        self.assertEqual(len(creates), 1)
        self.assertEqual(creates[0]["entry"]["legacyPath"], "/a")

    def test_update_entries_populated(self) -> None:
        entries = [_entry(legacyPath="/a", destinationPath="/el/v2")]
        existing = {"/a": _existing(legacyPath="/a", destinationPath="/el/v1")}
        result = run_seed(entries, existing)
        updates = result.get("updated_list", [])
        self.assertEqual(len(updates), 1)


# ---------------------------------------------------------------------------
# Markdown report
# ---------------------------------------------------------------------------


class BuildMarkdownSummaryTests(unittest.TestCase):
    def test_report_includes_all_sections(self) -> None:
        stats = {
            "added": 2,
            "updated": 1,
            "skipped": 3,
            "errors": 0,
            "input_count": 6,
        }
        created = [
            {"entry": _entry(legacyPath="/a", destinationPath="/el/a")},
            {"entry": _entry(legacyPath="/b", destinationPath="/el/b")},
        ]
        updated_list = [
            {
                "entry": _entry(legacyPath="/c", destinationPath="/el/c2"),
                "existing": _existing(legacyPath="/c", destinationPath="/el/c1"),
            },
        ]
        skipped = [
            {
                "entry": _entry(legacyPath="/d", destinationPath="/el/d"),
                "reason": "skip-identical",
            },
        ]
        report = build_markdown_summary(stats, created, updated_list, skipped)
        self.assertIn("Rows added", report)
        self.assertIn("Rows updated", report)
        self.assertIn("Rows skipped", report)
        self.assertIn("**2**", report)   # added count
        self.assertIn("**1**", report)   # updated count
        self.assertIn("**3**", report)   # skipped count

    def test_report_handles_zero_everything(self) -> None:
        stats = {"added": 0, "updated": 0, "skipped": 0, "errors": 0, "input_count": 0}
        report = build_markdown_summary(stats, [], [], [])
        self.assertIn("**0**", report)
        self.assertIn("URL Mapping Seed Result", report)

    def test_report_mentions_gone_410_protection(self) -> None:
        stats = {"added": 0, "updated": 0, "skipped": 1, "errors": 0, "input_count": 1}
        skipped = [
            {
                "entry": _entry(legacyPath="/retired"),
                "reason": "skip-gone-410",
            },
        ]
        report = build_markdown_summary(stats, [], [], skipped)
        self.assertIn("gone-410", report.lower())


# ---------------------------------------------------------------------------
# Unicode handling
# ---------------------------------------------------------------------------


class UnicodeTests(unittest.TestCase):
    """Verify that Unicode legacyPath values are handled correctly."""

    def test_greek_legacy_path_classified_correctly(self) -> None:
        entry = _entry(legacyPath="/αμυγδαλεκτομή", destinationPath="/el/amygdalektomi")
        action, _ = classify_action(entry, {})
        self.assertEqual(action, "create")

    def test_cyrillic_legacy_path_classified_correctly(self) -> None:
        entry = _entry(legacyPath="/пластика-лица", destinationPath="/ru/plastika-litsa")
        action, _ = classify_action(entry, {})
        self.assertEqual(action, "create")

    def test_greek_in_existing_map_lookup(self) -> None:
        existing = {"/αμυγδαλεκτομή": _existing(legacyPath="/αμυγδαλεκτομή",
                                                 destinationPath="/el/amygdalektomi")}
        action, _ = classify_action(
            _entry(legacyPath="/αμυγδαλεκτομή", destinationPath="/el/amygdalektomi"),
            existing,
        )
        self.assertEqual(action, "skip-identical")

    def test_cyrillic_in_existing_map_lookup(self) -> None:
        existing = {"/пластика-лица": _existing(legacyPath="/пластика-лица",
                                                destinationPath="/ru/plastika-litsa")}
        action, _ = classify_action(
            _entry(legacyPath="/пластика-лица", destinationPath="/ru/plastika-litsa"),
            existing,
        )
        self.assertEqual(action, "skip-identical")


class StrapiClientUrlEncodingTests(unittest.TestCase):
    """Verify that StrapiClient preserves brackets in Strapi query params."""

    def test_pagination_params_preserve_brackets(self) -> None:
        client = StrapiClient(base_url="http://localhost:1337", dry_run=True)
        url = client._build_url("/api/url-mappings", {
            "pagination[page]": 1,
            "pagination[pageSize]": 100,
        })
        self.assertIn("pagination[page]=1", url)
        self.assertIn("pagination[pageSize]=100", url)

    def test_filter_params_preserve_brackets(self) -> None:
        client = StrapiClient(base_url="http://localhost:1337", dry_run=True)
        url = client._build_url("/api/url-mappings", {
            "filters[slug][$eq]": "test-slug",
        })
        self.assertIn("filters[slug][$eq]=test-slug", url)

    def test_path_not_encoded_twice(self) -> None:
        client = StrapiClient(base_url="http://localhost:1337", dry_run=True)
        url = client._build_url("/api/url-mappings", {})
        self.assertEqual(url, "http://localhost:1337/api/url-mappings")


if __name__ == "__main__":
    unittest.main()
