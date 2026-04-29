---
module: Sections
symbols: 3
cohesion: 100%
source: gitnexus_cypher (cluster="Sections")
---

# Module: Sections — CMS section renderer

> The dynamic dispatch layer that maps Strapi section types to React components.

## Code location

- `frontend/src/components/sections/SectionRenderer.tsx` — all members live here

## Members (3)

| Symbol | Kind | Purpose |
| --- | --- | --- |
| `SectionRenderer` | Function | Top-level dispatcher — maps section type to render function |
| `renderSectionBody` | Function | Renders a standard (non-home) section body |
| `renderSectionBodyHome` | Function | Renders a homepage section body |

## How it works

`SectionRenderer` receives a `SectionDTO` array from the CMS and dispatches each section to either `renderSectionBody` or `renderSectionBodyHome` based on the page context (home vs standard page). This is the bridge between Contentful/Strapi section data and the React component tree.

## Indexed flows

| Process | Steps | Type |
| --- | --- | --- |
| `SectionRenderer → RenderSectionBody` | 3 | intra_community |

The single indexed flow traces: `SectionRenderer` → `renderSectionBody` (or `renderSectionBodyHome`) → section-specific component.

## Consumers

- `HomePage` (homepage layout) — calls `SectionRenderer` with `isHome: true`
- `StandardPage`, `ContactPage`, `GalleryPage`, etc. — call `SectionRenderer` for standard sections
- `PageRenderer` — wraps `SectionRenderer` with error boundaries and loading states
- `FrontendNativePage` — renders system-generated pages (404, etc.) through the same dispatcher

## Related

- [[components]] — design-system primitives used inside section bodies
- [[page-layouts]] — page-shape components that consume `SectionRenderer`
- [[00-MOC-Frontend]] — frontend entry points
