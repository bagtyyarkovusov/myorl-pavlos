import json

from cms_audit import CHECKPOINT_SOURCE_DIR, MODX_SOURCE_DIR
from collections import defaultdict

def analyze_missing_schema():
    with (MODX_SOURCE_DIR / "published_resources_flat.json").open("r", encoding="utf-8") as f:
        resources = json.load(f)
        
    with (MODX_SOURCE_DIR / "tv_definitions.json").open("r", encoding="utf-8") as f:
        tvs = json.load(f)
        
    tv_names = {tv['name']: tv for tv in tvs}
    
    # Categories of TVs we want to check based on user prompt
    tabs_tvs = ['migxTabs', 'migxTabsLink']
    video_tvs = ['videoMp4', 'videoWebm', 'imageVideo', 'migxVideo', 'videoTags']
    clinics_tvs = ['migxLocation', 'migxLocation2', 'location', 'location2', 'AffiliateAddress', 'AffiliatePhone', 'AffiliateEmail', 'AffiliateCoords']
    other_tvs_not_in_schema = [
        'migxSocial', 'tags', 'infoBlockTop', 'infoBlockBottom', 'class', 'url',
        'migxContacts', 'migxResources', 'migxPromoSlider', 'popUpClose',
        'migxAdvantages', 'articleAuthor', 'sources'
    ]
    
    analysis = {
        'tabs': defaultdict(int),
        'videos': defaultdict(int),
        'clinics': defaultdict(int),
        'others': defaultdict(int)
    }
    
    total_resources = len(resources)
    
    for r in resources:
        tvs_in_resource = r.get('template_variables', {})
        
        for tv_name, tv_value in tvs_in_resource.items():
            if not tv_value:
                continue
                
            if tv_name in tabs_tvs:
                analysis['tabs'][tv_name] += 1
            elif tv_name in video_tvs:
                analysis['videos'][tv_name] += 1
            elif tv_name in clinics_tvs:
                analysis['clinics'][tv_name] += 1
            elif tv_name in other_tvs_not_in_schema:
                analysis['others'][tv_name] += 1
                
    print("--- ANALYSIS OF CURRENTLY UNMAPPED TVs ---")
    
    print("\n1. TABS:")
    for tv, count in analysis['tabs'].items():
        print(f"  - {tv}: Used in {count} resources. Type: {tv_names[tv]['type']}")
        
    print("\n2. VIDEOS:")
    for tv, count in analysis['videos'].items():
        print(f"  - {tv}: Used in {count} resources. Type: {tv_names[tv]['type']}")
        
    print("\n3. CLINICS / LOCATIONS:")
    for tv, count in analysis['clinics'].items():
        print(f"  - {tv}: Used in {count} resources. Type: {tv_names[tv]['type']}")
        
    print("\n4. OTHER UNMAPPED TVs IN USE:")
    for tv, count in analysis['others'].items():
        print(f"  - {tv}: Used in {count} resources. Type: {tv_names[tv]['type']}")

if __name__ == "__main__":
    analyze_missing_schema()
