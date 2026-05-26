"""Unit tests for tools/audit_legacy_urls.py."""

import csv
import io
import json
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Optional

_TOOLS = Path(__file__).resolve().parents[1] / "tools"
if str(_TOOLS) not in sys.path:
    sys.path.insert(0, str(_TOOLS))

from audit_legacy_urls import (
    Case,
    HtaccessRule,
    InventoryRow,
    StrapiPage,
    build_seed_entries,
    classify_row,
    flatten_htaccess_rules,
    load_inventory_csv,
    load_strapi_page_map,
    parse_htaccess_rules,
    url_decode_path,
)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

CSV_HEADER = [
    "id", "pagetitle", "alias", "uri", "parent", "published",
    "deleted", "hidemenu", "context_key", "document_id", "status_guess",
]


def _make_csv(rows: list[list[str]]) -> str:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(CSV_HEADER)
    for row in rows:
        w.writerow(row)
    return buf.getvalue()


def _make_db(pages: list[dict]) -> sqlite3.Connection:
    """Create an in-memory SQLite DB with a Strapi-style pages table."""
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.execute(
        """
        CREATE TABLE pages (
            id INTEGER PRIMARY KEY,
            document_id TEXT NOT NULL,
            locale TEXT,
            slug TEXT,
            title TEXT,
            published_at TEXT
        )
        """
    )
    for p in pages:
        conn.execute(
            "INSERT INTO pages (document_id, locale, slug, title, published_at) "
            "VALUES (?, ?, ?, ?, ?)",
            (p["document_id"], p["locale"], p["slug"], p["title"], p.get("published_at")),
        )
    conn.commit()
    return conn


# ---------------------------------------------------------------------------
# StrapiPage map loader
# ---------------------------------------------------------------------------


class LoadStrapiPageMapTests(unittest.TestCase):
    def test_loads_pages_keyed_by_document_id_and_locale(self) -> None:
        conn = _make_db([
            {"document_id": "abc", "locale": "el", "slug": "rinoplastiki", "title": "Rinoplastiki", "published_at": "2025-01-01T00:00:00Z"},
            {"document_id": "abc", "locale": "ru", "slug": "rinoplastika", "title": "Rinoplastika", "published_at": "2025-01-01T00:00:00Z"},
        ])
        page_map = load_strapi_page_map(conn)
        self.assertIn(("abc", "el"), page_map)
        self.assertIn(("abc", "ru"), page_map)
        self.assertEqual(page_map[("abc", "el")].slug, "rinoplastiki")
        self.assertEqual(page_map[("abc", "ru")].slug, "rinoplastika")

    def test_unpublished_page_absent_from_map(self) -> None:
        conn = _make_db([
            {"document_id": "abc", "locale": "el", "slug": "test", "title": "Test", "published_at": None},
        ])
        page_map = load_strapi_page_map(conn)
        self.assertEqual(len(page_map), 0)

    def test_duplicate_doc_locale_keeps_last(self) -> None:
        conn = _make_db([
            {"document_id": "abc", "locale": "el", "slug": "first", "title": "First", "published_at": "2025-01-01T00:00:00Z"},
            {"document_id": "abc", "locale": "el", "slug": "second", "title": "Second", "published_at": "2025-01-01T00:00:00Z"},
        ])
        page_map = load_strapi_page_map(conn)
        self.assertEqual(page_map[("abc", "el")].slug, "second")


# ---------------------------------------------------------------------------
# CSV loader
# ---------------------------------------------------------------------------


