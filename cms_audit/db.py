"""SQLite helpers for read-only Strapi audit scripts."""

from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Any

from .io import ROOT

DEFAULT_SQLITE_DB_PATH = ROOT / "backend" / ".tmp" / "data.db"


def connect_readonly(db_path: Path = DEFAULT_SQLITE_DB_PATH) -> sqlite3.Connection:
    """Open a read-only SQLite connection with row access by column name."""

    uri = f"file:{db_path.resolve()}?mode=ro"
    connection = sqlite3.connect(uri, uri=True)
    connection.row_factory = sqlite3.Row
    return connection


def scalar(connection: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> int:
    """Return the first column of the first row as an integer count."""

    row = connection.execute(sql, params).fetchone()
    if row is None:
        return 0
    return int(row[0] or 0)
