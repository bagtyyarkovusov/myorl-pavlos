import json

from cms_audit import CHECKPOINT_SOURCE_DIR, MODX_SOURCE_DIR
import re
import unicodedata
from bs4 import BeautifulSoup
import urllib.parse

from html_cleanup import apply_dead_html_cleanup_to_resource
from internal_link_rewrite import apply_internal_link_rewrites_to_resource, build_page_link_index

# Pragmatic-drop policy keys: these MODX source fields are deliberately
# discarded or folded by the importer. See import_policy.md.
POLICY_DROP_KEYS = ("longtitle", "menutitle", "metaKeywords")


def iter_resource_tree(resources: list) -> list[dict]:
    """Flatten nested MODX ``children`` trees into a list of resource dicts."""

    out: list[dict] = []

    def walk(nodes: list) -> None:
        for node in nodes:
            if not isinstance(node, dict):
                continue
            if node.get("id") is not None:
                out.append(node)
            children = node.get("children")
            if isinstance(children, list):
                walk(children)

    walk(resources)
    return out


def _strip_html(value):
    if not isinstance(value, str) or not value:
        return value
    text = BeautifulSoup(value, "html.parser").get_text(separator=" ")
    return re.sub(r"\s+", " ", text).strip()


def _slug_from_text(value):
    normalized = unicodedata.normalize("NFKD", value or "")
    ascii_only = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    ascii_only = ascii_only.encode("ascii", "ignore").decode("ascii").lower()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_only).strip("-")
    return slug


def _derive_slug(resource, used_slugs):
    """Return the slug for ``resource`` per locale.

    When MODX ``alias`` is non-empty, it is used **exactly** (after ``.strip()``),
    matching legacy MODX URLs. Duplicate aliases in the same locale therefore
    produce duplicate ``_import.slug`` values; resolve those in MODX/Strapi.

    When ``alias`` is empty, the slug is ASCII-derived from ``pagetitle``; ties
    among those derived slugs still append ``-{MODX id}`` for stable uniqueness.
    """

    locale_slugs = used_slugs.setdefault(resource.get("context_key"), {})
    alias = (resource.get("alias") or "").strip()

    if alias:
        if alias not in locale_slugs:
            locale_slugs[alias] = resource["id"]
        return alias

    candidate = _slug_from_text(resource.get("pagetitle")) or f"page-{resource['id']}"
    if candidate not in locale_slugs:
        locale_slugs[candidate] = resource["id"]
        return candidate
    unique = f"{candidate}-{resource['id']}"
    locale_slugs[unique] = resource["id"]
    return unique


def _resolve_meta_title(description, tvs, pagetitle, longtitle):
    """TV wins -> description fallback -> longtitle fallback -> pagetitle."""

    tv_value = (tvs.get("metaTitle") or "").strip() if isinstance(tvs.get("metaTitle"), str) else ""
    if tv_value:
        return tv_value
    desc_value = _strip_html(description)
    if desc_value:
        return desc_value
    longtitle_value = _strip_html(longtitle)
    if longtitle_value:
        return longtitle_value
    return _strip_html(pagetitle) or ""


def _resolve_meta_description(description, tvs):
    tv_value = tvs.get("metaDescription") if isinstance(tvs.get("metaDescription"), str) else ""
    if tv_value and tv_value.strip():
        return tv_value.strip()
    return _strip_html(description) or ""


def _build_import_block(resource, used_slugs):
    """Produce the ``_import`` sibling used by every downstream stage."""

    tvs = resource.get("template_variables") or {}
    description = resource.get("description")
    pagetitle = resource.get("pagetitle")
    longtitle = resource.get("longtitle")

    slug = _derive_slug(resource, used_slugs)
    template = resource.get("template")
    template_id = f"template_{template}" if template is not None else None

    drops = {}
    for key in POLICY_DROP_KEYS:
        value = resource.get(key)
        if value in (None, "", [], {}):
            value = tvs.get(key)
        if value not in (None, "", [], {}):
            drops[key] = value

    return {
        "title": (pagetitle or "").strip(),
        "metaTitle": _resolve_meta_title(description, tvs, pagetitle, longtitle),
        "metaDescription": _resolve_meta_description(description, tvs),
        "slug": slug,
        "templateId": template_id,
        "drops": drops,
    }


