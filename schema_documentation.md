# MODX SQL to JSON Migration Schema Documentation

## 1. Original SQL Schema Analysis

The source database is a dump from a **MODX Revolution CMS**. In MODX, the core content units (pages, links, symlinks) are referred to as "Resources". These resources are stored in the `modx_site_content` table.

Additional custom fields for these resources are stored using a pattern called Template Variables (TVs). The TV definitions are in `modx_site_tmplvars`, and the actual values assigned to resources are in `modx_site_tmplvar_contentvalues`.

### Key SQL Tables and Relationships

*   **`modx_site_content` (Resources):**
    *   **`id`** (Primary Key): Unique identifier for the resource.
    *   **`parent`** (Foreign Key): ID of the parent resource, establishing a tree/hierarchical structure. If `0`, it's a root resource.
    *   **`pagetitle`, `longtitle`, `description`, `alias`, `introtext`, `content`**: Core content fields.
    *   **`published`**: Boolean flag indicating if the resource is live (1 = published, 0 = draft).
    *   **`deleted`**: Boolean flag indicating if the resource is in the trash (1 = deleted, 0 = active).
    *   **`template`**: ID of the template assigned to the resource.
    *   **`createdon`, `editedon`, `publishedon`**: Unix timestamps for lifecycle events.
    *   **`uri`**: The generated URL path for the resource.

*   **`modx_site_tmplvars` (Template Variable Definitions):**
    *   **`id`** (Primary Key): Unique ID of the TV.
    *   **`name`**: The key/name of the custom field.
    *   **`type`**: The input type (text, image, listbox, etc.).

*   **`modx_site_tmplvar_contentvalues` (Template Variable Values):**
    *   **`id`** (Primary Key).
    *   **`tmplvarid`** (Foreign Key): Maps to `modx_site_tmplvars.id`.
    *   **`contentid`** (Foreign Key): Maps to `modx_site_content.id`.
    *   **`value`**: The actual content value of the TV for the specific resource.

### Data Extraction Rules Applied
*   **Published Only:** Filtered `modx_site_content` to only include rows where `published = 1` AND `deleted = 0`.
*   **No Information Omitted:** All columns from `modx_site_content` have been preserved.
*   **Relationship Mapping:**
    *   **Template Variables:** We joined `modx_site_tmplvar_contentvalues` and `modx_site_tmplvars` to inject a `template_variables` dictionary directly into each resource object.
    *   **Hierarchy:** We used the `parent` column to nest child resources into a `children` array within their parent resource.

---

## 2. Extracted JSON Schema

The exported data is available in two formats for flexibility during backend migration:
1.  **`published_resources.json`**: A nested tree structure (useful for NoSQL backends, headless CMS, or building navigation menus).
2.  **`published_resources_flat.json`**: A flat array of objects (useful for relational databases).

### JSON Object Structure

Each resource object in the JSON adheres to the following schema:

```json
{
  "id": "integer - Unique identifier",
  "type": "string - Type of resource (e.g., 'document')",
  "contentType": "string - MIME type (e.g., 'text/html')",
  "pagetitle": "string - The main title of the page",
  "longtitle": "string - Extended title (optional)",
  "description": "string - Meta description",
  "alias": "string - URL slug",
  "link_attributes": "string - HTML attributes for links",
  "published": "integer - 1 (since we filtered for published only)",
  "pub_date": "integer - Unix timestamp for scheduled publishing",
  "unpub_date": "integer - Unix timestamp for scheduled unpublishing",
  "parent": "integer - ID of the parent resource (0 if root)",
  "isfolder": "integer - 1 if it acts as a folder containing children, else 0",
  "introtext": "string - Summary or excerpt",
  "content": "string - The main HTML/Text body content",
  "richtext": "integer - 1 if rich text editor was used",
  "template": "integer - ID of the assigned template",
  "menuindex": "integer - Sort order in menus",
  "searchable": "integer - 1 if searchable",
  "cacheable": "integer - 1 if cacheable",
  "createdby": "integer - User ID of creator",
  "createdon": "integer - Unix timestamp of creation",
  "editedby": "integer - User ID of last editor",
  "editedon": "integer - Unix timestamp of last edit",
  "deleted": "integer - 0 (since we filtered out deleted items)",
  "deletedon": "integer - Unix timestamp (usually 0)",
  "deletedby": "integer - User ID (usually 0)",
  "publishedon": "integer - Unix timestamp of publication",
  "publishedby": "integer - User ID of publisher",
  "menutitle": "string - Short title for navigation menus",
  "donthit": "integer - Analytics tracking flag",
  "privateweb": "integer - Security flag",
  "privatemgr": "integer - Security flag",
  "content_dispo": "integer - Content disposition (0 = inline, 1 = attachment)",
  "hidemenu": "integer - 1 if hidden from menus",
  "class_key": "string - MODX class (e.g., 'modDocument')",
  "context_key": "string - Context (usually 'web')",
  "content_type": "integer - ID mapping to content type",
  "uri": "string - Full generated URL path",
  "uri_override": "integer - 1 if URI is manually overridden",
  "hide_children_in_tree": "integer - Manager UI flag",
  "show_in_tree": "integer - Manager UI flag",
  "properties": "string/json - Internal MODX properties",
  "alias_visible": "integer - UI flag",
  
  "template_variables": {
    "tv_name_1": "string - Value of the custom template variable",
    "tv_name_2": "string - Value of the custom template variable"
  },

  "children": [
    "array - (Only present in published_resources.json) Contains nested resource objects following this exact same schema."
  ]
}
```

### Migration Notes

When migrating to a new backend (e.g., Strapi, Contentful, WordPress, or a custom database):
1.  **Hierarchy:** If your target system uses nested relationships, import `published_resources.json` recursively. If it uses a relational `parent_id` column, import `published_resources_flat.json` and ensure the parent rows are inserted before child rows to satisfy foreign key constraints.
2.  **Custom Fields:** The `template_variables` dictionary should be mapped to custom fields, ACF (Advanced Custom Fields), or JSON columns in your target backend.
3.  **Content:** The `content` field contains the raw HTML/text payload.
4.  **Timestamps:** Dates (`createdon`, `editedon`, etc.) are Unix timestamps and will need to be converted to `DATETIME` or `TIMESTAMP` objects depending on your SQL/NoSQL target.