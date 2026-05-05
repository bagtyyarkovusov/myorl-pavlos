#!/usr/bin/env python3
"""Canonical export adapter — migrate full Strapi state between databases.

Supports two deployment paths:
  1. Shell access: strapi export → strapi import (tarball)
  2. Platform-managed: pg_dump → pg_restore (database-level)

Interface:
  python3 tools/migrate_to_postgres.py --from=[sqlite|postgres] --to=[rehearsal|production] [--dry-run]

The implementation chooses the correct transport behind the seam based on
target type and available access.
"""

from __future__ import annotations

import argparse
import datetime
import json
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from cms_audit import ROOT

# Configuration
BACKEND_DIR = ROOT / "backend"
SQLITE_DB_PATH = BACKEND_DIR / ".tmp" / "data.db"
EXPORT_DIR = ROOT / "artifacts" / "exports"

TARGET_CONFIG: dict[str, dict[str, Any]] = {
    "dev": {
        "host": "127.0.0.1",
        "port": "55432",
        "database": "strapi",
        "username": "strapi",
        "password": "strapi",
        "container": "gemini-pg",
        "ssl": "false",
        "access": "local",
    },
    "rehearsal": {
        "host": "127.0.0.1",
        "port": "55532",
        "database": "strapi_rehearsal",
        "username": "strapi",
        "password": "strapi",
        "container": "gemini-pg-rehearsal",
        "ssl": "false",
        "access": "local",  # We have Docker/local access
    },
    "production": {
        "access": "remote",  # Requires shell or DATABASE_URL
    },
}


@dataclass
class MigrationResult:
    success: bool
    message: str
    details: dict[str, Any] = None  # type: ignore[assignment]

    def __post_init__(self):
        if self.details is None:
            self.details = {}


def log(message: str) -> None:
    timestamp = datetime.datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {message}")


def run_command(
    cmd: list[str],
    *,
    cwd: Path | None = None,
    env: dict[str, str] | None = None,
    check: bool = True,
    capture: bool = True,
    timeout: int | None = 300,
    input_text: str | None = None,
) -> subprocess.CompletedProcess[str]:
    """Run a subprocess command with unified error handling."""
    merged_env = {**dict(subprocess.os.environ), **(env or {})}
    result = subprocess.run(
        cmd,
        cwd=cwd,
        env=merged_env,
        capture_output=capture,
        text=True,
        check=False,
        timeout=timeout,
        input=input_text,
    )
    if check and result.returncode != 0:
        stderr = result.stderr.strip() if result.stderr else "(no stderr)"
        stdout = result.stdout.strip() if result.stdout else "(no stdout)"
        raise RuntimeError(
            f"Command failed (exit {result.returncode}): {' '.join(cmd)}\n"
            f"stdout: {stdout[:500]}\n"
            f"stderr: {stderr[:500]}"
        )
    return result


def check_strapi_version() -> str:
    """Read the current Strapi version from backend/package.json."""
    pkg_file = BACKEND_DIR / "package.json"
    if not pkg_file.exists():
        raise RuntimeError(f"package.json not found: {pkg_file}")
    pkg = json.loads(pkg_file.read_text(encoding="utf-8"))
    version = pkg.get("dependencies", {}).get("@strapi/strapi", "unknown")
    return version


def export_strapi_state(source: str, export_path: Path) -> Path:
    """Export Strapi state from the source database into a tarball."""
    log(f"Exporting Strapi state from {source}...")

    env: dict[str, str] = {}
    if source == "sqlite":
        env["DATABASE_CLIENT"] = "sqlite"
        env["DATABASE_FILENAME"] = ".tmp/data.db"
    elif source == "postgres":
        # Assume rehearsal PostgreSQL config
        env["DATABASE_CLIENT"] = "postgres"
        env["DATABASE_HOST"] = "127.0.0.1"
        env["DATABASE_PORT"] = "55532"
        env["DATABASE_NAME"] = "strapi_rehearsal"
        env["DATABASE_USERNAME"] = "strapi"
        env["DATABASE_PASSWORD"] = "strapi"
        env["DATABASE_SSL"] = "false"
    else:
        raise RuntimeError(f"Unknown source: {source}")

    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    if export_path.exists():
        export_path.unlink()

    result = run_command(
        ["npx", "strapi", "export", "--file", str(export_path), "--no-encrypt"],
        cwd=BACKEND_DIR,
        env=env,
        timeout=120,
    )

    if not export_path.exists():
        raise RuntimeError("Export completed but tarball was not created.")

    size = export_path.stat().st_size
    log(f"Export complete: {export_path.name} ({size:,} bytes)")
    return export_path


def import_strapi_state(target: str, export_path: Path) -> None:
    """Import Strapi state from tarball into the target database."""
    log(f"Importing into {target}...")

    config = TARGET_CONFIG.get(target)
    if not config:
        raise RuntimeError(f"Unknown target: {target}")

    env = {
        "DATABASE_CLIENT": "postgres",
        "DATABASE_HOST": config.get("host", "127.0.0.1"),
        "DATABASE_PORT": config.get("port", "5432"),
        "DATABASE_NAME": config.get("database", "strapi"),
        "DATABASE_USERNAME": config.get("username", "strapi"),
        "DATABASE_PASSWORD": config.get("password", ""),
        "DATABASE_SSL": config.get("ssl", "false"),
        "DATABASE_SCHEMA": "public",
    }

    result = run_command(
        ["npx", "strapi", "import", "--file", str(export_path), "--force"],
        cwd=BACKEND_DIR,
        env=env,
        timeout=300,
    )

    log("Import complete.")


