#!/usr/bin/env python3
"""Migration Runner — codify Forward-Only Migration policy.

Discovers, validates, and applies PostgreSQL migrations from
``backend/database/postgres-migrations/``. Tracks applied migrations in a
``_migrations`` table with SHA-256 checksums to detect edits after they have
been applied.

Interface:
  python3 tools/migration_runner.py status --target=<dev|rehearsal|production>
  python3 tools/migration_runner.py up --target=<target> [--dry-run] [--force]
  python3 tools/migration_runner.py down --target=<target> [--dry-run]

Forward-Only enforcement:
  - ``down`` is blocked for production.
  - ``up`` against production requires ``--force``.
  - Edited migrations (checksum mismatch against tracking table) are fatal.
"""

from __future__ import annotations

import argparse
import hashlib
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

from cms_audit import ROOT
from environments import ENVIRONMENTS, get

MIGRATIONS_DIR = ROOT / "backend" / "database" / "postgres-migrations"
TRACKING_TABLE = "_migrations"

# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Migration:
    basename: str
    up_path: Path
    down_path: Path | None

    def up_checksum(self) -> str:
        return _compute_checksum(self.up_path)

    def down_checksum(self) -> str | None:
        if self.down_path is None:
            return None
        return _compute_checksum(self.down_path)


@dataclass
class Target:
    name: str
    container: str
    db_user: str
    db_name: str
    access: str


# ---------------------------------------------------------------------------
# Pure functions (testable without Docker)
# ---------------------------------------------------------------------------


def discover_migrations() -> list[Migration]:
    """Return all migration pairs in ``MIGRATIONS_DIR``, sorted by basename."""
    if not MIGRATIONS_DIR.exists():
        return []

    up_files = sorted(MIGRATIONS_DIR.glob("*.up.sql"))
    migrations: list[Migration] = []
    for up in up_files:
        basename = up.name.replace(".up.sql", "")
        down = MIGRATIONS_DIR / f"{basename}.down.sql"
        migrations.append(
            Migration(basename=basename, up_path=up, down_path=down if down.exists() else None)
        )
    return migrations


