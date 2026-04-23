import json
import re
from bs4 import BeautifulSoup
from collections import Counter

def analyze_html():
    with open('published_resources_flat.json', 'r', encoding='utf-8') as f:
        resources = json.load(f)
        
    inline_styles = Counter()
    tags_found = Counter()
    
    html_fields = ['content', 'introtext']
    
    for r in resources:
        for field in html_fields:
            html_content = r.get(field, "")
            if not html_content or not isinstance(html_content, str):
                continue
                
            # Parse HTML
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Count tags
            for tag in soup.find_all(True):
                tags_found[tag.name] += 1
                
                # Check for inline styles
                if tag.has_attr('style'):
                    inline_styles[tag.name] += 1
                    
        # Also check template variables that might have rich text
        tvs = r.get('template_variables', {})
        for tv_name, tv_val in tvs.items():
            if isinstance(tv_val, str) and ('<' in tv_val and '>' in tv_val):
                soup = BeautifulSoup(tv_val, 'html.parser')
                for tag in soup.find_all(True):
                    tags_found[tag.name] += 1
                    if tag.has_attr('style'):
                        inline_styles[tag.name] += 1
                        
    print("--- HTML Tags Frequency ---")
    for tag, count in tags_found.most_common():
        print(f"<{tag}>: {count}")
        
    print("\n--- Tags with Inline Styles ---")
    for tag, count in inline_styles.most_common():
        print(f"<{tag}>: {count} elements have inline styles")

if __name__ == "__main__":
    analyze_html()
