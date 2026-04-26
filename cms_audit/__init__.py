"""Shared helpers for CMS readiness audits and migration scripts."""

from .db import DEFAULT_SQLITE_DB_PATH, connect_readonly, scalar
from .io import ROOT, load_json, load_optional_json, write_json
from .paths import (
    ARTIFACTS_DIR,
    CHECKPOINT_SOURCE_DIR,
    DATA_DIR,
    LEGACY_REPORTS_DIR,
    MANIFESTS_DIR,
    MIGRATION_DOCS_DIR,
    MODX_SOURCE_DIR,
    REPORTS_DIR,
    SOURCE_DIR,
)

__all__ = [
    "ARTIFACTS_DIR",
    "CHECKPOINT_SOURCE_DIR",
    "DATA_DIR",
    "DEFAULT_SQLITE_DB_PATH",
    "LEGACY_REPORTS_DIR",
    "MANIFESTS_DIR",
    "MIGRATION_DOCS_DIR",
    "MODX_SOURCE_DIR",
    "REPORTS_DIR",
    "ROOT",
    "SOURCE_DIR",
    "connect_readonly",
    "load_json",
    "load_optional_json",
    "scalar",
    "write_json",
]
