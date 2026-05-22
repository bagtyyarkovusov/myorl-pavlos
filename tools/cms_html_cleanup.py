"""Shared CMS HTML cleanup helpers for migration and repair scripts."""

from __future__ import annotations

import re
import warnings
from typing import Any

from bs4 import BeautifulSoup, MarkupResemblesLocatorWarning, NavigableString

_BROKEN_IMG_SRC_RE = re.compile(
    r"""
    ^\s*$
    |^file:
    |msohtmlclip
    """,
    re.IGNORECASE | re.VERBOSE,
)


_BROKEN_IMG_TAG_RE = re.compile(
    r"""
    <img\b[^>]*\bsrc\s*=\s*["']
    (?:
        \s*
      | file:[^"']*
      | [^"']*msohtmlclip[^"']*
    )
    ["']
    | <img\b(?![^>]*\bsrc\s*=)[^>]*>
    """,
    re.IGNORECASE | re.VERBOSE,
)


def html_has_broken_images(raw_html: str | None) -> bool:
    if not raw_html or "<img" not in raw_html.lower():
        return False
    return _BROKEN_IMG_TAG_RE.search(raw_html) is not None


def is_valid_img_src(src: str | None) -> bool:
    if not src or not isinstance(src, str):
        return False
    return _BROKEN_IMG_SRC_RE.search(src.strip()) is None


def _unwrap_empty_anchor(parent: Any) -> None:
    if parent is None or getattr(parent, "name", None) != "a":
        return
    if parent.get_text(strip=True):
        return
    if parent.find_all(["img", "picture", "svg"]):
        return
    parent.decompose()


def remove_broken_images(raw_html: str | None) -> str:
    """Drop Word paste artifacts and other ``<img>`` tags without a usable ``src``."""

    if not raw_html or not isinstance(raw_html, str):
        return raw_html or ""
    if "<img" not in raw_html.lower():
        return raw_html

    warnings.filterwarnings("ignore", category=MarkupResemblesLocatorWarning)
    soup = BeautifulSoup(raw_html, "html.parser")

    for img in list(soup.find_all("img")):
        src = img.get("src")
        if is_valid_img_src(src if isinstance(src, str) else None):
            continue
        parent = img.parent
        img.decompose()
        _unwrap_empty_anchor(parent)

    for figure in list(soup.find_all("figure")):
        if figure.get_text(strip=True):
            continue
        if figure.find_all(["img", "picture", "svg", "iframe"]):
            continue
        figure.decompose()

    for paragraph in list(soup.find_all("p")):
        if paragraph.get_text(strip=True):
            continue
        if paragraph.find_all(["img", "picture", "svg", "iframe", "br"]):
            continue
        paragraph.decompose()

    return str(soup)


_SENTENCE_BOUNDARY = re.compile(r"(?<=[.!?…])\s+")
_SKIP_NBSP_PARENTS = frozenset({"script", "style"})


def strip_nbsp_from_html(html: str | None) -> tuple[str, int]:
    """Replace non-breaking spaces with normal spaces outside ``script``/``style``.

    Handles literal ``\\xa0`` / narrow no-break spaces in text nodes only.
    Returns ``(clean_html, replacements_count)``.
    """

    if not html or not isinstance(html, str):
        return "", 0
    lowered = html.lower()
    # ``&nbsp;`` becomes ``\\xa0`` after parsing — still cheap to skip untouched HTML.
    if "\xa0" not in html and "\u202f" not in html and "&nbsp;" not in lowered:
        return html, 0

    warnings.filterwarnings("ignore", category=MarkupResemblesLocatorWarning)
    soup = BeautifulSoup(html, "html.parser")
    replaced = 0
    for text in soup.find_all(string=True):
        parent_name = getattr(getattr(text, "parent", None), "name", None)
        if parent_name in _SKIP_NBSP_PARENTS:
            continue
        raw = str(text)
        new = raw.replace("\xa0", " ").replace("\u202f", " ")
        if new != raw:
            replaced += raw.count("\xa0") + raw.count("\u202f")
            text.replace_with(new)
    out = str(soup)
    return out, replaced


def _paragraph_plain_with_br_only(p_tag: Any) -> bool:
    """True if paragraph has no nested elements other than optional ``br``."""

    if getattr(p_tag, "name", None) != "p":
        return False
    for child in getattr(p_tag, "children", ()):
        if isinstance(child, NavigableString):
            continue
        name = getattr(child, "name", None)
        if name == "br":
            continue
        return False
    return True


def _hard_wrap_line(text: str, max_chars: int) -> list[str]:
    """Break a chunk that still exceeds ``max_chars`` on spaces."""

    out: list[str] = []
    tail = text.strip()
    while tail:
        if len(tail) <= max_chars:
            out.append(tail)
            break
        cut = tail.rfind(" ", max(20, max_chars // 5), max_chars + 1)
        if cut < 1:
            cut = max_chars
        piece = tail[:cut].strip()
        tail = tail[cut:].strip()
        if piece:
            out.append(piece)
    return out


def _sentence_parts(text: str) -> list[str]:
    parts = [_p.strip() for _p in _SENTENCE_BOUNDARY.split(text.strip()) if _p.strip()]
    return parts if parts else ([text.strip()] if text.strip() else [])


def _chunk_plain_text(text: str, max_chars: int) -> list[str]:
    """Bundle sentences into paragraphs under ``max_chars``."""

    sentences = _sentence_parts(text)
    paragraphs: list[str] = []
    current = ""
    for sent in sentences:
        if len(sent) > max_chars:
            if current.strip():
                paragraphs.append(current.strip())
                current = ""
            paragraphs.extend(_hard_wrap_line(sent, max_chars))
            continue
        candidate = f"{current} {sent}".strip() if current else sent
        if len(candidate) <= max_chars:
            current = candidate
        else:
            if current.strip():
                paragraphs.append(current.strip())
            current = sent
    if current.strip():
        paragraphs.append(current.strip())
    return paragraphs


def split_long_paragraphs(html: str | None, *, max_chars: int) -> tuple[str, int]:
    """Split overly long plain ``<p>`` bodies into shorter ``<p>`` blocks."""

    if not html or max_chars <= 0:
        return html or "", 0

    warnings.filterwarnings("ignore", category=MarkupResemblesLocatorWarning)
    soup = BeautifulSoup(html, "html.parser")
    split_count = 0
    for p in list(soup.find_all("p")):
        if not _paragraph_plain_with_br_only(p):
            continue
        txt = p.get_text()
        if len(txt.strip()) <= max_chars:
            continue
        fragments = _chunk_plain_text(txt, max_chars)
        if len(fragments) <= 1:
            continue
        for frag in fragments:
            new_p = soup.new_tag("p")
            new_p.string = frag
            p.insert_before(new_p)
        split_count += len(fragments) - 1
        p.extract()
    return str(soup), split_count


def promote_h3_to_h2(html: str | None) -> tuple[str, int]:
    """Rename ``h3`` elements to ``h2`` for better scan hierarchy (use carefully)."""

    if not html or "<h3" not in html.lower():
        return html or "", 0

    warnings.filterwarnings("ignore", category=MarkupResemblesLocatorWarning)
    soup = BeautifulSoup(html, "html.parser")
    headings = soup.find_all("h3")
    for h in headings:
        h.name = "h2"
    return str(soup), len(headings)
