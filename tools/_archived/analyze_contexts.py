"""Loose context and Babel inventory.

This script is intentionally lightweight and counts any Babel reference found on
`web` rows. That makes it useful for inventory, but too permissive for final
go/no-go decisions. Use `full_ready_check.py` for strict pairing validation.
"""

import json

from cms_audit import CHECKPOINT_SOURCE_DIR, MODX_SOURCE_DIR

def analyze_contexts():
    with (MODX_SOURCE_DIR / "transformed_resources.json").open("r", encoding="utf-8") as f:
        resources = json.load(f)
        
    contexts = {}
    babel_pairs = []
    
    for r in resources:
        ctx = r.get('context_key')
        if ctx not in contexts:
            contexts[ctx] = 0
        contexts[ctx] += 1
        
        tvs = r.get('template_variables', {})
        babel_tv = tvs.get('babelLanguageLinks')
        if babel_tv and ctx == 'web': # only parse from one context to avoid duplicates
            parts = babel_tv.split(';')
            pair = {}
            for p in parts:
                if ':' in p:
                    c, id_val = p.split(':')
                    pair[c] = int(id_val)
            if pair:
                babel_pairs.append(pair)
            
    print("Note: this is a loose Babel inventory. Use full_ready_check.py for strict pair validation.")
    print("--- CONTEXT (LOCALE) DISTRIBUTION ---")
    for ctx, count in contexts.items():
        print(f"Context '{ctx}': {count} pages")
        
    print("\n--- BABEL LINKS ANALYSIS ---")
    print(f"Total Babel pairs found (from 'web' context): {len(babel_pairs)}")
    
    # Check if any pages exist in a context but aren't in a babel pair
    web_pages = {r['id'] for r in resources if r.get('context_key') == 'web'}
    rus_pages = {r['id'] for r in resources if r.get('context_key') == 'rus'}
    
    linked_web = set()
    linked_rus = set()
    
    for pair in babel_pairs:
        if 'web' in pair:
            linked_web.add(pair['web'])
        if 'rus' in pair:
            linked_rus.add(pair['rus'])
            
    print(f"Linked 'web' pages: {len(linked_web)} out of {len(web_pages)}")
    print(f"Linked 'rus' pages: {len(linked_rus)} out of {len(rus_pages)}")
    
    orphaned_web = web_pages - linked_web
    orphaned_rus = rus_pages - linked_rus
    
    print(f"\nOrphaned 'web' pages (no matching 'rus' link): {len(orphaned_web)}")
    print(f"Orphaned 'rus' pages (no matching 'web' link): {len(orphaned_rus)}")
    
    if orphaned_web:
        print(f"Sample orphaned 'web' IDs: {list(orphaned_web)[:5]}")
    if orphaned_rus:
        print(f"Sample orphaned 'rus' IDs: {list(orphaned_rus)[:5]}")

if __name__ == "__main__":
    analyze_contexts()
