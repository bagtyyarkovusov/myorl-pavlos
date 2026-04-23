import os
import json

def create_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if isinstance(content, dict):
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(content, f, indent=2)
    else:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
            
base = 'backend/src'

# COMPONENTS
components = {
    'shared/seo': {
        "collectionName": "components_shared_seos",
        "info": { "displayName": "SEO", "description": "" },
        "options": {},
        "attributes": {
            "metaTitle": { "type": "string" },
            "metaDescription": { "type": "text" }
        }
    },
    'shared/location': {
        "collectionName": "components_shared_locations",
        "info": { "displayName": "Location", "description": "" },
        "options": {},
        "attributes": {
            "latitude": { "type": "decimal" },
            "longitude": { "type": "decimal" },
            "address": { "type": "string" }
        }
    },
    'blocks/accordion-item': {
        "collectionName": "components_blocks_accordion_items",
        "info": { "displayName": "Accordion Item", "description": "" },
        "options": {},
        "attributes": {
            "title": { "type": "string" },
            "content": { "type": "richtext" }
        }
    },
    'blocks/faq-item': {
        "collectionName": "components_blocks_faq_items",
        "info": { "displayName": "FAQ Item", "description": "" },
        "options": {},
        "attributes": {
            "question": { "type": "string" },
            "answer": { "type": "text" }
        }
    },
    'blocks/gallery-image': {
        "collectionName": "components_blocks_gallery_images",
        "info": { "displayName": "Gallery Image", "description": "" },
        "options": {},
        "attributes": {
            "image": { "type": "media", "multiple": False, "required": False, "allowedTypes": ["images"] },
            "caption": { "type": "string" }
        }
    },
    # NEW COMPONENTS
    'blocks/tab-item': {
        "collectionName": "components_blocks_tab_items",
        "info": { "displayName": "Tab Item", "description": "" },
        "options": {},
        "attributes": {
            "title": { "type": "string" },
            "content": { "type": "richtext" },
            "link": { "type": "string" }
        }
    },
    'blocks/video': {
        "collectionName": "components_blocks_videos",
        "info": { "displayName": "Video", "description": "" },
        "options": {},
        "attributes": {
            "title": { "type": "string" },
            "videoMp4": { "type": "media", "multiple": False, "allowedTypes": ["videos"] },
            "videoWebm": { "type": "media", "multiple": False, "allowedTypes": ["videos"] },
            "thumbnail": { "type": "media", "multiple": False, "allowedTypes": ["images"] },
            "videoTags": { "type": "string" }
        }
    },
    'blocks/clinic': {
        "collectionName": "components_blocks_clinics",
        "info": { "displayName": "Clinic", "description": "" },
        "options": {},
        "attributes": {
            "name": { "type": "string" },
            "address": { "type": "string" },
            "phone": { "type": "string" },
            "email": { "type": "email" },
            "latitude": { "type": "decimal" },
            "longitude": { "type": "decimal" }
        }
    },
    'blocks/social-link': {
        "collectionName": "components_blocks_social_links",
        "info": { "displayName": "Social Link" },
        "attributes": {
            "name": { "type": "string" },
            "url": { "type": "string" },
            "icon": { "type": "string" }
        }
    },
    'blocks/promo-slide': {
        "collectionName": "components_blocks_promo_slides",
        "info": { "displayName": "Promo Slide" },
        "attributes": {
            "title": { "type": "string" },
            "description": { "type": "text" },
            "image": { "type": "media", "allowedTypes": ["images"] }
        }
    },
    'blocks/contact-detail': {
        "collectionName": "components_blocks_contact_details",
        "info": { "displayName": "Contact Detail" },
        "attributes": {
            "type": { "type": "string" },
            "value": { "type": "string" }
        }
    },
    'blocks/advantage': {
        "collectionName": "components_blocks_advantages",
        "info": { "displayName": "Advantage" },
        "attributes": {
            "title": { "type": "string" },
            "description": { "type": "text" },
            "icon": { "type": "string" }
        }
    }
}

