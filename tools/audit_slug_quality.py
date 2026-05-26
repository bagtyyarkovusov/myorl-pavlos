"""Audit Strapi page slugs for surgical-fix quality issues.

Flags slugs matching at least one of five criteria:
1. Demonstrably broken (typos — consonant-only segments, repeated chars)
2. Duplicates (exact) or near-duplicates (dash-normalized collision)
3. Numeric collision suffix from MODX (-2, -copy, -test, -1)
4. Locale mismatch (Cyrillic in EL, Greek in RU)
5. Garbage (single-char, special chars, all-numeric)
"""

from __future__ import annotations

import argparse
import re
import sys
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from cms_audit import DEFAULT_SQLITE_DB_PATH, REPORTS_DIR, connect_readonly

OUTPUT_PATH = REPORTS_DIR / "slug-quality-audit.md"

# ---------------------------------------------------------------------------
# Compiled regex patterns
# ---------------------------------------------------------------------------

# MODX collision suffixes: -2, -copy, -test, -1, -0 (1-3 digit numeric)
_collision_suffix_re = re.compile(r"-(?:copy|test|\d{1,3})$", re.IGNORECASE)

# Cyrillic Unicode block (U+0400–U+04FF) + supplementary (U+0500–U+052F)
_cyrillic_re = re.compile(r"[Ѐ-ӿԀ-ԯ]")

# Greek Unicode block (U+0370–U+03FF) + extended (U+1F00–U+1FFF)
_greek_re = re.compile(r"[Ͱ-Ͽἀ-῿]")

# Consonant-only word segment: 5+ consonants, no vowels
_consonant_only_re = re.compile(r"^[bcdfghjklmnpqrstvwxyz]{4,}$", re.IGNORECASE)

# Repeated character run: 3+ of the same alphabetic character
_repeated_char_re = re.compile(r"([a-zA-Z])\1{2,}")

# Non-UID-safe characters in slug (beyond the Strapi uid set)
_non_uid_re = re.compile(r"[^A-Za-z0-9\-_.~]")

# All-numeric slug
_all_numeric_re = re.compile(r"^\d+$")

KEEP_GOOD_SUFFIX = {"2024", "2025", "2026"}


# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------


@dataclass
class SlugFinding:
    locale: str
    slug: str
    document_id: str
    title: str
    criterion: str
    detail: str
    proposed_slug: str = ""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def levenshtein(a: str, b: str) -> int:
    """Levenshtein edit distance between two strings."""
    if len(a) < len(b):
        return levenshtein(b, a)
    if len(b) == 0:
        return len(a)

    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a):
        curr = [i + 1]
        for j, cb in enumerate(b):
            curr.append(
                min(
                    curr[j] + 1,  # insertion
                    prev[j + 1] + 1,  # deletion
                    prev[j] + (0 if ca == cb else 1),  # substitution
                )
            )
        prev = curr
    return prev[-1]


def normalize_for_comparison(slug: str) -> str:
    """Remove all separators and lowercase for near-duplicate comparison."""
    return re.sub(r"[-_.~]+", "", slug).lower()


def _slug_words(slug: str) -> list[str]:
    """Split a slug into word segments on common separators."""
    return [w for w in re.split(r"[-_.~]+", slug) if w]


# ---------------------------------------------------------------------------
# Criterion 1: Broken typos
# ---------------------------------------------------------------------------

# Common English words that might appear in Greek/transliterated slugs
_VALID_ENGLISH_WORDS = {
    "lift", "face", "brow", "neck", "hair", "scar", "ear", "nose",
    "laser", "thread", "botox", "skin", "oral", "sleep", "apnea",
    "test", "copy", "page", "blog", "news", "post", "home", "about",
    "contact", "service", "price", "faq", "team",
}


