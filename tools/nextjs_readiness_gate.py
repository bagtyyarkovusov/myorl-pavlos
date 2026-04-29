#!/usr/bin/env python3
"""Run the stable read-only readiness gate for Next.js implementation."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence
from urllib import error, request

from cms_audit import ROOT


@dataclass(frozen=True)
class GateStep:
    name: str
    command: list[str]
    cwd: Path = ROOT


def run_step(step: GateStep) -> dict[str, object]:
    completed = subprocess.run(
        step.command,
        cwd=step.cwd,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    return {
        "name": step.name,
        "command": step.command,
        "cwd": str(step.cwd),
        "returnCode": completed.returncode,
        "passed": completed.returncode == 0,
        "output": completed.stdout,
    }


def build_steps(args: argparse.Namespace) -> list[GateStep]:
    steps = [
        GateStep(
            name="content-hygiene",
            command=[
                sys.executable,
                "audit_nextjs_content_hygiene.py",
                "--max-broken-internal-links",
                str(args.max_broken_internal_links),
                "--max-samples",
                str(args.max_samples),
                *(["--skip-strapi-navigation"] if args.skip_live_strapi else []),
            ],
        ),
        GateStep(
            name="nextjs-contract",
            command=["node", "backend/scripts/verify-nextjs-contract.js"],
        ),
    ]

    if not args.skip_live_strapi:
        steps.append(
            GateStep(
                name="navigation-dry-run-ru",
                command=[
                    sys.executable,
                    "sync_navigation_from_pages.py",
                    "--dry-run",
                    "--merge",
                    "--locale",
                    "ru",
                ],
            )
        )

    return steps


def strapi_origin() -> str:
    value = os.environ.get("STRAPI_URL", "").strip()
    if not value:
        print("[FAIL] STRAPI_URL environment variable is required")
        raise SystemExit(1)
    return value.rstrip("/")


def live_strapi_preflight() -> dict[str, object]:
    origin = strapi_origin()
    url = f"{origin}/api/navigation/render/navigation?type=TREE&locale=el"
    try:
        req = request.Request(url, method="GET")
        with request.urlopen(req, timeout=5) as response:
            status = response.status
    except error.HTTPError as exc:
        return {
            "name": "live-strapi-preflight",
            "command": [f"GET {url}"],
            "cwd": str(ROOT),
            "returnCode": 0,
            "passed": True,
            "output": f"Live Strapi reachable at {origin} (HTTP {exc.code}).",
        }
    except error.URLError as exc:
        return {
            "name": "live-strapi-preflight",
            "command": [f"GET {url}"],
            "cwd": str(ROOT),
            "returnCode": 1,
            "passed": False,
            "output": (
                f"Live Strapi is not reachable at {origin}. Start Strapi before "
                "running the full gate, or use --skip-live-strapi for the static "
                f"code/content gate. Underlying error: {exc}"
            ),
        }

    return {
        "name": "live-strapi-preflight",
        "command": [f"GET {url}"],
        "cwd": str(ROOT),
        "returnCode": 0,
        "passed": True,
        "output": f"Live Strapi reachable at {origin} (HTTP {status}).",
    }


def write_report(path: Path, results: Sequence[dict[str, object]]) -> None:
    payload = {
        "passed": all(bool(result["passed"]) for result in results),
        "steps": list(results),
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--skip-live-strapi",
        action="store_true",
        help="Skip checks that require a running Strapi instance.",
    )
    parser.add_argument("--max-samples", type=int, default=10)
    parser.add_argument(
        "--max-broken-internal-links",
        type=int,
        default=2,
        help="Current accepted baseline; the gate fails if this count increases.",
    )
    parser.add_argument("--report-json", type=Path, help="Optional path for a full gate report.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    results: list[dict[str, object]] = []
    if not args.skip_live_strapi:
        preflight = live_strapi_preflight()
        results.append(preflight)
        if not preflight["passed"]:
            args.skip_live_strapi = True

    results.extend(run_step(step) for step in build_steps(args))

    for result in results:
        status = "PASS" if result["passed"] else "FAIL"
        print(f"[{status}] {result['name']}: {' '.join(result['command'])}")
        output = str(result["output"]).strip()
        if output:
            print(output)

    if args.report_json:
        write_report(args.report_json, results)

    return 0 if all(bool(result["passed"]) for result in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