class LoadInventoryCsvTests(unittest.TestCase):
    def test_parses_all_columns(self) -> None:
        csv_text = _make_csv([
            ["42", "Rhinoplasty", "rinoplastiki", "/rinoplastiki", "0", "1", "0", "0", "web", "doc-rhino-el", "ok"],
        ])
        with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
            f.write(csv_text)
            f.flush()
            rows = load_inventory_csv(Path(f.name))
        Path(f.name).unlink()
        self.assertEqual(len(rows), 1)
        r = rows[0]
        self.assertEqual(r.modx_id, 42)
        self.assertEqual(r.alias, "rinoplastiki")
        self.assertEqual(r.uri, "/rinoplastiki")
        self.assertEqual(r.locale, "el")
        self.assertEqual(r.document_id, "doc-rhino-el")
        self.assertTrue(r.published)
        self.assertFalse(r.deleted)

    def test_context_key_rus_maps_to_ru(self) -> None:
        csv_text = _make_csv([
            ["1", "Page", "test", "/ru/test", "0", "1", "0", "0", "rus", "doc-ru", "ok"],
        ])
        with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
            f.write(csv_text)
            f.flush()
            rows = load_inventory_csv(Path(f.name))
        Path(f.name).unlink()
        self.assertEqual(rows[0].locale, "ru")

    def test_empty_document_id_treated_as_empty_string(self) -> None:
        csv_text = _make_csv([
            ["1", "Page", "test", "/test", "0", "1", "0", "0", "web", "", "ok"],
        ])
        with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
            f.write(csv_text)
            f.flush()
            rows = load_inventory_csv(Path(f.name))
        Path(f.name).unlink()
        self.assertEqual(rows[0].document_id, "")

    def test_skips_header_and_empty_rows(self) -> None:
        csv_text = _make_csv([
            ["1", "Page", "test", "/test", "0", "1", "0", "0", "web", "doc1", "ok"],
            ["", "", "", "", "", "", "", "", "", "", ""],
        ])
        with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
            f.write(csv_text)
            f.flush()
            rows = load_inventory_csv(Path(f.name))
        Path(f.name).unlink()
        # Empty row with empty id should be skipped
        self.assertEqual(len(rows), 1)


# ---------------------------------------------------------------------------
# Classification
# ---------------------------------------------------------------------------


class ClassifyRowTests(unittest.TestCase):
    def setUp(self) -> None:
        self.page_map: dict[tuple[str, str], StrapiPage] = {
            ("doc-rhino-el", "el"): StrapiPage(
                document_id="doc-rhino-el", locale="el",
                slug="rinoplastiki", title="Rinoplastiki",
            ),
            ("doc-facelift-el", "el"): StrapiPage(
                document_id="doc-facelift-el", locale="el",
                slug="facelifting", title="Facelifting",
            ),
            ("doc-cyrillic-ru", "ru"): StrapiPage(
                document_id="doc-cyrillic-ru", locale="ru",
                slug="plastika-litsa", title="Plastika Litsa",
            ),
        }

    def _row(self, **overrides) -> InventoryRow:
        defaults = {
            "modx_id": 1, "pagetitle": "Test", "alias": "test",
            "uri": "/test", "parent": 0, "published": 1,
            "deleted": 0, "hidemenu": 0, "locale": "el",
            "document_id": "doc-test-el", "status_guess": "ok",
        }
        defaults.update(overrides)
        return InventoryRow(**defaults)

    # Case 1 — slug unchanged

    def test_case1_slug_unchanged(self) -> None:
        row = self._row(document_id="doc-rhino-el", locale="el", alias="rinoplastiki")
        case, dest, notes = classify_row(row, self.page_map)
        self.assertEqual(case, Case.UNCHANGED)
        self.assertEqual(dest, "")
        self.assertIn("slug unchanged", notes.lower())

    # Case 2 — slug renamed

    def test_case2_slug_renamed(self) -> None:
        row = self._row(document_id="doc-facelift-el", locale="el", alias="facelift")
        case, dest, notes = classify_row(row, self.page_map)
        self.assertEqual(case, Case.RENAMED)
        self.assertEqual(dest, "/el/facelifting")
        self.assertIn("renamed", notes.lower())

    def test_case2_cyrillic_alias_renamed(self) -> None:
        row = self._row(
            document_id="doc-cyrillic-ru", locale="ru",
            alias="пластика-лица", uri="/ru/пластика-лица",
        )
        case, dest, notes = classify_row(row, self.page_map)
        self.assertEqual(case, Case.RENAMED)
        self.assertEqual(dest, "/ru/plastika-litsa")

    # Case 3 — page retired

    def test_case3_deleted_row(self) -> None:
        row = self._row(deleted=1, document_id="doc-rhino-el", locale="el", alias="some-slug")
        case, dest, notes = classify_row(row, self.page_map)
        self.assertEqual(case, Case.RETIRED)
        self.assertIn("deleted", notes.lower())

    def test_case3_unpublished_row(self) -> None:
        row = self._row(published=0, document_id="doc-rhino-el", locale="el", alias="some-slug")
        case, dest, notes = classify_row(row, self.page_map)
        self.assertEqual(case, Case.RETIRED)
        self.assertIn("unpublished", notes.lower())

    def test_case3_no_strapi_match(self) -> None:
        row = self._row(document_id="no-such-doc", locale="el", alias="whatever")
        case, dest, notes = classify_row(row, self.page_map)
        self.assertEqual(case, Case.RETIRED)
        self.assertIn("no strapi", notes.lower())

    def test_case3_empty_document_id(self) -> None:
        row = self._row(document_id="", locale="el", alias="whatever")
        case, dest, notes = classify_row(row, self.page_map)
        self.assertEqual(case, Case.RETIRED)
        self.assertIn("document_id", notes.lower())

    # Edge cases

    def test_locale_mismatch_no_match(self) -> None:
        """Row has locale=ru but Strapi only has locale=el for this document_id."""
        row = self._row(document_id="doc-rhino-el", locale="ru", alias="some-slug")
        case, dest, notes = classify_row(row, self.page_map)
        self.assertEqual(case, Case.RETIRED)
        self.assertIn("no strapi", notes.lower())

    def test_garbage_slash_one_uri(self) -> None:
        row = self._row(alias="1", uri="/1", document_id="", locale="el")
        case, dest, notes = classify_row(row, self.page_map)
        self.assertEqual(case, Case.RETIRED)
        self.assertIn("document_id", notes.lower())


