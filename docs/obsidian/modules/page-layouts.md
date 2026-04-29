---
module: Page-layouts
symbols: 6
cohesion: 100%
source: gitnexus://repo/gemini-export/cluster/Page-layouts
---

# Module: Page-layouts

> Page-shape components matched to CMS layouts. Cluster reports 100% cohesion — but only **3 of 9** files in the directory ended up in this cluster.

## Cluster members (6)

| Symbol | File |
| --- | --- |
| `readableVariant` | `frontend/src/components/page-layouts/_shared.tsx` |
| `PageHeader` | `frontend/src/components/page-layouts/_shared.tsx` |
| `extractGalleryItems` | `frontend/src/components/page-layouts/GalleryPage.tsx` |
| `GalleryPage` | `frontend/src/components/page-layouts/GalleryPage.tsx` |
| `extractQuestionEntries` | `frontend/src/components/page-layouts/QuestionListPage.tsx` |
| `QuestionListPage` | `frontend/src/components/page-layouts/QuestionListPage.tsx` |

## Files NOT in this cluster but in the same directory

These exist as symbols but the community detector grouped them elsewhere:

- `HomePage`, `StandardPage`, `AppointmentPage`, `ContactPage`, `FrontendNativePage`

This is a **clustering signal worth investigating**:

- They might have so few outgoing internal edges that they got absorbed into `Navigation`/`Cms` neighbours.
- Or they may be effectively pass-through wrappers around `SectionRenderer` + DTO data, with all the real logic upstream.

`gitnexus_context({name: "HomePage"})` would confirm. Adding more shared helpers in `_shared.tsx` would naturally pull them into this cluster.

## Active risk (2026-04-30)

Every page-layout file in the directory has been touched in the working tree (see [[../audits/audit-2026-04-30]]). Combined with the `SectionRenderer` rewrite (in [[../audits/audit-2026-04-30|the audit]]) and design-system changes in [[components]], expect visual regression risk across every CMS page type.

## Related

- [[components]] — `PageSection`, `CmsHtml` consumed here
- [[cms]] — DTO shapes consumed
- [[../audits/audit-2026-04-30]]
