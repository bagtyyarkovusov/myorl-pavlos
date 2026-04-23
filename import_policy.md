# Import policy (pragmatic-drop)

Every MODX source field has one of four fates during the Strapi injection.
This document is the single source of truth for those decisions; the
readiness audit (`injection_readiness.py`) and the importer (`strapi_importer.py`)
both enforce it.

## Classification buckets

- **direct** - the field maps 1:1 to a Strapi attribute, no transformation.
- **transform** - the value is reshaped (e.g. MIGX JSON -> dynamic zone, Babel TV -> `babel_normalization.json`).
- **drop(policy)** - the field carries no information we want in Strapi; dropping it is intentional and reported.
- **drop(system)** - the field is MODX-internal plumbing (cache flags, auditing columns, tree-view flags) and carries no content.
- **unmapped** - no decision yet; a blocker in the readiness audit.

Dropped fields are never silently removed: `transform_data.py` records the
source values under `_import.drops` on every affected resource so the
importer can log them to `import_log.json`.

## SEO precedence

The Strapi `shared.seo` component receives a single `metaTitle` and
`metaDescription` per locale. Precedence is deterministic:

| Target            | 1st source                  | 2nd source                         | 3rd source                      |
|-------------------|-----------------------------|------------------------------------|---------------------------------|
| `metaTitle`       | TV `metaTitle`              | `description` (plain-text)         | `longtitle` / `pagetitle`       |
| `metaDescription` | TV `metaDescription`        | `description` (plain-text)         | empty string                    |

`longtitle` is therefore never written as-is; it survives only as a fallback
source for `metaTitle`.

## Direct map (MODX column -> Strapi attribute)

| MODX column  | Strapi attribute         |
|--------------|--------------------------|
| `pagetitle`  | `title`                  |
| `alias`      | `slug` (verbatim when set; see slug rules below) |
| `content`    | `content`                |
| `introtext`  | `excerpt`                |
| `parent`     | `parentPage` (resolved)  |
| `menuindex`  | `menuIndex`              |
| `isfolder`   | `isFolder`               |
| `hidemenu`   | `hideFromMenu`           |
| `template`   | `templateId` (`template_{n}`) |
| `published`  | `publishedAt`            |
| `context_key`| `locale` (`web` -> `el`) |

Slug rules (per `context_key` / locale): if MODX `alias` is non-empty, it is
copied into `_import.slug` **unchanged** after trimming whitespace (legacy URL
parity). If `alias` is empty, the slug is ASCII-transliterated from `pagetitle`
and collisions among those derived-only slugs append `-{MODX id}`. Duplicate
non-empty aliases in one locale yield duplicate `_import.slug` values and must
be fixed in source or Strapi. Downstream code reads `_import.slug`, not `alias`
directly.

## Slug parity migration (existing Strapi data)

When Strapi `Page.slug` diverges from the MODX **`alias`** (legacy flat URL
segment), use the parity tools at the repo root:

1. **Analyze** — [`slug_parity_analyze.py`](slug_parity_analyze.py) joins
   [`published_resources_flat.json`](published_resources_flat.json) (or
   [`transformed_resources.json`](transformed_resources.json)),
   [`checkpoint.json`](checkpoint.json) (`pages.web` / `pages.rus` → Strapi
   `documentId`), and live Strapi `GET /api/pages` to emit
   [`slug_parity_report.json`](slug_parity_report.json). Rows with
   `blocked_reason: collision` need editorial resolution; `swap_pair` rows can
   be applied with a two-phase temp slug sequence.

   Options: `--skip-strapi` builds MODX-side rows only (no `change_needed`
   flags); `--output` to choose the report path.

2. **Review** — Inspect `summary` and `rows` in the report; resolve collisions
   before writing.

3. **Apply** — [`slug_parity_apply.py`](slug_parity_apply.py) defaults to
   **dry-run** (logged `PUT`s, no writes). Use `--apply` after backing up the DB
   (e.g. copy `backend/.tmp/data.db` in local SQLite dev). Failures append to
   [`slug_migration_errors.json`](slug_migration_errors.json).

   Flags: `--include-swaps` for documented `swap_pair` two-phase updates;
   `--document-id` to scope a single page; `--sleep-ms` to throttle requests.

