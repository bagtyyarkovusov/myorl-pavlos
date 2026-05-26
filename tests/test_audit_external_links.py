import asyncio
import json
import sys
import tempfile
import unittest
from pathlib import Path

_TOOLS = Path(__file__).resolve().parents[1] / "tools"
if str(_TOOLS) not in sys.path:
    sys.path.insert(0, str(_TOOLS))

import httpx
import respx

from audit_external_links import (
    ALLOWLIST_DOMAINS,
    USER_AGENT,
    CheckResult,
    _page_label,
    build_report,
    check_all_links,
    check_one_link,
    extract_external_links,
    is_allowlisted,
)


class IsAllowlistedTests(unittest.TestCase):
    def test_allowlisted_domain_exact_match(self) -> None:
        self.assertTrue(is_allowlisted("https://eody.gov.gr/some-page"))

    def test_allowlisted_domain_subdomain(self) -> None:
        self.assertTrue(is_allowlisted("https://www.nhs.uk/conditions/flu"))

    def test_allowlisted_domain_cdc(self) -> None:
        self.assertTrue(is_allowlisted("https://www.cdc.gov/flu"))

    def test_non_allowlisted_domain(self) -> None:
        self.assertFalse(is_allowlisted("https://example.com/page"))

    def test_non_allowlisted_org_domain(self) -> None:
        self.assertFalse(is_allowlisted("https://www.who.int/health"))

    def test_malformed_url(self) -> None:
        self.assertFalse(is_allowlisted("not-a-url"))

    def test_no_hostname(self) -> None:
        self.assertFalse(is_allowlisted("/relative/path"))


class PageLabelTests(unittest.TestCase):
    def test_page_source_el(self) -> None:
        self.assertEqual(
            _page_label("page:el:amygdales:abc123"),
            "/el/amygdales",
        )

    def test_page_source_ru(self) -> None:
        self.assertEqual(
            _page_label("page:ru:tonzillektomiya:xyz789"),
            "/ru/tonzillektomiya",
        )

    def test_page_source_multiple_colons(self) -> None:
        self.assertEqual(
            _page_label("page:el:rinoplastiki:doc-id-extra"),
            "/el/rinoplastiki",
        )

    def test_component_source(self) -> None:
        label = _page_label("component:components_items_accordion_items:42")
        self.assertIn("component", label)
        self.assertIn("accordion_items", label)

    def test_component_section_source(self) -> None:
        label = _page_label("component:components_sections_faqs:7")
        self.assertIn("faqs", label)


class ExtractExternalLinksTests(unittest.TestCase):
    def test_from_json_report(self) -> None:
        data = {
            "externalLinks": [
                {"source": "page:el:test:1", "field": "content", "href": "https://example.com"},
                {"source": "page:ru:test:2", "field": "excerpt", "href": "https://other.org"},
            ]
        }
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".json", delete=False
        ) as f:
            json.dump(data, f)
            path = f.name

        try:
            links = extract_external_links(json_report_path=path)
            self.assertEqual(len(links), 2)
            self.assertEqual(links[0]["href"], "https://example.com")
            self.assertEqual(links[1]["href"], "https://other.org")
        finally:
            Path(path).unlink()

    def test_empty_json_report(self) -> None:
        data: dict = {}
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".json", delete=False
        ) as f:
            json.dump(data, f)
            path = f.name

        try:
            links = extract_external_links(json_report_path=path)
            self.assertEqual(links, [])
        finally:
            Path(path).unlink()


