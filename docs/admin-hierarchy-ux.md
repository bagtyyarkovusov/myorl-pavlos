# Admin hierarchy UX — editor cheat sheet

This document explains how the Strapi admin has been tuned to make the
hierarchical `Page` content type easier to edit and browse.

## TL;DR for editors

| You want to… | Use |
|---|---|
| See pages as a tree (expand / collapse, drag-and-drop reorder) | **Navigation** (left sidebar → Navigation) |
| Create, edit, translate, publish a page | **Content Manager → Page** |
| Pick a parent page for an entry | The **Parent page** relation at the top of the Page edit view |
| Change the order of sibling pages | The **Menu order** integer field (`menuIndex`) — lower = first |
| Mark a node as folder-only (groups children in the page tree) | The **Is folder** toggle (sync still emits an INTERNAL nav link to that page) |
| Hide a page from site navigation | The **Hide from menu** toggle |

Rule of thumb:
- **Content Manager is the source of truth.** Every page lives there.
- **Navigation is a browser / menu builder on top of it.** It mirrors pages
  into a drag-and-drop tree you can expose on the frontend via
  `GET /api/navigation/render/<slug>?type=TREE`.

## What was changed

### 1. Content Manager view configuration

Seeded by [backend/src/bootstrap/content-manager-config.ts](../backend/src/bootstrap/content-manager-config.ts)
on first server start. Applies to `api::page.page` and `api::tag.tag`.

- **Page edit view** is grouped top-to-bottom as:
  1. Identity — `title`, `slug`
  2. Hierarchy — `parentPage`, `menuIndex`, `isFolder`, `hideFromMenu`, `childrenPages`, `templateId`
  3. Taxonomy — `tags`, `relatedPages`
  4. Summary — `excerpt`, `articleAuthor`
  5. Body — `content`, `pageBlocks`, `infoBlockBottom`
  6. Media — `featuredImage`, `imageCenter`
  7. SEO — `seo`, `externalUrl`
  8. Extras — `sources`, `popUpClose`
- **Relations show human-readable titles** (parent/children/related → Page title, tags → Tag name) instead of IDs.
- **Relations open in a new tab** so navigating to a parent/child from the edit view doesn't lose your current edit context.
- **List view** defaults to sorting by `menuIndex ASC` and exposes `title`, `slug`, `menuIndex`, `isFolder`, `hideFromMenu` as columns. Parent selection remains in the edit view to keep the list configuration resilient across Strapi upgrades.

If editors tweak the views later in the admin UI their changes persist — the
seeder is gated by a `hierarchy_ui_seed_version` marker in `strapi_core_store_settings` and
only re-applies when that version is bumped in the seeder file.

### 2. Navigation plugin

Installed `strapi-plugin-navigation` and configured in
[backend/config/plugins.ts](../backend/config/plugins.ts) against `api::page.page`, with up to 6 levels of nesting and i18n auto-detected.

A Navigation left-nav item appears for Super Admin, Editor, and Author roles
(permissions seeded by [backend/src/bootstrap/navigation-permissions.ts](../backend/src/bootstrap/navigation-permissions.ts)):

- Super Admin: read + update + settings
- Editor: read + update
- Author: read only

To create the browsable tree:
1. Go to **Navigation** in the admin.
2. A default navigation with slug `navigation` is auto-created in the default locale (`el`). You can rename its **display name** without changing the slug, or create additional navigations per site.
3. Drag pages from the picker into the tree; nest with indent.
4. Save. Clicking a node jumps to the Page's edit view.

The public API (protected by your usual auth / public-role permissions) is
`GET /api/navigation/render/navigation?type=TREE&locale=el`
(or `?locale=ru`).

### Localization of the navigation tree

`strapi-plugin-navigation` does **not** render one shared tree across locales
— it always stores one independent tree per locale. For this project, the
safe repeatable workflow is now:

1. Treat the `Page` content type as the source of truth.
2. Build the `el` navigation directly from published `el` pages.
3. Build the `ru` navigation directly from published `ru` pages.
4. Omit any `el` page from `ru` when no Russian translation exists, and
   report the omission.
5. Include `ru`-only pages directly in the `ru` tree instead of depending on
   copy-from-`el` bootstrap.

This avoids drift and makes reruns deterministic during migration.

