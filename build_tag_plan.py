"""Build ``tag_plan.json`` from ``tag_mapping.yaml``.

The canonical/russian-only split drives Phase 4 of the importer: each
canonical entry becomes ONE Tag document with el+ru locale versions, each
russian_only entry becomes a standalone ru-only Tag.

Invariants (enforced here and re-used by the readiness audit):
- Each slug is unique across both sections.
- Each source tag value (canonical labels, russian-only labels, and every
  alias) maps to at most one slug.
- Every distinct tag value observed in ``transformed_resources.json``
  resolves to exactly one slug. Unresolved values are a hard error.
"""

from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parent
MAPPING_PATH = ROOT / "tag_mapping.yaml"
TRANSFORMED_PATH = ROOT / "transformed_resources.json"
OUTPUT_PATH = ROOT / "tag_plan.json"


def _collect_variants(entry: dict[str, Any], ctx: str) -> list[str]:
    primary = entry.get(ctx)
    aliases = entry.get(f"aliases_{ctx}") or []
    values: list[str] = []
    if primary:
        values.append(primary)
    values.extend(str(a) for a in aliases if a)
    return values


def _index_source_tags() -> dict[str, Counter]:
    with TRANSFORMED_PATH.open("r", encoding="utf-8") as handle:
        resources = json.load(handle)
    counts = {"web": Counter(), "rus": Counter()}
    for resource in resources:
        ctx = resource.get("context_key")
        if ctx not in counts:
            continue
        raw = (resource.get("template_variables") or {}).get("tags")
        if not isinstance(raw, str):
            continue
        for value in (item.strip() for item in raw.split(",")):
            if value:
                counts[ctx][value] += 1
    return counts


def build_plan() -> dict[str, Any]:
    with MAPPING_PATH.open("r", encoding="utf-8") as handle:
        mapping = yaml.safe_load(handle) or {}

    canonical = mapping.get("canonical_tags") or []
    russian_only = mapping.get("russian_only_tags") or []

    slugs: set[str] = set()
    el_lookup: dict[str, str] = {}
    ru_lookup: dict[str, str] = {}

    for entry in canonical:
        slug = entry.get("slug")
        if not slug:
            raise SystemExit(f"canonical_tags entry missing slug: {entry}")
        if slug in slugs:
            raise SystemExit(f"duplicate slug {slug!r} in tag_mapping.yaml")
        slugs.add(slug)
        for value in _collect_variants(entry, "el"):
            if value in el_lookup and el_lookup[value] != slug:
                raise SystemExit(
                    f"el value {value!r} maps to both {el_lookup[value]!r} and {slug!r}"
                )
            el_lookup[value] = slug
        for value in _collect_variants(entry, "ru"):
            if value in ru_lookup and ru_lookup[value] != slug:
                raise SystemExit(
                    f"ru value {value!r} maps to both {ru_lookup[value]!r} and {slug!r}"
                )
            ru_lookup[value] = slug

    for entry in russian_only:
        slug = entry.get("slug")
        if not slug:
            raise SystemExit(f"russian_only_tags entry missing slug: {entry}")
        if slug in slugs:
            raise SystemExit(f"duplicate slug {slug!r} in tag_mapping.yaml")
        slugs.add(slug)
        for value in _collect_variants(entry, "ru"):
            if value in ru_lookup and ru_lookup[value] != slug:
                raise SystemExit(
                    f"ru value {value!r} maps to both {ru_lookup[value]!r} and {slug!r}"
                )
            ru_lookup[value] = slug

    source_counts = _index_source_tags()
    unresolved = {
        "web": sorted(value for value in source_counts["web"] if value not in el_lookup),
        "rus": sorted(value for value in source_counts["rus"] if value not in ru_lookup),
    }
    if unresolved["web"] or unresolved["rus"]:
        raise SystemExit(
            "Unresolved tags in source data:\n"
            f"  el: {unresolved['web']}\n"
            f"  ru: {unresolved['rus']}\n"
            "Edit tag_mapping.yaml aliases or add new entries to cover these."
        )

    plan: dict[str, Any] = {
        "canonical": [
            {
                "slug": entry["slug"],
                "el": entry.get("el"),
                "ru": entry.get("ru"),
                "aliases_el": entry.get("aliases_el") or [],
                "aliases_ru": entry.get("aliases_ru") or [],
            }
            for entry in canonical
        ],
        "russian_only": [
            {
                "slug": entry["slug"],
                "ru": entry.get("ru"),
                "aliases_ru": entry.get("aliases_ru") or [],
            }
            for entry in russian_only
        ],
        "resolution": {
            "el": {value: slug for value, slug in sorted(el_lookup.items())},
            "ru": {value: slug for value, slug in sorted(ru_lookup.items())},
        },
        "source_counts": {
            "el": dict(source_counts["web"]),
            "ru": dict(source_counts["rus"]),
        },
    }
    return plan


def main() -> int:
    plan = build_plan()
    with OUTPUT_PATH.open("w", encoding="utf-8") as handle:
        json.dump(plan, handle, ensure_ascii=False, indent=2)
    print(
        f"tag_plan.json written: {len(plan['canonical'])} canonical, "
        f"{len(plan['russian_only'])} russian-only, "
        f"{len(plan['resolution']['el'])} el lookups, "
        f"{len(plan['resolution']['ru'])} ru lookups"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
