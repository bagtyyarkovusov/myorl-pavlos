import json
import os

def localize_schema(schema_path):
    with open(schema_path, 'r', encoding='utf-8') as f:
        schema = json.load(f)
        
    # Make sure the content-type itself is localized
    if 'pluginOptions' not in schema:
        schema['pluginOptions'] = {}
    schema['pluginOptions']['i18n'] = {'localized': True}
    
    # Localize all content-bearing attributes
    for attr_name, attr_def in schema['attributes'].items():
        # Typically you want to localize text, rich text, components, dynamic zones
        # Things like uid (slug) might be localized so the URL can change per language
        # Media can be localized if you want different images per language, but often it's shared. Let's localize text.
        # It's usually safe to localize all fields except maybe relations that should be shared. Let's localize everything to be safe for this specific site where pages are 1:1 translations.
        if 'pluginOptions' not in attr_def:
            attr_def['pluginOptions'] = {}
        attr_def['pluginOptions']['i18n'] = {'localized': True}
        
    with open(schema_path, 'w', encoding='utf-8') as f:
        json.dump(schema, f, indent=2, ensure_ascii=False)
        
def process():
    localize_schema('backend/src/api/page/content-types/page/schema.json')
    localize_schema('backend/src/api/tag/content-types/tag/schema.json')
    print("Localization enabled for Page and Tag schemas.")

if __name__ == "__main__":
    process()
