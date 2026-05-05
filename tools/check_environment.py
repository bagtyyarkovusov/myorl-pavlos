#!/usr/bin/env python3
"""Environment guard — validate target safety before database operations.

Checks port availability, container conflicts, source database existence,
and environment configuration before any migration or rehearsal begins.

Exits 0 when the target is safe to use, 1 with actionable errors otherwise.
"""

from __future__ import annotations

import argparse
import json
import socket
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from cms_audit import DEFAULT_SQLITE_DB_PATH, ROOT

# Port allocation contract: see docker-compose*.yml and CONTEXT.md
TARGET_CONFIG: dict[str, dict[str, Any]] = {
    "dev": {
        "port": 55432,
        "container_name": "gemini-pg",
        "compose_file": "docker-compose.yml",
        "needs_sqlite_source": True,
    },
    "rehearsal": {
        "port": 55532,
        "container_name": "gemini-pg-rehearsal",
        "compose_file": "docker-compose.rehearsal.yml",
        "needs_sqlite_source": True,
    },
    "production": {
        "port": 5432,
        "container_name": "gemini-pg-prod",
        "compose_file": "docker-compose.prod.yml",
        "needs_sqlite_source": False,
    },
}


@dataclass
class CheckResult:
    passed: bool
    message: str
    details: dict[str, Any] = field(default_factory=dict)


def check_port_free(port: int) -> CheckResult:
    """Return True if the given TCP port is not currently bound on any interface."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(1.0)
            # Bind to all interfaces on the given port
            sock.bind(("0.0.0.0", port))
        return CheckResult(passed=True, message=f"Port {port} is free")
    except OSError:
        # Determine who is using the port for a better error message
        occupier = _find_port_occupier(port)
        msg = f"Port {port} is already in use"
        if occupier:
            msg += f" by {occupier}"
        return CheckResult(passed=False, message=msg, details={"port": port, "occupier": occupier})


def _find_port_occupier(port: int) -> str | None:
    """Attempt to identify which process or Docker container is using the port."""
    try:
        # Check for Docker containers forwarding this port
        result = subprocess.run(
            ["docker", "ps", "--format", "{{.Names}}:{{.Ports}}"],
            capture_output=True,
            text=True,
            check=False,
            timeout=5,
        )
        if result.returncode == 0:
            for line in result.stdout.splitlines():
                if f":{port}->" in line or f",{port}->" in line:
                    name = line.split(":", 1)[0]
                    return f"Docker container '{name}'"
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass

    try:
        # Try lsof as a fallback (macOS/Linux)
        result = subprocess.run(
            ["lsof", "-ti", f"tcp:{port}"],
            capture_output=True,
            text=True,
            check=False,
            timeout=5,
        )
        if result.returncode == 0 and result.stdout.strip():
            pid = result.stdout.strip().splitlines()[0]
            return f"process PID {pid}"
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass

    return None


def check_container_conflict(container_name: str) -> CheckResult:
    """Return True if no Docker container with the given name is running."""
    try:
        result = subprocess.run(
            ["docker", "ps", "--format", "{{.Names}}"],
            capture_output=True,
            text=True,
            check=False,
            timeout=5,
        )
        if result.returncode != 0:
            return CheckResult(
                passed=False,
                message="Docker is not available or not running",
                details={"docker_error": result.stderr.strip()},
            )

        running = {line.strip() for line in result.stdout.splitlines() if line.strip()}
        if container_name in running:
            return CheckResult(
                passed=False,
                message=f"Docker container '{container_name}' is already running",
                details={"running_containers": sorted(running)},
            )

        return CheckResult(passed=True, message=f"No conflicting container '{container_name}' found")
    except FileNotFoundError:
        return CheckResult(
            passed=False,
            message="Docker command not found. Is Docker installed?",
        )
    except subprocess.TimeoutExpired:
        return CheckResult(
            passed=False,
            message="Docker command timed out",
        )


def check_sqlite_source_exists(db_path: Path) -> CheckResult:
    """Return True if the SQLite source database exists and is readable."""
    if not db_path.exists():
        return CheckResult(
            passed=False,
            message=f"SQLite source database not found: {db_path}",
            details={"path": str(db_path)},
        )
    if not db_path.is_file():
        return CheckResult(
            passed=False,
            message=f"SQLite source path is not a file: {db_path}",
            details={"path": str(db_path)},
        )
    return CheckResult(passed=True, message=f"SQLite source found: {db_path}")


def check_target_config(target: str) -> CheckResult:
    """Validate that the target is known and its configuration is complete."""
    if target not in TARGET_CONFIG:
        known = ", ".join(TARGET_CONFIG.keys())
        return CheckResult(
            passed=False,
            message=f"Unknown target '{target}'. Known targets: {known}",
            details={"target": target, "known_targets": list(TARGET_CONFIG.keys())},
        )
    return CheckResult(passed=True, message=f"Target '{target}' is valid")


def run_checks(target: str) -> list[CheckResult]:
    """Run all safety checks for the given target."""
    results: list[CheckResult] = []

    # Target validity
    results.append(check_target_config(target))
    if not results[-1].passed:
        return results

    config = TARGET_CONFIG[target]

    # Port availability
    results.append(check_port_free(config["port"]))

    # Container conflict
    results.append(check_container_conflict(config["container_name"]))

    # SQLite source (for dev and rehearsal)
    if config.get("needs_sqlite_source"):
        results.append(check_sqlite_source_exists(DEFAULT_SQLITE_DB_PATH))

    return results


def print_report(results: list[CheckResult]) -> None:
    """Print a human-readable report of check results."""
    passed = sum(1 for r in results if r.passed)
    total = len(results)

    print(f"Environment Guard Report: {passed}/{total} checks passed")
    print("=" * 50)
    for result in results:
        status = "PASS" if result.passed else "FAIL"
        print(f"  [{status}] {result.message}")
        if result.details:
            for key, value in result.details.items():
                print(f"         {key}: {value}")
    print()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--target",
        choices=list(TARGET_CONFIG.keys()),
        required=True,
        help="Target environment to validate",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output results as JSON instead of human-readable text",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    results = run_checks(args.target)

    if args.json:
        output = [
            {
                "passed": r.passed,
                "message": r.message,
                "details": r.details,
            }
            for r in results
        ]
        print(json.dumps(output, indent=2))
    else:
        print_report(results)

    return 0 if all(r.passed for r in results) else 1


if __name__ == "__main__":
    sys.exit(main())