4. **Dependent content** — After slug changes, re-run
   [`internal_link_rewrite.py`](internal_link_rewrite.py) on transformed HTML
   (or a Strapi-side href pass) so `content` / TVs / `pageBlocks` do not keep
   `/{old-slug}` links. Then run
   [`sync_navigation_from_pages.py`](sync_navigation_from_pages.py) with
   `--merge` so navigation `path` / `uiRouterKey` match the new slugs (see
   [`docs/admin-hierarchy-ux.md`](docs/admin-hierarchy-ux.md)).

5. **Optional** — Emit Next.js `redirects` only for URLs that actually changed
   and still receive traffic.

## Transform map (TV -> Strapi)

| Template variable                 | Destination                                   |
|-----------------------------------|-----------------------------------------------|
| `metaTitle`                       | `seo.metaTitle`                               |
| `metaDescription`                 | `seo.metaDescription`                         |
| `image`                           | `featuredImage` (Strapi asset id)             |
| `imageCenter`                     | `imageCenter` (Strapi asset id)               |
| `infoBlockBottom`                 | `infoBlockBottom`                             |
| `articleAuthor`                   | `articleAuthor`                               |
| `sources`                         | `sources`                                     |
| `popUpClose`                      | `popUpClose`                                  |
| `url`                             | `externalUrl`                                 |
| `tags`                            | `tags` (via `tag_mapping.yaml`)               |
| `migxAccordion`                   | `pageBlocks[blocks.accordion-item]`           |
| `migxFaq`, `migxResources`        | `pageBlocks[blocks.faq-item]`                 |
| `migxLocation`, `migxLocation2`   | `pageBlocks[blocks.clinic]`                   |
| `migxTabs`, `migxTabsLink`        | `pageBlocks[blocks.tab-item]`                 |
| `migxPromoSlider`                 | `pageBlocks[blocks.promo-slide]`              |
| `migxContacts`                    | `pageBlocks[blocks.contact-detail]`           |
| `migxSocial`                      | `pageBlocks[blocks.social-link]`              |
| `migxGallery`                     | `pageBlocks[blocks.gallery-image]`            |
| `migxVideo`                       | `pageBlocks[blocks.video]`                    |
| `migxAdvantages`                  | `pageBlocks[blocks.advantage]`                |
| `videoMp4`, `videoWebm`, `imageVideo`, `videoTags` | `pageBlocks[blocks.video]` (homepage) |
| `location`                        | `pageBlocks[shared.location]`                 |

`babelLanguageLinks` is not in the table: it is never consulted directly.
`babel_normalization.json` is authoritative for pairing.

## Policy drops

| Source key             | Reason                                                       |
|------------------------|--------------------------------------------------------------|
| `longtitle`            | Folded into `metaTitle` fallback; no Strapi field holds it.  |
| `menutitle`            | Strapi uses `title` for navigation.                          |
| `metaKeywords`         | `shared.seo` intentionally omits keywords (SEO best practice).|
| `babelLanguageLinks`   | Replaced by `babel_normalization.json`.                      |
| `AffiliateAddress`     | Affiliate block not modelled in this scope.                  |
| `AffiliatePhone`       | Same as above.                                               |
| `AffiliateEmail`       | Same as above.                                               |
| `AffiliateCoords`      | Same as above.                                               |

## System drops (MODX plumbing)

`cacheable`, `class_key`, `contentType`, `content_dispo`, `content_type`,
`createdby`, `createdon`, `deleted`, `deletedby`, `deletedon`, `donthit`,
`editedby`, `editedon`, `hide_children_in_tree`, `link_attributes`,
`privatemgr`, `privateweb`, `pub_date`, `publishedby`, `publishedon`,
`richtext`, `searchable`, `show_in_tree`, `type`, `unpub_date`, `uri`,
`uri_override`, `alias_visible`, `children`, `properties`.

These are either MODX cache flags, audit columns, or derived values (`uri`
is rebuilt by Strapi from `slug` and `parentPage`). They never reach Strapi.

## The `_import` block

After `transform_data.py` runs, every resource carries an `_import` sibling:

```json
{
  "_import": {
    "title": "...",
    "metaTitle": "...",
    "metaDescription": "...",
    "slug": "...",
    "templateId": "template_12",
    "drops": { "longtitle": "...", "menutitle": "...", "metaKeywords": "..." }
  }
}
```

`normalize_migx.py` (Phase 2) adds `_import.blocks` and the importer reads
every value from the `_import` sibling so upstream raw fields remain
untouched and re-runs are idempotent.
