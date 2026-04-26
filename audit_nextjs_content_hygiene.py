#!/usr/bin/env python3
"""Compatibility wrapper for tools/audit_nextjs_content_hygiene.py."""

from __future__ import annotations

import runpy
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TOOLS = ROOT / "tools"

sys.path.insert(0, str(TOOLS))
sys.path.insert(0, str(ROOT))

runpy.run_path(str(TOOLS / "audit_nextjs_content_hygiene.py"), run_name="__main__")
