"""Canonical repository paths for migration and audit tooling."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DATA_DIR = ROOT / "data"
SOURCE_DIR = DATA_DIR / "source"
MODX_SOURCE_DIR = SOURCE_DIR / "modx"
CHECKPOINT_SOURCE_DIR = SOURCE_DIR / "checkpoints"
MANIFESTS_DIR = DATA_DIR / "manifests"

ARTIFACTS_DIR = ROOT / "artifacts"
REPORTS_DIR = ARTIFACTS_DIR / "reports"
LEGACY_REPORTS_DIR = REPORTS_DIR / "legacy"

MIGRATION_DOCS_DIR = ROOT / "docs" / "migration"
