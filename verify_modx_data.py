import json

def verify_modx_data():
    with open('published_resources_flat.json', 'r', encoding='utf-8') as f:
        resources = json.load(f)
        
    with open('backend/src/api/page/content-types/page/schema.json', 'r', encoding='utf-8') as f:
        strapi_schema = json.load(f)
        
    schema_attributes = strapi_schema.get('attributes', {})
    
    print("--- VERIFYING MODX DATA AGAINST STRAPI SCHEMA ---")
    
    errors = []
    
    # Check Templates Mapping
    valid_templates = schema_attributes.get('templateId', {}).get('enum', [])
    for r in resources:
        modx_template = r.get('template')
        if modx_template is not None:
            expected_enum_val = f"template_{modx_template}"
            if expected_enum_val not in valid_templates:
                errors.append(f"Resource {r['id']} has invalid template '{modx_template}'. Expected one of {valid_templates}")
                
    # Check parent hierarchy
    parent_ids = {r.get('parent') for r in resources if r.get('parent') not in [0, None]}
    all_ids = {r['id'] for r in resources}
    for pid in parent_ids:
        if pid not in all_ids:
            # Check if parent is unpublished or deleted
            print(f"Warning: Parent ID {pid} is referenced but not in the published dataset.")
            
    # Check boolean values matching
    for r in resources:
        for field in ['isfolder', 'hidemenu']:
            val = r.get(field)
            if val not in [0, 1, None]:
                errors.append(f"Resource {r['id']} has non-boolean like value for {field}: {val}")
                
    # Summary
    if errors:
        print(f"Validation FAILED with {len(errors)} errors:")
        for err in errors[:10]:
            print(f" - {err}")
        if len(errors) > 10:
            print(f" ... and {len(errors) - 10} more.")
    else:
        print("Validation PASSED: All templates are correctly mapped to the Strapi 'templateId' enum.")
        print("Hierarchy constraints and boolean fields look safe for migration.")
        print("Ready for import script.")

if __name__ == "__main__":
    verify_modx_data()
