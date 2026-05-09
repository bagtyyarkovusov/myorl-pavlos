# Module: Page-layouts

> Page-shape components that wrap section content into full page layouts. Each page type in the CMS maps to one layout component. All layouts dispatch sections through `SectionRenderer`.

## Members

| Symbol | File | Page type |
| --- | --- | --- |
| `HomePage` | `frontend/src/components/page-layouts/HomePage.tsx` | Homepage layout |
| `StandardPage` | `frontend/src/components/page-layouts/StandardPage.tsx` | Generic content page |
| `GalleryPage` | `frontend/src/components/page-layouts/GalleryPage.tsx` | Gallery page layout |
| `QuestionListPage` | `frontend/src/components/page-layouts/QuestionListPage.tsx` | FAQ/accordion/tabs layout |
| `ContactPage` | `frontend/src/components/page-layouts/ContactPage.tsx` | Contact page with clinic cards + map |
| `AppointmentPage` | `frontend/src/components/page-layouts/AppointmentPage.tsx` | Appointment form page |
| `FrontendNativePage` | `frontend/src/components/page-layouts/FrontendNativePage.tsx` | 404/system pages |
| `PageHeader` | `frontend/src/components/page-layouts/_shared.tsx` | Shared page header component |
| `readableVariant` | `frontend/src/components/page-layouts/_shared.tsx` | Human-readable variant labels |

After the section pipeline unification (ADR-006), all layouts iterate `page.sections` through `SectionRenderer`.

## Layouts test

`frontend/src/components/page-layouts/layouts.test.tsx` covers all 7 layout components with render tests.

## Related

- [i18n-module.md](i18n-module.md) — `HomePage` layout + copy
- [cms-module.md](cms-module.md) — gateway layer for page data
- [sections-module.md](sections-module.md) — SectionRenderer consumed by every layout
- [frontend-moc.md](frontend-moc.md) — frontend entry points
