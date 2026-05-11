#!/usr/bin/env python3
"""Backup Runner — wrap pg_dump / psql restore with verification and drill mode.

Interface:
  python3 tools/backup_runner.py backup --target=<dev|rehearsal|production> [--uploads]
  python3 tools/backup_runner.py restore --target=<target> --file <path> [--force] [--uploads <path>]
  python3 tools/backup_runner.py drill --target=<target>

The ``drill`` command runs a full backup → restore → verify cycle against the
chosen target. It is safe for rehearsal (disposable) but blocked for production
unless ``--force`` is used.

Backups are written to ``backups/`` under the repo root. Retention pruning
removes backups older than 30 days automatically.
"""

from __future__ import annotations

import argparse
import datetime
import gzip
import json
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from cms_audit import ROOT
from environments import ENVIRONMENTS, get

BACKUPS_DIR = ROOT / "backups"
DEFAULT_RETENTION_DAYS = 30


@dataclass
class Target:
    name: str
    container: str
    db_user: str
    db_name: str


def _resolve_target(name: str) -> Target:
    env = get(name)
    return Target(
        name=name,
        container=env["container"],
        db_user=env["db_user"],
        db_name=env["db_name"],
    )


def _run(cmd: list[str], *, input_data: str | None = None, timeout: int = 300) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        cmd,
        input=input_data,
        capture_output=True,
        text=True,
        check=False,
        timeout=timeout,
    )
    return result


def _docker_exec(container: str, cmd: list[str], **kwargs: Any) -> subprocess.CompletedProcess[str]:
    return _run(["docker", "exec", "-i", container, *cmd], **kwargs)


def _ensure_container_running(container: str) -> None:
    result = _run(["docker", "ps", "--format", "{{.Names}}"])
    running = {line.strip() for line in result.stdout.splitlines() if line.strip()}
    if container not in running:
        raise RuntimeError(f"Container '{container}' is not running.")


def _pg_dump(target: Target, *, schema_only: bool = False, data_only: bool = False) -> subprocess.CompletedProcess[str]:
    cmd = [
        "pg_dump",
        "-U", target.db_user,
        "-d", target.db_name,
        "--clean",
        "--if-exists",
        "--no-owner",
    ]
    if schema_only:
        cmd.append("--schema-only")
    if data_only:
        cmd.append("--data-only")
        cmd.append("--inserts")
    return _docker_exec(target.container, cmd, timeout=600)


def _timestamp() -> str:
    return datetime.datetime.now().strftime("%Y%m%d_%H%M%S")


def _backup_path(kind: str = "full") -> Path:
    BACKUPS_DIR.mkdir(parents=True, exist_ok=True)
    return BACKUPS_DIR / f"strapi_{kind}_{_timestamp()}.sql.gz"


def _prune_old_backups(retention_days: int = DEFAULT_RETENTION_DAYS) -> int:
    if not BACKUPS_DIR.exists():
        return 0
    cutoff = datetime.datetime.now() - datetime.timedelta(days=retention_days)
    pruned = 0
    for f in BACKUPS_DIR.glob("strapi_*.sql.gz"):
        # Parse timestamp from filename: strapi_full_20260506_123456.sql.gz
        try:
            ts_str = f.stem.replace(".sql", "").split("_")[-2:]  # ['20260506', '123456']
            ts = datetime.datetime.strptime("_".join(ts_str), "%Y%m%d_%H%M%S")
            if ts < cutoff:
                f.unlink()
                pruned += 1
        except (ValueError, IndexError):
            continue
    return pruned


def _row_counts(target: Target) -> dict[str, int]:
    """Return key row counts from the target database."""
    tables = ["pages", "tags", "files"]
    counts: dict[str, int] = {}
    for table in tables:
        result = _docker_exec(
            target.container,
            ["psql", "-U", target.db_user, "-d", target.db_name, "-At", "-c", f"SELECT COUNT(*) FROM {table};"],
            timeout=30,
        )
        if result.returncode == 0:
            try:
                counts[table] = int(result.stdout.strip())
            except ValueError:
                counts[table] = -1
        else:
            counts[table] = -1
    return counts


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------