# ---------------------------------------------------------------------------
# URL decoding
# ---------------------------------------------------------------------------


class UrlDecodePathTests(unittest.TestCase):
    def test_plain_ascii_passthrough(self) -> None:
        self.assertEqual(url_decode_path("/el/rinoplastiki"), "/el/rinoplastiki")

    def test_percent_encoded_greek(self) -> None:
        # /αμυγδαλεκτομή
        encoded = "/%CE%B1%CE%BC%CF%85%CE%B3%CE%B4%CE%B1%CE%BB%CE%B5%CE%BA%CF%84%CE%BF%CE%BC%CE%AE"
        decoded = url_decode_path(encoded)
        self.assertEqual(decoded, "/αμυγδαλεκτομή")

    def test_percent_encoded_cyrillic(self) -> None:
        # /ru/пластика-лица
        encoded = "/ru/%D0%BF%D0%BB%D0%B0%D1%81%D1%82%D0%B8%D0%BA%D0%B0-%D0%BB%D0%B8%D1%86%D0%B0"
        decoded = url_decode_path(encoded)
        self.assertEqual(decoded, "/ru/пластика-лица")

    def test_mixed_segments(self) -> None:
        self.assertEqual(
            url_decode_path("/el/hello/%CE%B1%CE%BC%CF%85/world"),
            "/el/hello/αμυ/world",
        )

    def test_no_trailing_slash_added(self) -> None:
        self.assertEqual(url_decode_path("/el/test"), "/el/test")


# ---------------------------------------------------------------------------
# .htaccess rule parsing and flattening
# ---------------------------------------------------------------------------

SAMPLE_HTACCESS = """
RewriteEngine On
# Some comment
Redirect 301 /αμυγδαλεκτομή /amygdalektomi
Redirect 301 /пластика-лица /plastika-litsa
Redirect 301 /old-page /new-page
Redirect 301 /ρυτιδεκτομή /ritidektomi
"""


