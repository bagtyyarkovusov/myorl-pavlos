"""Filesystem helpers shared by CMS audit scripts."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .paths import ROOT


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def load_optional_json(path: Path, default: Any = None) -> Any:
    if not path.exists():
        return {} if default is None else default
    return load_json(path)


def write_json(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