Config knobs that support this workflow
(in [backend/config/plugins.ts](../backend/config/plugins.ts)):

- `cascadeMenuAttached: true` — children inherit the *menuAttached* flag
  from their parent, so hiding a branch hides everything under it.
- `pruneObsoleteI18nNavigations: true` — when a navigation (the shell, not
  individual items) is deleted in the default locale, the same-`documentId`
  copies in other locales are cleaned up instead of lingering as ghosts.

### Import / sync from the Page hierarchy

Use [sync_navigation_from_pages.py](../sync_navigation_from_pages.py) for all
future rebuilds. It reads published `Page` entries, reconstructs the
hierarchy from `parentPage` / `menuIndex`, skips `hideFromMenu`, and emits
**INTERNAL** navigation items for every page (including folder-only section
roots) so each row links to `api::page.page` with `path` derived from the
slug. We do **not** use `WRAPPER` for page-backed nodes anymore so `el` and
`ru` stay aligned; `--dry-run` prints `former_wrapper_candidates` for audit
(rows that would previously have become WRAPPER).

**Path and `uiRouterKey`:** each item’s `uiRouterKey` matches the Page `slug`
when the slug is set (empty slug falls back to a title-derived ASCII key).
The home page (`slug` `index`) uses **`path` `/`** while `uiRouterKey` stays
`index` so the Page slug and router key stay identical. Stored item paths are
kept as leaf segments in the sync payload, but the Navigation plugin render
endpoint may return breadcrumb-style nested display paths such as
`/plastika-litsa/fillers`. Next.js must treat `uiRouterKey` or the related
Page `slug` as the flat route key and must not use rendered navigation `path`
as the public URL.

The current Next.js scaffold enforces this in
[`frontend/src/lib/cms/dto.ts`](../frontend/src/lib/cms/dto.ts): `hrefForPage`
builds URLs from `Page.locale` + `Page.slug`, while Navigation output is only
used as display hierarchy.

**`menuAttached`:** only **top-level** rows under the navigation shell use
`menuAttached: true`; deeper descendants use `false` so mega-menus do not mark
every nested row as attached to the primary menu. Set
`NAV_SYNC_MENU_ATTACHED_ALL=1` to restore the old “all true” behaviour.

**Admin path label (patched plugin):** upstream `strapi-plugin-navigation` builds
a breadcrumb-style string for the card header by joining each parent’s
accumulated `levelPath` with the item’s own `path`. That made nested INTERNAL
rows look like `/pathiseis/child-slug` even when Strapi stored only the leaf
segment on the item. The backend ships a **`patch-package`** patch
([`backend/patches/strapi-plugin-navigation+3.3.7.patch`](../backend/patches/strapi-plugin-navigation+3.3.7.patch))
so INTERNAL rows show **`/` + their own `path`** (WRAPPER and empty-path
fallbacks still use the joined path). Run `npm install` in `backend/` so
`postinstall` applies patches. After upgrading the plugin version, regenerate
the patch if the upstream file changed.

**Numeric slug suffixes (e.g. `-395`):** they appear on Page **`slug`** when
that slug was **derived from `pagetitle`** (empty MODX `alias`) and another
resource in the same locale already took the same ASCII base—[`transform_data._derive_slug`](../transform_data.py)
then appends `-{MODX resource id}`. When MODX **`alias` is set**, it is copied
**verbatim** into `_import.slug` (no transliteration, no id suffix); duplicates
must be fixed in MODX or Strapi. Navigation still reflects whatever slug Strapi
stores.

**Verification (when Strapi is up):**

1. `GET /api/navigation/{slug}` (or the admin REST payload for the navigation)
   and confirm each item’s stored `path` is a single segment (except home `/`).
2. `GET /api/navigation/render/navigation?type=TREE&locale=ru` can show nested
   display paths; this is acceptable for menu display but not for Next.js route
   construction.
3. Open **Content Manager → Page** for that row: the **slug** field should match
   the item `uiRouterKey` and the final segment of the rendered path.

After **bulk slug renames** (MODX parity), run
[`slug_parity_analyze.py`](../slug_parity_analyze.py) /
[`slug_parity_apply.py`](../slug_parity_apply.py) per
[`import_policy.md`](../import_policy.md), refresh internal links, then re-sync
navigation here so menu paths stay aligned with `Page.slug`.

