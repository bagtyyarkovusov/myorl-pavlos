import sys
import unittest
from pathlib import Path

_TOOLS = Path(__file__).resolve().parents[1] / "tools"
if str(_TOOLS) not in sys.path:
    sys.path.insert(0, str(_TOOLS))

from seed_search_index import _compute_hmac, _resolve_target, _nextjs_base_url, _strapi_base_url


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
        expected = hmac.new(
            b"test-webhook-secret", body, hashlib.sha256
        ).hexdigest()

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


if __name__ == "__main__":
    unittest.main()
