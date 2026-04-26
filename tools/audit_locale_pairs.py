#!/usr/bin/env python3
"""Locale pairing audit for the MODX -> Strapi migration.

For each page on either side (Greek `web` or Russian `rus`) that is not
part of a self-consistent Babel pair, this script proposes the most
likely translation partner using deterministic signals:

  * exact alias match
  * alias token overlap (Jaccard) and Levenshtein distance
  * shared `image` / `imageCenter` / `featuredImage` path
  * shared asset references inside `content`
  * parent lineage alignment (using already-valid strict pairs)
  * same template and parent sub-tree
  * title latinization token overlap (handles Russian Cyrillic aliases)

Output:
  * console summary
  * `locale_pair_audit.md` with three buckets:
      1. Auto-link (single high-confidence candidate, score >= AUTO)
      2. Review (one or more plausible candidates, score >= REVIEW)
      3. Truly unlocalized (no credible candidate)
  * `locale_pair_audit.json` for machine consumption by the importer
"""

from __future__ import annotations

import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

from cms_audit import (
    CHECKPOINT_SOURCE_DIR,
    MANIFESTS_DIR,
    MIGRATION_DOCS_DIR,
    MODX_SOURCE_DIR,
    REPORTS_DIR,
    ROOT,
)
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
RESOURCES_PATH = MODX_SOURCE_DIR / "transformed_resources.json"
REPORT_MD_PATH = MIGRATION_DOCS_DIR / "locale_pair_audit.md"
REPORT_JSON_PATH = MANIFESTS_DIR / "locale_pair_audit.json"

AUTO_LINK_THRESHOLD = 70
REVIEW_THRESHOLD = 25
MAX_CANDIDATES = 5

ASSET_REGEX = re.compile(
    r"(?:files|assets|uploads)/[\w\-/\.]+\.(?:jpg|jpeg|png|webp|gif|mp4|webm|pdf|svg)",
    flags=re.IGNORECASE,
)
TOKEN_SPLIT = re.compile(r"[^a-z0-9]+")

CYRILLIC_LATIN_MAP = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "yo",
    "ж": "zh", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m",
    "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
    "ф": "f", "х": "h", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sch",
    "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
}
GREEK_LATIN_MAP = {
    "α": "a", "β": "v", "γ": "g", "δ": "d", "ε": "e", "ζ": "z", "η": "i",
    "θ": "th", "ι": "i", "κ": "k", "λ": "l", "μ": "m", "ν": "n", "ξ": "x",
    "ο": "o", "π": "p", "ρ": "r", "σ": "s", "ς": "s", "τ": "t", "υ": "y",
    "φ": "f", "χ": "x", "ψ": "ps", "ω": "o",
}


def load_resources() -> list[dict[str, Any]]:
    """Load the transformed MODX resources."""

    with RESOURCES_PATH.open("r", encoding="utf-8") as file_handle:
        return json.load(file_handle)


def parse_babel(resource: dict[str, Any]) -> dict[str, int]:
    """Parse a Babel TV string into a context->id map."""

    raw = (resource.get("template_variables") or {}).get("babelLanguageLinks") or ""
    links: dict[str, int] = {}
    if not isinstance(raw, str):
        return links
    for part in raw.split(";"):
        if ":" not in part:
            continue
        context_key, resource_id = part.split(":", 1)
        if resource_id.isdigit():
            links[context_key.strip()] = int(resource_id)
    return links


def transliterate(text: str) -> str:
    """Transliterate Greek and Cyrillic text into a lowercase latin string."""

    lowered = (text or "").lower()
    buffer: list[str] = []
    for character in lowered:
        if character in CYRILLIC_LATIN_MAP:
            buffer.append(CYRILLIC_LATIN_MAP[character])
        elif character in GREEK_LATIN_MAP:
            buffer.append(GREEK_LATIN_MAP[character])
        else:
            normalized = unicodedata.normalize("NFKD", character)
            stripped = "".join(ch for ch in normalized if not unicodedata.combining(ch))
            buffer.append(stripped)
    return "".join(buffer)


def tokenize(text: str) -> set[str]:
    """Tokenize a latin string into a set of meaningful tokens."""

    if not text:
        return set()
    latinized = transliterate(text)
    tokens = {token for token in TOKEN_SPLIT.split(latinized) if len(token) >= 3}
    return tokens


