---
module: Page-layouts
symbols: 6 (3 sub-clusters of 2)
cohesion: 100% (per sub-cluster)
source: gitnexus_cypher (cluster="Page-layouts")
---

# Module: Page-layouts

> Page-shape components that wrap section content into full page layouts. Each page type in the CMS maps to one layout component.

## Cluster members (6, across 3 sub-clusters)

| Symbol | File | Page type |
| --- | --- | --- |
| `GalleryPage` | `frontend/src/components/page-layouts/GalleryPage.tsx` | Gallery page layout |
| `extractGalleryItems` | `frontend/src/components/page-layouts/GalleryPage.tsx` | Gallery item extraction helper |
| `QuestionListPage` | `frontend/src/components/page-layouts/QuestionListPage.tsx` | FAQ/question-list page layout |
| `extractQuestionEntries` | `frontend/src/components/page-layouts/QuestionListPage.tsx` | Question entry extraction helper |
| `PageHeader` | `frontend/src/components/page-layouts/_shared.tsx` | Shared page header component |
| `readableVariant` | `frontend/src/components/page-layouts/_shared.tsx` | Human-readable variant labels |

## Files NOT in this cluster but in the same directory

These page layouts were absorbed by other clusters:
- `HomePage.tsx` → [[i18n]] cluster (tight coupling with `useHomeSections` + `getHomeStrings`)
- `StandardPage.tsx` → [[cms]] cluster (generic page, fewer distinct edges)
- `ContactPage.tsx` → [[cms]] cluster
- `AppointmentPage.tsx` → [[cms]] cluster
- `FrontendNativePage.tsx` → [[cms]] cluster (404/system pages)

Only `GalleryPage` and `QuestionListPage` retained enough internal cohesion to form a distinct community — each has a dedicated extraction helper that creates a tightly-bound pair.

## Layouts test

`frontend/src/components/page-layouts/layouts.test.tsx` covers all 7 layout components with snapshot tests.

## Related

- [[i18n]] — `HomePage` layout (separate cluster)
- [[cms]] — parent cluster for most page layouts
- [[sections]] — SectionRenderer consumed by every layout
- [[00-MOC-Frontend]] — frontend entry points
