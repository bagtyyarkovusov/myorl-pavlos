#!/usr/bin/env python3
"""Prune Web Vitals Log — enforce the 90-day anonymity TTL.

Runs an idempotent DELETE against the target PostgreSQL database via Docker exec.
``--dry-run`` counts how many rows *would* be deleted without deleting them.
Production requires ``--force``, matching the safety conventions of
``migration_runner.py`` and ``backup_runner.py``.

Interface:
  python3 tools/prune_web_vitals_log.py --target=<dev|rehearsal|production>
  python3 tools/prune_web_vitals_log.py --target=<target> --dry-run
  python3 tools/prune_web_vitals_log.py --target=production --force
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from dataclasses import dataclass

from environments import ENVIRONMENTS, get

DELETE_QUERY = "DELETE FROM web_vitals_log WHERE created_at < NOW() - INTERVAL '90 days';"
COUNT_QUERY = "SELECT COUNT(*) FROM web_vitals_log WHERE created_at < NOW() - INTERVAL '90 days';"


@dataclass
class Target:
    name: str
    container: str
    db_user: str
    db_name: str
    access: str


def _resolve_target(name: str) -> Target:
    env = get(name)
    return Target(
        name=name,
        container=env["container"],
        db_user=env["db_user"],
        db_name=env["db_name"],
        access=env["access"],
    )


def _resolve_docker(target: Target, sql: str) -> subprocess.CompletedProcess[str]:
    cmd = [
        "docker",
        "exec",
        "-i",
        target.container,
        "psql",
        "-U",
        target.db_user,
        "-d",
        target.db_name,
        "-v",
        "ON_ERROR_STOP=1",
        "-At",
    ]
    return subprocess.run(
        cmd,
        input=sql,
        capture_output=True,
        text=True,
        check=False,
        timeout=120,
    )


def cmd_prune(target_name: str, *, dry_run: bool, force: bool) -> int:
    if target_name == "production" and not force:
        print(
            "ERROR: Pruning production web_vitals_log requires --force.\n"
            "This will permanently delete rows older than 90 days.",
            file=sys.stderr,
        )
        return 1

    target = _resolve_target(target_name)
    sql = COUNT_QUERY if dry_run else DELETE_QUERY

    label = "[DRY-RUN] " if dry_run else ""
    verb = "Counting" if dry_run else "Pruning"
    print(f"{verb} web_vitals_log rows on {target_name}...")

    result = _resolve_docker(target, sql)
    if result.returncode != 0:
        stderr = result.stderr.strip() if result.stderr else "(no stderr)"
        print(f"ERROR: Prune failed:\n{stderr[:500]}", file=sys.stderr)
        return 1

    output = result.stdout.strip()
    if dry_run:
        try:
            count = int(output)
        except ValueError:
            count = -1
        print(f"{label}Would delete {count} row(s).")
    else:
        print(f"{label}Done.")
        if output:
            lines = output.splitlines()
            for line in lines:
                print(f"  {line}")

    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--target",
        choices=list(ENVIRONMENTS.keys()),
        required=True,
        help="Target environment",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Count rows that would be deleted without deleting",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Required to run against production",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    return cmd_prune(args.target, dry_run=args.dry_run, force=args.force)


if __name__ == "__main__":
    sys.exit(main())
