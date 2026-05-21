"""Shared CMS HTML cleanup helpers for migration and repair scripts."""

from __future__ import annotations

import re
import warnings
from typing import Any

from bs4 import BeautifulSoup, MarkupResemblesLocatorWarning

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
