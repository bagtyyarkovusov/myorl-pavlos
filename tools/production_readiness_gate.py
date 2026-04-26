#!/usr/bin/env python3
"""Run the database, CMS, and frontend gates required before design work."""

from __future__ import annotations

import argparse
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

from cms_audit import DEFAULT_SQLITE_DB_PATH, REPORTS_DIR, ROOT


@dataclass(frozen=True)
class Step:
    name: str
    command: list[str]
    cwd: Path = ROOT


def run_step(step: Step) -> bool:
    print(f"[RUN] {step.name}: {' '.join(step.command)}")
    completed = subprocess.run(step.command, cwd=step.cwd, text=True)
    if completed.returncode == 0:
        print(f"[PASS] {step.name}")
        return True
    print(f"[FAIL] {step.name}: exit {completed.returncode}")
    return False


def build_steps(args: argparse.Namespace) -> list[Step]:
    steps = [
        Step(
            "postgres-strictness",
            [
                sys.executable,
                "tools/audit_postgres_strictness.py",
                "--db",
                str(args.db),
                "--fail-on-findings",
            ],
        ),
        Step(
            "postgres-rehearsal-report",
            [
                sys.executable,
                "tools/check_postgres_rehearsal_report.py",
                str(args.postgres_report),
                "--db",
                str(args.db),
            ],
        ),
        Step(
            "nextjs-readiness",
            [
                sys.executable,
                "tools/nextjs_readiness_gate.py",
                *(["--skip-live-strapi"] if args.skip_live_strapi else []),
            ],
        ),
        Step("frontend-format", ["npm", "run", "format:check"], ROOT / "frontend"),
        Step("frontend-lint", ["npm", "run", "lint"], ROOT / "frontend"),
        Step("frontend-typecheck", ["npm", "run", "typecheck"], ROOT / "frontend"),
        Step("frontend-test", ["npm", "test"], ROOT / "frontend"),
        Step("frontend-build", ["npm", "run", "build"], ROOT / "frontend"),
    ]
    return steps


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=DEFAULT_SQLITE_DB_PATH)
    parser.add_argument(
        "--postgres-report",
        type=Path,
        default=REPORTS_DIR / "postgres_rehearsal_explain_report.json",
    )
    parser.add_argument("--skip-live-strapi", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    failed = [step.name for step in build_steps(args) if not run_step(step)]
    if failed:
        print("[FAIL] production-readiness-gate")
        for name in failed:
            print(f"  - {name}")
        return 1
    print("[PASS] production-readiness-gate")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
