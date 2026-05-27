#!/usr/bin/env python3
"""Expand search synonym YAML from indexed CMS content (Meilisearch export or Strapi).

Reads page titles, tags, and section labels; generates Greeklish / Latin transliterations
and common English medical aliases; merges with existing hand-curated synonym groups.

Usage:
  python3 tools/expand_search_synonyms.py
  python3 tools/expand_search_synonyms.py --dry-run
  python3 tools/expand_search_synonyms.py --source=strapi --write
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parents[1]
YAML_DIR = ROOT / "frontend" / "src" / "lib" / "search"
DATA_DIR = ROOT / "tools" / "data"
MEILI_EL = DATA_DIR / "search-synonym-source-el.json"
MEILI_RU = DATA_DIR / "search-synonym-source-ru.json"

# ---------------------------------------------------------------------------
# Transliteration
# ---------------------------------------------------------------------------

GREEK_TO_LATIN: dict[str, str] = {
    "α": "a",
    "ά": "a",
    "β": "v",
    "γ": "g",
    "δ": "d",
    "ε": "e",
    "έ": "e",
    "ζ": "z",
    "η": "i",
    "ή": "i",
    "θ": "th",
    "ι": "i",
    "ί": "i",
    "ϊ": "i",
    "ΐ": "i",
    "κ": "k",
    "λ": "l",
    "μ": "m",
    "ν": "n",
    "ξ": "x",
    "ο": "o",
    "ό": "o",
    "π": "p",
    "ρ": "r",
    "σ": "s",
    "ς": "s",
    "τ": "t",
    "υ": "y",
    "ύ": "y",
    "ϋ": "y",
    "ΰ": "y",
    "φ": "f",
    "χ": "ch",
    "ψ": "ps",
    "ω": "o",
    "ώ": "o",
}

CYRILLIC_TO_LATIN: dict[str, str] = {
    "а": "a",
    "б": "b",
    "в": "v",
    "г": "g",
    "д": "d",
    "е": "e",
    "ё": "e",
    "ж": "zh",
    "з": "z",
    "и": "i",
    "й": "y",
    "к": "k",
    "л": "l",
    "м": "m",
    "н": "n",
    "о": "o",
    "п": "p",
    "р": "r",
    "с": "s",
    "т": "t",
    "у": "u",
    "ф": "f",
    "х": "kh",
    "ц": "ts",
    "ч": "ch",
    "ш": "sh",
    "щ": "shch",
    "ъ": "",
    "ы": "y",
    "ь": "",
    "э": "e",
    "ю": "yu",
    "я": "ya",
}

# English / Latin aliases keyed by normalized Greek or Russian substring (lowercase, no accents).
MEDICAL_ALIASES_EL: dict[str, list[str]] = {
    "ρινοπλαστ": ["rhinoplasty", "nose job", "nose surgery"],
    "διαφραγματοπλαστ": [
        "septoplasty",
        "septum surgery",
        "nasal septum surgery",
        "septum operation",
        "deviated septum surgery",
    ],
    "διαφραγμα": ["septum", "nasal septum", "deviated septum", "septum surgery"],
    "σκολιωση ρινικου διαφραγματος": ["septal deviation", "deviated septum", "crooked septum"],
    "στραβο διαφραγμα": ["deviated septum", "crooked septum"],
    "αμυγδαλεκτομ": ["tonsillectomy", "tonsil removal", "tonsils"],
    "αμυγδαλ": ["tonsils", "tonsil"],
    "αδενοτομ": ["adenoidectomy", "adenoids removal", "adenoids"],
    "αδενοειδ": ["adenoids"],
    "θυρεοειδεκτομ": ["thyroidectomy", "thyroid removal"],
    "θυρεοειδ": ["thyroid"],
    "βλεφαροπλαστ": ["blepharoplasty", "eyelid surgery", "eye lift"],
    "ωτοπλαστ": ["otoplasty", "ear surgery", "ear pinning"],
    "ιγμοριτιδ": ["sinusitis", "sinus infection"],
    "ρινιτιδ": ["rhinitis", "runny nose"],
    "αλλεργικη ρινιτιδ": ["allergic rhinitis", "hay fever"],
    "ωτιτιδ": ["otitis", "ear infection"],
    "ιλιγγ": ["vertigo", "dizziness"],
    "εμβο": ["tinnitus", "ringing ears"],
    "ροχαλητ": ["snoring"],
    "απνοι": ["sleep apnea", "apnea"],
    "βαρηκοι": ["hearing loss", "deafness"],
    "πολυποδ": ["nasal polyps", "polyps"],
    "καρκινος στοματος": ["oral cancer", "mouth cancer"],
    "βραγχος φωνης": ["hoarseness", "voice disorder"],
    "βυσμα": ["earwax", "cerumen"],
    "κογχοπλαστ": ["conchoplasty", "turbinoplasty"],
    "λιποαναρροφ": ["liposuction", "lipo"],
    "μεταμοσχευση μαλλιων": ["hair transplant"],
    "μποτοξ": ["botox", "botulinum toxin"],
    "μεσοθεραπ": ["mesotherapy", "microneedling"],
    "facelift": ["facelift", "face lift"],
    "ωτορινολαρυγγολογ": ["ent", "orl", "otolaryngologist"],
    "ενδοσκοπικ": ["endoscopic surgery", "endoscopy"],
    "λαζερ": ["laser"],
    "coblation": ["coblation"],
    "davinci": ["davinci", "robotic surgery"],
    "fess": ["fess", "endoscopic sinus surgery"],
    "dcr": ["dcr", "dacryocystorhinostomy"],
    "hpv": ["hpv", "human papillomavirus"],
    "papilloma": ["papilloma"],
    "κολπικη": ["sinus", "sinusitis"],
    "υπερτροφια ρινικων κογχων": ["turbinates", "concha bullosa", "enlarged turbinates"],
    "τριχοπτωση": ["hair loss"],
    "ρινορροια": ["runny nose", "rhinorrhea"],
    "επιστυμια": ["epistaxis", "nosebleed"],
    "φαρυγγ": ["pharynx", "throat"],
    "λαρυγγ": ["larynx"],
    "στομα": ["mouth", "oral"],
    "γλωσσ": ["tongue"],
    "αυτι": ["ear"],
    "μυτη": ["nose"],
    "λααιμος": ["neck"],
    "προσωπ": ["face", "facial"],
}

MEDICAL_ALIASES_RU: dict[str, list[str]] = {
    "ринопласт": ["rhinoplasty", "nose job", "nose surgery"],
    "септопласт": ["septoplasty", "septum surgery", "nasal septum surgery"],
    "перегород": ["septum", "nasal septum", "deviated septum"],
    "искривлен": ["septal deviation", "deviated septum"],
    "тонзиллэктом": ["tonsillectomy", "tonsil removal"],
    "миндалин": ["tonsils", "tonsil"],
    "аденотом": ["adenoidectomy", "adenoids"],
    "аденоид": ["adenoids"],
    "тиреоидэктом": ["thyroidectomy"],
    "щитовид": ["thyroid"],
    "блефаропласт": ["blepharoplasty", "eyelid surgery"],
    "отопласт": ["otoplasty", "ear surgery"],
    "гайморит": ["sinusitis"],
    "синусит": ["sinusitis", "sinus infection"],
    "ринит": ["rhinitis"],
    "аллергическ": ["allergic rhinitis", "hay fever"],
    "отит": ["otitis", "ear infection"],
    "головокружен": ["vertigo", "dizziness"],
    "шум в ушах": ["tinnitus", "ringing ears"],
    "храп": ["snoring"],
    "апноэ": ["sleep apnea", "apnea"],
    "глухот": ["hearing loss", "deafness"],
    "полип": ["nasal polyps", "polyps"],
    "рак полости рта": ["oral cancer"],
    "охриплост": ["hoarseness"],
    "серная пробка": ["earwax", "cerumen"],
    "конхопласт": ["conchoplasty", "turbinoplasty"],
    "липосакц": ["liposuction", "lipo"],
    "пересадка волос": ["hair transplant"],
    "ботокс": ["botox"],
    "мезотерап": ["mesotherapy"],
    "отоларинголог": ["ent", "orl", "otolaryngologist"],
    "лор": ["ent", "orl"],
    "эндоскоп": ["endoscopic surgery", "endoscopy"],
    "лазер": ["laser"],
    "робот": ["robotic surgery", "davinci"],
    "увуэктом": ["uvulectomy"],
    "полипэктом": ["polypectomy"],
}

SKIP_TITLES = {
    "menu",
    "video",
    "mediterraneo hospital",
    "αμπελόκηποι",
    "κολωνάκι",
    "πειραιάς",
    "thessaloniki",
}

# Generic words that must not trigger cross-group merging (they appear on many pages).
MERGE_STOPWORDS = {
    "αφαιρεση",
    "διορθωση",
    "θεραπεια",
    "χειρουργικη",
    "ενδοσκοπικη",
    "με",
    "και",
    "στα",
    "παιδια",
    "ολες",
    "τεχνικες",
    "удаление",
    "исправление",
    "лечение",
    "операция",
    "хирургия",
    "эндоскопическая",
    "laser",
    "leizer",
    "surgery",
    "treatment",
    "removal",
    "correction",
}

TAG_LABELS_EL: dict[str, list[str]] = {
    "nose": ["μύτη", "ρινός", "nasal"],
    "ear": ["αυτί", "ωτικό", "otology"],
    "throat": ["λαιμός", "φάρυγγας", "pharynx"],
    "larynx": ["λάρυγγας", "larynx"],
    "sinusitis": ["ιγμορίτιδα", "sinusitis", "κολπίτιδα"],
    "tonsils": ["αμυγδαλές", "tonsils"],
    "adenoids": ["αδενοειδή", "adenoids", "κρεατάκια"],
    "thyroid-gland": ["θυρεοειδής", "thyroid"],
    "vertigo": ["ίλιγγος", "vertigo", "ζάλη"],
    "pediatric-orl": ["παιδο-ωρλ", "pediatric ent", "παιδί"],
    "facial-plastic-surgery": ["πλαστική προσώπου", "facial plastic"],
    "endoscopic-surgery": ["ενδοσκοπική", "endoscopic"],
    "procedures": ["επεμβάσεις", "procedures", "χειρουργική"],
}

TAG_LABELS_RU: dict[str, list[str]] = {
    "nose": ["нос", "носовой", "nasal"],
    "ear": ["ухо", "ушной", "otology"],
    "throat": ["горло", "глотка", "pharynx"],
    "larynx": ["гортань", "larynx"],
    "sinusitis": ["синусит", "гайморит", "sinusitis"],
    "tonsils": ["миндалины", "tonsils"],
    "adenoids": ["аденоиды", "adenoids"],
    "thyroid-gland": ["щитовидная", "thyroid"],
    "vertigo": ["головокружение", "vertigo"],
    "pediatric-orl": ["детская лор", "pediatric ent"],
    "facial-plastic-surgery": ["пластика лица", "facial plastic"],
    "endoscopic-surgery": ["эндоскопическая", "endoscopic"],
    "procedures": ["операции", "procedures", "хирургия"],
}


def strip_accents(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text)
    return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")


def greeklish(text: str) -> str:
    out: list[str] = []
    for ch in text.lower():
        if ch in GREEK_TO_LATIN:
            out.append(GREEK_TO_LATIN[ch])
        elif ch.isascii() and (ch.isalnum() or ch.isspace()):
            out.append(ch)
    return re.sub(r"\s+", " ", "".join(out)).strip()


def latinize_cyrillic(text: str) -> str:
    out: list[str] = []
    for ch in text.lower():
        if ch in CYRILLIC_TO_LATIN:
            out.append(CYRILLIC_TO_LATIN[ch])
        elif ch.isascii() and (ch.isalnum() or ch.isspace()):
            out.append(ch)
    return re.sub(r"\s+", " ", "".join(out)).strip()


def normalize_key(text: str) -> str:
    return re.sub(r"\s+", " ", strip_accents(text).lower()).strip()


def slug_to_phrase(slug: str) -> str:
    return slug.replace("-", " ").strip()


def canonical_title(title: str) -> str:
    """Drop hub breadcrumb suffixes like ' - Όλες τεχνικές...'."""
    primary = title.split(" - ")[0].strip()
    primary = re.sub(r"\s*\([^)]+\)\s*$", "", primary).strip()
    return primary


def extract_english_tokens(title: str) -> list[str]:
    """Keep Latin-script tokens from mixed titles (e.g. Neck Lifting, Coblation)."""
    tokens: list[str] = []
    for match in re.finditer(r"[A-Za-z][A-Za-z0-9+./-]*", title):
        token = match.group(0).strip()
        if len(token) >= 3 and token.lower() not in {"and", "the", "with", "for"}:
            tokens.append(token)
            tokens.append(token.lower())
    return tokens


def aliases_for_term(term: str, locale: str) -> list[str]:
    key = normalize_key(term)
    aliases: list[str] = []
    table = MEDICAL_ALIASES_EL if locale == "el" else MEDICAL_ALIASES_RU
    for stem, extras in table.items():
        if stem in key:
            aliases.extend(extras)
    return aliases


def transliterate_term(term: str, locale: str) -> str | None:
    if locale == "el" and re.search(r"[\u0370-\u03ff]", term):
        return greeklish(term)
    if locale == "ru" and re.search(r"[\u0400-\u04ff]", term):
        return latinize_cyrillic(term)
    return None


def build_group_from_phrase(phrase: str, locale: str, *, extra: list[str] | None = None) -> list[str]:
    phrase = phrase.strip()
    if not phrase or len(phrase) < 2:
        return []

    terms: list[str] = [phrase]
    if extra:
        terms.extend(extra)

    translit = transliterate_term(phrase, locale)
    if translit and translit != normalize_key(phrase):
        terms.append(translit)

    no_accent = strip_accents(phrase)
    if no_accent != phrase:
        terms.append(no_accent)

    terms.extend(extract_english_tokens(phrase))
    terms.extend(aliases_for_term(phrase, locale))

    # Dedupe preserving order; drop very short tokens except known abbreviations
    seen: set[str] = set()
    out: list[str] = []
    for term in terms:
        cleaned = term.strip()
        if not cleaned:
            continue
        norm = normalize_key(cleaned)
        if norm in seen:
            continue
        if len(cleaned) < 2 and cleaned.upper() not in {"FESS", "DCR", "ORL", "ENT", "HPV"}:
            continue
        seen.add(norm)
        out.append(cleaned)
    return out if len(out) >= 2 else []


def load_existing_groups(path: Path) -> list[list[str]]:
    if not path.exists():
        return []
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        return []
    groups: list[list[str]] = []
    for group in raw:
        if isinstance(group, list):
            terms = [t for t in group if isinstance(t, str) and t.strip()]
            if len(terms) >= 2:
                groups.append(terms)
    return groups


def dedupe_identical_groups(groups: list[list[str]]) -> list[list[str]]:
    seen: set[tuple[str, ...]] = set()
    out: list[list[str]] = []
    for group in groups:
        key = tuple(sorted(normalize_key(t) for t in group))
        if key in seen:
            continue
        seen.add(key)
        out.append(group)
    return out


def anchor_term(group: list[str]) -> str:
    """Primary term for overlap detection — prefer first Greek/Cyrillic title-like term."""
    for term in group:
        if re.search(r"[\u0370-\u03ff\u0400-\u04ff]", term) and len(term) >= 6:
            return normalize_key(term)
    return normalize_key(group[0])


PROTECTED_ABBREVS = {
    "fess",
    "dcr",
    "orl",
    "ent",
    "hpv",
    "feess",
    "ωρλ",
    "лор",
}


def trim_group(group: list[str], max_size: int = 8) -> list[str]:
    if len(group) <= max_size:
        return group

    protected: list[str] = []
    rest: list[str] = []
    for term in group:
        norm = normalize_key(term)
        if norm in PROTECTED_ABBREVS or term.upper() in {"FESS", "DCR", "ORL", "ENT", "HPV"}:
            protected.append(term)
        else:
            rest.append(term)

    slots = max(max_size - len(protected), 2)
    scored: list[tuple[int, str]] = []
    for term in rest:
        score = 0
        if re.search(r"[\u0370-\u03ff\u0400-\u04ff]", term):
            score += 3
        if term.isascii():
            score += 2
        if len(term) >= 8:
            score += 1
        scored.append((score, term))
    scored.sort(key=lambda x: (-x[0], len(x[1])))
    trimmed = protected + [t for _, t in scored[:slots]]
    return trimmed if len(trimmed) >= 2 else group[:max_size]


def enrich_with_aliases(groups: list[list[str]], locale: str, *, max_size: int = 8) -> list[list[str]]:
    """Add English / Greeklish aliases for every anchor term in each group."""
    enriched: list[list[str]] = []
    for group in groups:
        expanded: list[str] = list(group)
        for term in group:
            expanded.extend(aliases_for_term(term, locale))
            translit = transliterate_term(term, locale)
            if translit:
                expanded.append(translit)
        seen: set[str] = set()
        deduped: list[str] = []
        for term in expanded:
            norm = normalize_key(term)
            if norm in seen:
                continue
            seen.add(norm)
            deduped.append(term.strip())
        if len(deduped) >= 2:
            enriched.append(trim_group(deduped, max_size=max_size))
    return enriched


def integrate_generated(
    curated: list[list[str]],
    generated: list[list[str]],
    *,
    max_size: int = 8,
) -> list[list[str]]:
    """Extend curated groups when anchors match; otherwise add focused new groups."""
    result = [list(g) for g in curated]
    anchor_index: dict[str, int] = {}
    for idx, group in enumerate(result):
        anchor_index[anchor_term(group)] = idx

    for gen in generated:
        gen = trim_group(gen, max_size=max_size)
        if len(gen) < 2:
            continue
        key = anchor_term(gen)
        if key in anchor_index:
            target = result[anchor_index[key]]
            for term in gen:
                if normalize_key(term) not in {normalize_key(t) for t in target}:
                    target.append(term)
            result[anchor_index[key]] = trim_group(target, max_size=max_size)
            continue

        # Substring anchor match (e.g. shared procedure root)
        merged = False
        for existing_key, idx in anchor_index.items():
            if len(key) >= 8 and (key in existing_key or existing_key in key):
                target = result[idx]
                for term in gen:
                    if normalize_key(term) not in {normalize_key(t) for t in target}:
                        target.append(term)
                result[idx] = trim_group(target, max_size=max_size)
                merged = True
                break
        if merged:
            continue

        result.append(gen)
        anchor_index[key] = len(result) - 1

    return result


def load_meili_docs(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def groups_from_docs(docs: list[dict[str, Any]], locale: str) -> list[list[str]]:
    groups: list[list[str]] = []

    for doc in docs:
        title = (doc.get("title") or "").strip()
        if not title or normalize_key(title) in SKIP_TITLES:
            continue

        canon = canonical_title(title)
        group = build_group_from_phrase(canon, locale)
        if group:
            groups.append(group)

        # Parent hub / section label
        section = (doc.get("parentSectionLabel") or "").strip()
        if section and normalize_key(section) not in SKIP_TITLES:
            section_group = build_group_from_phrase(section, locale)
            if section_group:
                groups.append(section_group)

        # Tag slugs
        for tag in doc.get("tags") or []:
            if not isinstance(tag, str):
                continue
            tag_labels = (TAG_LABELS_EL if locale == "el" else TAG_LABELS_RU).get(tag)
            if tag_labels:
                tag_group = build_group_from_phrase(tag_labels[0], locale, extra=tag_labels[1:])
            else:
                tag_group = build_group_from_phrase(slug_to_phrase(tag), locale)
            if tag_group:
                groups.append(tag_group)

    return groups


def count_unique_terms(groups: list[list[str]]) -> int:
    terms: set[str] = set()
    for group in groups:
        for term in group:
            terms.add(normalize_key(term))
    return len(terms)


def format_yaml(groups: list[list[str]], locale: str) -> str:
    lines = [
        "# Auto-expanded from CMS content via tools/expand_search_synonyms.py",
        "# Hand-curated seed groups are preserved; page titles, tags, and medical aliases added.",
        f"# Locale: {locale} — {len(groups)} groups, {count_unique_terms(groups)} unique terms",
        "",
    ]

    # Section hints for humans
    procedures: list[list[str]] = []
    conditions: list[list[str]] = []
    cross: list[list[str]] = []

    for group in groups:
        text = normalize_key(" ".join(group))
        if any(x in text for x in ("orl", "ent", "fess", "dcr", "davinci", "robot")):
            cross.append(group)
        elif any(
            x in text
            for x in (
                "itis",
                "ίτιδ",
                "ит",
                "ρinit",
                "ринит",
                "apno",
                "απνο",
                "апно",
                "tinnitus",
                "εμβο",
                "шум",
                "vertigo",
                "ιλιγ",
                "головокруж",
                "cancer",
                "καρκιν",
                "рак",
            )
        ):
            conditions.append(group)
        else:
            procedures.append(group)

    def emit(section: str, section_groups: list[list[str]]) -> None:
        if not section_groups:
            return
        lines.append(f"# {section}")
        for group in section_groups:
            if len(group) <= 4:
                inner = ", ".join(json.dumps(t, ensure_ascii=False) for t in group)
                lines.append(f"- [{inner}]")
            else:
                lines.append("- [")
                for term in group:
                    lines.append(f'    {json.dumps(term, ensure_ascii=False)},')
                lines[-1] = lines[-1].rstrip(",")
                lines.append("  ]")
        lines.append("")

    emit("Procedures & anatomy", procedures)
    emit("Conditions & symptoms", conditions)
    emit("Cross-locale & abbreviations", cross)

    return "\n".join(lines).rstrip() + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="Expand search synonym YAML from CMS content")
    parser.add_argument("--dry-run", action="store_true", help="Print stats only, do not write files")
    parser.add_argument("--write", action="store_true", help="Write YAML files (default when not dry-run)")
    args = parser.parse_args()
    write = args.write or not args.dry_run

    stats: dict[str, Any] = {}

    for locale in ("el", "ru"):
        existing_path = YAML_DIR / f"synonyms.{locale}.yaml"
        meili_path = MEILI_EL if locale == "el" else MEILI_RU

        # Always rebuild from the committed seed file on first run in a branch;
        # re-read original curated groups from git if we already overwrote — use backup.
        docs = load_meili_docs(meili_path)
        generated = groups_from_docs(docs, locale)

        seed_path = YAML_DIR / f"synonyms.{locale}.seed.yaml"
        existing = load_existing_groups(seed_path if seed_path.exists() else existing_path)

        curated = enrich_with_aliases(existing, locale, max_size=10)
        final = dedupe_identical_groups(integrate_generated(curated, generated, max_size=10))
        # Ensure cross-locale abbreviation groups from seed survive trimming.
        for seed_group in existing:
            labels = {normalize_key(t) for t in seed_group}
            if not (labels & PROTECTED_ABBREVS or labels & {"fess", "dcr"}):
                continue
            expanded = enrich_with_aliases([seed_group], locale, max_size=12)[0]
            key = tuple(sorted(normalize_key(t) for t in expanded))
            existing_keys = {tuple(sorted(normalize_key(t) for t in g)) for g in final}
            if key not in existing_keys:
                final.append(expanded)

        # Sort for stable output: larger groups first, then alphabetically
        final.sort(key=lambda g: (-len(g), normalize_key(g[0])))

        stats[locale] = {
            "docs": len(docs),
            "existing_groups": len(existing),
            "generated_groups": len(generated),
            "final_groups": len(final),
            "unique_terms": count_unique_terms(final),
        }

        if write and not args.dry_run:
            out = format_yaml(final, locale)
            existing_path.write_text(out, encoding="utf-8")
            print(f"Wrote {existing_path} ({stats[locale]['final_groups']} groups, {stats[locale]['unique_terms']} terms)")

    print(json.dumps(stats, indent=2))

    total_terms = stats["el"]["unique_terms"] + stats["ru"]["unique_terms"]
    if total_terms < 400:
        print(
            f"WARNING: {total_terms} total unique terms across locales — re-export Meilisearch after full reindex for more coverage.",
            file=sys.stderr,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