def cmd_backup(target_name: str, *, uploads: bool, schema_only: bool, data_only: bool) -> int:
    target = _resolve_target(target_name)
    _ensure_container_running(target.container)

    print(f"Backing up {target.db_name} from {target.container}...")
    result = _pg_dump(target, schema_only=schema_only, data_only=data_only)
    if result.returncode != 0:
        print(f"pg_dump failed:\n{result.stderr[:500]}", file=sys.stderr)
        return 1

    kind = "schema" if schema_only else ("data" if data_only else "full")
    path = _backup_path(kind)
    path.write_bytes(gzip.compress(result.stdout.encode("utf-8")))
    size = path.stat().st_size
    print(f"  Saved: {path.name} ({size:,} bytes)")

    if uploads:
        uploads_path = BACKUPS_DIR / f"uploads_{_timestamp()}.tar.gz"
        up_result = _run([
            "docker", "run", "--rm",
            "-v", "myorl-pavlos_uploads:/data",
            "-v", f"{BACKUPS_DIR}:/backup",
            "alpine", "tar", "czf", f"/backup/{uploads_path.name}", "-C", "/data", ".",
        ], timeout=120)
        if up_result.returncode != 0:
            print(f"Uploads backup failed:\n{up_result.stderr[:500]}", file=sys.stderr)
            return 1
        print(f"  Saved uploads: {uploads_path.name}")

    pruned = _prune_old_backups()
    if pruned:
        print(f"  Pruned {pruned} old backup(s).")

    return 0


def cmd_restore(target_name: str, *, file: Path, force: bool, uploads_file: Path | None) -> int:
    if target_name == "production" and not force:
        print(
            "ERROR: Restoring production requires --force.\n"
            "This will DESTROY the current production database.",
            file=sys.stderr,
        )
        return 1

    target = _resolve_target(target_name)
    _ensure_container_running(target.container)

    if not file.exists():
        print(f"ERROR: Backup file not found: {file}", file=sys.stderr)
        return 1

    print(f"Restoring {target.db_name} on {target.container} from {file.name}...")

    # Read backup file (handle gzip)
    raw = file.read_bytes()
    try:
        sql = gzip.decompress(raw).decode("utf-8")
    except OSError:
        sql = raw.decode("utf-8")

    # Pre-restore counts for verification
    before = _row_counts(target)
    print(f"  Pre-restore counts: {before}")

    # Drop and recreate database
    drop_result = _docker_exec(
        target.container,
        ["psql", "-U", target.db_user, "-d", "postgres", "-At", "-c",
         f"DROP DATABASE IF EXISTS {target.db_name};"],
        timeout=30,
    )
    if drop_result.returncode != 0:
        print(f"DROP DATABASE failed:\n{drop_result.stderr}", file=sys.stderr)
        return 1

    create_result = _docker_exec(
        target.container,
        ["psql", "-U", target.db_user, "-d", "postgres", "-At", "-c",
         f"CREATE DATABASE {target.db_name} OWNER {target.db_user};"],
        timeout=30,
    )
    if create_result.returncode != 0:
        print(f"CREATE DATABASE failed:\n{create_result.stderr}", file=sys.stderr)
        return 1

    # Restore
    restore_result = _docker_exec(
        target.container,
        ["psql", "-U", target.db_user, "-d", target.db_name, "-v", "ON_ERROR_STOP=1"],
        input_data=sql,
        timeout=600,
    )
    if restore_result.returncode != 0:
        print(f"Restore failed:\n{restore_result.stderr[:500]}", file=sys.stderr)
        return 1

    # Post-restore counts
    after = _row_counts(target)
    print(f"  Post-restore counts: {after}")

    if uploads_file and uploads_file.exists():
        print(f"  Restoring uploads from {uploads_file.name}...")
        up_result = _run([
            "docker", "run", "--rm",
            "-v", "myorl-pavlos_uploads:/data",
            "-v", f"{uploads_file.parent}:/backup",
            "alpine", "tar", "xzf", f"/backup/{uploads_file.name}", "-C", "/data",
        ], timeout=120)
        if up_result.returncode != 0:
            print(f"Uploads restore failed:\n{up_result.stderr[:500]}", file=sys.stderr)
            return 1
        print("  Uploads restored.")

    print("Restore complete.")
    return 0