Dry-run first:

```bash
STRAPI_URL=http://localhost:1337 \
AUTORIZATION_TOKEN=... \
python sync_navigation_from_pages.py \
  --dry-run \
  --replace-existing \
  --locale all \
  --report-json nav_sync_report.json
```

Then perform the rebuild:

```bash
STRAPI_URL=http://localhost:1337 \
AUTORIZATION_TOKEN=... \
STRAPI_ADMIN_EMAIL=admin@admin.com \
STRAPI_ADMIN_PASSWORD=... \
python sync_navigation_from_pages.py \
  --replace-existing \
  --locale all
```

Useful flags:

- `--locale el|ru|all` — rebuild one locale or both.
- `--navigation-slug navigation` — target a specific navigation shell.
- `--replace-existing` — delete and recreate the target navigation shell
  before syncing. This is the safest option for full rebuilds.
- `--merge` — preserve existing navigation item document IDs where possible
  and reconcile in place.
- `--report-json path` — write the full analysis / diff report for audit.

The sync report includes:

- total pages per locale
- included vs hidden pages
- wrapper vs internal item counts
- orphan parent references
- `el` pages omitted from `ru` because no translation exists
- `ru`-only pages that are added directly to the Russian tree

### Coverage report (translation gaps only)

If you only want the translation-gap summary, keep using:

```bash
STRAPI_URL=http://localhost:1337 \
STRAPI_TOKEN=... \
python report_nav_locale_coverage.py --json nav_coverage.json
```

That read-only report is useful before a rerun, but the sync script above is
the authoritative tool for rebuilding the navigation trees.

## Limits (known)

- The Content Manager list view itself stays flat — there is no maintained
  v5 plugin that puts a drag-and-drop tree inside `/admin/content-manager/...` for an arbitrary content type. The Navigation plugin is the tree browsing surface.
- View configuration is stored per Strapi instance (in `strapi_core_store_settings`). To mirror to other environments, copy those rows or bump `SEED_VERSION` in the seeder to re-apply.
- i18n relation labels show the target entry's own-locale title, not the
  current admin locale. Usually fine; worth flagging to editors.
- The navigation plugin does not auto-sync *items* between locales — only
  the navigation *shell*. Re-run `sync_navigation_from_pages.py` after page
  hierarchy changes instead of editing both locale trees manually.
- Bumping **`strapi-plugin-navigation`** may invalidate the admin patch; if the
  Navigation UI reverts to breadcrumb paths, re-run `npx patch-package
  strapi-plugin-navigation` after re-applying the edit to the new vendor file.

## Troubleshooting

### "Internal link" is missing

If the **New Item** dialog only shows **Wrapper** and **External link**,
the Navigation plugin is using an old persisted config that does not list
`Page` as an allowed internal-link target.

Normal fix:

1. Restart the backend once. On boot, the project now self-heals the
   Navigation plugin config if `api::page.page` is missing.
2. Refresh the admin and open **Navigation → New Item** again.

Manual fallback:

1. Go to **Settings → Navigation Plugin**.
2. Click **Restore default settings**.
3. Restart the backend.

After that, the type dropdown should show:

- **Internal link**
- **External link**
- **Wrapper**

### The `ru` tab looks empty after sync

Current observed behaviour:

- `GET /api/navigation/render/navigation?type=TREE&locale=ru` returns the
  expected Russian tree
- the Navigation admin locale selector can still show the `ru` tab as empty

This appears to be a `strapi-plugin-navigation` admin-side locale loading
issue, not a hierarchy import issue. Treat the render API as the source of
truth for verification until the plugin bug is patched.

## If this isn't enough

If editors ask for a tree view *inside* the Content Manager list, or
drag-and-drop reparenting inline, the next step is a small local plugin
under `backend/src/plugins/hierarchy-ui/` using Strapi 5 Content Manager
APIs:

- `app.getPlugin('content-manager').apis.addEditViewSidePanel(...)` — parent / siblings / children panel
- `injectComponent('listView', 'actions', ...)` — a "Tree view" toggle
- `addDocumentAction(...)` — "Add child page", "Move under…"

That's out of scope for the current config-only setup.
