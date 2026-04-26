# Strapi Asset Migration Guide

Migrating assets from a traditional CMS like MODX to a Headless CMS like Strapi requires a specific strategy, because Strapi manages media through its own internal Media Library, which often alters the final URL path of the asset (e.g., appending hashes to filenames). 

Based on the analysis of your codebase (`/Users/bagtyyar/Downloads/public_html 2`), here is the strategy to migrate your assets without breaking existing relations.

## 1. Asset Directory Analysis

From the `public_html 2` directory, we identified three primary folders containing assets:

1.  **`/uploads/`**: Contains the bulk of your user-uploaded media (JPGs, PNGs, JPEGs, PDFs, DOCs). Examples include `IMG_2167.JPG`, `amygdalektomi sta paidia.jpg`, etc. **These must be migrated into Strapi's Media Library.**
2.  **`/assets/`**: In MODX, this usually contains plugin/component data, cache, and TinyMCE configurations. You generally **do not** need to migrate this folder to Strapi, as these are CMS-specific operational files.
3.  **`/template/`**: Contains your theme files (`css/`, `js/`, `img/`, `fonts/`). **Do not migrate these into Strapi.** Since Strapi is headless, these static template files should be moved directly into your new frontend application's static/public directory (e.g., the `public` folder in Next.js or Nuxt).

## 2. Strapi Media Library Behavior

When you upload a file to Strapi, it does not maintain the exact original folder path.
If you upload `uploads/image.jpg`, Strapi will process it, generate responsive thumbnails (if it's an image), and return a new object with a URL like `/uploads/image_hash83jd8.jpg`.

Because the URL changes, **we cannot just drag and drop the `uploads` folder into Strapi's public directory** if we want to use Strapi's media management features.

## 3. The Asset Migration Strategy

To ensure no paths break, the migration script must be executed in a specific order: **Assets First, Content Second.**

### Step 1: Uploading Files to Strapi
Write a Node.js or Python script that reads the files from your local `/Users/bagtyyar/Downloads/public_html 2/uploads` directory.
For each file, the script will `POST` the file to Strapi's `/api/upload` endpoint.

*Crucial Step:* Your script must maintain a **Mapping Dictionary**. When Strapi successfully uploads `IMG_2167.JPG`, it returns a JSON object with the new Strapi `id` and new Strapi `url`.
You must save this mapping:
```json
{
  "uploads/IMG_2167.JPG": {
    "id": 45,
    "new_url": "/uploads/IMG_2167_a8f9c.JPG"
  }
}
```

### Step 2: Updating Template Variables (TVs)
In MODX, Image/File TVs usually store the string path (e.g., `uploads/my_image.jpg`).
In Strapi, Media fields expect the integer `id` of the uploaded media.

When your migration script creates a `Page` in Strapi:
1. It looks at the old TV value: `"image": "uploads/my_image.jpg"`.
2. It looks up the Mapping Dictionary for `uploads/my_image.jpg` and finds `"id": 45`.
3. It sends `{"image": 45}` to the Strapi API.
*Result: The Strapi API perfectly links the media.*

### Step 3: Updating Rich Text Content (HTML)
In your `content`, `introtext`, and `richtext` TVs, you have raw HTML. Inside this HTML are `<img>` and `<a>` tags pointing to the old paths:
`<img src="uploads/IMG_2167.JPG" />` or `<a href="uploads/biografiko.doc">`

Before posting the `content` to Strapi, your migration script must perform a Regex Find-and-Replace:
1. Search the HTML string for `src="([^"]+)"` and `href="([^"]+)"`.
2. Check if the matched path exists in your Mapping Dictionary.
3. If it does, replace the old path with the `new_url` from the dictionary.
```html
<!-- Before -->
<img src="uploads/IMG_2167.JPG" />

<!-- After script regex replacement -->
<img src="/uploads/IMG_2167_a8f9c.JPG" />
```

## 4. Alternative "Quick & Dirty" Method (Not Recommended)
If you do not want to use Strapi's Media Library to manage legacy assets, you can bypass the upload process:
1. Copy the entire `/uploads/` folder into Strapi's `./public/` directory (so it becomes `./public/uploads/`).
2. Strapi will serve these files statically.
3. **The Problem:** These files will *not* appear in the Strapi Admin UI Media Library. If a content editor wants to change an image, they cannot select the old ones from the library. 

**Conclusion:** Implementing the Mapping Dictionary script (Step 3) is the only way to perfectly preserve relations while fully adopting Strapi's headless architecture.