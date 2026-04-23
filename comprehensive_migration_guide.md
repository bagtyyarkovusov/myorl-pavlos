# Comprehensive MODX to Strapi Migration Guide

This document provides an end-to-end, actionable plan for migrating the existing MODX SQL database and its associated assets to a modern Strapi headless CMS architecture.

## Phase 1: Pre-Migration Setup & Preparation

**Goal:** Establish the target environment and prepare the data sources.

### Step 1.1: Strapi Architecture Setup
Before importing any data, you must configure the Strapi Content Types to match the legacy MODX schema.

1.  **Initialize Strapi:** Create a new Strapi project (`npx create-strapi-app@latest my-project`).
2.  **Create Components:**
    *   `Shared.SEO`: Fields -> `metaTitle` (String), `metaDescription` (Text).
    *   `Shared.Location`: Fields -> `latitude` (Decimal), `longitude` (Decimal), `address` (String).
    *   `Blocks.AccordionItem`: Fields -> `title` (String), `content` (Rich Text).
    *   `Blocks.FAQItem`: Fields -> `question` (String), `answer` (Text).
    *   `Blocks.GalleryImage`: Fields -> `image` (Media), `caption` (String).
3.  **Create Collection Types:**
    *   `Tag`: Fields -> `name` (String).
    *   `Page` (or `Article`):
        *   `title` (String)
        *   `slug` (UID attached to title)
        *   `content` (Rich Text)
        *   `excerpt` (Text)
        *   `seo` (Component: Shared.SEO)
        *   `parentPage` (Relation: Page has many Pages)
        *   `tags` (Relation: Page has many Tags)
        *   `featuredImage` (Media)
        *   `pageBlocks` (Dynamic Zone using Blocks components)

### Step 1.2: Prepare the Migration Script Environment
Create a Node.js or Python environment that will handle the ETL (Extract, Transform, Load) pipeline.

1.  Initialize a script project (e.g., `npm init -y` or `python -m venv env`).
2.  Install required libraries:
    *   **Node.js:** `axios` (for API requests), `cheerio` (for HTML parsing), `form-data` (for file uploads).
    *   **Python:** `requests`, `beautifulsoup4`.
3.  Ensure the exported JSON files (`published_resources_flat.json`, `tv_definitions.json`) and the `uploads` folder are accessible to the script.

---

## Phase 2: Asset Migration (The Mapping Phase)

**Goal:** Move physical files into Strapi's Media Library and generate a URL mapping dictionary.

### Step 2.1: Upload Assets
Write a script loop to iterate through the legacy `uploads/` directory.

1.  Read each file (e.g., `uploads/IMG_2167.JPG`).
2.  Use `multipart/form-data` to `POST` the file to Strapi's upload endpoint: `POST http://localhost:1337/api/upload`.
3.  Capture the response from Strapi, which contains the new Media `id` and `url`.

### Step 2.2: Build the Asset Mapping Dictionary
Save the mapping of the old local path to the new Strapi ID and URL. Store this in memory or write it to a `asset_map.json` file.

*Example Mapping:*
```json
{
  "uploads/IMG_2167.JPG": {
    "strapi_id": 45,
    "strapi_url": "/uploads/IMG_2167_a8f9c.JPG"
  }
}
```

---

## Phase 3: Data Transformation (HTML Modernization)

**Goal:** Cleanse legacy HTML and inject the new asset URLs before pushing to Strapi.

### Step 3.1: HTML Cleansing
For every resource in `published_resources_flat.json`, process the `content`, `introtext`, and any rich text Template Variables (TVs).

1.  Load the HTML string into a parser (`BeautifulSoup` or `Cheerio`).
2.  **Strip Inline Styles:** Find all elements (`*`) and remove the `style` attribute.
3.  **Remove Legacy Attributes:** Strip `align`, `valign`, `border`, `cellpadding`, `cellspacing`, `bgcolor`.
4.  **Modernize Tags:**
    *   Unwrap `<font>` tags (remove the tag but keep the inner text).
    *   Convert `<b>` to `<strong>`.
    *   Convert `<i>` to `<em>`.
    *   Convert `<u>` to `<span class="underline">`.
    *   Convert `<tt>` to `<code>`.

### Step 3.2: Asset URL Replacement
While the HTML is loaded in the parser, find all `<img>` and `<a>` tags.

1.  Extract the `src` or `href` attribute.
2.  Check if the path starts with `uploads/` and exists in your `asset_map.json`.
3.  If a match is found, replace the old path with the new `strapi_url`.
4.  Export the cleaned, updated HTML string back into the JSON payload.

---

## Phase 4: Data Migration (Content Injection)

**Goal:** POST the transformed data into the Strapi CMS.

### Step 4.1: Migrate Tags
1.  Extract all unique tags from the `autotag` TVs (e.g., `metaKeywords`, `tags`, `videoTags`).
2.  `POST` each unique tag to the Strapi `/api/tags` endpoint.
3.  Create a Tag Mapping Dictionary: `{"TagName": strapi_tag_id}`.

### Step 4.2: Parse MIGX (Repeatable Data)
For resources containing `migx` TVs (e.g., `migxAccordion`, `migxFaq`), parse the raw JSON string stored in the TV value into actual JSON objects. Map these objects to fit the schema of the Strapi Dynamic Zone components (`pageBlocks`) created in Step 1.1.

### Step 4.3: Migrate Root Pages
Because pages have a parent/child hierarchy, you must migrate the root pages first to obtain their new Strapi IDs.

1.  Filter resources where `parent == 0`.
2.  Construct the Strapi payload:
    *   Map standard fields (`pagetitle` -> `title`).
    *   Map the cleaned HTML to `content`.
    *   Map image TV values (e.g., `image`) by looking up the `strapi_id` in the Asset Mapping Dictionary.
    *   Attach the Dynamic Zone blocks.
3.  `POST` to `/api/pages`.
4.  Save a mapping of `old_modx_id` -> `new_strapi_id`.

### Step 4.4: Migrate Child Pages
1.  Iterate through the remaining resources (where `parent != 0`).
2.  For each resource, look up its `parent` ID in the `old_modx_id -> new_strapi_id` mapping.
3.  Construct the payload, setting the `parentPage` relation field to the `new_strapi_id` of the parent.
4.  `POST` to `/api/pages`.
5.  If you have multiple levels of nesting, repeat this process level by level.

---

## Phase 5: Post-Migration & Validation

**Goal:** Verify data integrity and hand over to the frontend team.

1.  **Spot Check Content:** Log into the Strapi Admin panel. Open random pages and verify that the Rich Text editor contains clean formatting without hidden inline styles.
2.  **Verify Media Links:** Ensure that images within the rich text and featured images load correctly and point to Strapi's `/uploads/` directory.
3.  **Verify Hierarchy:** Check that parent/child relations are accurately reflected in the Strapi entries.
4.  **Static Asset Handoff:** Provide the `/template/` folder (CSS, JS, static images) to the frontend developers to integrate into the new frontend repository (e.g., Next.js `public` directory).
