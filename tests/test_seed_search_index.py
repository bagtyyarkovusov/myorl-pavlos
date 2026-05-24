import os
import sys
import tempfile
import unittest
from pathlib import Path

_TOOLS = Path(__file__).resolve().parents[1] / "tools"
if str(_TOOLS) not in sys.path:
    sys.path.insert(0, str(_TOOLS))

from seed_search_index import (
    _compute_hmac,
    _nextjs_base_url,
    _resolve_target,
    _strapi_base_url,
    _build_synonyms_payload,
    YAML_DIR,
)


class SeedSearchIndexTests(unittest.TestCase):
    def test_resolve_dev_target(self) -> None:
        target = _resolve_target("dev")
        self.assertEqual(target.name, "dev")
        self.assertEqual(target.access, "local")
        self.assertIsNotNone(target.meili_host_port)

    def test_resolve_production_target(self) -> None:
        target = _resolve_target("production")
        self.assertEqual(target.name, "production")
        self.assertEqual(target.access, "remote")

    def test_resolve_unknown_target_raises(self) -> None:
        with self.assertRaises(KeyError):
            _resolve_target("nonexistent")

    def test_hmac_computation_matches_node_hmac(self) -> None:
        import hashlib
        import hmac
        import json

        import os

        os.environ["STRAPI_WEBHOOK_SECRET"] = "test-webhook-secret"

        payload = {"contentType": "page", "id": "abc123", "locale": "el", "action": "upsert"}
        body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
        expected = hmac.new(b"test-webhook-secret", body, hashlib.sha256).hexdigest()

        result = _compute_hmac(payload)
        self.assertEqual(result, expected)
        del os.environ["STRAPI_WEBHOOK_SECRET"]

    def test_hmac_with_unicode(self) -> None:
        # Ensure HMAC works with non-ASCII content
        payload = {"contentType": "page", "id": "abc", "locale": "el", "query": "ρινοπλαστική"}
        result = _compute_hmac(payload)
        self.assertIsInstance(result, str)
        self.assertEqual(len(result), 64)  # SHA-256 hex length

    def test_strapi_base_url_default(self) -> None:
        url = _strapi_base_url()
        self.assertEqual(url, "http://localhost:1337")

    def test_nextjs_base_url_dev_default(self) -> None:
        target = _resolve_target("dev")
        url = _nextjs_base_url(target)
        self.assertEqual(url, "http://localhost:3000")

    def test_page_ids_matched(self) -> None:
        from seed_search_index import _strip_id

        self.assertEqual(_strip_id("abc123"), "abc123")
        self.assertEqual(_strip_id({"documentId": "xyz"}), "xyz")
        # dict without documentId returns empty string (unexpected shape)
        self.assertEqual(_strip_id({"id": "123"}), "")


class SyncSynonymsTests(unittest.TestCase):
    def setUp(self) -> None:
        # Create a temp directory with YAML files
        self.temp_dir = Path(tempfile.mkdtemp())

    def tearDown(self) -> None:
        # Clean up temp files
        import shutil

        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def _build_payload_for_locale(self, locale: str, syn_content: str, sw_content: str) -> dict:
        """Write temporary YAML files and build a payload for the given locale."""
        import seed_search_index as ssi

        # Patch the YAML_DIR to point at our temp directory
        original_dir = ssi.YAML_DIR
        ssi.YAML_DIR = self.temp_dir

        try:
            (self.temp_dir / f"synonyms.{locale}.yaml").write_text(syn_content, encoding="utf-8")
            (self.temp_dir / f"stopwords.{locale}.yaml").write_text(sw_content, encoding="utf-8")
            return _build_synonyms_payload(locale)
        finally:
            ssi.YAML_DIR = original_dir

    def test_constructs_correct_payload_from_yaml_files(self) -> None:
        """--mode sync-synonyms constructs correct payload from YAML files."""
        payload = self._build_payload_for_locale(
            "el",
            '- ["ρινοπλαστική", "διόρθωση μύτης"]\n- ["βλεφαροπλαστική", "διόρθωση βλεφάρων"]',
            '- "ο"\n- "η"\n- "το"',
        )

        self.assertEqual(payload["action"], "sync-synonyms")
        self.assertEqual(payload["locale"], "el")
        self.assertIn("ρινοπλαστική", payload["synonyms"])
        self.assertEqual(payload["synonyms"]["ρινοπλαστική"], ["διόρθωση μύτης"])
        self.assertEqual(payload["stopWords"], ["ο", "η", "το"])

    def test_payload_includes_both_locales(self) -> None:
        """Both el and ru produce correct payloads from their respective YAML files."""
        el_payload = self._build_payload_for_locale(
            "el", '- ["a", "b"]', '- "x"\n- "y"'
        )
        ru_payload = self._build_payload_for_locale(
            "ru", '- ["c", "d"]', '- "z"'
        )

        self.assertEqual(el_payload["locale"], "el")
        self.assertEqual(el_payload["synonyms"]["a"], ["b"])
        self.assertEqual(el_payload["stopWords"], ["x", "y"])

        self.assertEqual(ru_payload["locale"], "ru")
        self.assertEqual(ru_payload["synonyms"]["c"], ["d"])
        self.assertEqual(ru_payload["stopWords"], ["z"])

    def test_empty_yaml_files_produce_empty_payloads(self) -> None:
        """Empty or missing YAML files produce empty synonyms/stopWords."""
        payload = self._build_payload_for_locale("el", "", "")
        self.assertEqual(payload["synonyms"], {})
        self.assertEqual(payload["stopWords"], [])

    def test_single_word_group_is_skipped(self) -> None:
        """A group with only one word is skipped."""
        payload = self._build_payload_for_locale("el", '- ["alone"]', "")
        self.assertEqual(payload["synonyms"], {})


if __name__ == "__main__":
    unittest.main()
