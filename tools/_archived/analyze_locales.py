"""Legacy URI-based locale inspection.

This script is useful for exploratory checks, but it should not be used as the
final readiness gate for injection. For go/no-go decisions, use
`analyze_contexts.py` or `full_ready_check.py`, which validate localization from
`context_key` and strict Babel links instead of URI heuristics.
"""

import json

from cms_audit import CHECKPOINT_SOURCE_DIR, MODX_SOURCE_DIR

def analyze_locales():
    with (MODX_SOURCE_DIR / "transformed_resources.json").open("r", encoding="utf-8") as f:
        resources = json.load(f)
        
    ru_pages = []
    gr_pages = []
    
    babel_links = {}
    
    for r in resources:
        uri = r.get('uri', '')
        # Determine language based on URI
        if uri.startswith('ru/') or uri == 'ru':
            ru_pages.append(r)
        else:
            gr_pages.append(r)
            
        # Check Babel links
        tvs = r.get('template_variables', {})
        babel_tv = tvs.get('babelLanguageLinks')
        if babel_tv:
            babel_links[r['id']] = babel_tv
            
    print(f"Total Resources: {len(resources)}")
    print(f"Detected Greek (Default) Pages: {len(gr_pages)}")
    print(f"Detected Russian Pages: {len(ru_pages)}")
    
    print(f"\nPages with babelLanguageLinks: {len(babel_links)}")
    
    # Analyze the format of babelLanguageLinks
    sample_links = list(babel_links.items())[:5]
    print("\nSample Babel Links Format:")
    for res_id, link_val in sample_links:
        print(f"Resource {res_id}: {link_val}")
        
    # Check how many RU pages are orphaned (not linked to GR) and vice versa, if possible based on format
    # Babel links usually look like "web:1;rus:12" where "web" is Greek context and "rus" is Russian context.

if __name__ == "__main__":
    analyze_locales()