def alias_tokens(alias: str) -> set[str]:
    """Return tokens for an alias, removing locale suffixes."""

    cleaned = re.sub(r"-(ru|en|gr|el)(?:-\d+)?$", "", alias or "")
    cleaned = re.sub(r"-(v-athinah|afini)$", "", cleaned)
    cleaned = re.sub(r"-\d+$", "", cleaned)
    return tokenize(cleaned)


def jaccard(left: set[str], right: set[str]) -> float:
    """Return the Jaccard similarity of two token sets."""

    if not left and not right:
        return 0.0
    intersection = left & right
    union = left | right
    if not union:
        return 0.0
    return len(intersection) / len(union)


def levenshtein(left: str, right: str) -> int:
    """Compute the Levenshtein distance between two short strings."""

    if left == right:
        return 0
    if not left:
        return len(right)
    if not right:
        return len(left)

    previous_row = list(range(len(right) + 1))
    for i, left_char in enumerate(left, start=1):
        current_row = [i]
        for j, right_char in enumerate(right, start=1):
            insertions = previous_row[j] + 1
            deletions = current_row[j - 1] + 1
            substitutions = previous_row[j - 1] + (left_char != right_char)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    return previous_row[-1]


def extract_assets(resource: dict[str, Any]) -> set[str]:
    """Extract asset path references from image TVs and rich-text content."""

    tvs = resource.get("template_variables") or {}
    assets: set[str] = set()

    for field_name in ("image", "imageCenter", "featuredImage", "imageVideo"):
        value = tvs.get(field_name)
        if isinstance(value, str) and value:
            assets.add(value.lower())

    content = resource.get("content") or ""
    for match in ASSET_REGEX.findall(content):
        assets.add(match.lower())

    intro = resource.get("introtext") or ""
    for match in ASSET_REGEX.findall(intro):
        assets.add(match.lower())

    return assets


def build_strict_pairs(resources: list[dict[str, Any]]) -> tuple[dict[int, int], dict[int, int]]:
    """Build the forward (web->rus) and reverse (rus->web) strict pair maps."""

    by_id = {resource["id"]: resource for resource in resources}
    forward: dict[int, int] = {}

    for resource in resources:
        if resource.get("context_key") != "web":
            continue
        links = parse_babel(resource)
        web_id = links.get("web")
        rus_id = links.get("rus")
        if web_id != resource["id"]:
            continue
        if rus_id is None:
            continue
        target = by_id.get(rus_id)
        if target is None or target.get("context_key") != "rus":
            continue
        forward[resource["id"]] = rus_id

    reverse = {rus_id: web_id for web_id, rus_id in forward.items()}
    return forward, reverse


def classify_orphans(resources: list[dict[str, Any]]) -> dict[str, Any]:
    """Classify every page by its current localization state."""

    by_id = {resource["id"]: resource for resource in resources}
    forward, reverse = build_strict_pairs(resources)

    web_pages = [r for r in resources if r.get("context_key") == "web"]
    rus_pages = [r for r in resources if r.get("context_key") == "rus"]

    orphan_web: list[dict[str, Any]] = []
    orphan_rus: list[dict[str, Any]] = []
    broken_web: list[dict[str, Any]] = []
    broken_rus: list[dict[str, Any]] = []

    for resource in web_pages:
        if resource["id"] in forward:
            continue
        links = parse_babel(resource)
        rus_target = links.get("rus")
        if rus_target and rus_target not in by_id:
            broken_web.append({"resource": resource, "missing_rus_id": rus_target, "links": links})
        elif rus_target and by_id.get(rus_target, {}).get("context_key") != "rus":
            broken_web.append({"resource": resource, "missing_rus_id": rus_target, "links": links, "reason": "wrong context"})
        else:
            orphan_web.append(resource)

    for resource in rus_pages:
        if resource["id"] in reverse:
            continue
        links = parse_babel(resource)
        web_target = links.get("web")
        if web_target and web_target not in by_id:
            broken_rus.append({"resource": resource, "missing_web_id": web_target, "links": links})
        elif web_target and by_id.get(web_target, {}).get("context_key") != "web":
            broken_rus.append({"resource": resource, "missing_web_id": web_target, "links": links, "reason": "wrong context"})
        else:
            orphan_rus.append(resource)

    return {
        "by_id": by_id,
        "forward": forward,
        "reverse": reverse,
        "orphan_web": orphan_web,
        "orphan_rus": orphan_rus,
        "broken_web": broken_web,
        "broken_rus": broken_rus,
    }