class ParseHtaccessRulesTests(unittest.TestCase):
    def test_parses_redirect_301_lines(self) -> None:
        rules = parse_htaccess_rules(SAMPLE_HTACCESS)
        self.assertEqual(len(rules), 4)
        self.assertEqual(rules[0].source, "/αμυγδαλεκτομή")
        self.assertEqual(rules[0].target, "/amygdalektomi")
        self.assertEqual(rules[1].source, "/пластика-лица")
        self.assertEqual(rules[1].target, "/plastika-litsa")

    def test_ignores_non_redirect_lines(self) -> None:
        rules = parse_htaccess_rules(SAMPLE_HTACCESS)
        sources = {r.source for r in rules}
        self.assertNotIn("/some-comment", sources)

    def test_empty_input_returns_empty_list(self) -> None:
        self.assertEqual(parse_htaccess_rules(""), [])

    def test_handles_malformed_lines(self) -> None:
        rules = parse_htaccess_rules("Redirect 301\nRedirect 301 /only-one\nRedirect 301 /a /b /extra")
        self.assertEqual(len(rules), 1)
        self.assertEqual(rules[0].source, "/a")
        self.assertEqual(rules[0].target, "/b")


class FlattenHtaccessRulesTests(unittest.TestCase):
    def test_direct_rules_unchanged(self) -> None:
        """Rules pointing to final locale-prefixed paths pass through as-is."""
        rules = [
            HtaccessRule(source="/greek-slug", target="/el/english-slug"),
            HtaccessRule(source="/cyrillic-slug", target="/ru/ascii-slug"),
        ]
        result = flatten_htaccess_rules(rules)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0].legacyPath, "/greek-slug")
        self.assertEqual(result[0].destinationPath, "/el/english-slug")
        self.assertEqual(result[0].destinationKind, "internal-301")
        self.assertEqual(result[0].locale, "el")

    def test_intermediate_hop_flattened(self) -> None:
        """Chain: Greek → ASCII-intermediate → locale-prefixed final."""
        rules = [
            HtaccessRule(source="/αμυγδαλεκτομή", target="/amygdalektomi"),
            HtaccessRule(source="/amygdalektomi", target="/el/amygdalektomi"),
        ]
        result = flatten_htaccess_rules(rules)
        self.assertEqual(len(result), 2)
        greek_entry = next(r for r in result if r.legacyPath == "/αμυγδαλεκτομή")
        self.assertEqual(greek_entry.destinationPath, "/el/amygdalektomi")
        self.assertEqual(greek_entry.destinationKind, "internal-301")
        self.assertEqual(greek_entry.locale, "el")
        self.assertIn("Flattened from .htaccess", greek_entry.notes)

    def test_non_ascii_source_preserved_as_unicode(self) -> None:
        rules = [HtaccessRule(source="/пластика-лица", target="/ru/plastika-litsa")]
        result = flatten_htaccess_rules(rules)
        self.assertEqual(result[0].legacyPath, "/пластика-лица")

    def test_orphan_intermediate_hop_skipped(self) -> None:
        """Intermediate target not resolved to locale-prefixed path: kept as-is."""
        rules = [HtaccessRule(source="/greek-slug", target="/intermediate")]
        result = flatten_htaccess_rules(rules)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].destinationPath, "/intermediate")

    def test_locale_detection_from_destination(self) -> None:
        self.assertEqual(
            flatten_htaccess_rules([HtaccessRule("/a", "/el/foo")])[0].locale, "el"
        )
        self.assertEqual(
            flatten_htaccess_rules([HtaccessRule("/a", "/ru/bar")])[0].locale, "ru"
        )


# ---------------------------------------------------------------------------
# Seed entry builder
# ---------------------------------------------------------------------------


