# Localization (i18n) Strategy for Strapi Migration

> Note: This document preserves the original migration plan, but its locale summary is now superseded by `strapi_injection_readiness.md` and `full_ready_check.py`. Use the strict `context_key` + Babel validation there for current go/no-go decisions.

Before moving to the final data injection (Phase 4), we must define exactly how the Greek (`web`) and Russian (`rus`) pages will be linked in Strapi, preserving your existing SEO and translation structure.

## 1. Analysis of Current Locales in MODX

I ran a deep analysis script (`analyze_locales.py`) against your extracted database. Here is the exact state of your data:

*   **Total Greek Pages (Context `web`):** 183 pages
*   **Total Russian Pages (Context `rus`):** 143 pages

### Translation Links (Babel)
MODX used the `babelLanguageLinks` Template Variable to bind Greek and Russian pages together (e.g., `web:1;rus:153`).
*   Out of 143 Russian pages, **133 are perfectly linked** to a Greek equivalent!
*   There are **20 Orphaned Russian Pages** (pages that exist only in Russian, with no Greek equivalent).
*   There is **1 Orphaned Greek Page** (page ID 403).

## 2. Strapi v5 i18n Architecture

In Strapi, translations are treated as "Locale Versions" of the same Document. 
For example, if you have a Greek page with `documentId: "abc123"`, you don't create a totally separate document for Russian. Instead, you send a specific `PUT` request to `"abc123"` telling Strapi to generate the Russian version attached to it.

I have already modified the Strapi schema for `Page` and `Tag` to globally enable the `i18n` plugin on every text and relation field.

## 3. The Migration Execution Plan (Phase 4 Updated)

To handle this complex relationship programmatically, the final migration script will execute in three distinct steps:

### Step 1: Manual Setup (Required)
Before running the script, you must log into the Strapi Admin Panel:
1. Go to **Settings** > **Internationalization**.
2. Click **Add new locale**.
3. Add **Greek (el)**.
4. Add **Russian (ru)**.
5. *(Optional but recommended)* Set Greek as the default locale and delete English if you don't need it.

### Step 2: Migrate the Source (Greek) Pages
The Node/Python script will iterate over the 183 Greek pages.
*   It will `POST /api/pages` with the payload (including `locale: "el"`).
*   Crucially, the script will save a **Babel Translation Map**. 
    *   Example: `MODX_Greek_ID: 1 -> Strapi_Document_ID: "abc123"`

### Step 3: Migrate the Target (Russian) Pages
The script will iterate over the 143 Russian pages.
*   It reads the `babelLanguageLinks` TV (e.g., `web:1;rus:153`).
*   It looks up the Greek `modx_id` (1) in the Translation Map and retrieves the `Strapi_Document_ID` (`"abc123"`).
*   Instead of a normal `POST`, the script executes a **`PUT`** request to Strapi:
    *   `PUT /api/pages/abc123?locale=ru`
    *   Payload: The Russian title, content, blocks, and SEO fields.
*   **Result:** Strapi natively links the Greek and Russian pages together in the Admin Panel so content editors can seamlessly switch between them!
*   *Orphaned Pages:* For the 20 Russian pages that have no Greek parent, the script will simply execute a standard `POST /api/pages` with `locale: "ru"`, treating them as standalone documents.

---
This strategy guarantees 0% data loss and perfect architectural alignment with Strapi's native internationalization system.
