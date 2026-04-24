"""Strapi 5 ``uid`` slug rules: ASCII URL-safe only unless schema sets custom ``regex``."""

from __future__ import annotations

import re
from typing import Dict, Iterable, List, Tuple

from unidecode import unidecode

# Matches Strapi entity ``uidValidator`` default (``@strapi/core``).
STRAPI_UID_PATTERN = re.compile(r"^[A-Za-z0-9-_.~]*$")


def modx_alias_is_strapi_uid_safe(alias: str) -> bool:
    """True if ``alias`` can be stored as-is on a Strapi ``uid`` field."""
    if not alias or not str(alias).strip():
        return False
    return STRAPI_UID_PATTERN.fullmatch(alias.strip()) is not None


def _collapse_to_uid_segment(raw: str) -> str:
    """Lowercase, keep only uid-safe chars, collapse separators to single hyphen."""

    s = raw.strip().lower()
    s = re.sub(r"[^a-z0-9-_.~]+", "-", s)
    s = re.sub(r"-{2,}", "-", s).strip("-")
    return s


def transliterate_modx_alias_to_uid_base(alias: str) -> str:
    """
    Deterministic ASCII slug segment from a MODX ``alias`` (may be non-ASCII).

    Empty after sanitization falls back to ``page`` (caller may append ``-modxId``).
    """

    if not alias or not str(alias).strip():
        return "page"
    base = unidecode(str(alias).strip())
    base = _collapse_to_uid_segment(base)
    if not base:
        return "page"
    return base


def strapi_slug_for_modx_alias(alias: str) -> str:
    """MODX ``alias`` -> value safe for Strapi ``uid`` (ASCII only)."""
    if not alias or not str(alias).strip():
        return ""
    a = str(alias).strip()
    if modx_alias_is_strapi_uid_safe(a):
        return a
    return transliterate_modx_alias_to_uid_base(a)


def assign_unique_strapi_slugs_for_locale(
    items: Iterable[Tuple[str, str, str]],
) -> Dict[Tuple[str, str], str]:
    """
    Resolve duplicate transliterated targets within one locale.

    ``items`` yields ``(modx_id, alias, document_id)`` for rows that will receive
    a new slug. Returns map ``(locale_key unused — actually key by document_id)``
    Simpler: input is list of dicts with modx_id, alias, document_id, locale — output document_id -> final slug.

    Actually signature: list of tuples (modx_id, alias, document_id) for ONE locale.
    Returns: document_id -> final unique slug among this batch (does not include existing Strapi slugs).
    """

    rows: List[Tuple[str, str, str]] = [(str(mid), a or "", str(did)) for mid, a, did in items]
    bases: List[Tuple[str, str, str, str]] = []
    for modx_id, alias, doc_id in rows:
        bases.append((modx_id, alias, doc_id, strapi_slug_for_modx_alias(alias)))

    # Group by base slug
    by_base: Dict[str, List[Tuple[str, str, str, str]]] = {}
    for modx_id, alias, doc_id, base in bases:
        by_base.setdefault(base, []).append((modx_id, alias, doc_id, base))

    out: Dict[str, str] = {}
    for base, group in by_base.items():
        if len(group) == 1:
            _, _, doc_id, _ = group[0]
            out[doc_id] = base
            continue
        # Stable: lower modx_id keeps plain base; others suffix -{modx_id}
        sorted_g = sorted(group, key=lambda t: int(t[0]) if t[0].isdigit() else 0)
        _first_modx, _first_alias, first_doc, first_base = sorted_g[0]
        out[first_doc] = first_base
        for modx_id, _alias, doc_id, _b in sorted_g[1:]:
            candidate = f"{base}-{modx_id}"
            out[doc_id] = candidate if STRAPI_UID_PATTERN.fullmatch(candidate) else f"{base}-x{modx_id}"
    return out


def assign_resolved_slugs_for_report_rows(rows: List[dict]) -> None:
    """
    Mutates each row in place: sets ``strapi_slug_ascii`` and
    ``strapi_slug_resolved`` (batch-unique per Strapi locale).
    """

    by_locale: Dict[str, List[Tuple[str, str, str]]] = {}
    for row in rows:
        doc = row.get("document_id")
        loc = row.get("strapi_locale")
        mid = row.get("modx_id")
        alias = (row.get("alias") or row.get("proposed_slug") or "") or ""
        if not doc or not loc or mid is None:
            continue
        if not str(alias).strip():
            continue
        by_locale.setdefault(str(loc), []).append((str(mid), str(alias).strip(), str(doc)))

    resolved_map: Dict[str, str] = {}
    for _loc, items in by_locale.items():
        resolved_map.update(assign_unique_strapi_slugs_for_locale(items))

    for row in rows:
        doc = row.get("document_id")
        alias = (row.get("alias") or row.get("proposed_slug") or "") or ""
        alias_stripped = str(alias).strip()
        if not doc or not alias_stripped:
            row["strapi_slug_ascii"] = strapi_slug_for_modx_alias(alias_stripped) if alias_stripped else None
            row["strapi_slug_resolved"] = None
            row["non_ascii_modx_alias"] = bool(alias_stripped and not modx_alias_is_strapi_uid_safe(alias_stripped))
            continue
        ascii_slug = strapi_slug_for_modx_alias(alias_stripped)
        row["strapi_slug_ascii"] = ascii_slug
        row["strapi_slug_resolved"] = resolved_map.get(str(doc))
        row["non_ascii_modx_alias"] = not modx_alias_is_strapi_uid_safe(alias_stripped)