for comp_path, schema in components.items():
    create_file(f'{base}/components/{comp_path}.json', schema)

# APIS
apis = {
    'tag': {
        "kind": "collectionType",
        "collectionName": "tags",
        "info": {
            "singularName": "tag",
            "pluralName": "tags",
            "displayName": "Tag",
            "description": ""
        },
        "options": {
            "draftAndPublish": False
        },
        "pluginOptions": {},
        "attributes": {
            "name": {
                "type": "string"
            },
            "pages": {
                "type": "relation",
                "relation": "manyToMany",
                "target": "api::page.page",
                "mappedBy": "tags"
            }
        }
    },
    'page': {
        "kind": "collectionType",
        "collectionName": "pages",
        "info": {
            "singularName": "page",
            "pluralName": "pages",
            "displayName": "Page",
            "description": ""
        },
        "options": {
            "draftAndPublish": True
        },
        "pluginOptions": {},
        "attributes": {
            "title": { "type": "string", "required": True },
            "slug": { "type": "uid", "targetField": "title" },
            "content": { "type": "richtext" },
            "excerpt": { "type": "text" },
            "seo": { "type": "component", "repeatable": False, "component": "shared.seo" },
            
            # Relation for hierarchy
            "parentPage": {
                "type": "relation",
                "relation": "manyToOne",
                "target": "api::page.page",
                "inversedBy": "childrenPages"
            },
            "childrenPages": {
                "type": "relation",
                "relation": "oneToMany",
                "target": "api::page.page",
                "mappedBy": "parentPage"
            },
            
            # Relation for tags
            "tags": {
                "type": "relation",
                "relation": "manyToMany",
                "target": "api::tag.tag",
                "inversedBy": "pages"
            },

            # Relation for related pages
            "relatedPages": {
                "type": "relation",
                "relation": "manyToMany",
                "target": "api::page.page"
            },
            
            "featuredImage": {
                "type": "media",
                "multiple": False,
                "required": False,
                "allowedTypes": ["images", "files", "videos", "audios"]
            },
            
            # New fields added based on analysis (excluding css class)
            "templateId": { "type": "integer" },
            "imageCenter": { "type": "media", "multiple": False, "allowedTypes": ["images"] },
            "infoBlockBottom": { "type": "richtext" },
            "externalUrl": { "type": "string" },
            "isFolder": { "type": "boolean", "default": False },
            "hideFromMenu": { "type": "boolean", "default": False },
            "menuIndex": { "type": "integer" },
            "articleAuthor": { "type": "string" },
            "sources": { "type": "richtext" },
            "popUpClose": { "type": "richtext" },

            "pageBlocks": {
                "type": "dynamiczone",
                "components": [
                    "blocks.accordion-item",
                    "blocks.faq-item",
                    "blocks.gallery-image",
                    "blocks.tab-item",
                    "blocks.video",
                    "blocks.clinic",
                    "blocks.social-link",
                    "blocks.promo-slide",
                    "blocks.contact-detail",
                    "blocks.advantage",
                    "shared.location"
                ]
            }
        }
    }
}

for api_name, schema in apis.items():
    api_dir = f'{base}/api/{api_name}'
    
    # schema
    create_file(f'{api_dir}/content-types/{api_name}/schema.json', schema)
    
    # boilerplate TS files
    create_file(f'{api_dir}/controllers/{api_name}.ts', f"import {{ factories }} from '@strapi/strapi';\nexport default factories.createCoreController('api::{api_name}.{api_name}');\n")
    create_file(f'{api_dir}/services/{api_name}.ts', f"import {{ factories }} from '@strapi/strapi';\nexport default factories.createCoreService('api::{api_name}.{api_name}');\n")
    create_file(f'{api_dir}/routes/{api_name}.ts', f"import {{ factories }} from '@strapi/strapi';\nexport default factories.createCoreRouter('api::{api_name}.{api_name}');\n")

print("Created and updated components and API schemas successfully.")