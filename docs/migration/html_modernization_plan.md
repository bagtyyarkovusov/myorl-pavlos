# HTML Content Modernization Plan

When migrating from an older CMS like MODX to a modern Headless CMS like Strapi, the embedded HTML content often contains legacy tags and inline styles. These violate modern frontend principles (like separation of concerns) and can break or override your new frontend CSS (React, Vue, Next.js, etc.).

## 1. Analysis of Current HTML

We ran an analysis on the `content`, `introtext`, and all Rich Text `template_variables` in the extracted MODX SQL database. 

### Legacy Tags Detected
*   **`<font>` (4,702 occurrences):** This tag is completely deprecated in HTML5 and must be removed.
*   **`<b>` (74 occurrences):** Should be replaced with the semantic `<strong>`.
*   **`<u>` (13 occurrences):** Should generally be avoided or replaced with CSS (e.g., `<span class="underline">`).
*   **`<tt>` (1 occurrence):** Deprecated. Should be `<code>` or `kbd`.

### Inline Styles Detected
There is heavy use of inline `style="..."` attributes across the codebase, which will override modern stylesheets:
*   `<p>`: 1,277 elements have inline styles
*   `<h5>`, `<h4>`, `<h6>`, `<h3>`, `<h2>`: 769 headings have inline styles
*   `<img>`: 211 images have inline styles
*   `<span>`: 115 elements have inline styles

## 2. When is the "Correct Time" to Modernize?

The absolute best time to modernize the HTML is **during the Data Transformation Phase** of your migration script—*before* the data is POSTed to the Strapi API.

**Why?**
1.  **Data Integrity:** You ensure that Strapi only receives clean, pure, semantic HTML.
2.  **Editor Experience:** When content editors open the rich text editor in Strapi, they won't see invisible inline styles or broken legacy tags that they cannot easily remove.
3.  **Frontend Safety:** Your new frontend developers will not have to write `!important` CSS rules to override legacy inline styles injected from the database.

**The Pipeline:**
`Extracted JSON` -> `Transformation Script (Strips HTML & Updates Assets)` -> `POST to Strapi API`

## 3. How to Execute the Modernization

If you are using **Python** for your migration script, you should use the `BeautifulSoup` library. If you are using **Node.js**, use `cheerio` or `jsdom`.

Here is the exact transformation logic you need to apply to every HTML field (`content`, `introtext`, and rich text TVs) before uploading to Strapi.

### Example Transformation Script (Python with BeautifulSoup)

```python
from bs4 import BeautifulSoup
import copy

def modernize_html(raw_html):
    if not raw_html or not isinstance(raw_html, str):
        return raw_html
        
    soup = BeautifulSoup(raw_html, 'html.parser')
    
    # 1. Remove all inline style attributes from EVERY tag
    for tag in soup.find_all(True):
        if 'style' in tag.attrs:
            del tag['style']
            
        # Optional: Remove other legacy presentation attributes
        if 'align' in tag.attrs:
            del tag['align']
        if 'bgcolor' in tag.attrs:
            del tag['bgcolor']
        if 'border' in tag.attrs:
            del tag['border']

    # 2. Handle Deprecated <font> tags
    # We replace <font> with <span>. If it has no classes, it just becomes a semantic wrapper.
    # Alternatively, you can use tag.unwrap() to remove the tag entirely but keep the text.
    for font_tag in soup.find_all('font'):
        font_tag.unwrap() # Removes <font> but keeps the text inside

    # 3. Replace <b> with <strong>
    for b_tag in soup.find_all('b'):
        b_tag.name = 'strong'

    # 4. Replace <i> with <em>
    for i_tag in soup.find_all('i'):
        i_tag.name = 'em'
        
    # 5. Handle <u> (Underline)
    for u_tag in soup.find_all('u'):
        u_tag.name = 'span'
        u_tag['class'] = u_tag.get('class', []) + ['text-underline']
        
    # 6. Handle <tt> (Teletype)
    for tt_tag in soup.find_all('tt'):
        tt_tag.name = 'code'

    # Return the cleaned HTML string
    return str(soup)

# Example usage during migration:
# page_payload["content"] = modernize_html(page_payload["content"])
```

## 4. Modernization Checklist for the Migration Script

1. [ ] Parse the raw HTML string using a DOM parser (do not use simple regex for this, as HTML is not regular).
2. [ ] Strip all `style=""` attributes.
3. [ ] Strip all legacy layout attributes (`align`, `valign`, `border`, `cellpadding`, `cellspacing`).
4. [ ] `.unwrap()` all `<font>` tags (removes the tag, leaves the inner text).
5. [ ] Convert `<b>` to `<strong>` and `<i>` to `<em>`.
6. [ ] Remove empty tags (e.g., `<p></p>` or `<span></span>`) that might have been left over after stripping content.
7. [ ] (Optional) Apply the Asset Migration logic to swap the old image `src` URLs with the new Strapi URLs at the same time.