class CheckOneLinkTests(unittest.IsolatedAsyncioTestCase):
    async def test_2xx_ok(self) -> None:
        async with respx.mock(assert_all_called=False) as mock:
            mock.head("https://example.com/ok").respond(200)
            async with httpx.AsyncClient(
                timeout=10, follow_redirects=True, headers={"User-Agent": USER_AGENT},
            ) as client:
                result = await check_one_link(
                    client, "https://example.com/ok",
                    source="page:el:test:1", field="content",
                )
            self.assertEqual(result.classification, "ok")
            self.assertEqual(result.status, 200)
            self.assertFalse(result.retried)

    async def test_3xx_followed_becomes_ok(self) -> None:
        async with respx.mock(assert_all_called=False) as mock:
            mock.head("https://example.com/redirect").respond(301, headers={"Location": "https://example.com/final"})
            mock.head("https://example.com/final").respond(200)
            async with httpx.AsyncClient(
                timeout=10, follow_redirects=True, headers={"User-Agent": USER_AGENT},
            ) as client:
                result = await check_one_link(
                    client, "https://example.com/redirect",
                    source="page:el:test:1", field="content",
                )
            self.assertEqual(result.classification, "ok")
            self.assertEqual(result.status, 200)

    async def test_4xx_broken(self) -> None:
        async with respx.mock(assert_all_called=False) as mock:
            mock.head("https://example.com/gone").respond(404)
            async with httpx.AsyncClient(
                timeout=10, follow_redirects=True, headers={"User-Agent": USER_AGENT},
            ) as client:
                result = await check_one_link(
                    client, "https://example.com/gone",
                    source="page:el:test:1", field="content",
                )
            self.assertEqual(result.classification, "broken")
            self.assertEqual(result.status, 404)

    async def test_4xx_allowlisted_domain(self) -> None:
        async with respx.mock(assert_all_called=False) as mock:
            mock.head("https://www.cdc.gov/gone").respond(404)
            async with httpx.AsyncClient(
                timeout=10, follow_redirects=True, headers={"User-Agent": USER_AGENT},
            ) as client:
                result = await check_one_link(
                    client, "https://www.cdc.gov/gone",
                    source="page:el:test:1", field="content",
                )
            self.assertEqual(result.classification, "allowlisted")
            self.assertEqual(result.status, 404)

    async def test_5xx_flaky(self) -> None:
        async with respx.mock(assert_all_called=False) as mock:
            mock.head("https://example.com/server-error").respond(500)
            async with httpx.AsyncClient(
                timeout=10, follow_redirects=True, headers={"User-Agent": USER_AGENT},
            ) as client:
                result = await check_one_link(
                    client, "https://example.com/server-error",
                    source="page:el:test:1", field="content",
                )
            self.assertEqual(result.classification, "flaky")
            self.assertEqual(result.status, 500)
            self.assertTrue(result.retried)

    async def test_5xx_allowlisted_domain(self) -> None:
        async with respx.mock(assert_all_called=False) as mock:
            mock.head("https://eody.gov.gr/error").respond(503)
            async with httpx.AsyncClient(
                timeout=10, follow_redirects=True, headers={"User-Agent": USER_AGENT},
            ) as client:
                result = await check_one_link(
                    client, "https://eody.gov.gr/error",
                    source="page:el:test:1", field="content",
                )
            self.assertEqual(result.classification, "allowlisted")
            self.assertEqual(result.status, 503)

    async def test_flaky_retry_succeeds(self) -> None:
        call_count = 0

        async def handler(request: httpx.Request) -> httpx.Response:
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return httpx.Response(503)
            return httpx.Response(200)

        async with respx.mock(assert_all_called=False) as mock:
            mock.head("https://example.com/retry").mock(side_effect=handler)
            async with httpx.AsyncClient(
                timeout=10, follow_redirects=True, headers={"User-Agent": USER_AGENT},
            ) as client:
                result = await check_one_link(
                    client, "https://example.com/retry",
                    source="page:el:test:1", field="content",
                )
            self.assertEqual(result.classification, "ok")
            self.assertEqual(result.status, 200)
            self.assertTrue(result.retried)
            self.assertEqual(call_count, 2)

    async def test_timeout_flaky(self) -> None:
        async with respx.mock(assert_all_called=False) as mock:
            mock.head("https://example.com/slow").mock(side_effect=httpx.TimeoutException("timed out"))
            async with httpx.AsyncClient(
                timeout=10, follow_redirects=True, headers={"User-Agent": USER_AGENT},
            ) as client:
                result = await check_one_link(
                    client, "https://example.com/slow",
                    source="page:el:test:1", field="content",
                )
            self.assertIn(result.classification, ("flaky", "allowlisted"))
            self.assertIsNotNone(result.error)

    async def test_connection_error_flaky(self) -> None:
        async with respx.mock(assert_all_called=False) as mock:
            mock.head("https://nonexistent.example").mock(
                side_effect=httpx.ConnectError("connection refused")
            )
            async with httpx.AsyncClient(
                timeout=10, follow_redirects=True, headers={"User-Agent": USER_AGENT},
            ) as client:
                result = await check_one_link(
                    client, "https://nonexistent.example",
                    source="page:el:test:1", field="content",
                )
            self.assertIn(result.classification, ("flaky", "allowlisted"))
            self.assertIn("connection refused", str(result.error or ""))

    async def test_remote_protocol_error_recorded_as_flaky(self) -> None:
        async with respx.mock(assert_all_called=False) as mock:
            mock.head("https://disconnect.example").mock(
                side_effect=httpx.RemoteProtocolError(
                    "Server disconnected without sending a response."
                )
            )
            async with httpx.AsyncClient(
                timeout=10, follow_redirects=True, headers={"User-Agent": USER_AGENT},
            ) as client:
                result = await check_one_link(
                    client, "https://disconnect.example",
                    source="page:el:test:1", field="content",
                )
        self.assertEqual(result.classification, "flaky")
        self.assertIsNone(result.status)
        self.assertEqual(result.error, "RemoteProtocolError")

    async def test_proxy_error_recorded_as_flaky(self) -> None:
        async with respx.mock(assert_all_called=False) as mock:
            mock.head("https://via-proxy.example").mock(
                side_effect=httpx.ProxyError("proxy connect failure")
            )
            async with httpx.AsyncClient(
                timeout=10, follow_redirects=True, headers={"User-Agent": USER_AGENT},
            ) as client:
                result = await check_one_link(
                    client, "https://via-proxy.example",
                    source="page:el:test:1", field="content",
                )
        self.assertEqual(result.classification, "flaky")
        self.assertIsNone(result.status)
        self.assertEqual(result.error, "ProxyError")


