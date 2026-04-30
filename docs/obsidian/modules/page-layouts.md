---
module: Page-layouts
symbols: 4 (2 sub-clusters of 2)
cohesion: 100% (per sub-cluster)
source: gitnexus_cypher (cluster="Page-layouts")
---

# Module: Page-layouts

> Page-shape components that wrap section content into full page layouts. Each page type in the CMS maps to one layout component. All layouts now dispatch sections through `SectionRenderer` instead of inline extraction.

## Cluster members (4, across 2 sub-clusters)

| Symbol | File | Page type |
| --- | --- | --- |
| `GalleryPage` | `frontend/src/components/page-layouts/GalleryPage.tsx` | Gallery page layout — dispatches through `SectionRenderer` |
| `QuestionListPage` | `frontend/src/components/page-layouts/QuestionListPage.tsx` | FAQ/accordion/tabs layout — dispatches through `SectionRenderer` |
| `PageHeader` | `frontend/src/components/page-layouts/_shared.tsx` | Shared page header component |
| `readableVariant` | `frontend/src/components/page-layouts/_shared.tsx` | Human-readable variant labels |

## Files NOT in this cluster but in the same directory

These page layouts were absorbed by other clusters:
- `HomePage.tsx` → [[i18n]] cluster (coupled with `getHomeStrings`; dispatches all sections through `SectionRenderer` with `context="home"`)
- `StandardPage.tsx` → [[cms]] cluster (generic page, fewer distinct edges)
- `ContactPage.tsx` → [[cms]] cluster
- `AppointmentPage.tsx` → [[cms]] cluster
- `FrontendNativePage.tsx` → [[cms]] cluster (404/system pages)

After the section pipeline unification, `extractGalleryItems` and `extractQuestionEntries` helpers were deleted — all layouts iterate `page.sections` through `SectionRenderer`.

## Layouts test

`frontend/src/components/page-layouts/layouts.test.tsx` covers all 7 layout components with render tests.

## Related

- [[i18n]] — `HomePage` layout (separate cluster)
- [[cms]] — parent cluster for most page layouts
- [[sections]] — SectionRenderer consumed by every layout
- [[00-MOC-Frontend]] — frontend entry points
