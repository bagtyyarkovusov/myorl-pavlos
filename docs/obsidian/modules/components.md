---
module: Components
symbols: 9
cohesion: 89%
source: gitnexus://repo/gemini-export/cluster/Components
---

# Module: Components — design system + HTML sanitization

> Shared visual primitives and the `CmsHtml` sanitizer used wherever Strapi-authored HTML is rendered.

## Members (9)

| Symbol | File | Purpose |
| --- | --- | --- |
| `cn` | `frontend/src/lib/utils.ts` | `clsx`/`tailwind-merge` helper |
| `isExternalHref` | `frontend/src/components/design-system.tsx` | URL classifier |
| `ButtonLink` | `frontend/src/components/design-system.tsx` | Themed link/button |
| `PageSection` | `frontend/src/components/PageSection.tsx` | Section wrapper |
| `CmsHtml` | `frontend/src/components/CmsHtml.tsx` | Renders sanitized CMS HTML |
| `sanitizeCmsHtml` | `frontend/src/lib/html.ts` | DOMPurify-style sanitiser |
| `isAllowedIframeSrc` | `frontend/src/lib/html.ts` | Iframe allowlist (YouTube etc.) |
| `registerHooks` | `frontend/src/lib/html.ts` | Sanitiser hook setup |
| `NavigationAnchor` | `frontend/src/components/site-header/internal/NavigationAnchor.tsx` | Anchor with internal/external split |

## Active risk (2026-04-30)

`ButtonLink`, `SectionHeading`, `MediaFrame`, `isExternalHref`, `SECONDARY_CLASSES`, `variantClass`, `classes` in `design-system.tsx` are touched — design-system rewrite in progress.

## Notes

- `CmsHtml` + `sanitizeCmsHtml` together gate every block of Strapi-authored markup. Treat changes here as security-sensitive (XSS surface).
- `NavigationAnchor` was clustered with `Components` rather than [[internal]]; the indexer tracks edges, not folders.

## Related

- [[cms]] — produces the HTML this module sanitises
- [[internal]] — uses `cn`, `ButtonLink`
- [[page-layouts]] — uses `PageSection`, `CmsHtml`