class BuildReportTests(unittest.TestCase):
    def test_report_structure(self) -> None:
        results = [
            CheckResult(source="page:el:amygdales:1", field="content",
                        href="https://example.com/ok", classification="ok", status=200),
            CheckResult(source="page:el:amygdales:1", field="excerpt",
                        href="https://example.com/broken", classification="broken", status=404),
            CheckResult(source="page:el:amygdales:1", field="content",
                        href="https://example.com/flaky", classification="flaky", status=500,
                        error="HTTP 500", retried=True),
            CheckResult(source="page:ru:test:2", field="content",
                        href="https://www.cdc.gov/blocked", classification="allowlisted", status=429),
        ]
        report = build_report(results)

        self.assertIn("**Total links checked:** 4", report)
        self.assertIn("**OK:** 1", report)
        self.assertIn("**Broken (4xx):** 1", report)
        self.assertIn("Flaky", report)
        self.assertIn("Allowlisted", report)
        self.assertIn("amygdales", report)
        self.assertIn("https://example.com/broken", report)
        self.assertIn("HTTP 404", report)
        self.assertIn("(retried)", report)

    def test_report_all_ok_shows_no_broken_sections(self) -> None:
        results = [
            CheckResult(source="page:el:test:1", field="content",
                        href="https://example.com/a", classification="ok", status=200),
            CheckResult(source="page:el:test:1", field="content",
                        href="https://example.com/b", classification="ok", status=200),
        ]
        report = build_report(results)
        self.assertIn("**OK:** 2", report)
        self.assertIn("**Broken (4xx):** 0", report)
        self.assertNotIn("###", report)

    def test_report_includes_final_url_when_redirected(self) -> None:
        results = [
            CheckResult(source="page:el:test:1", field="content",
                        href="https://old.example/page",
                        classification="flaky", status=503,
                        error="HTTP 503",
                        final_url="https://new.example/error-page"),
        ]
        report = build_report(results)
        self.assertIn("old.example", report)
        self.assertIn("new.example", report)
        self.assertIn("HTTP 503", report)


class CheckAllLinksTests(unittest.IsolatedAsyncioTestCase):
    async def test_concurrent_check_multiple_links(self) -> None:
        links = [
            {"source": "page:el:a:1", "field": "content", "href": "https://example.com/1"},
            {"source": "page:el:b:1", "field": "content", "href": "https://example.com/2"},
            {"source": "page:el:c:1", "field": "content", "href": "https://example.com/3"},
        ]

        async with respx.mock(assert_all_called=False) as mock:
            mock.head("https://example.com/1").respond(200)
            mock.head("https://example.com/2").respond(404)
            mock.head("https://example.com/3").respond(200)

            results = await check_all_links(links)

        self.assertEqual(len(results), 3)
        classifications = {r.classification for r in results}
        self.assertIn("ok", classifications)
        self.assertIn("broken", classifications)

        ok_count = sum(1 for r in results if r.classification == "ok")
        broken_count = sum(1 for r in results if r.classification == "broken")
        self.assertEqual(ok_count, 2)
        self.assertEqual(broken_count, 1)

    async def test_empty_links_list(self) -> None:
        results = await check_all_links([])
        self.assertEqual(len(results), 0)


if __name__ == "__main__":
    unittest.main()
