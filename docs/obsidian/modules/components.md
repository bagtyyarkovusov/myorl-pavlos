---
module: Components
symbols: 10 (6 + 4)
cohesion: 86%–92%
source: gitnexus_cypher (cluster="Components")
---

# Module: Components — design system + HTML sanitization

> Shared UI primitives used across all page types plus the CMS HTML rendering/sanitization pipeline.

## Code location

| Directory | Contents |
| --- | --- |
| `frontend/src/components/` | `CmsHtml.tsx`, `PageSection.tsx`, `design-system.tsx` |
| `frontend/src/components/site-header/internal/` | `CTAButton.tsx`, `NavigationAnchor.tsx` |
| `frontend/src/lib/` | `html.ts`, `utils.ts` |

## Members (10)

### Design system (6)

| Symbol | File | Purpose |
| --- | --- | --- |
| `CmsHtml` | `frontend/src/components/CmsHtml.tsx` | Renders sanitized CMS HTML with iframe allow-listing |
| `PageSection` | `frontend/src/components/PageSection.tsx` | Layout wrapper with background/rhythm/container classes |
| `ButtonLink` | `frontend/src/components/design-system.tsx` | Link styled as a button with variant support |
| `isExternalHref` | `frontend/src/components/design-system.tsx` | External link detection |
| `CTAButton` | `frontend/src/components/site-header/internal/CTAButton.tsx` | "Make an appointment" button |
| `NavigationAnchor` | `frontend/src/components/site-header/internal/NavigationAnchor.tsx` | Styled nav link with active state |

### HTML utilities (4)

| Symbol | File | Purpose |
| --- | --- | --- |
| `sanitizeCmsHtml` | `frontend/src/lib/html.ts` | DOMPurify-based HTML sanitization |
| `isAllowedIframeSrc` | `frontend/src/lib/html.ts` | Iframe src allow-list (`youtube.com`, `maps.google.com`) |
| `registerHooks` | `frontend/src/lib/html.ts` | DOMPurify hook registration |
| `cn` | `frontend/src/lib/utils.ts` | Tailwind class-name merge utility |

## Cohesion: 86–92%

The `CmsHtml → isAllowedIframeSrc` call chain creates a 4-step trace (`CmsHtml → IsAllowedIframeSrc`). The design-system components share `cn` and Tailwind variant classes.

## Related

- [[sections]] — SectionRenderer which delegates to these components
- [[page-layouts]] — page-shape components consuming design-system primitives
- [[i18n]] — homepage layout using `CmsHtml` and `PageSection`
- [[00-MOC-Frontend]] — frontend entry points
