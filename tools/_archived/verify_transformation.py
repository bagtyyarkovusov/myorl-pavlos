import json

from cms_audit import CHECKPOINT_SOURCE_DIR, MODX_SOURCE_DIR
from collections import Counter
from bs4 import BeautifulSoup
import re

def verify():
    with (MODX_SOURCE_DIR / "transformed_resources.json").open("r", encoding="utf-8") as f:
        resources = json.load(f)
        
    with (CHECKPOINT_SOURCE_DIR / "asset_map.json").open("r", encoding="utf-8") as f:
        asset_map = json.load(f)
        
    inline_styles = 0
    font_tags = 0
    b_tags = 0
    i_tags = 0
    old_urls_found = 0
    
    html_fields = ['content', 'introtext']
    
    for r in resources:
        fields_to_check = [r.get(f) for f in html_fields]
        tvs = r.get('template_variables', {})
        for v in tvs.values():
            if isinstance(v, str) and '<' in v and '>' in v:
                fields_to_check.append(v)
                
        for html_content in fields_to_check:
            if not html_content or not isinstance(html_content, str):
                continue
                
            import warnings
            from bs4 import MarkupResemblesLocatorWarning
            warnings.filterwarnings("ignore", category=MarkupResemblesLocatorWarning)
                
            soup = BeautifulSoup(html_content, 'html.parser')
            
            for tag in soup.find_all(True):
                if tag.name == 'font':
                    font_tags += 1
                if tag.name == 'b':
                    b_tags += 1
                if tag.name == 'i':
                    i_tags += 1
                if tag.has_attr('style'):
                    inline_styles += 1
                
                # Check for missed old asset urls
                for attr in ['src', 'href']:
                    if attr in tag.attrs:
                        val = tag[attr]
                        if "uploads/" in val and "uploads/thumbnail" not in val and "_a" not in val and "_b" not in val and "_" not in val and len(val) < 50:
                             # Just a loose check to see if original unhashed URLs remain
                             # The hashed strapi URLs have _hash, let's see if any old ones exactly match asset_map keys
                             clean = val
                             if clean.startswith('/'): clean = clean[1:]
                             if clean in asset_map:
                                 old_urls_found += 1
                                 print(f"Warning: Missed URL replacement: {clean}")

    print("--- TRANSFORMATION VERIFICATION ---")
    print(f"Inline styles found: {inline_styles} (Expected: 0)")
    print(f"<font> tags found: {font_tags} (Expected: 0)")
    print(f"<b> tags found: {b_tags} (Expected: 0)")
    print(f"<i> tags found: {i_tags} (Expected: 0)")
    print(f"Unreplaced known asset URLs found: {old_urls_found} (Expected: 0)")
    
    if inline_styles == 0 and font_tags == 0 and b_tags == 0 and i_tags == 0 and old_urls_found == 0:
        print("SUCCESS: Data transformation verified clean.")
    else:
        print("ERROR: Some legacy HTML remains.")

if __name__ == '__main__':
    verify()
