#!/usr/bin/env python3
"""Tests for check_dns_cutover_readiness.py"""

from __future__ import annotations

import json
import socket
import sys
import unittest
from io import StringIO
from pathlib import Path
from unittest.mock import patch

_TOOLS = Path(__file__).resolve().parents[1] / "tools"
if str(_TOOLS) not in sys.path:
    sys.path.insert(0, str(_TOOLS))

from check_dns_cutover_readiness import (
    CheckResult,
    check_dns_record,
    format_report,
    format_report_json,
    run_checks,
)


class TestCheckDnsRecord(unittest.TestCase):
    def test_apex_resolves_to_expected_ip(self):
        with patch("socket.getaddrinfo") as mock_resolve:
            mock_resolve.return_value = [
                (
                    socket.AF_INET,
                    socket.SOCK_STREAM,
                    6,
                    "",
                    ("93.184.216.34", 0),
                )
            ]
            result = check_dns_record("myorl.gr", "93.184.216.34")

        self.assertTrue(result.passed)
        self.assertEqual(result.hostname, "myorl.gr")
        self.assertEqual(result.resolved_ips, ["93.184.216.34"])

    def test_apex_resolves_to_unexpected_ip(self):
        with patch("socket.getaddrinfo") as mock_resolve:
            mock_resolve.return_value = [
                (
                    socket.AF_INET,
                    socket.SOCK_STREAM,
                    6,
                    "",
                    ("203.0.113.1", 0),
                )
            ]
            result = check_dns_record("myorl.gr", "93.184.216.34")

        self.assertFalse(result.passed)
        self.assertEqual(result.resolved_ips, ["203.0.113.1"])
        self.assertNotIn("93.184.216.34", result.resolved_ips)

    def test_legacy_subdomain_resolves_to_expected_ip(self):
        with patch("socket.getaddrinfo") as mock_resolve:
            mock_resolve.return_value = [
                (
                    socket.AF_INET,
                    socket.SOCK_STREAM,
                    6,
                    "",
                    ("198.51.100.1", 0),
                )
            ]
            result = check_dns_record("legacy.myorl.gr", "198.51.100.1")

        self.assertTrue(result.passed)
        self.assertEqual(result.hostname, "legacy.myorl.gr")
        self.assertEqual(result.resolved_ips, ["198.51.100.1"])

    def test_legacy_subdomain_resolves_to_wrong_ip(self):
        with patch("socket.getaddrinfo") as mock_resolve:
            mock_resolve.return_value = [
                (
                    socket.AF_INET,
                    socket.SOCK_STREAM,
                    6,
                    "",
                    ("203.0.113.99", 0),
                )
            ]
            result = check_dns_record("legacy.myorl.gr", "198.51.100.1")

        self.assertFalse(result.passed)
        self.assertEqual(result.expected_ip, "198.51.100.1")

    def test_resolution_failure_gaierror(self):
        with patch("socket.getaddrinfo") as mock_resolve:
            mock_resolve.side_effect = socket.gaierror("Name or service not known")
            result = check_dns_record("myorl.gr", "93.184.216.34")

        self.assertFalse(result.passed)
        self.assertIn("resolution failed", result.message.lower())
        self.assertEqual(result.resolved_ips, [])

    def test_multiple_addresses_one_matches(self):
        """When a hostname resolves to multiple IPs, any match is a pass."""
        with patch("socket.getaddrinfo") as mock_resolve:
            mock_resolve.return_value = [
                (
                    socket.AF_INET,
                    socket.SOCK_STREAM,
                    6,
                    "",
                    ("203.0.113.1", 0),
                ),
                (
                    socket.AF_INET,
                    socket.SOCK_STREAM,
                    6,
                    "",
                    ("93.184.216.34", 0),
                ),
            ]
            result = check_dns_record("myorl.gr", "93.184.216.34")

        self.assertTrue(result.passed)
        self.assertEqual(len(result.resolved_ips), 2)

    def test_multiple_addresses_none_match(self):
        with patch("socket.getaddrinfo") as mock_resolve:
            mock_resolve.return_value = [
                (
                    socket.AF_INET,
                    socket.SOCK_STREAM,
                    6,
                    "",
                    ("203.0.113.1", 0),
                ),
                (
                    socket.AF_INET,
                    socket.SOCK_STREAM,
                    6,
                    "",
                    ("203.0.113.2", 0),
                ),
            ]
            result = check_dns_record("myorl.gr", "93.184.216.34")

        self.assertFalse(result.passed)