def flag_broken_typos(pages: list[tuple[str, str, str, str]]) -> list[SlugFinding]:
    """Flag slugs with demonstrably broken segments (typos)."""
    findings: list[SlugFinding] = []
    flagged_slugs: set[tuple[str, str]] = set()

    for locale, slug, doc_id, title in pages:
        if not slug:
            continue
        words = _slug_words(slug)
        for word in words:
            # Skip known valid words and numbers
            if word.lower() in _VALID_ENGLISH_WORDS or word.isdigit():
                continue
            # Flag consonant-only segments of 5+ chars (likely typo)
            if _consonant_only_re.search(word):
                findings.append(
                    SlugFinding(
                        locale=locale,
                        slug=slug,
                        document_id=doc_id,
                        title=title,
                        criterion="typo",
                        detail=f'consonant-only segment "{word}" (no vowels)',
                    )
                )
                flagged_slugs.add((locale, slug))
                break
            # Flag runs of 3+ repeated chars
            if _repeated_char_re.search(word):
                findings.append(
                    SlugFinding(
                        locale=locale,
                        slug=slug,
                        document_id=doc_id,
                        title=title,
                        criterion="typo",
                        detail=f'repeated character run in segment "{word}"',
                    )
                )
                flagged_slugs.add((locale, slug))
                break

    # Cross-slug comparison: flag sibling pairs with Levenshtein distance ≤ 2
    by_locale: dict[str, list[tuple[str, str, str, str]]] = defaultdict(list)
    for page in pages:
        if page[1]:
            by_locale[page[0]].append(page)

    for locale, locale_pages in by_locale.items():
        for i in range(len(locale_pages)):
            for j in range(i + 1, len(locale_pages)):
                a_loc, a_slug, a_doc, a_title = locale_pages[i]
                b_loc, b_slug, b_doc, b_title = locale_pages[j]
                dist = levenshtein(a_slug.lower(), b_slug.lower())
                if dist == 0:
                    continue  # exact duplicate — handled by criterion 2
                if dist > 2:
                    continue
                if (a_loc, a_slug) not in flagged_slugs:
                    findings.append(
                        SlugFinding(
                            locale=a_loc,
                            slug=a_slug,
                            document_id=a_doc,
                            title=a_title,
                            criterion="typo",
                            detail=f"Levenshtein distance {dist} from sibling slug \"{b_slug}\"",
                        )
                    )
                    flagged_slugs.add((a_loc, a_slug))
                if (b_loc, b_slug) not in flagged_slugs:
                    findings.append(
                        SlugFinding(
                            locale=b_loc,
                            slug=b_slug,
                            document_id=b_doc,
                            title=b_title,
                            criterion="typo",
                            detail=f"Levenshtein distance {dist} from sibling slug \"{a_slug}\"",
                        )
                    )
                    flagged_slugs.add((b_loc, b_slug))

    return findings


# ---------------------------------------------------------------------------
# Criterion 2: Duplicates and near-duplicates
# ---------------------------------------------------------------------------


def flag_duplicates(pages: list[tuple[str, str, str, str]]) -> list[SlugFinding]:
    """Flag exact-duplicate slugs within the same locale."""
    findings: list[SlugFinding] = []
    by_locale_slug: dict[tuple[str, str], list[tuple[str, str, str, str]]] = defaultdict(list)

    for locale, slug, doc_id, title in pages:
        if not slug:
            continue
        by_locale_slug[(locale, slug.lower())].append((locale, slug, doc_id, title))

    for (locale, slug_key), group in by_locale_slug.items():
        if len(group) > 1:
            for loc, slug, doc_id, title in group:
                findings.append(
                    SlugFinding(
                        locale=loc,
                        slug=slug,
                        document_id=doc_id,
                        title=title,
                        criterion="duplicate",
                        detail=f"slug appears {len(group)} times in locale {loc}",
                    )
                )

    return findings


def flag_near_duplicates(pages: list[tuple[str, str, str, str]]) -> list[SlugFinding]:
    """Flag near-duplicate slugs (same after dash-normalization) within the same locale."""
    findings: list[SlugFinding] = []
    by_group: dict[tuple[str, str], list[tuple[str, str, str, str]]] = defaultdict(list)

    for locale, slug, doc_id, title in pages:
        if not slug:
            continue
        key = (locale, normalize_for_comparison(slug))
        by_group[key].append((locale, slug, doc_id, title))

    for (locale, _norm), group in by_group.items():
        if len(group) > 1:
            unique_slugs = set(slug for _, slug, _, _ in group)
            if len(unique_slugs) <= 1:
                continue  # all the same slug — handled by flag_duplicates

            # Propose the shortest variant (usually the canonical form)
            sorted_slugs = sorted(unique_slugs, key=lambda s: (len(s), s))
            proposed = sorted_slugs[0]

            for loc, slug, doc_id, title in group:
                detail_slugs = ", ".join(sorted(unique_slugs))
                findings.append(
                    SlugFinding(
                        locale=loc,
                        slug=slug,
                        document_id=doc_id,
                        title=title,
                        criterion="near-duplicate",
                        detail=f"normalizes to same value with: {detail_slugs}",
                        proposed_slug=proposed if slug != proposed else "",
                    )
                )

    return findings


