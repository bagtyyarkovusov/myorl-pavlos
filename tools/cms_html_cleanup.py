"""Shared CMS HTML cleanup helpers for migration and repair scripts."""

from __future__ import annotations

import re
import warnings
from typing import Any

from bs4 import BeautifulSoup, MarkupResemblesLocatorWarning, NavigableString

_INVISIBLE_SRC_CHARS = re.compile(r"[\u200b-\u200d\ufeff\u2060\u00ad]+")

_MODX_SNIPPET_RE = re.compile(r"\[\[[a-zA-Z_][a-zA-Z0-9_]*\]\]")

_DEPRECATED_TAGS = frozenset({"center", "u", "font", "strike", "marquee"})


_BROKEN_IMG_SRC_RE = re.compile(
    r"""
    ^[\s\u200b-\u200d\ufeff\u2060\u00ad]*$
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
    if _BROKEN_IMG_TAG_RE.search(raw_html):
        return True

    warnings.filterwarnings("ignore", category=MarkupResemblesLocatorWarning)
    soup = BeautifulSoup(raw_html, "html.parser")
    for img in soup.find_all("img"):
        src = img.get("src")
        if not is_valid_img_src(src if isinstance(src, str) else None):
            return True
    return False


def is_valid_img_src(src: str | None) -> bool:
    if not src or not isinstance(src, str):
        return False
    normalized = _INVISIBLE_SRC_CHARS.sub("", src).strip()
    if not normalized:
        return False
    return _BROKEN_IMG_SRC_RE.search(normalized) is None


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


_PRESENTATION_ATTRS = frozenset(
    {"style", "align", "border", "height", "width", "draggable", "frameborder", "title"}
)

_IFRAME_KEEP_ATTRS = frozenset({"src", "allow", "allowfullscreen", "referrerpolicy", "loading"})

_IMG_KEEP_ATTRS = frozenset({"src", "alt", "srcset", "sizes", "loading", "decoding"})


def _parse_soup(html: str) -> BeautifulSoup:
    warnings.filterwarnings("ignore", category=MarkupResemblesLocatorWarning)
    return BeautifulSoup(html, "html.parser")


def _element_is_empty(tag: Any) -> bool:
    if tag is None or not getattr(tag, "name", None):
        return True
    if tag.find_all(["img", "picture", "svg", "iframe", "video", "table", "ul", "ol", "blockquote"]):
        return False
    text = tag.get_text(strip=True)
    if text:
        return False
    for child in tag.children:
        if isinstance(child, NavigableString):
            if str(child).strip():
                return False
        elif getattr(child, "name", None) != "br":
            return False
    return True


def unwrap_legacy_wrappers(html: str | None) -> tuple[str, int]:
    """Unwrap MODX ``tab-content`` shells and editor widget ``div`` wrappers."""

    if not html or "<div" not in html.lower():
        return html or "", 0

    soup = _parse_soup(html)
    unwrap_count = 0

    root = soup.body if soup.body is not None else soup
    children = [c for c in root.children if getattr(c, "name", None) or str(c).strip()]
    if (
        len(children) == 1
        and getattr(children[0], "name", None) == "div"
        and "tab-content" in (children[0].get("class") or [])
    ):
        children[0].unwrap()
        unwrap_count += 1

    for div in list(soup.find_all("div")):
        classes = div.get("class") or []
        contenteditable = div.get("contenteditable")
        is_widget = contenteditable is not None and str(contenteditable).lower() == "false"
        is_tab = "tab-content" in classes
        if not is_widget and not is_tab:
            continue
        div.unwrap()
        unwrap_count += 1

    return str(soup), unwrap_count


def strip_presentation_attrs(html: str | None) -> tuple[str, int]:
    """Remove legacy inline layout attributes stripped by the frontend sanitizer."""

    if not html:
        return html or "", 0

    soup = _parse_soup(html)
    stripped = 0
    for tag in soup.find_all(True):
        name = tag.name
        if name is None:
            continue
        keep: frozenset[str] | None = None
        if name == "iframe":
            keep = _IFRAME_KEEP_ATTRS
        elif name == "img":
            keep = _IMG_KEEP_ATTRS
        elif name in {"a", "td", "th"}:
            keep = frozenset({"href", "target", "rel", "colspan", "rowspan", "scope", "id", "name"})
        elif name in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            keep = frozenset({"id"})
        else:
            keep = frozenset({"id", "class"})

        for attr in list(tag.attrs.keys()):
            if attr in keep:
                continue
            if attr in _PRESENTATION_ATTRS or attr.startswith("data-"):
                del tag[attr]
                stripped += 1
            elif attr == "class":
                classes = tag.get("class") or []
                safe = [c for c in classes if c.startswith("callout-") or c.startswith("cms-html__")]
                if safe:
                    tag["class"] = safe
                else:
                    del tag["class"]
                    stripped += 1

    return str(soup), stripped


def remove_empty_nodes(html: str | None) -> tuple[str, int]:
    """Drop empty ``p`` / ``div`` nodes left by legacy editors."""

    if not html:
        return html or "", 0

    soup = _parse_soup(html)
    removed = 0
    changed = True
    while changed:
        changed = False
        for tag in list(soup.find_all(["p", "div"])):
            if not _element_is_empty(tag):
                continue
            tag.decompose()
            removed += 1
            changed = True
    return str(soup), removed


def split_multi_image_paragraphs(html: str | None) -> tuple[str, int]:
    """Split ``<p>`` blocks with multiple ``<img>`` into one image per paragraph."""

    if not html or "<img" not in html.lower():
        return html or "", 0

    soup = _parse_soup(html)
    split_count = 0
    for paragraph in list(soup.find_all("p")):
        images = paragraph.find_all("img", recursive=False)
        if len(images) <= 1:
            continue
        for img in images:
            new_p = soup.new_tag("p")
            img.extract()
            new_p.append(img)
            paragraph.insert_before(new_p)
            split_count += 1
        paragraph.decompose()
    return str(soup), split_count


def normalize_youtube_iframes(html: str | None) -> tuple[str, int]:
    """Normalize protocol-relative YouTube embed URLs and drop fixed iframe dimensions."""

    if not html or "<iframe" not in html.lower():
        return html or "", 0

    soup = _parse_soup(html)
    normalized = 0
    for iframe in soup.find_all("iframe"):
        src = iframe.get("src")
        if isinstance(src, str) and src.startswith("//"):
            iframe["src"] = f"https:{src}"
            normalized += 1
        for attr in ("width", "height", "frameborder", "style"):
            if iframe.has_attr(attr):
                del iframe[attr]
                normalized += 1
    return str(soup), normalized


def _pre_looks_like_code(text: str) -> bool:
    lines = text.splitlines()
    if not lines:
        return False
    indented = sum(1 for line in lines if line.startswith(("  ", "\t")))
    if indented >= 2:
        return True
    if any(marker in text for marker in ("{", "};", "function ", "def ", "class ", "<html")):
        return True
    return False


def convert_prose_pre_to_p(html: str | None) -> tuple[str, int]:
    """Convert legacy prose ``<pre>`` blocks (not code) into ``<p>`` paragraphs."""

    if not html or "<pre" not in html.lower():
        return html or "", 0

    soup = _parse_soup(html)
    converted = 0
    for pre in list(soup.find_all("pre")):
        text = pre.get_text()
        if _pre_looks_like_code(text):
            continue
        stripped = text.strip()
        if not stripped:
            pre.decompose()
            converted += 1
            continue
        new_p = soup.new_tag("p")
        new_p.string = stripped
        pre.replace_with(new_p)
        converted += 1
    return str(soup), converted


def remove_legacy_video_tags(html: str | None) -> tuple[str, int]:
    """Remove dead legacy ``<video>`` tags (local ``files/`` sources not served by Next.js)."""

    if not html or "<video" not in html.lower():
        return html or "", 0

    soup = _parse_soup(html)
    videos = list(soup.find_all("video"))
    for video in videos:
        video.decompose()
    return str(soup), len(videos)


def strip_font_tags(html: str | None) -> tuple[str, int]:
    """Unwrap ``<font>`` tags, preserving their inner content."""

    if not html or "<font" not in html.lower():
        return html or "", 0

    soup = _parse_soup(html)
    tags = list(soup.find_all("font"))
    for tag in tags:
        tag.unwrap()
    return str(soup), len(tags)


def strip_modx_snippets(html: str | None) -> tuple[str, int]:
    """Remove MODX ``[[snippetName]]`` insertion markers (snippets no longer resolve)."""

    if not html or "[[" not in html:
        return html or "", 0

    result, count = _MODX_SNIPPET_RE.subn("", html)
    return result, count


def normalize_legacy_modx_markup(html: str | None) -> tuple[str, dict[str, int]]:
    """Full MODX-era HTML normalization pipeline for Strapi page fields."""

    stats: dict[str, int] = {}
    if not html or not isinstance(html, str):
        return html or "", stats

    out = html
    steps: tuple[tuple[str, Any], ...] = (
        ("unwrap_wrappers", unwrap_legacy_wrappers),
        ("strip_presentation_attrs", strip_presentation_attrs),
        ("strip_font_tags", strip_font_tags),
        ("strip_modx_snippets", strip_modx_snippets),
        ("remove_broken_images", lambda h: (remove_broken_images(h), 0)),
        ("split_multi_image_paragraphs", split_multi_image_paragraphs),
        ("normalize_youtube_iframes", normalize_youtube_iframes),
        ("convert_prose_pre_to_p", convert_prose_pre_to_p),
        ("remove_legacy_video_tags", remove_legacy_video_tags),
        ("remove_empty_nodes", remove_empty_nodes),
        ("strip_nbsp", lambda h: strip_nbsp_from_html(h)),
    )

    for key, fn in steps:
        if key == "remove_broken_images":
            before = out
            out = remove_broken_images(out)
            if out != before:
                stats["broken_images_removed"] = stats.get("broken_images_removed", 0) + 1
            continue
        result = fn(out)
        if isinstance(result, tuple) and len(result) == 2:
            out, count = result
            if count:
                stats[key] = stats.get(key, 0) + count

    return out, stats


def count_legacy_markup_issues(html: str | None) -> dict[str, int]:
    """Count remaining legacy patterns (for audit scripts)."""

    counts = {
        "tab_content_wrapper": 0,
        "inline_style": 0,
        "align_attr": 0,
        "file_or_msohtmlclip": 0,
        "legacy_video": 0,
        "fixed_dimension_img": 0,
        "fixed_dimension_iframe": 0,
        "empty_paragraphs": 0,
        "prose_pre": 0,
        "font_tags": 0,
        "modx_snippets": 0,
        "deprecated_tags": 0,
        "essential_style_attrs": 0,
    }
    if not html:
        return counts

    lowered = html.lower()
    if "tab-content" in lowered:
        counts["tab_content_wrapper"] += lowered.count("tab-content")
    counts["inline_style"] += len(re.findall(r"\sstyle\s*=", html, re.IGNORECASE))
    counts["align_attr"] += len(re.findall(r"\salign\s*=", html, re.IGNORECASE))
    if "file:" in lowered or "msohtmlclip" in lowered:
        counts["file_or_msohtmlclip"] += 1
    counts["legacy_video"] += len(re.findall(r"<video\b", html, re.IGNORECASE))
    counts["fixed_dimension_img"] += len(
        re.findall(r"<img\b[^>]*\b(?:width|height)\s*=", html, re.IGNORECASE)
    )
    counts["fixed_dimension_iframe"] += len(
        re.findall(r"<iframe\b[^>]*\b(?:width|height)\s*=", html, re.IGNORECASE)
    )

    soup = _parse_soup(html)
    for pre in soup.find_all("pre"):
        if not _pre_looks_like_code(pre.get_text()):
            counts["prose_pre"] += 1
    for tag in soup.find_all("p"):
        if _element_is_empty(tag):
            counts["empty_paragraphs"] += 1
    for tag in soup.find_all("font"):
        counts["font_tags"] += 1
    counts["modx_snippets"] += len(_MODX_SNIPPET_RE.findall(html))
    for tag in soup.find_all(True):
        if getattr(tag, "name", None) in _DEPRECATED_TAGS:
            counts["deprecated_tags"] += 1
        if getattr(tag, "name", None) in {"td", "th"} and tag.has_attr("style"):
            counts["essential_style_attrs"] += 1

    return counts


def flag_deprecated_semantic_tags(html: str | None) -> list[dict[str, str]]:
    """Find deprecated semantic tags (``<center>``, ``<u>``) that need editorial review."""

    if not html:
        return []

    soup = _parse_soup(html)
    findings: list[dict[str, str]] = []
    for tag in soup.find_all(_DEPRECATED_TAGS):
        name = getattr(tag, "name", "?")
        findings.append({
            "tag": name,
            "reason": "deprecated semantic tag — requires editorial decision",
            "textPreview": tag.get_text(strip=True)[:120],
        })
    return findings


def flag_essential_style_attrs(html: str | None) -> list[dict[str, str]]:
    """Find ``style`` attributes on essential elements (table cells) that need manual review.
    These were deliberately authored (e.g. column widths) and should not be auto-stripped."""

    if not html or "style=" not in html.lower():
        return []

    soup = _parse_soup(html)
    findings: list[dict[str, str]] = []
    for tag in soup.find_all(["td", "th"]):
        style = tag.get("style")
        if not isinstance(style, str) or not style.strip():
            continue
        findings.append({
            "tag": tag.name,
            "style": style.strip()[:200],
            "textPreview": tag.get_text(strip=True)[:120],
        })
    return findings


def flag_mixed_semantic_presentational(html: str | None) -> list[dict[str, str]]:
    """Find mixed semantic + presentational markup that needs editorial review.
    Example: ``<strong>`` inside ``<center>`` with inline ``style`` attributes."""

    if not html:
        return []

    soup = _parse_soup(html)
    findings: list[dict[str, str]] = []

    _SEMANTIC_TAGS = frozenset({"strong", "em", "b", "i", "article", "section", "header", "footer"})

    for deprecated_tag in soup.find_all(_DEPRECATED_TAGS):
        context_tags: list[str] = []
        has_style = False
        for child in deprecated_tag.descendants:
            if getattr(child, "name", None) in _SEMANTIC_TAGS:
                context_tags.append(child.name)
        if deprecated_tag.has_attr("style"):
            has_style = True
        if context_tags or has_style:
            findings.append({
                "tag": getattr(deprecated_tag, "name", "?"),
                "reason": "mixed semantic + presentational markup",
                "children": ", ".join(sorted(set(context_tags))) if context_tags else "(has style attr)",
                "textPreview": deprecated_tag.get_text(strip=True)[:120],
            })
    return findings
