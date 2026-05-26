#!/usr/bin/env python3
"""DNS cutover readiness check — verify apex and legacy hostname resolution.

Pre-flight guard for the MODX → Strapi/Next.js same-domain migration.  Resolves
``myorl.gr`` (apex) and ``legacy.myorl.gr`` (standby) via the system resolver and
confirms each resolves to its expected IP address before the registrar DNS flip
is triggered.

Exit 0 when both hostnames resolve to their expected addresses, 1 otherwise.
"""

from __future__ import annotations

import argparse
import json
import os
import socket
import sys
from dataclasses import dataclass, field
from typing import TextIO


APEX_HOSTNAME = "myorl.gr"
LEGACY_HOSTNAME = "legacy.myorl.gr"

ENV_APEX_IP = "CUTOVER_APEX_IP"
ENV_LEGACY_IP = "CUTOVER_LEGACY_IP"


@dataclass
class CheckResult:
    hostname: str
    expected_ip: str
    resolved_ips: list[str] = field(default_factory=list)
    passed: bool = False
    message: str = ""


def check_dns_record(hostname: str, expected_ip: str) -> CheckResult:
    """Resolve *hostname* and verify *expected_ip* is among the resolved addresses."""
    try:
        addrinfo = socket.getaddrinfo(hostname, None)
    except socket.gaierror as exc:
        return CheckResult(
            hostname=hostname,
            expected_ip=expected_ip,
            resolved_ips=[],
            passed=False,
            message=f"{hostname} DNS resolution failed: {exc}",
        )

    resolved = sorted({addr[4][0] for addr in addrinfo})

    if expected_ip in resolved:
        return CheckResult(
            hostname=hostname,
            expected_ip=expected_ip,
            resolved_ips=resolved,
            passed=True,
            message=f"{hostname} resolves to {expected_ip}",
        )

    ip_list = ", ".join(resolved)
    return CheckResult(
        hostname=hostname,
        expected_ip=expected_ip,
        resolved_ips=resolved,
        passed=False,
        message=(
            f"{hostname} does not resolve to {expected_ip}. "
            f"Resolved IPs: {ip_list}"
        ),
    )


def run_checks(
    apex_expected_ip: str,
    legacy_expected_ip: str,
) -> list[CheckResult]:
    """Run DNS resolution checks for apex and legacy hostnames."""
    return [
        check_dns_record(APEX_HOSTNAME, apex_expected_ip),
        check_dns_record(LEGACY_HOSTNAME, legacy_expected_ip),
    ]


def format_report(results: list[CheckResult], file: TextIO = sys.stdout) -> None:
    """Print a human-readable report of check results to *file*."""
    passed = sum(1 for r in results if r.passed)
    total = len(results)

    print("DNS Cutover Readiness Report", file=file)
    print("=" * 50, file=file)
    for result in results:
        status = "PASS" if result.passed else "FAIL"
        print(f"  [{status}] {result.message}", file=file)
        if result.resolved_ips:
            print(f"         resolved: {', '.join(result.resolved_ips)}", file=file)
        print(f"         expected: {result.expected_ip}", file=file)
        print(file=file)

    verdict = "READY" if passed == total else "NOT READY"
    print(f"Verdict: {verdict} ({passed}/{total} checks passed)", file=file)


def format_report_json(results: list[CheckResult]) -> str:
    """Return a JSON string of check results."""
    return json.dumps(
        [
            {
                "hostname": r.hostname,
                "expected_ip": r.expected_ip,
                "resolved_ips": r.resolved_ips,
                "passed": r.passed,
                "message": r.message,
            }
            for r in results
        ],
        indent=2,
    )


def _resolve_ip(arg: str | None, env_var: str) -> str:
    """Return *arg* if provided, otherwise the value of *env_var*."""
    if arg:
        return arg
    value = os.environ.get(env_var)
    if value:
        return value
    msg = (
        f"Missing required IP address. Provide --apex-ip / --legacy-ip "
        f"or set the {ENV_APEX_IP} / {ENV_LEGACY_IP} environment variables."
    )
    raise SystemExit(msg)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--apex-ip",
        help=f"Expected IP address for {APEX_HOSTNAME}",
    )
    parser.add_argument(
        "--legacy-ip",
        help=f"Expected IP address for {LEGACY_HOSTNAME}",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output results as JSON instead of human-readable text",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    apex_ip = _resolve_ip(args.apex_ip, ENV_APEX_IP)
    legacy_ip = _resolve_ip(args.legacy_ip, ENV_LEGACY_IP)

    results = run_checks(apex_expected_ip=apex_ip, legacy_expected_ip=legacy_ip)

    if args.json:
        print(format_report_json(results))
    else:
        format_report(results)

    return 0 if all(r.passed for r in results) else 1


if __name__ == "__main__":
    sys.exit(main())