def modernize_html(raw_html, asset_map):
    if not raw_html or not isinstance(raw_html, str):
        return raw_html
        
    # Ignore BeautifulSoup warning for URLs masquerading as HTML
    import warnings
    from bs4 import MarkupResemblesLocatorWarning
    warnings.filterwarnings("ignore", category=MarkupResemblesLocatorWarning)
        
    soup = BeautifulSoup(raw_html, 'html.parser')
    
    # 1. Remove all inline style attributes from EVERY tag
    for tag in soup.find_all(True):
        if 'style' in tag.attrs:
            del tag['style']
        if 'align' in tag.attrs:
            del tag['align']
        if 'bgcolor' in tag.attrs:
            del tag['bgcolor']
        if 'border' in tag.attrs:
            del tag['border']
            
    # 2. Handle Deprecated <font> tags
    for font_tag in soup.find_all('font'):
        font_tag.unwrap()
        
    # 3. Replace <b> with <strong>
    for b_tag in soup.find_all('b'):
        b_tag.name = 'strong'
        
    # 4. Replace <i> with <em>
    for i_tag in soup.find_all('i'):
        i_tag.name = 'em'
        
    # 5. Handle <u>
    for u_tag in soup.find_all('u'):
        u_tag.name = 'span'
        u_tag['class'] = u_tag.get('class', []) + ['text-underline']
        
    # 6. Handle <tt>
    for tt_tag in soup.find_all('tt'):
        tt_tag.name = 'code'
        
    # 7. Replace Asset URLs
    # Look for src and href
    for tag in soup.find_all(True):
        for attr in ['src', 'href']:
            if attr in tag.attrs:
                val = tag[attr]
                # decode url to match map keys potentially
                decoded_val = urllib.parse.unquote(val)
                # some urls might be relative like "uploads/..." or "/uploads/..."
                clean_val = val
                if val.startswith('/'):
                    clean_val = val[1:]
                
                # Check in asset map
                if clean_val in asset_map:
                    tag[attr] = asset_map[clean_val]['url']
                elif decoded_val in asset_map:
                    tag[attr] = asset_map[decoded_val]['url']
                elif clean_val.startswith('uploads/'):
                    # if we have spaces or other chars not caught
                    encoded_val = urllib.parse.quote(clean_val)
                    if encoded_val in asset_map:
                        tag[attr] = asset_map[encoded_val]['url']
                elif clean_val.startswith('files/'):
                    # Legacy MODX `files/` tree (ingested by migrate_files_assets.py).
                    # Same dual-shape fallback as uploads/: some source HTML
                    # carries raw spaces or Greek chars, others percent-encode.
                    encoded_val = urllib.parse.quote(clean_val, safe='/')
                    if encoded_val in asset_map:
                        tag[attr] = asset_map[encoded_val]['url']

    # 8. Drop orphan <img> tags still pointing at the legacy trees. These are
    # references whose source files are missing from the archive (documented
    # in orphan_assets.json) - per the pragmatic-drop policy in
    # import_policy.md we remove the tag so Strapi does not render a broken
    # image, and unwrap any ancestor <a> that would be left empty.
    #
    # A tag is "orphan" only when its src was NOT successfully rewritten to a
    # live Strapi URL. Successfully rewritten tags point at `/uploads/<hash>`
    # values present in asset_map (via ``resolved_urls``) and must be kept.
    resolved_urls = {info['url'] for info in asset_map.values() if isinstance(info, dict)}
    for img in list(soup.find_all('img')):
        src = img.get('src') or ''
        if src in resolved_urls:
            continue
        candidate = src.lstrip('/')
        if candidate.startswith('files/') or candidate.startswith('uploads/'):
            parent = img.parent
            img.decompose()
            if parent is not None and parent.name == 'a' and not parent.get_text(strip=True) and not parent.find_all(['img', 'picture', 'svg']):
                parent.decompose()

    return str(soup)

def process():
    with (MODX_SOURCE_DIR / "published_resources_flat.json").open("r", encoding="utf-8") as f:
        resources = json.load(f)

    flat_resources = iter_resource_tree(resources)

    with (CHECKPOINT_SOURCE_DIR / "asset_map.json").open("r", encoding="utf-8") as f:
        asset_map = json.load(f)

    for r in flat_resources:
        r['content'] = modernize_html(r.get('content'), asset_map)
        r['introtext'] = modernize_html(r.get('introtext'), asset_map)

        tvs = r.get('template_variables', {})
        for k, v in tvs.items():
            if isinstance(v, str) and isinstance(k, str) and k.lower().startswith("migx"):
                # JSON payloads with embedded HTML; ``modernize_html`` would corrupt them.
                continue
            if isinstance(v, str) and ('<' in v and '>' in v):
                tvs[k] = modernize_html(v, asset_map)
            elif isinstance(v, str):
                clean_v = v
                if v.startswith('/'):
                    clean_v = v[1:]
                if clean_v in asset_map:
                    # Direct TV asset links (e.g. image TV)
                    # For Strapi, Media fields usually expect an ID, not a URL string.
                    # We will replace the value with the Strapi ID so the migration script can use it directly.
                    tvs[k] = asset_map[clean_v]['id']
                elif clean_v.startswith('files/') or clean_v.startswith('uploads/'):
                    # Orphan reference: the TV points at a legacy path whose source
                    # is missing from the archive (documented in orphan_assets.json).
                    # Clear it so the importer does not write a broken path.
                    tvs[k] = ""

    # Deterministic second pass: emit the `_import` block every downstream
    # stage consumes. `used_slugs` is locale-scoped: MODX aliases are kept
    # verbatim (no id-suffix); derived-from-title slugs still disambiguate with
    # ``-{id}``. Order by MODX id so runs are deterministic.
    used_slugs = {}
    for r in sorted(flat_resources, key=lambda row: int(row['id'])):
        r['_import'] = _build_import_block(r, used_slugs)

    page_link_index = build_page_link_index(flat_resources)
    for r in flat_resources:
        apply_internal_link_rewrites_to_resource(r, page_link_index)
    for r in flat_resources:
        apply_dead_html_cleanup_to_resource(r, page_link_index, asset_map)

    with (MODX_SOURCE_DIR / "transformed_resources.json").open("w", encoding="utf-8") as f:
        json.dump(resources, f, ensure_ascii=False, indent=2)
        
    print("Data transformation complete. Wrote transformed_resources.json")

if __name__ == '__main__':
    process()