# ---------------------------------------------------------------------------
# Criterion 3: Numeric collision suffix
# ---------------------------------------------------------------------------


def flag_collision_suffixes(pages: list[tuple[str, str, str, str]]) -> list[SlugFinding]:
    """Flag slugs with MODX collision suffixes where the base slug also exists."""
    findings: list[SlugFinding] = []
    all_slugs: set[str] = set()  # slug (all locales)
    locale_slug_set: set[tuple[str, str]] = set()  # (locale, slug)

    for locale, slug, _doc_id, _title in pages:
        if slug:
            all_slugs.add(slug.lower())
            locale_slug_set.add((locale, slug.lower()))

    for locale, slug, doc_id, title in pages:
        if not slug:
            continue
        m = _collision_suffix_re.search(slug.lower())
        if not m:
            continue
        suffix = m.group()
        # Skip known non-collision suffixes like years
        if suffix.lstrip("-") in KEEP_GOOD_SUFFIX:
            continue
        base = slug.lower()[: m.start()]
        if not base:
            continue
        if base in all_slugs or (locale, base) in locale_slug_set:
            findings.append(
                SlugFinding(
                    locale=locale,
                    slug=slug,
                    document_id=doc_id,
                    title=title,
                    criterion="collision-suffix",
                    detail=f'has suffix "{m.group()}" and base slug "{base}" exists',
                    proposed_slug=base,
                )
            )

    return findings


# ---------------------------------------------------------------------------
# Criterion 4: Locale mismatch
# ---------------------------------------------------------------------------


def flag_locale_mismatch(pages: list[tuple[str, str, str, str]]) -> list[SlugFinding]:
    """Flag Cyrillic text in EL slugs and Greek text in RU slugs."""
    findings: list[SlugFinding] = []

    for locale, slug, doc_id, title in pages:
        if not slug:
            continue
        if locale == "el" and _cyrillic_re.search(slug):
            findings.append(
                SlugFinding(
                    locale=locale,
                    slug=slug,
                    document_id=doc_id,
                    title=title,
                    criterion="locale-mismatch",
                    detail=f"Cyrillic characters found in el-locale slug",
                )
            )
        elif locale == "ru" and _greek_re.search(slug):
            findings.append(
                SlugFinding(
                    locale=locale,
                    slug=slug,
                    document_id=doc_id,
                    title=title,
                    criterion="locale-mismatch",
                    detail=f"Greek characters found in ru-locale slug",
                )
            )

    return findings


# ---------------------------------------------------------------------------
# Criterion 5: Garbage
# ---------------------------------------------------------------------------


def flag_garbage(pages: list[tuple[str, str, str, str]]) -> list[SlugFinding]:
    """Flag slugs with garbage content: single chars, special chars, all-numeric."""
    findings: list[SlugFinding] = []

    for locale, slug, doc_id, title in pages:
        if not slug:
            continue

        # Single character
        if len(slug) == 1:
            findings.append(
                SlugFinding(
                    locale=locale,
                    slug=slug,
                    document_id=doc_id,
                    title=title,
                    criterion="garbage",
                    detail="single character",
                )
            )
            continue

        # Two or fewer alphanumeric chars (non-word)
        alpha_only = re.sub(r"[^a-zA-Z]", "", slug)
        if len(alpha_only) <= 2 and len(slug) <= 3:
            findings.append(
                SlugFinding(
                    locale=locale,
                    slug=slug,
                    document_id=doc_id,
                    title=title,
                    criterion="garbage",
                    detail=f"too short ({len(slug)} chars, only {len(alpha_only)} letters)",
                )
            )
            continue

        # Contains ? or , or other non-UID-safe chars
        if _non_uid_re.search(slug):
            findings.append(
                SlugFinding(
                    locale=locale,
                    slug=slug,
                    document_id=doc_id,
                    title=title,
                    criterion="garbage",
                    detail="contains invalid character for URL slug",
                )
            )
            continue

        # All-numeric
        if _all_numeric_re.search(slug):
            findings.append(
                SlugFinding(
                    locale=locale,
                    slug=slug,
                    document_id=doc_id,
                    title=title,
                    criterion="garbage",
                    detail="all-numeric slug",
                )
            )
            continue

        # Starts or ends with separator
        if slug[0] in "-_.~" or slug[-1] in "-_.~":
            findings.append(
                SlugFinding(
                    locale=locale,
                    slug=slug,
                    document_id=doc_id,
                    title=title,
                    criterion="garbage",
                    detail=f'{"starts" if slug[0] in "-_.~" else "ends"} with separator',
                )
            )
            continue

    return findings


