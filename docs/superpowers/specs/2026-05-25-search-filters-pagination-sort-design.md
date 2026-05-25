# Search Filters, Pagination & Sort — Design Spec

## Status
Approved

## Problem
The SSR `/search-results` page returns flat, unfiltered results. Patients cannot narrow by content type (page/video), medical section, or sort by date. Results beyond 20 have no way to access them.

## URL State Design

All filter/pagination/sort state lives in URL search params:

```
?q=term&type=page&section=otorhinolaryngology&sort=newest&page=2
```

| Param | Values | Default (missing) |
|-------|--------|-------------------|
| `q` | free text | empty (prompt) |
| `type` | `page`, `video` | no filter (both) |
| `sectionLabel` | `parentSectionLabel` value (localized) | no filter (all) |
| `sort` | `newest` | relevance (no sort param) |
| `page` | integer >= 1 | 1 |

## Component Architecture

### 1. `index-document.ts` — Add `parentSectionLabel`

New field on `SearchDocument`:
```typescript
parentSectionLabel: string | null;
```
Populated from `page.parentPage?.title` in `indexPageDocument`. Value is already localized via Strapi. Video entries remain `null` (no parent page).

### 2. `page.tsx` — Server Component (modified)

Parse 4 new searchParams, build Meilisearch query with filter/sort/offset/facets:

| Concern | Implementation |
|---------|---------------|
| Filter string | `["type=page", "parentSectionLabel=X"].join(" AND ")` |
| Sort | `["publishedAt:desc"]` when `sort=newest`; omit for relevance |
| Offset | `(page - 1) * 20` |
| Facets | `["parentSectionLabel"]` — returns distinct section labels for current query |
| Total pages | `Math.ceil(estimatedTotalHits / 20)` |

**Edge cases:**
- Invalid/NaN page → clamped to 1
- Page > total → clamped to totalPages
- Unrecognized `type` value → treated as no filter
- Unrecognized `sort` value → falls back to relevance

### 3. `SearchFilters.tsx` — Client Component (new)

- `"use client"` — never imports `meili-client`
- Reads current filter state from `useSearchParams()`
- Receives `sections: string[]` and `locale: Locale` as props (from server facet)
- Three control groups:
  - **Type**: radio/button — All | Pages (Άρθρα/Статьи) | Videos (Βίντεο/Видео)
  - **Section**: `<select>` — dynamically populated from facet distribution
  - **Sort**: radio/button — Relevance (Συνάφεια/Релевантность) | Newest (Νεότερα/Новые)
- On change: `useRouter().replace()` with new URL preserving all other params
- **Desktop**: sidebar column (left of results, `lg`+ breakpoint)
- **Mobile**: collapsible panel ("Filters" toggle above results)

### 4. `Pagination.tsx` — Client Component (new)

- `"use client"`
- Props: `totalPages: number`, `currentPage: number`
- Reads search params via `useSearchParams()`
- Renders: `[< Prev] 1 2 3 ... N [Next >]`
- Previous disabled on page 1, Next on last page
- Ellipsis for gap > 2 pages
- All page links preserve current filter params

### 5. Result count display

Show `"Showing 1–20 of ~150 results"` above the result list.

## Layout

```
Desktop (≥1024px):
┌──────────────────────────────────────────────────┐
│ Results for "term"  •  30 results               │
├─────────────┬────────────────────────────────────┤
│ Filters     │ ResultCard                         │
│             │ ResultCard                         │
│ Type        │ ResultCard                         │
│   ○ All     │ ...                                │
│   ○ Pages   │                                    │
│   ○ Videos  │ Pagination: < 1 [2] 3 ... 8 >     │
│             │                                    │
│ Section     │                                    │
│   [Select]  │                                    │
│             │                                    │
│ Sort        │                                    │
│   ○ Relev.  │                                    │
│   ○ Newest  │                                    │
└─────────────┴────────────────────────────────────┘

Mobile (<1024px):
┌──────────────────────────────────────┐
│ Results for "term" • 30 results     │
├──────────────────────────────────────┤
│ [▼ Filters] (expandable tap target) │
├──────────────────────────────────────┤
│ ResultCard                          │
│ ResultCard                          │
│ ...                                 │
│ Pagination: < [1] 2 3 ... 8 >       │
└──────────────────────────────────────┘
```

## Data Flow

```
URL search params (q, type, section, sort, page)
  → page.tsx parses and validates
  → builds Meilisearch filter/sort/offset/facets
  → index.search() returns hits + estimatedTotalHits + facetDistribution
  → Server renders:
      SearchFilters(sections=facetDistribution, locale)
      ResultCard list
      result count text
      Pagination(totalPages, currentPage)
  → User changes filter → router.push(new URL) → full SSR re-run
```

## Files to Create/Modify

| File | Action |
|------|--------|
| `frontend/src/lib/search/index-document.ts` | Modify — add `parentSectionLabel` |
| `frontend/src/app/[locale]/search-results/page.tsx` | Modify — parse 4 params, build filter/sort/facets, render new components |
| `frontend/src/components/search/SearchFilters.tsx` | Create — client component, URL-driven filter UI |
| `frontend/src/components/search/SearchFilters.test.tsx` | Create — component tests |
| `frontend/src/components/search/Pagination.tsx` | Create — client component, page navigation |
| `frontend/src/components/search/Pagination.test.tsx` | Create — component tests |

## Testing

| Test file | What it covers |
|-----------|---------------|
| `SearchFilters.test.tsx` | Renders type/section/sort controls; clicking navigates to new URL; preserves unrelated params; handles empty sections list |
| `Pagination.test.tsx` | Renders correct page numbers; disables prev on page 1; disables next on last page; shows ellipsis; links preserve search params |
| Playwright E2E | Filter-by-type filters results; pagination navigates pages; URL reflects state on reload |

## Accessibility

- Type filter: `<fieldset>` with `<legend>`, `<input type="radio">`
- Sort filter: `<fieldset>` with `<legend>`, `<input type="radio">`
- Section: `<select>` with `<label>`
- Pagination: `<nav aria-label="pagination">`, `aria-current="page"` on active page

## Open Items

- Verify `parentSectionLabel` is in Meilisearch `filterableAttributes`. Add during reindex if missing.