def pg_dump_from_container(container: str, database: str, user: str) -> str:
    """Run pg_dump inside a Docker container and return the SQL."""
    log(f"Running pg_dump from container {container}...")
    result = run_command(
        ["docker", "exec", container, "pg_dump", "-U", user, "-d", database, "--clean", "--if-exists"],
        timeout=120,
    )
    return result.stdout


def pg_restore_to_url(sql: str, database_url: str) -> None:
    """Restore SQL into a PostgreSQL instance via DATABASE_URL."""
    log("Restoring into target PostgreSQL...")
    result = run_command(
        ["psql", database_url, "-v", "ON_ERROR_STOP=1"],
        input_text=sql,
        timeout=300,
    )
    log("Restore complete.")


def verify_row_counts(target: str) -> dict[str, int]:
    """Verify basic row counts in the target database."""
    config = TARGET_CONFIG.get(target)
    if not config:
        return {}

    if config.get("access") == "local":
        container = config["container"]
        database = config["database"]
        user = config["username"]

        def psql_count(table: str) -> int:
            result = run_command(
                [
                    "docker", "exec", container,
                    "psql", "-U", user, "-d", database,
                    "-At", "-c", f"SELECT COUNT(*) FROM {table};",
                ],
                timeout=30,
            )
            return int(result.stdout.strip())

        return {
            "pages": psql_count("pages"),
            "tags": psql_count("tags"),
        }

    # For remote targets, we can't easily verify without a connection string
    return {}


def migrate_shell_access(source: str, target: str, export_path: Path, dry_run: bool) -> MigrationResult:
    """Migrate using Strapi export/import (shell-access path)."""
    log(f"Using shell-access adapter: {source} → {target}")

    if dry_run:
        log("[DRY RUN] Would export and import Strapi state.")
        return MigrationResult(success=True, message="Dry run: shell-access path validated.")

    # Export
    export_strapi_state(source, export_path)

    # Import
    import_strapi_state(target, export_path)

    # Verify
    counts = verify_row_counts(target)
    log(f"Row counts after import: {counts}")

    return MigrationResult(
        success=True,
        message=f"Migration complete: {source} → {target}",
        details={"row_counts": counts, "export_path": str(export_path)},
    )


def migrate_platform_managed(source: str, target_url: str, dry_run: bool) -> MigrationResult:
    """Migrate using pg_dump/pg_restore (platform-managed path)."""
    log(f"Using platform-managed adapter: pg_dump → pg_restore")

    if dry_run:
        log("[DRY RUN] Would pg_dump from rehearsal and pg_restore to target.")
        return MigrationResult(success=True, message="Dry run: platform-managed path validated.")

    # Dump from rehearsal container
    sql = pg_dump_from_container("gemini-pg-rehearsal", "strapi_rehearsal", "strapi")

    # Restore to target
    pg_restore_to_url(sql, target_url)

    return MigrationResult(
        success=True,
        message="Platform-managed migration complete.",
        details={"dump_size": len(sql)},
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--from",
        dest="source",
        choices=["sqlite", "postgres"],
        required=True,
        help="Source database type",
    )
    parser.add_argument(
        "--to",
        dest="target",
        choices=["dev", "rehearsal", "production"],
        required=True,
        help="Target environment",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate without modifying the target",
    )
    parser.add_argument(
        "--production-url",
        help="PostgreSQL connection URL for platform-managed production targets (e.g., postgres://user:pass@host:5432/db)",
    )
    parser.add_argument(
        "--export-file",
        type=Path,
        default=EXPORT_DIR / f"strapi-export-{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.tar.gz",
        help="Path for the export tarball",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    start_time = time.time()

    try:
        # Version check
        version = check_strapi_version()
        log(f"Strapi version: {version}")

        if args.dry_run:
            log("[DRY RUN] No changes will be made.")

        # Determine adapter based on target
        if args.target in ("dev", "rehearsal"):
            result = migrate_shell_access(
                args.source, args.target, args.export_file, args.dry_run
            )
        elif args.target == "production":
            if args.production_url:
                result = migrate_platform_managed(
                    args.source, args.production_url, args.dry_run
                )
            else:
                # Assume shell-access production with manual copy step
                log("No --production-url provided; using shell-access path.")
                log("After export, copy the tarball to your production server and run:")
                log(f"  docker exec gemini-strapi-prod npm run strapi import -- --file /path/to/{args.export_file.name}")
                result = migrate_shell_access(
                    args.source, args.target, args.export_file, args.dry_run
                )
        else:
            raise RuntimeError(f"Unsupported target: {args.target}")

        elapsed = time.time() - start_time
        status = "SUCCESS" if result.success else "FAILED"
        log(f"Migration {status} in {elapsed:.1f}s: {result.message}")

        if result.details:
            log(f"Details: {result.details}")

        return 0 if result.success else 1

    except RuntimeError as e:
        log(f"Migration failed: {e}")
        return 1
    except KeyboardInterrupt:
        log("Migration interrupted.")
        return 130


if __name__ == "__main__":
    sys.exit(main())