def cmd_drill(target_name: str) -> int:
    """Backup → restore → verify cycle. Safe for rehearsal; blocked for production."""
    if target_name == "production":
        print(
            "ERROR: The restore drill is blocked for production.\n"
            "It drops and recreates the database. Run against rehearsal instead.",
            file=sys.stderr,
        )
        return 1

    target = _resolve_target(target_name)
    _ensure_container_running(target.container)

    print(f"=== Restore Drill on {target_name} ===\n")

    # 1. Capture current counts
    original = _row_counts(target)
    print(f"Original counts: {original}")

    # 2. Backup
    print("\n[1/3] Backup...")
    result = _pg_dump(target)
    if result.returncode != 0:
        print(f"Backup failed: {result.stderr[:500]}", file=sys.stderr)
        return 1
    backup_sql = result.stdout
    print("  Backup captured.")

    # 3. Restore
    print("\n[2/3] Restore...")
    drop_result = _docker_exec(
        target.container,
        ["psql", "-U", target.db_user, "-d", "postgres", "-At", "-c",
         f"DROP DATABASE IF EXISTS {target.db_name};"],
        timeout=30,
    )
    if drop_result.returncode != 0:
        print(f"DROP DATABASE failed: {drop_result.stderr}", file=sys.stderr)
        return 1

    create_result = _docker_exec(
        target.container,
        ["psql", "-U", target.db_user, "-d", "postgres", "-At", "-c",
         f"CREATE DATABASE {target.db_name} OWNER {target.db_user};"],
        timeout=30,
    )
    if create_result.returncode != 0:
        print(f"CREATE DATABASE failed: {create_result.stderr}", file=sys.stderr)
        return 1

    restore_result = _docker_exec(
        target.container,
        ["psql", "-U", target.db_user, "-d", target.db_name, "-v", "ON_ERROR_STOP=1"],
        input_data=backup_sql,
        timeout=600,
    )
    if restore_result.returncode != 0:
        print(f"Restore failed: {restore_result.stderr[:500]}", file=sys.stderr)
        return 1
    print("  Restored.")

    # 4. Verify
    print("\n[3/3] Verify...")
    after = _row_counts(target)
    print(f"Post-restore counts: {after}")

    mismatches = []
    for table in original:
        if original[table] != after.get(table):
            mismatches.append(f"{table}: {original[table]} → {after.get(table)}")

    if mismatches:
        print("\nMISMATCHES DETECTED:")
        for m in mismatches:
            print(f"  ✗ {m}")
        return 1

    print("\n✓ All counts match. Drill passed.")
    return 0


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    common = argparse.ArgumentParser(add_help=False)
    common.add_argument(
        "--target",
        choices=list(ENVIRONMENTS.keys()),
        required=True,
        help="Target environment",
    )

    backup_parser = sub.add_parser("backup", parents=[common], help="Create a backup")
    backup_parser.add_argument("--uploads", action="store_true", help="Also backup uploads volume")
    backup_parser.add_argument("--schema-only", action="store_true", help="Schema-only dump")
    backup_parser.add_argument("--data-only", action="store_true", help="Data-only dump")

    restore_parser = sub.add_parser("restore", parents=[common], help="Restore from a backup file")
    restore_parser.add_argument("--file", type=Path, required=True, help="Path to .sql or .sql.gz backup")
    restore_parser.add_argument("--force", action="store_true", help="Required for production")
    restore_parser.add_argument("--uploads-file", type=Path, default=None, help="Path to uploads .tar.gz")

    drill_parser = sub.add_parser("drill", parents=[common], help="Backup → restore → verify cycle")

    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if args.command == "backup":
        return cmd_backup(
            args.target,
            uploads=args.uploads,
            schema_only=args.schema_only,
            data_only=args.data_only,
        )
    if args.command == "restore":
        return cmd_restore(
            args.target,
            file=args.file,
            force=args.force,
            uploads_file=args.uploads_file,
        )
    if args.command == "drill":
        return cmd_drill(args.target)

    return 1


if __name__ == "__main__":
    sys.exit(main())
