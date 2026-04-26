# Strapi home page checklist (el + ru)

Use this when editing the **index** page in Strapi. Aligns with `PageDTO` + `pageSections` in the frontend.

## Page fields

- [ ] `title` and `excerpt` set (hero); avoid placeholder slugs like “menu”.
- [ ] `content` and/or `excerpt` for the about block as needed.
- [ ] `featuredImage` and/or `imageCenter` — set `alternativeText` on every media; use a distinct second image for about when possible.
- [ ] `pageSections` order matches your story (first **linked-resources** = topic hub for the focus grid when you use a single block).

## Sections to verify

- [ ] **Linked resources** — each item: title, short description (not empty), `targetPage` or `targetUrl` (not only sitemap).
- [ ] **Second linked-resources (optional)** — if present, the frontend uses the **first** for the large focus grid and the **second** for the article row.
- [ ] **Promo slider** — images + targets where used.
- [ ] **Advantages** — short titles, `icon` as short label, descriptions; no longer mixed into the focus card grid in the app.
- [ ] **Video** — `thumbnail` on items used in the hero/teaser; full list is not duplicated on the home (teaser + link to video index).
- [ ] **Gallery / promo** — can supply a fallback clinic still for the about or video area.
- [ ] **Social** — every link: name, valid URL, recognised platform.
- [ ] **Contact** — details + clinic names and addresses; mirror section structure in both locales.

## After publish

- [ ] Open `/el` and `/ru` — confirm no long fallback focus cards (means sections are present).
- [ ] Run `npm run build` in `frontend` after template changes.
