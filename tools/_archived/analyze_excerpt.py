import json

from cms_audit import CHECKPOINT_SOURCE_DIR, MODX_SOURCE_DIR

def analyze_excerpt():
    with (MODX_SOURCE_DIR / "published_resources_flat.json").open("r", encoding="utf-8") as f:
        resources = json.load(f)
        
    introtext_count = 0
    sample_introtexts = []
    
    for r in resources:
        introtext = r.get('introtext')
        if introtext and introtext.strip():
            introtext_count += 1
            if len(sample_introtexts) < 3:
                sample_introtexts.append(introtext)
                
    print(f"Total resources: {len(resources)}")
    print(f"Resources with 'introtext' (mapped to 'excerpt' in Strapi): {introtext_count}")
    print("\nSample 'introtext' values:")
    for i, sample in enumerate(sample_introtexts, 1):
        print(f"--- Sample {i} ---")
        print(sample)

if __name__ == "__main__":
    analyze_excerpt()