class BuildSeedEntriesTests(unittest.TestCase):
    def _row(self, **overrides) -> InventoryRow:
        defaults = {
            "modx_id": 1, "pagetitle": "Test", "alias": "test",
            "uri": "/test", "parent": 0, "published": 1,
            "deleted": 0, "hidemenu": 0, "locale": "el",
            "document_id": "doc-test", "status_guess": "ok",
        }
        defaults.update(overrides)
        return InventoryRow(**defaults)

    def test_case1_excluded_from_seed(self) -> None:
        page_map: dict[tuple[str, str], StrapiPage] = {
            ("doc-test", "el"): StrapiPage("doc-test", "el", "test", "Test"),
        }
        rows = [self._row(document_id="doc-test", locale="el", alias="test")]
        entries = build_seed_entries(rows, page_map)
        case1 = [e for e in entries if e["_case"] == "case-1"]
        self.assertEqual(len(case1), 0)

    def test_case2_in_seed_as_internal_301(self) -> None:
        page_map: dict[tuple[str, str], StrapiPage] = {
            ("doc-test", "el"): StrapiPage("doc-test", "el", "new-slug", "Test"),
        }
        rows = [self._row(document_id="doc-test", locale="el", alias="old-slug", uri="/old-slug")]
        entries = build_seed_entries(rows, page_map)
        case2 = [e for e in entries if e["_case"] == "case-2"]
        self.assertEqual(len(case2), 1)
        self.assertEqual(case2[0]["legacyPath"], "/old-slug")
        self.assertEqual(case2[0]["destinationPath"], "/el/new-slug")
        self.assertEqual(case2[0]["destinationKind"], "internal-301")
        self.assertEqual(case2[0]["locale"], "el")

    def test_case3_in_seed_as_gone_410(self) -> None:
        page_map: dict[tuple[str, str], StrapiPage] = {}
        rows = [self._row(document_id="no-match", locale="el", alias="gone-slug", uri="/gone-slug")]
        entries = build_seed_entries(rows, page_map)
        case3 = [e for e in entries if e["_case"] == "case-3"]
        self.assertEqual(len(case3), 1)
        self.assertEqual(case3[0]["legacyPath"], "/gone-slug")
        self.assertEqual(case3[0]["destinationPath"], "")
        self.assertEqual(case3[0]["destinationKind"], "gone-410")
        self.assertEqual(case3[0]["locale"], "el")

    def test_percent_encoded_uri_decoded_in_output(self) -> None:
        page_map: dict[tuple[str, str], StrapiPage] = {
            ("doc-test", "el"): StrapiPage("doc-test", "el", "new-slug", "Test"),
        }
        rows = [self._row(
            document_id="doc-test", locale="el", alias="old-greek",
            uri="/%CE%B1%CE%BC%CF%85%CE%B3%CE%B4%CE%B1%CE%BB%CE%B5%CE%BA%CF%84%CE%BF%CE%BC%CE%AE",
        )]
        entries = build_seed_entries(rows, page_map)
        case2 = [e for e in entries if e["_case"] == "case-2"]
        self.assertEqual(len(case2), 1)
        self.assertEqual(case2[0]["legacyPath"], "/αμυγδαλεκτομή")

    def test_json_serializable(self) -> None:
        page_map: dict[tuple[str, str], StrapiPage] = {
            ("doc-test", "el"): StrapiPage("doc-test", "el", "new-slug", "Test"),
        }
        rows = [self._row(document_id="doc-test", locale="el", alias="old-slug", uri="/old-slug")]
        entries = build_seed_entries(rows, page_map)
        serialized = json.dumps(entries, ensure_ascii=False, indent=2)
        self.assertIsInstance(serialized, str)
        self.assertIn("legacyPath", serialized)
        self.assertIn("/old-slug", serialized)

    def test_row_without_document_id_still_classified(self) -> None:
        page_map: dict[tuple[str, str], StrapiPage] = {}
        rows = [self._row(document_id="", locale="el", alias="orphan", uri="/orphan")]
        entries = build_seed_entries(rows, page_map)
        case3 = [e for e in entries if e["_case"] == "case-3"]
        self.assertEqual(len(case3), 1)
        self.assertEqual(case3[0]["legacyPath"], "/orphan")


# ---------------------------------------------------------------------------
# InventoryRow dataclass
# ---------------------------------------------------------------------------


class InventoryRowTests(unittest.TestCase):
    def test_fields_default_correctly(self) -> None:
        row = InventoryRow(
            modx_id=1, pagetitle="T", alias="a", uri="/a",
            parent=0, published=1, deleted=0, hidemenu=0,
            locale="el", document_id="d1", status_guess="ok",
        )
        self.assertEqual(row.modx_id, 1)
        self.assertTrue(row.published)
        self.assertFalse(row.deleted)
        self.assertFalse(row.hidemenu)


if __name__ == "__main__":
    unittest.main()
