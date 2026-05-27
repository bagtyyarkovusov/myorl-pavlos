#!/usr/bin/env python3
"""Upsert or verify the Strapi webhook that calls the Next.js search reindex route.

The reindex API accepts either:
  - ``Authorization: Bearer <STRAPI_WEBHOOK_SECRET>`` (Strapi webhooks — static header), or
  - ``x-webhook-signature: <hmac-sha256-hex>`` (``tools/seed_search_index.py`` — per-body HMAC).

Both sides must use the same ``STRAPI_WEBHOOK_SECRET`` value (see docs/runbooks/search-reindex.md).
"""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
import subprocess
from pathlib import Path
from typing import Any

from cms_audit import DEFAULT_SQLITE_DB_PATH, ROOT

WEBHOOK_NAME = "Next.js search reindex"
WEBHOOK_EVENTS = [
    "entry.create",
    "entry.update",
    "entry.delete",
    "entry.publish",
    "entry.unpublish",
]


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def webhook_url(explicit_url: str | None) -> str:
    if explicit_url:
        return explicit_url
    site_url = os.environ.get("NEXT_PUBLIC_SITE_URL", "http://localhost:3000").rstrip("/")
    return f"{site_url}/api/search/reindex"


def webhook_headers(secret: str) -> str:
    return json.dumps({"Authorization": f"Bearer {secret}"}, ensure_ascii=False)


def expected_payload(url: str, secret: str) -> dict[str, Any]:
    return {
        "name": WEBHOOK_NAME,
        "url": url,
        "headers": webhook_headers(secret),
        "events": json.dumps(WEBHOOK_EVENTS, ensure_ascii=False),
        "enabled": 1,
    }


def upsert_sqlite(db_path: Path, payload: dict[str, Any]) -> None:
    connection = sqlite3.connect(db_path)
    try:
        existing = connection.execute(
            "SELECT id FROM strapi_webhooks WHERE name = ?",
            (payload["name"],),
        ).fetchone()
        if existing:
            connection.execute(
                """
                UPDATE strapi_webhooks
                SET url = ?, headers = ?, events = ?, enabled = ?
                WHERE id = ?
                """,
                (
                    payload["url"],
                    payload["headers"],
                    payload["events"],
                    payload["enabled"],
                    existing[0],
                ),
            )
        else:
            connection.execute(
                """
                INSERT INTO strapi_webhooks (name, url, headers, events, enabled)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    payload["name"],
                    payload["url"],
                    payload["headers"],
                    payload["events"],
                    payload["enabled"],
                ),
            )
        connection.commit()
    finally:
        connection.close()


def verify_sqlite(db_path: Path, payload: dict[str, Any]) -> list[str]:
    connection = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    try:
        row = connection.execute(
            "SELECT url, headers, events, enabled FROM strapi_webhooks WHERE name = ?",
            (payload["name"],),
        ).fetchone()
    finally:
        connection.close()

    if not row:
        return [f"webhook {payload['name']!r} is missing"]

    failures: list[str] = []
    if row[0] != payload["url"]:
        failures.append(f"url is {row[0]!r}, expected {payload['url']!r}")
    if json.loads(row[1] or "{}") != json.loads(payload["headers"]):
        failures.append("headers do not match expected Authorization bearer secret")
    if sorted(json.loads(row[2] or "[]")) != sorted(WEBHOOK_EVENTS):
        failures.append("events do not match expected search reindex events")
    if int(row[3] or 0) != 1:
        failures.append("webhook is not enabled")
    return failures


def sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def upsert_postgres(database_url: str, payload: dict[str, Any]) -> None:
    sql = f"""
    DELETE FROM strapi_webhooks WHERE name = {sql_literal(payload['name'])};
    INSERT INTO strapi_webhooks (name, url, headers, events, enabled)
    VALUES (
      {sql_literal(payload['name'])},
      {sql_literal(payload['url'])},
      {sql_literal(payload['headers'])}::json,
      {sql_literal(payload['events'])}::json,
      true
    );
    """
    subprocess.run(
        ["psql", database_url, "-v", "ON_ERROR_STOP=1", "-c", sql],
        check=True,
        text=True,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=DEFAULT_SQLITE_DB_PATH)
    parser.add_argument("--database-url", help="PostgreSQL DATABASE_URL; uses psql when set.")
    parser.add_argument(
        "--url",
        help="Full webhook URL. Defaults to NEXT_PUBLIC_SITE_URL/api/search/reindex.",
    )
    parser.add_argument("--secret", help="Bearer secret. Defaults to STRAPI_WEBHOOK_SECRET.")
    parser.add_argument("--verify-only", action="store_true")
    return parser.parse_args()


def main() -> int:
    load_env_file(ROOT / ".env")
    load_env_file(ROOT / "frontend" / ".env.local")
    args = parse_args()
    secret = args.secret or os.environ.get("STRAPI_WEBHOOK_SECRET")
    if not secret:
        print("[FAIL] STRAPI_WEBHOOK_SECRET is required")
        print("  Set it in frontend/.env.local or pass --secret")
        print("  Dev Compose default: dev-search-webhook-secret")
        return 1

    payload = expected_payload(webhook_url(args.url), secret)
    if args.database_url:
        if args.verify_only:
            print("[FAIL] --verify-only is only supported for SQLite")
            return 1
        upsert_postgres(args.database_url, payload)
        print("[PASS] strapi-search-webhook-upsert: PostgreSQL")
        return 0

    if not args.verify_only:
        upsert_sqlite(args.db, payload)
    failures = verify_sqlite(args.db, payload)
    if failures:
        print("[FAIL] strapi-search-webhook")
        for failure in failures:
            print(f"  - {failure}")
        return 1

    print(f"[PASS] strapi-search-webhook: {payload['url']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
