import json
from collections import Counter

def analyze_templates_and_tvs():
    with open('published_resources_flat.json', 'r', encoding='utf-8') as f:
        resources = json.load(f)
        
    with open('tv_definitions.json', 'r', encoding='utf-8') as f:
        tvs = json.load(f)
        
    tv_names = {tv['name']: tv for tv in tvs}
    
    # Analyze templates
    templates = Counter()
    for r in resources:
        template = r.get('template', 0)
        templates[template] += 1
        
    print("--- TEMPLATE DISTRIBUTION ---")
    for temp, count in templates.most_common():
        print(f"Template ID: {temp} -> Used by {count} resources")
        
    # Analyze TV usage
    tv_usage = Counter()
    for r in resources:
        tvs_in_resource = r.get('template_variables', {})
        for tv_name, tv_value in tvs_in_resource.items():
            if tv_value and tv_value.strip(): # Only count if it has an actual value
                tv_usage[tv_name] += 1
                
    print("\n--- TV USAGE (WITH VALUES) ---")
    used_tvs = set()
    for tv_name, count in tv_usage.most_common():
        print(f"TV: {tv_name} -> Used by {count} resources")
        used_tvs.add(tv_name)
        
    print("\n--- UNUSED TVs (No values in published resources) ---")
    for tv_name in tv_names:
        if tv_name not in used_tvs:
            print(f"Unused TV: {tv_name}")
            
    # Also let's check other fields in modx_site_content that might be important
    # For example: parent, isfolder, menuindex, hidemenu, uri
    print("\n--- OTHER IMPORTANT FIELDS IN RESOURCES ---")
    isfolder_count = sum(1 for r in resources if r.get('isfolder') == 1)
    hidemenu_count = sum(1 for r in resources if r.get('hidemenu') == 1)
    
    print(f"Folders (isfolder=1): {isfolder_count}")
    print(f"Hidden from Menu (hidemenu=1): {hidemenu_count}")

if __name__ == "__main__":
    analyze_templates_and_tvs()