class TestRunChecks(unittest.TestCase):
    def test_all_pass(self):
        with patch("check_dns_cutover_readiness.check_dns_record") as mock_check:
            mock_check.side_effect = [
                CheckResult(
                    hostname="myorl.gr",
                    expected_ip="93.184.216.34",
                    resolved_ips=["93.184.216.34"],
                    passed=True,
                    message="myorl.gr resolves to 93.184.216.34",
                ),
                CheckResult(
                    hostname="legacy.myorl.gr",
                    expected_ip="198.51.100.1",
                    resolved_ips=["198.51.100.1"],
                    passed=True,
                    message="legacy.myorl.gr resolves to 198.51.100.1",
                ),
            ]
            results = run_checks(
                apex_expected_ip="93.184.216.34",
                legacy_expected_ip="198.51.100.1",
            )

        self.assertEqual(len(results), 2)
        self.assertTrue(all(r.passed for r in results))

    def test_apex_fails(self):
        with patch("check_dns_cutover_readiness.check_dns_record") as mock_check:
            mock_check.side_effect = [
                CheckResult(
                    hostname="myorl.gr",
                    expected_ip="93.184.216.34",
                    resolved_ips=["203.0.113.1"],
                    passed=False,
                    message="myorl.gr resolves to 203.0.113.1, expected 93.184.216.34",
                ),
                CheckResult(
                    hostname="legacy.myorl.gr",
                    expected_ip="198.51.100.1",
                    resolved_ips=["198.51.100.1"],
                    passed=True,
                    message="legacy.myorl.gr resolves to 198.51.100.1",
                ),
            ]
            results = run_checks(
                apex_expected_ip="93.184.216.34",
                legacy_expected_ip="198.51.100.1",
            )

        self.assertEqual(len(results), 2)
        self.assertFalse(results[0].passed)
        self.assertTrue(results[1].passed)

    def test_legacy_fails(self):
        with patch("check_dns_cutover_readiness.check_dns_record") as mock_check:
            mock_check.side_effect = [
                CheckResult(
                    hostname="myorl.gr",
                    expected_ip="93.184.216.34",
                    resolved_ips=["93.184.216.34"],
                    passed=True,
                    message="myorl.gr resolves to 93.184.216.34",
                ),
                CheckResult(
                    hostname="legacy.myorl.gr",
                    expected_ip="198.51.100.1",
                    resolved_ips=[],
                    passed=False,
                    message="legacy.myorl.gr resolution failed: Name or service not known",
                ),
            ]
            results = run_checks(
                apex_expected_ip="93.184.216.34",
                legacy_expected_ip="198.51.100.1",
            )

        self.assertFalse(results[1].passed)
        self.assertIn("resolution failed", results[1].message.lower())


class TestFormatReport(unittest.TestCase):
    def test_human_readable_report_all_pass(self):
        results = [
            CheckResult(
                hostname="myorl.gr",
                expected_ip="93.184.216.34",
                resolved_ips=["93.184.216.34"],
                passed=True,
                message="myorl.gr resolves to 93.184.216.34",
            ),
            CheckResult(
                hostname="legacy.myorl.gr",
                expected_ip="198.51.100.1",
                resolved_ips=["198.51.100.1"],
                passed=True,
                message="legacy.myorl.gr resolves to 198.51.100.1",
            ),
        ]
        buf = StringIO()
        format_report(results, file=buf)
        output = buf.getvalue()

        self.assertIn("PASS", output)
        self.assertIn("myorl.gr", output)
        self.assertIn("legacy.myorl.gr", output)
        self.assertIn("2/2", output)

    def test_human_readable_report_with_failure(self):
        results = [
            CheckResult(
                hostname="myorl.gr",
                expected_ip="93.184.216.34",
                resolved_ips=["203.0.113.1"],
                passed=False,
                message="myorl.gr resolves to 203.0.113.1, expected 93.184.216.34",
            ),
            CheckResult(
                hostname="legacy.myorl.gr",
                expected_ip="198.51.100.1",
                resolved_ips=["198.51.100.1"],
                passed=True,
                message="legacy.myorl.gr resolves to 198.51.100.1",
            ),
        ]
        buf = StringIO()
        format_report(results, file=buf)
        output = buf.getvalue()

        self.assertIn("FAIL", output)
        self.assertIn("1/2", output)
        self.assertIn("203.0.113.1", output)
        self.assertIn("93.184.216.34", output)

    def test_human_readable_report_with_resolution_error(self):
        results = [
            CheckResult(
                hostname="legacy.myorl.gr",
                expected_ip="198.51.100.1",
                resolved_ips=[],
                passed=False,
                message="legacy.myorl.gr resolution failed: Name or service not known",
            ),
        ]
        buf = StringIO()
        format_report(results, file=buf)
        output = buf.getvalue()

        self.assertIn("FAIL", output)
        self.assertIn("resolution failed", output.lower())


class TestFormatReportJson(unittest.TestCase):
    def test_json_output(self):
        results = [
            CheckResult(
                hostname="myorl.gr",
                expected_ip="93.184.216.34",
                resolved_ips=["93.184.216.34"],
                passed=True,
                message="myorl.gr resolves to 93.184.216.34",
            ),
        ]
        output = format_report_json(results)
        parsed = json.loads(output)

        self.assertIsInstance(parsed, list)
        self.assertEqual(len(parsed), 1)
        self.assertTrue(parsed[0]["passed"])
        self.assertEqual(parsed[0]["hostname"], "myorl.gr")
        self.assertEqual(parsed[0]["expected_ip"], "93.184.216.34")
        self.assertEqual(parsed[0]["resolved_ips"], ["93.184.216.34"])

    def test_json_output_with_failure(self):
        results = [
            CheckResult(
                hostname="myorl.gr",
                expected_ip="93.184.216.34",
                resolved_ips=["203.0.113.1"],
                passed=False,
                message="myorl.gr resolves to 203.0.113.1, expected 93.184.216.34",
            ),
        ]

        output = format_report_json(results)
        parsed = json.loads(output)

        self.assertFalse(parsed[0]["passed"])
        self.assertEqual(parsed[0]["resolved_ips"], ["203.0.113.1"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