def score_candidate(
    source: dict[str, Any],
    candidate: dict[str, Any],
    forward: dict[int, int],
    by_id: dict[int, dict[str, Any]],
) -> tuple[int, list[str], int]:
    """Score a candidate translation partner against a source page.

    Returns a `(score, reasons, content_evidence)` tuple.
    `content_evidence` tracks signals that actually prove the two rows talk
    about the same thing (alias overlap, shared assets, title overlap) so
    structural signals (template, parent lineage) cannot carry a candidate
    into the review bucket on their own.
    """

    score = 0
    reasons: list[str] = []
    content_evidence = 0

    source_alias = (source.get("alias") or "").lower()
    candidate_alias = (candidate.get("alias") or "").lower()

    if source_alias and candidate_alias:
        if source_alias == candidate_alias:
            score += 60
            content_evidence += 60
            reasons.append("alias exact match")
        else:
            source_tokens = alias_tokens(source_alias)
            candidate_tokens = alias_tokens(candidate_alias)
            overlap = jaccard(source_tokens, candidate_tokens)
            if overlap >= 0.8:
                score += 45
                content_evidence += 45
                reasons.append(f"alias tokens nearly identical ({overlap:.2f})")
            elif overlap >= 0.5:
                score += 25
                content_evidence += 25
                reasons.append(f"alias tokens overlap ({overlap:.2f})")
            elif overlap >= 0.25:
                score += 10
                content_evidence += 10
                reasons.append(f"alias tokens partially overlap ({overlap:.2f})")

            distance = levenshtein(source_alias, candidate_alias)
            max_length = max(len(source_alias), len(candidate_alias), 1)
            if distance <= max(2, max_length // 5):
                score += 10
                content_evidence += 10
                reasons.append(f"alias Levenshtein {distance}")

    source_assets = extract_assets(source)
    candidate_assets = extract_assets(candidate)
    shared_assets = source_assets & candidate_assets
    if shared_assets:
        bonus = min(40, 15 + 10 * len(shared_assets))
        score += bonus
        content_evidence += bonus
        reasons.append(f"shared asset paths: {sorted(shared_assets)[:3]}")

    if source.get("template") == candidate.get("template"):
        score += 5
        reasons.append("same template")

    source_parent = source.get("parent")
    candidate_parent = candidate.get("parent")
    if source_parent and candidate_parent:
        if source.get("context_key") == "web":
            expected_candidate_parent = forward.get(source_parent)
        else:
            expected_candidate_parent = {v: k for k, v in forward.items()}.get(source_parent)
        if expected_candidate_parent and expected_candidate_parent == candidate_parent:
            score += 20
            reasons.append("parent is in a known strict pair")
        else:
            source_parent_alias = (by_id.get(source_parent, {}).get("alias") or "").lower()
            candidate_parent_alias = (by_id.get(candidate_parent, {}).get("alias") or "").lower()
            if source_parent_alias and source_parent_alias == candidate_parent_alias:
                score += 10
                reasons.append("parent alias matches")

    source_title_tokens = tokenize(source.get("pagetitle") or "")
    candidate_title_tokens = tokenize(candidate.get("pagetitle") or "")
    title_overlap = jaccard(source_title_tokens, candidate_title_tokens)
    if title_overlap >= 0.5:
        score += 15
        content_evidence += 15
        reasons.append(f"title token overlap ({title_overlap:.2f})")
    elif title_overlap >= 0.25:
        score += 6
        content_evidence += 6
        reasons.append(f"title token partial overlap ({title_overlap:.2f})")

    source_longtitle_tokens = tokenize(source.get("longtitle") or "")
    candidate_longtitle_tokens = tokenize(candidate.get("longtitle") or "")
    longtitle_overlap = jaccard(source_longtitle_tokens, candidate_longtitle_tokens)
    if longtitle_overlap >= 0.5:
        score += 8
        content_evidence += 8
        reasons.append(f"longtitle token overlap ({longtitle_overlap:.2f})")

    return score, reasons, content_evidence


def rank_candidates(
    source: dict[str, Any],
    pool: list[dict[str, Any]],
    forward: dict[int, int],
    by_id: dict[int, dict[str, Any]],
) -> list[dict[str, Any]]:
    """Rank candidate matches for a single source page."""

    scored: list[dict[str, Any]] = []
    for candidate in pool:
        score, reasons, content_evidence = score_candidate(source, candidate, forward, by_id)
        if content_evidence <= 0:
            continue
        scored.append({
            "candidate_id": candidate["id"],
            "candidate_alias": candidate.get("alias"),
            "candidate_title": candidate.get("pagetitle"),
            "candidate_parent": candidate.get("parent"),
            "candidate_template": candidate.get("template"),
            "score": score,
            "content_evidence": content_evidence,
            "reasons": reasons,
        })
    scored.sort(key=lambda item: (item["score"], item["content_evidence"]), reverse=True)
    return scored[:MAX_CANDIDATES]


def bucket_result(top_score: int, has_single_clear_winner: bool) -> str:
    """Classify a match result into auto / review / truly_unlocalized buckets."""

    if top_score == 0:
        return "truly_unlocalized"
    if top_score >= AUTO_LINK_THRESHOLD and has_single_clear_winner:
        return "auto_link"
    if top_score >= REVIEW_THRESHOLD:
        return "review"
    return "truly_unlocalized"


def build_proposals(classified: dict[str, Any]) -> dict[str, Any]:
    """Generate ranked translation proposals for both orphan sides."""

    by_id = classified["by_id"]
    forward = classified["forward"]

    rus_orphan_pool = list(classified["orphan_rus"])
    web_orphan_pool = list(classified["orphan_web"])

    web_proposals: list[dict[str, Any]] = []
    for source in classified["orphan_web"]:
        candidates = rank_candidates(source, rus_orphan_pool, forward, by_id)
        top_score = candidates[0]["score"] if candidates else 0
        has_single_clear_winner = (
            len(candidates) >= 1
            and (len(candidates) == 1 or candidates[0]["score"] - candidates[1]["score"] >= 15)
        )
        web_proposals.append({
            "source_id": source["id"],
            "source_alias": source.get("alias"),
            "source_title": source.get("pagetitle"),
            "source_parent": source.get("parent"),
            "source_template": source.get("template"),
            "current_babel": parse_babel(source),
            "candidates": candidates,
            "bucket": bucket_result(top_score, has_single_clear_winner),
        })

    rus_proposals: list[dict[str, Any]] = []
    for source in classified["orphan_rus"]:
        candidates = rank_candidates(source, web_orphan_pool, forward, by_id)
        top_score = candidates[0]["score"] if candidates else 0
        has_single_clear_winner = (
            len(candidates) >= 1
            and (len(candidates) == 1 or candidates[0]["score"] - candidates[1]["score"] >= 15)
        )
        rus_proposals.append({
            "source_id": source["id"],
            "source_alias": source.get("alias"),
            "source_title": source.get("pagetitle"),
            "source_parent": source.get("parent"),
            "source_template": source.get("template"),
            "current_babel": parse_babel(source),
            "candidates": candidates,
            "bucket": bucket_result(top_score, has_single_clear_winner),
        })

    return {"web_proposals": web_proposals, "rus_proposals": rus_proposals}


def cross_validate(proposals: dict[str, Any]) -> dict[str, Any]:
    """Keep only mutual top-1 matches as auto-linkable.

    A proposal is auto-linkable only if:
      * Greek orphan G's #1 candidate is Russian orphan R, and
      * Russian orphan R's #1 candidate is Greek orphan G.
    Otherwise it drops to `review` to avoid unsafe auto-attachment.
    """

    rus_top_for = {
        p["source_id"]: p["candidates"][0]["candidate_id"]
        for p in proposals["rus_proposals"]
        if p["candidates"]
    }

    for web_proposal in proposals["web_proposals"]:
        if web_proposal["bucket"] != "auto_link":
            continue
        top_candidate_id = web_proposal["candidates"][0]["candidate_id"]
        reciprocal = rus_top_for.get(top_candidate_id)
        if reciprocal != web_proposal["source_id"]:
            web_proposal["bucket"] = "review"
            web_proposal.setdefault("notes", []).append(
                "Russian top-1 does not reciprocate; manual confirmation required."
            )

    web_top_for = {
        p["source_id"]: p["candidates"][0]["candidate_id"]
        for p in proposals["web_proposals"]
        if p["candidates"]
    }

    for rus_proposal in proposals["rus_proposals"]:
        if rus_proposal["bucket"] != "auto_link":
            continue
        top_candidate_id = rus_proposal["candidates"][0]["candidate_id"]
        reciprocal = web_top_for.get(top_candidate_id)
        if reciprocal != rus_proposal["source_id"]:
            rus_proposal["bucket"] = "review"
            rus_proposal.setdefault("notes", []).append(
                "Greek top-1 does not reciprocate; manual confirmation required."
            )

    return proposals


def format_babel(value: dict[str, int]) -> str:
    """Format a Babel link dict for markdown display."""

    if not value:
        return "—"
    return "; ".join(f"{k}:{v}" for k, v in sorted(value.items()))


def detect_ambiguities(proposals: dict[str, Any]) -> list[dict[str, Any]]:
    """Find cross-collisions where two orphans compete for the same partner."""

    ambiguities: list[dict[str, Any]] = []

    for side_key, source_label, target_label in (
        ("web_proposals", "Greek (web)", "Russian (rus)"),
        ("rus_proposals", "Russian (rus)", "Greek (web)"),
    ):
        claimed: dict[int, list[int]] = defaultdict(list)
        for proposal in proposals[side_key]:
            if not proposal["candidates"]:
                continue
            if proposal["bucket"] == "truly_unlocalized":
                continue
            top_candidate_id = proposal["candidates"][0]["candidate_id"]
            claimed[top_candidate_id].append(proposal["source_id"])

        for target_id, claimants in claimed.items():
            if len(claimants) >= 2:
                ambiguities.append({
                    "side": source_label,
                    "target": f"{target_label} {target_id}",
                    "claimants": sorted(claimants),
                })

    return ambiguities


def render_markdown(classified: dict[str, Any], proposals: dict[str, Any]) -> str:
    """Render the audit report as Markdown."""

    by_id = classified["by_id"]
    lines: list[str] = []
    lines.append("# Locale Pair Audit")
    lines.append("")
    lines.append(
        "Deterministic audit for the MODX -> Strapi migration. Starts from "
        "`transformed_resources.json` and `full_ready_check.py` strict-pair "
        "output, then evaluates every unlinked page for a likely translation "
        "partner before injection."
    )
    lines.append("")
    lines.append("## Summary")
    lines.append("")
    lines.append(f"- Strict self-consistent pairs: **{len(classified['forward'])}**")
    lines.append(f"- Greek pages without a strict partner: **{len(classified['orphan_web']) + len(classified['broken_web'])}**")
    lines.append(f"  - Pointing to a missing Russian id: **{len(classified['broken_web'])}**")
    lines.append(f"  - Truly unlinked candidates: **{len(classified['orphan_web'])}**")
    lines.append(f"- Russian pages without a strict partner: **{len(classified['orphan_rus']) + len(classified['broken_rus'])}**")
    lines.append(f"  - Pointing to a missing Greek id: **{len(classified['broken_rus'])}**")
    lines.append(f"  - Truly unlinked candidates: **{len(classified['orphan_rus'])}**")

    web_auto = sum(1 for p in proposals["web_proposals"] if p["bucket"] == "auto_link")
    web_review = sum(1 for p in proposals["web_proposals"] if p["bucket"] == "review")
    web_true = sum(1 for p in proposals["web_proposals"] if p["bucket"] == "truly_unlocalized")
    rus_auto = sum(1 for p in proposals["rus_proposals"] if p["bucket"] == "auto_link")
    rus_review = sum(1 for p in proposals["rus_proposals"] if p["bucket"] == "review")
    rus_true = sum(1 for p in proposals["rus_proposals"] if p["bucket"] == "truly_unlocalized")

    lines.append("")
    lines.append("### Proposal buckets")
    lines.append("")
    lines.append("| Side | Auto-link | Needs review | Truly unlocalized |")
    lines.append("| --- | ---: | ---: | ---: |")
    lines.append(f"| Greek (web) orphans | {web_auto} | {web_review} | {web_true} |")
    lines.append(f"| Russian (rus) orphans | {rus_auto} | {rus_review} | {rus_true} |")

    ambiguities = detect_ambiguities(proposals)
    lines.append("")
    lines.append("### Cross-collisions (ambiguities)")
    lines.append("")
    if ambiguities:
        lines.append(
            "Two or more orphans picked the same partner as their top-1 "
            "candidate. These must be resolved before any auto-linking."
        )
        lines.append("")
        lines.append("| Side | Target | Claimants |")
        lines.append("| --- | --- | --- |")
        for ambiguity in ambiguities:
            claimants_text = ", ".join(str(claimant) for claimant in ambiguity["claimants"])
            lines.append(f"| {ambiguity['side']} | {ambiguity['target']} | {claimants_text} |")
    else:
        lines.append("_None detected._")

    lines.append("")
    lines.append("## Broken Babel references")
    lines.append("")
    lines.append(
        "Rows that already claim a translation partner in the opposite "
        "context, but whose target id does not exist in the dataset. These "
        "are almost certainly mis-linked, not truly orphan, and the rewrite "
        "should overwrite the dead id with a live candidate from this audit."
    )
    lines.append("")

    lines.append("### Greek rows pointing at missing Russian ids")
    lines.append("")
    if classified["broken_web"]:
        lines.append("| web id | alias | title | dead rus target | current babel |")
        lines.append("| ---: | --- | --- | ---: | --- |")
        for entry in sorted(classified["broken_web"], key=lambda item: item["resource"]["id"]):
            resource = entry["resource"]
            lines.append(
                f"| {resource['id']} | `{resource.get('alias')}` | "
                f"{resource.get('pagetitle')} | {entry['missing_rus_id']} | "
                f"{format_babel(entry['links'])} |"
            )
    else:
        lines.append("_None_")
    lines.append("")

    lines.append("### Russian rows pointing at missing Greek ids")
    lines.append("")
    if classified["broken_rus"]:
        lines.append("| rus id | alias | title | dead web target | current babel |")
        lines.append("| ---: | --- | --- | ---: | --- |")
        for entry in sorted(classified["broken_rus"], key=lambda item: item["resource"]["id"]):
            resource = entry["resource"]
            lines.append(
                f"| {resource['id']} | `{resource.get('alias')}` | "
                f"{resource.get('pagetitle')} | {entry['missing_web_id']} | "
                f"{format_babel(entry['links'])} |"
            )
    else:
        lines.append("_None_")
    lines.append("")

    def render_proposal_section(title: str, items: list[dict[str, Any]], source_label: str, target_label: str) -> None:
        lines.append(f"## {title}")
        lines.append("")
        if not items:
            lines.append("_None_")
            lines.append("")
            return
        for bucket_name, heading in (
            ("auto_link", "Auto-linkable (reciprocal top-1, score ≥ {0})".format(AUTO_LINK_THRESHOLD)),
            ("review", "Needs human review (score ≥ {0})".format(REVIEW_THRESHOLD)),
            ("truly_unlocalized", "Truly unlocalized (no credible candidate)"),
        ):
            bucket_items = [item for item in items if item["bucket"] == bucket_name]
            if not bucket_items:
                continue
            lines.append(f"### {heading}")
            lines.append("")
            for item in sorted(bucket_items, key=lambda entry: entry["source_id"]):
                header = (
                    f"- **{source_label} {item['source_id']}** "
                    f"`{item['source_alias']}` — {item['source_title']} "
                    f"(parent {item['source_parent']}, tpl {item['source_template']}, "
                    f"current babel: {format_babel(item['current_babel'])})"
                )
                lines.append(header)
                if not item["candidates"]:
                    lines.append(f"  - No {target_label} candidate in the current dataset.")
                    lines.append("")
                    continue
                for rank, candidate in enumerate(item["candidates"], start=1):
                    reasons = "; ".join(candidate["reasons"]) or "no reasons"
                    lines.append(
                        f"  {rank}. {target_label} **{candidate['candidate_id']}** "
                        f"`{candidate['candidate_alias']}` "
                        f"— {candidate['candidate_title']} "
                        f"(parent {candidate['candidate_parent']}, tpl {candidate['candidate_template']}) "
                        f"— score **{candidate['score']}** — {reasons}"
                    )
                if item.get("notes"):
                    for note in item["notes"]:
                        lines.append(f"  - _note_: {note}")
                lines.append("")

    render_proposal_section(
        "Greek orphans with proposed Russian partners",
        proposals["web_proposals"],
        "web",
        "rus",
    )
    render_proposal_section(
        "Russian orphans with proposed Greek partners",
        proposals["rus_proposals"],
        "rus",
        "web",
    )

    lines.append("## How to use this audit")
    lines.append("")
    lines.append(
        "1. Treat every row in **Broken Babel references** as a mis-link. "
        "The importer must **not** honor those dead ids; instead consult "
        "the per-row candidate below to pick the real partner."
    )
    lines.append(
        "2. **Auto-linkable** entries can be adopted by the importer without "
        "manual input: both sides reciprocate each other as top-1 and the "
        "top score is above the auto threshold (signals usually include an "
        "exact alias, a shared image path, or both)."
    )
    lines.append(
        "3. **Needs review** requires human confirmation before it becomes a "
        "locale link. Check the candidate list, pick the right one, and "
        "record the decision back into the Babel normalization table."
    )
    lines.append(
        "4. **Truly unlocalized** rows are safe to import as standalone "
        "locale documents (no `documentId` attachment)."
    )
    lines.append(
        "5. Re-run this script after editing Babel TVs in MODX (or an "
        "equivalent normalization table) to confirm the orphan list shrinks."
    )
    lines.append("")

    return "\n".join(lines) + "\n"


def write_reports(classified: dict[str, Any], proposals: dict[str, Any]) -> None:
    """Serialize both the JSON and Markdown reports to disk."""

    markdown = render_markdown(classified, proposals)
    REPORT_MD_PATH.write_text(markdown, encoding="utf-8")

    serializable = {
        "strict_pairs": [
            {"web": web_id, "rus": rus_id}
            for web_id, rus_id in sorted(classified["forward"].items())
        ],
        "broken_web": [
            {
                "id": entry["resource"]["id"],
                "alias": entry["resource"].get("alias"),
                "title": entry["resource"].get("pagetitle"),
                "dead_rus_id": entry["missing_rus_id"],
                "current_babel": entry["links"],
            }
            for entry in classified["broken_web"]
        ],
        "broken_rus": [
            {
                "id": entry["resource"]["id"],
                "alias": entry["resource"].get("alias"),
                "title": entry["resource"].get("pagetitle"),
                "dead_web_id": entry["missing_web_id"],
                "current_babel": entry["links"],
            }
            for entry in classified["broken_rus"]
        ],
        "web_proposals": proposals["web_proposals"],
        "rus_proposals": proposals["rus_proposals"],
    }
    REPORT_JSON_PATH.write_text(
        json.dumps(serializable, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def print_summary(classified: dict[str, Any], proposals: dict[str, Any]) -> None:
    """Print a compact console summary."""

    print("=== Locale Pair Audit Summary ===")
    print(f"Strict pairs:                 {len(classified['forward'])}")
    print(f"Greek orphans (candidates):   {len(classified['orphan_web'])}")
    print(f"Greek rows with dead Babel:   {len(classified['broken_web'])}")
    print(f"Russian orphans (candidates): {len(classified['orphan_rus'])}")
    print(f"Russian rows with dead Babel: {len(classified['broken_rus'])}")

    for side_key, label in (("web_proposals", "Greek"), ("rus_proposals", "Russian")):
        auto = sum(1 for p in proposals[side_key] if p["bucket"] == "auto_link")
        review = sum(1 for p in proposals[side_key] if p["bucket"] == "review")
        true_orphan = sum(1 for p in proposals[side_key] if p["bucket"] == "truly_unlocalized")
        print(f"{label:>8} proposals -> auto={auto} review={review} truly_unlocalized={true_orphan}")

    print(f"\nMarkdown report: {REPORT_MD_PATH}")
    print(f"JSON report:     {REPORT_JSON_PATH}")


def main() -> None:
    """Run the full audit and emit reports."""

    resources = load_resources()

    # Expand the orphan pools to include every row that is not part of a
    # strict pair, so that rows carrying a dead Babel reference can still
    # compete for a fresh, valid partner in the audit.
    classified = classify_orphans(resources)
    extended_orphan_web = classified["orphan_web"] + [
        entry["resource"] for entry in classified["broken_web"]
    ]
    extended_orphan_rus = classified["orphan_rus"] + [
        entry["resource"] for entry in classified["broken_rus"]
    ]
    classified["orphan_web"] = extended_orphan_web
    classified["orphan_rus"] = extended_orphan_rus

    proposals = build_proposals(classified)
    proposals = cross_validate(proposals)

    write_reports(classified, proposals)
    print_summary(classified, proposals)


if __name__ == "__main__":
    main()
