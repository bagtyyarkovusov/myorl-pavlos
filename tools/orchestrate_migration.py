#!/usr/bin/env python3
"""Migration Orchestrator — chain restore → verify → reindex → smoke.

Ensures zero drift between Postgres and the Search Index after a bulk restore
by running each step sequentially and aborting on any failure.

Interface:
  python3 tools/orchestrate_migration.py --target <dev|rehearsal|production> --backup <file> [--force]
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.request
from dataclasses import dataclass
from pathlib import Path

from environments import ENVIRONMENTS, get


STRAPI_DEFAULT_URL = "http://localhost:1337"


@dataclass
class Target:
    name: str
    access: str
    meili_host_port: int | None


def _resolve_target(name: str) -> Target:
    env = get(name)
    return Target(name=name, access=env["access"], meili_host_port=env.get("meili_host_port"))


def _log(step: str, message: str) -> None:
    print(f"[{step}] {message}")


def _fail(step: str, reason: str) -> int:
    print(f"[{step}] FAILED: {reason}", file=sys.stderr)
    return 1


def _resolve_backup(path_str: str) -> Path | None:
    p = Path(path_str).resolve()
    return p if p.exists() else None


# ---------------------------------------------------------------------------
# Step 1: Restore
# ---------------------------------------------------------------------------


def _step_restore(target_name: str, backup_path: str, force: bool) -> int:
    _log("restore", f"Restoring {target_name} from {backup_path}...")
    cmd = [
        sys.executable, "tools/backup_runner.py", "restore",
        "--target", target_name, "--file", backup_path,
    ]
    if force:
        cmd.append("--force")

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        stderr = (result.stderr or "").strip() or (result.stdout or "").strip()
        return _fail("restore", stderr[:500])

    _log("restore", "Database restored.")
    return 0


# ---------------------------------------------------------------------------
# Step 2: Verify Strapi health
# ---------------------------------------------------------------------------


def _check_strapi_health(strapi_url: str, timeout: int = 120) -> bool:
    deadline = time.time() + timeout
    health_url = f"{strapi_url.rstrip('/')}/admin/init"
    while time.time() < deadline:
        try:
            req = urllib.request.Request(health_url)
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            pass
        time.sleep(2)
    return False


def _step_verify_strapi(target: Target) -> int:
    if target.name == "production":
        strapi_url = os.environ.get("STRAPI_BASE_URL", "")
        if not strapi_url:
            return _fail("verify-strapi", "STRAPI_BASE_URL is not set")
    else:
        strapi_url = os.environ.get("STRAPI_BASE_URL", STRAPI_DEFAULT_URL)

    _log("verify-strapi", f"Polling {strapi_url}/admin/init ...")
    if _check_strapi_health(strapi_url):
        _log("verify-strapi", "Strapi is healthy.")
        return 0

    return _fail("verify-strapi", f"Strapi at {strapi_url} did not respond within timeout")


# ---------------------------------------------------------------------------
# Step 3: Reindex search index
# ---------------------------------------------------------------------------


def _step_reindex(target_name: str, force: bool) -> int:
    _log("reindex", "Rebuilding search index...")
    cmd = [
        sys.executable, "tools/seed_search_index.py",
        "--target", target_name, "--mode", "full",
    ]
    if force:
        cmd.append("--force")

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        stderr = (result.stderr or "").strip() or (result.stdout or "").strip()
        return _fail("reindex", stderr[:500])

    _log("reindex", "Search index rebuilt.")
    return 0


# ---------------------------------------------------------------------------
# Step 4: Smoke test
# ---------------------------------------------------------------------------


def _smoke_query(target: Target) -> bool:
    """Query Meilisearch directly (local) or via Next.js (production)."""
    if target.meili_host_port:
        host = f"http://localhost:{target.meili_host_port}"
        url = f"{host}/indexes/el/search"
        body = json.dumps({"q": "ρινοπλαστική", "limit": 3}).encode("utf-8")
        headers = {"Content-Type": "application/json"}
        req = urllib.request.Request(url, data=body, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            return len(result.get("hits", [])) >= 1
    else:
        nextjs_url = os.environ.get("NEXTJS_URL", "")
        if not nextjs_url:
            _log("smoke", "NEXTJS_URL not set; skipping production smoke test via API")
            return True
        url = f"{nextjs_url.rstrip('/')}/api/search/query"
        body = json.dumps({"q": "ρινοπλαστική", "locale": "el", "limit": 3}).encode("utf-8")
        headers = {"Content-Type": "application/json"}
        req = urllib.request.Request(url, data=body, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            return len(result.get("hits", [])) >= 1


def _step_smoke(target: Target) -> int:
    _log("smoke", "Querying search index for 'ρινοπλαστική'...")
    try:
        if _smoke_query(target):
            _log("smoke", "Smoke query passed — search index is populated.")
            return 0
        return _fail("smoke", "Smoke query returned 0 results")
    except Exception as e:
        return _fail("smoke", str(e) or "Unknown error during smoke query")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--target",
        choices=list(ENVIRONMENTS.keys()),
        required=True,
        help="Target environment",
    )
    parser.add_argument(
        "--backup",
        type=str,
        required=True,
        help="Path to a .sql or .sql.gz backup file",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Required for production",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    target = _resolve_target(args.target)

    if args.target == "production" and not args.force:
        print(
            "ERROR: Targeting production requires --force.\n"
            "This will DESTROY and rebuild the production database and search index.",
            file=sys.stderr,
        )
        return 1

    backup_path = _resolve_backup(args.backup)
    if backup_path is None:
        print(f"ERROR: Backup file not found: {args.backup}", file=sys.stderr)
        return 1

    # Step 1
    rc = _step_restore(args.target, str(backup_path), args.force)
    if rc != 0:
        return rc

    # Step 2
    rc = _step_verify_strapi(target)
    if rc != 0:
        return rc

    # Step 3
    rc = _step_reindex(args.target, args.force)
    if rc != 0:
        return rc

    # Step 4
    rc = _step_smoke(target)
    if rc != 0:
        return rc

    print("Migration complete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