def _compute_checksum(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def validate_migrations_against_history(
    migrations: list[Migration],
    history: dict[str, str],
) -> list[str]:
    """Return a list of fatal-error messages for checksum mismatches.

    ``history`` maps ``basename`` → ``checksum`` for already-applied migrations.
    """
    errors: list[str] = []
    for mig in migrations:
        if mig.basename in history:
            expected = history[mig.basename]
            actual = mig.up_checksum()
            if expected != actual:
                errors.append(
                    f"EDITED MIGRATION: {mig.basename}.up.sql was applied with checksum "
                    f"{expected[:16]}… but now has checksum {actual[:16]}…. "
                    f"Forward-Only policy forbids editing applied migrations. "
                    f"Add a new forward migration instead."
                )
    return errors


def plan_up(migrations: list[Migration], history: dict[str, str]) -> list[Migration]:
    """Return migrations that need to be applied (not yet in history)."""
    return [m for m in migrations if m.basename not in history]


def plan_down(migrations: list[Migration], history: dict[str, str]) -> list[Migration]:
    """Return migrations to roll back, in reverse order, limited to those in history."""
    applied = [m for m in migrations if m.basename in history and m.down_path is not None]
    return list(reversed(applied))


# ---------------------------------------------------------------------------
# Database executor (Docker psql)
# ---------------------------------------------------------------------------


def _docker_psql(container: str, user: str, db: str, sql: str) -> subprocess.CompletedProcess[str]:
    cmd = [
        "docker",
        "exec",
        "-i",
        container,
        "psql",
        "-U",
        user,
        "-d",
        db,
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


def _ensure_tracking_table(target: Target) -> None:
    sql = f"""
    CREATE TABLE IF NOT EXISTS {TRACKING_TABLE} (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW(),
        checksum TEXT NOT NULL
    );
    """
    result = _docker_psql(target.container, target.db_user, target.db_name, sql)
    if result.returncode != 0:
        raise RuntimeError(f"Failed to create tracking table: {result.stderr.strip()}")


def _load_history(target: Target) -> dict[str, str]:
    """Return ``basename → checksum`` for already-applied migrations."""
    sql = f"""
    SELECT filename, checksum FROM {TRACKING_TABLE} ORDER BY filename;
    """
    result = _docker_psql(target.container, target.db_user, target.db_name, sql)
    if result.returncode != 0:
        err = result.stderr.lower()
        if "does not exist" in err or "relation" in err:
            return {}
        raise RuntimeError(f"Failed to read tracking table: {result.stderr.strip()}")

    history: dict[str, str] = {}
    for line in result.stdout.strip().splitlines():
        if not line.strip():
            continue
        parts = line.split("|")
        if len(parts) >= 2:
            history[parts[0]] = parts[1]
    return history


def _record_migration(target: Target, basename: str, checksum: str) -> None:
    # Escape single quotes for safety (basenames are controlled, but be defensive)
    safe_name = basename.replace("'", "''")
    safe_checksum = checksum.replace("'", "''")
    sql = f"""
    INSERT INTO {TRACKING_TABLE} (filename, checksum)
    VALUES ('{safe_name}', '{safe_checksum}')
    ON CONFLICT (filename) DO UPDATE SET
        applied_at = NOW(),
        checksum = EXCLUDED.checksum;
    """
    result = _docker_psql(target.container, target.db_user, target.db_name, sql)
    if result.returncode != 0:
        raise RuntimeError(f"Failed to record migration {basename}: {result.stderr.strip()}")


def _delete_migration_record(target: Target, basename: str) -> None:
    safe_name = basename.replace("'", "''")
    sql = f"DELETE FROM {TRACKING_TABLE} WHERE filename = '{safe_name}';"
    result = _docker_psql(target.container, target.db_user, target.db_name, sql)
    if result.returncode != 0:
        raise RuntimeError(
            f"Failed to delete migration record {basename}: {result.stderr.strip()}"
        )


def _run_migration_sql(target: Target, sql: str) -> None:
    result = _docker_psql(target.container, target.db_user, target.db_name, sql)
    if result.returncode != 0:
        stderr = result.stderr.strip() if result.stderr else "(no stderr)"
        raise RuntimeError(f"Migration failed:\n{stderr[:500]}")


# ---------------------------------------------------------------------------
# Target resolution
# ---------------------------------------------------------------------------


def _resolve_target(name: str) -> Target:
    env = get(name)
    return Target(
        name=name,
        container=env["container"],
        db_user=env["db_user"],
        db_name=env["db_name"],
        access=env["access"],
    )


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------


def cmd_status(target_name: str) -> int:
    target = _resolve_target(target_name)
    migrations = discover_migrations()

    print(f"Target: {target_name}")
    print(f"  Container : {target.container}")
    print(f"  Database  : {target.db_name}")
    print(f"  Migrations: {MIGRATIONS_DIR.relative_to(ROOT)}")
    print()

    _ensure_tracking_table(target)
    history = _load_history(target)

    if not migrations:
        print("No migrations discovered.")
        return 0

    print(f"{'Status':<12} {'Basename':<50} {'Checksum (first 16)':<20}")
    print("-" * 82)

    for mig in migrations:
        if mig.basename in history:
            status = "APPLIED"
            checksum = history[mig.basename][:16] + "…"
        else:
            status = "PENDING"
            checksum = mig.up_checksum()[:16] + "…"
        print(f"{status:<12} {mig.basename:<50} {checksum:<20}")

    applied = sum(1 for m in migrations if m.basename in history)
    pending = len(migrations) - applied
    print()
    print(f"Total: {len(migrations)}  Applied: {applied}  Pending: {pending}")
    return 0


def cmd_up(target_name: str, *, dry_run: bool, force: bool) -> int:
    target = _resolve_target(target_name)

    if target_name == "production" and not force:
        print(
            "ERROR: Running migrations against production requires --force.\n"
            "Review pending migrations carefully before proceeding.",
            file=sys.stderr,
        )
        return 1

    migrations = discover_migrations()
    _ensure_tracking_table(target)
    history = _load_history(target)

    errors = validate_migrations_against_history(migrations, history)
    if errors:
        for e in errors:
            print(f"ERROR: {e}", file=sys.stderr)
        return 1

    pending = plan_up(migrations, history)
    if not pending:
        print("No pending migrations.")
        return 0

    print(f"{'[DRY-RUN]' if dry_run else ''} Applying {len(pending)} migration(s) to {target_name}…")
    for mig in pending:
        sql = mig.up_path.read_text(encoding="utf-8")
        print(f"  → {mig.basename}.up.sql")
        if dry_run:
            continue

        _run_migration_sql(target, sql)
        _record_migration(target, mig.basename, mig.up_checksum())
        print(f"     OK")

    print("Done.")
    return 0


def cmd_down(target_name: str, *, dry_run: bool) -> int:
    if target_name == "production":
        print(
            "ERROR: down migrations are blocked for production.\n"
            "Forward-Only policy requires rollbacks to be implemented as new forward migrations.",
            file=sys.stderr,
        )
        return 1

    target = _resolve_target(target_name)
    migrations = discover_migrations()
    _ensure_tracking_table(target)
    history = _load_history(target)

    errors = validate_migrations_against_history(migrations, history)
    if errors:
        for e in errors:
            print(f"ERROR: {e}", file=sys.stderr)
        return 1

    to_roll_back = plan_down(migrations, history)
    if not to_roll_back:
        print("No down migrations to apply (nothing in history with a .down.sql file).")
        return 0

    print(
        f"{'[DRY-RUN] ' if dry_run else ''}Rolling back {len(to_roll_back)} migration(s) on {target_name}…"
    )
    for mig in to_roll_back:
        sql = mig.down_path.read_text(encoding="utf-8") if mig.down_path else ""
        print(f"  → {mig.basename}.down.sql")
        if dry_run:
            continue

        _run_migration_sql(target, sql)
        _delete_migration_record(target, mig.basename)
        print(f"     OK")

    print("Done.")
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
    common.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be executed without running",
    )

    sub.add_parser("status", parents=[common], help="Show applied vs pending migrations")

    up_parser = sub.add_parser("up", parents=[common], help="Apply pending forward migrations")
    up_parser.add_argument(
        "--force",
        action="store_true",
        help="Required to run against production",
    )

    sub.add_parser("down", parents=[common], help="Roll back migrations (rehearsal/dev only)")

    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if args.command == "status":
        return cmd_status(args.target)
    if args.command == "up":
        return cmd_up(args.target, dry_run=args.dry_run, force=args.force)
    if args.command == "down":
        return cmd_down(args.target, dry_run=args.dry_run)

    return 1


if __name__ == "__main__":
    sys.exit(main())
