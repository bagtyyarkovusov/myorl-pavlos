import json

def analyze_advantages():
    with open('published_resources_flat.json', 'r', encoding='utf-8') as f:
        resources = json.load(f)
        
    for r in resources:
        tvs = r.get('template_variables', {})
        if 'migxAdvantages' in tvs and tvs['migxAdvantages'].strip():
            print(f"Resource ID: {r['id']}, Title: {r['pagetitle']}")
            print("migxAdvantages Content:")
            
            # The content might be a JSON string since it's a MIGX TV
            try:
                parsed = json.loads(tvs['migxAdvantages'])
                print(json.dumps(parsed, indent=2, ensure_ascii=False))
            except json.JSONDecodeError:
                print(tvs['migxAdvantages'])
            print("-" * 40)

if __name__ == "__main__":
    analyze_advantages()
