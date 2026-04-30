---
module: Sections
symbols: 5
cohesion: 100%
source: gitnexus_cypher (cluster="Sections")
---

# Module: Sections — CMS section renderer

> The single dispatch point that maps all Strapi section types to React components. Handles both `"default"` and `"home"` rendering contexts.

## Code location

- `frontend/src/components/sections/SectionRenderer.tsx` — all members live here

## Members (5)

| Symbol | Kind | Purpose |
| --- | --- | --- |
| `SectionRenderer` | Function | Top-level dispatcher — receives a single `SectionDTO`, determines context, delegates to `renderSectionBody` or `renderSectionBodyHome` |
| `renderSectionBody` | Function | Renders a standard (non-home) section body — all 10 section types |
| `renderSectionBodyHome` | Function | Renders a homepage section body — 6 home-specific variants + fallback to `renderSectionBody` |
| `DisclosureList` | Function | <details>-based accordion rendering for faq and accordion sections |
| `ResponsiveImage` | Function | `<Image>` wrapper with responsive sizes and null-guard |

## How it works

`SectionRenderer` receives a single `SectionDTO` and an optional `context` (`"default"` | `"home"`) and `locale` prop. It wraps each section in a `PageSection` with appropriate rhythm, extracts heading/intro, and dispatches to either `renderSectionBody` or `renderSectionBodyHome`. The four home-specific components (`HomePromoCarousel`, `HomeAdvantagesSection`, `HomeMedicalLedger`/`HomeMedicalGrid`, `HomeVideoTheater`) are rendered inside `renderSectionBodyHome`.

## Indexed flows

| Process | Steps | Type |
| --- | --- | --- |
| `SectionRenderer → RenderSectionBody` | 3 | intra_community |

## Consumers

- `HomePage` — iterates all sections through `SectionRenderer` with `context="home"` and `locale`
- `StandardPage`, `GalleryPage`, `QuestionListPage`, `ContactPage`, `AppointmentPage` — iterate sections through `SectionRenderer` with default context
- `FrontendNativePage` — delegates to `StandardPage` for section rendering

## Related

- [[components]] — design-system primitives used inside section bodies
- [[page-layouts]] — page-shape components that consume `SectionRenderer`
- [[00-MOC-Frontend]] — frontend entry points
- [[../deep-dives/home-sections]] — home section components absorbed into `renderSectionBodyHome`
