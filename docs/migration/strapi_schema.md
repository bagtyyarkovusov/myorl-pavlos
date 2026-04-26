# Strapi Migration Guide: MODX Schema Adaptation

This document details how to adapt the extracted MODX SQL schema—particularly the Template Variables (TVs)—into a modern Headless CMS architecture using **Strapi**.

## 1. Core Resource (Page/Article) Schema Mapping

The base fields from `modx_site_content` map cleanly to standard Strapi fields in a Collection Type (e.g., `Page` or `Article`).

| MODX Field | Strapi Type | Notes |
| :--- | :--- | :--- |
| `pagetitle` | String (Short text) | Required. Can be used as the Display Field. |
| `longtitle` | String (Short text) | Optional. |
| `description` | Text (Long text) | Used for SEO meta description. |
| `alias` | UID | Strapi's UID field can automatically generate from `pagetitle`. |
| `introtext` | Text (Long text) | Summary / Excerpt. |
| `content` | Rich Text (Blocks / Markdown) | Main body content. |
| `published` | Draft/Publish System | Strapi has a native Draft/Publish system. You do not need a boolean field for this. |
| `createdon`, `editedon` | Native Timestamps | Strapi automatically handles `createdAt`, `updatedAt`, `publishedAt`. |
| `parent` | Relation (One-to-Many or Many-to-One) | To recreate the hierarchy, create a Relation field pointing to the same Collection Type (e.g., a "Parent Page" relation). |

## 2. Template Variables (TVs) Deep Dive & Strapi Mapping

The most complex part of a MODX migration is the Template Variables (TVs). Based on the analysis of `modx_site_tmplvars`, here is the detailed mapping to Strapi types.

### Standard Field Types

| MODX TV Type | Example TVs | Strapi Mapping |
| :--- | :--- | :--- |
| **`text`** | `metaTitle`, `class`, `articleAuthor` | **String** (Short Text) |
| **`textarea`** | `metaDescription`, `infoBlockTop` | **Text** (Long Text) |
| **`richtext`** | `infoBlockBottom`, `sources` | **Rich Text** |
| **`image`** | `image`, `imageVideo`, `imageCenter` | **Media** (Single Media, images only) |
| **`file`** | `videoMp4`, `videoWebm` | **Media** (Single Media, video files) |
| **`url`** | `url` | **String** (Short Text, with URL validation Regex) |

### Complex & Custom Field Types

MODX uses specific custom types that require special handling in Strapi.

#### 1. `autotag` (Tags)
*   **Examples:** `metaKeywords`, `tags`, `videoTags`
*   **MODX Behavior:** Comma-separated strings used for tagging.
*   **Strapi Adaptation:** 
    *   *Best Practice:* Create a separate **Collection Type** called `Tag`. In your `Page` collection, add a **Relation** field (Many-to-Many) pointing to the `Tag` collection. This allows for centralized tag management.
    *   *Alternative:* Use a **JSON** field to store an array of strings, though this is harder to query.

#### 2. `migx` (Repeatable Data Grids)
*   **Examples:** `migxGallery`, `migxAccordion`, `migxSocial`, `migxTabs`, `migxPromoSlider`, `migxFaq`
*   **MODX Behavior:** MIGX stores an array of JSON objects. It acts like a repeatable matrix of fields.
*   **Strapi Adaptation:** These map perfectly to Strapi's **Components** (marked as Repeatable).
    *   **Example (FAQ):** Create a Strapi Component called `FAQ Item` with two fields: `question` (String) and `answer` (Text). In your `Page` collection, add a Repeatable Component field called `FAQ` that uses the `FAQ Item` component.
    *   **Example (Gallery):** Create a Component with an `image` (Media) and `caption` (String), and make it repeatable.
    *   *Note:* If pages can have completely different structures (e.g., one page has an Accordion, another has a Video Grid), use a Strapi **Dynamic Zone** to allow content editors to mix and match these components on the fly.

#### 3. `maplocationtv` & Custom Coordinates
*   **Examples:** `location`, `AffiliateCoords`
*   **MODX Behavior:** Stores coordinates or Google Maps data.
*   **Strapi Adaptation:** Store as a **JSON** field (e.g., `{"lat": 37.9838, "lng": 23.7275}`) or create a custom Component called `Coordinates` with two Number fields (Decimal) for `latitude` and `longitude`.

#### 4. `hidden` (Babel Translation Links)
*   **Examples:** `babelLanguageLinks`
*   **MODX Behavior:** Used by the Babel plugin to link translated versions of a page.
*   **Strapi Adaptation:** **Do not migrate this field directly.** Instead, enable Strapi's native **Internationalization (i18n)** plugin. When migrating the data, use the Strapi API to link the localized versions of the entries together using Strapi's built-in localization relationships.

---

## 3. Recommended Strapi Architecture

To cleanly migrate this MODX site, build the following architecture in Strapi:

### Collection Types

1.  **Page (or Article)**
    *   `title` (String)
    *   `slug` (UID based on title)
    *   `content` (Rich Text)
    *   `excerpt` (Text)
    *   `parentPage` (Relation -> Page)
    *   `seo` (Component: SEO - containing metaTitle, metaDescription)
    *   `tags` (Relation -> Tag)
    *   `featuredImage` (Media)
    *   `pageBlocks` (Dynamic Zone - to handle MIGX items like Accordions, Galleries, Tabs, FAQs)
2.  **Tag**
    *   `name` (String)

### Components

To handle the MIGX TVs, create these components in Strapi:

1.  **SEO (Category: Shared)**
    *   `metaTitle` (String)
    *   `metaDescription` (Text)
2.  **Accordion Item (Category: Blocks)**
    *   `title` (String)
    *   `content` (Rich Text)
3.  **FAQ Item (Category: Blocks)**
    *   `question` (String)
    *   `answer` (Text)
4.  **Location (Category: Shared)**
    *   `latitude` (Decimal)
    *   `longitude` (Decimal)
    *   `address` (String)

## 4. Migration Strategy Summary

1.  **Extract Data:** Use the `data/source/modx/published_resources.json` generated previously.
2.  **Process MIGX Data:** Write an intermediate script to parse the JSON strings inside the `template_variables` (e.g., parsing the raw MIGX JSON string into an array of objects).
3.  **Strapi REST API / GraphQL:** Write a Node.js or Python script to iterate over the extracted JSON and POST the data to Strapi.
    *   *Step 1:* Import media files (images/videos) to the Strapi Upload endpoint first and get their IDs.
    *   *Step 2:* Import Tags and get their IDs.
    *   *Step 3:* Import the Pages. Since pages have parent-child relationships, import root pages first, then child pages, assigning the `parentPage` relation using the IDs returned from Strapi.
    *   *Step 4:* Map the parsed MIGX data into the Strapi Dynamic Zone payload.