# ---------------------------------------------------------------------------
# Fetch pages
# ---------------------------------------------------------------------------


def fetch_pages(connection: Any) -> list[tuple[str, str, str, str]]:
    """Return list of (locale, slug, document_id, title) for published pages."""
    rows = connection.execute(
        """
        SELECT locale, slug, document_id, title
        FROM pages
        WHERE published_at IS NOT NULL
          AND slug IS NOT NULL
          AND TRIM(slug) != ''
        ORDER BY locale, slug
        """
    ).fetchall()
    return [(str(row["locale"]), str(row["slug"]), str(row["document_id"]), str(row["title"] or "")) for row in rows]


# ---------------------------------------------------------------------------
# Report builder
# ---------------------------------------------------------------------------


def _md_link(slug: str, locale: str) -> str:
    return f"`{locale}:{slug}`"


def build_report(pages: list[tuple[str, str, str, str]]) -> tuple[str, list[SlugFinding]]:
    """Return (markdown_report, all_findings)."""
    criteria: list[tuple[str, str, Any]] = [
        ("criterion-1-broken-typos", "typo", flag_broken_typos),
        ("criterion-2-duplicates", "duplicate", flag_duplicates),
        ("criterion-2b-near-duplicates", "near-duplicate", flag_near_duplicates),
        ("criterion-3-collision-suffixes", "collision-suffix", flag_collision_suffixes),
        ("criterion-4-locale-mismatch", "locale-mismatch", flag_locale_mismatch),
        ("criterion-5-garbage", "garbage", flag_garbage),
    ]

    all_findings: list[SlugFinding] = []
    sections: list[str] = []

    total = len(pages)
    sections.append("# Slug Quality Audit\n")
    sections.append(f"**{total} published pages** audited.\n")

    for anchor, _criterion_key, check_fn in criteria:
        findings = check_fn(pages)
        all_findings.extend(findings)
        if not findings:
            sections.append(f"## {anchor}\n\n_No issues found._\n")
            continue

        sections.append(f"## {anchor} ({len(findings)})\n")
        for f in findings:
            line = f"- {_md_link(f.slug, f.locale)} — {f.detail}"
            if f.title:
                line += f" (title: \"{f.title}\")"
            if f.proposed_slug:
                line += f"\n  Proposed: `{f.locale}:{f.proposed_slug}`"
            sections.append(line)
        sections.append("")

    by_criterion: dict[str, int] = defaultdict(int)
    for f in all_findings:
        by_criterion[f.criterion] += 1

    summary_lines = [
        "## Summary\n",
        "| Criterion | Flagged |",
        "|---|---|",
    ]
    for anchor, criterion_key, _check_fn in criteria:
        label = anchor.replace("criterion-", "").replace("-", " ")
        count = by_criterion.get(criterion_key, 0)
        summary_lines.append(f"| {label} | {count} |")

    summary_lines.append(f"| **Total flagged** | **{len(all_findings)}** |")
    summary_lines.append("")

    sections.insert(1, "\n".join(summary_lines))
    sections.insert(2, "")

    return "\n".join(sections), all_findings


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--db",
        default=str(DEFAULT_SQLITE_DB_PATH),
        help="Path to Strapi SQLite database",
    )
    parser.add_argument(
        "--output",
        default=str(OUTPUT_PATH),
        help="Path for the markdown report",
    )
    parser.add_argument(
        "--stdout",
        action="store_true",
        help="Print report to stdout instead of writing to file",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    db_path = Path(args.db)

    if not db_path.exists():
        print(f"Error: database not found at {db_path}", file=sys.stderr)
        return 1

    connection = connect_readonly(db_path)
    pages = fetch_pages(connection)

    if not pages:
        print("No published pages with slugs found.", file=sys.stderr)
        return 0

    report_md, findings = build_report(pages)

    if args.stdout:
        print(report_md)
    else:
        output = Path(args.output)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(report_md, encoding="utf-8")
        print(f"Report written to {output} ({len(findings)} findings)", file=sys.stderr)

    return 0


if __name__ == "__main__":
    sys.exit(main())
