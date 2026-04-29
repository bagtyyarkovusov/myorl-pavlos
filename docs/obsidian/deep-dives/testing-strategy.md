---
module: Testing strategy
source: code reading (all *.test.ts, *.test.tsx)
---

# Deep dive: Testing strategy

> 28 test files covering frontend components, hooks, utilities, and API routes. Uses Vitest with React Testing Library and co-located test files.

## Test inventory

| Area | Test files | Type |
| --- | --- | --- |
| Site header internals | 14 | Component + hook tests |
| CMS gateway + DTOs | 6 | Unit + integration tests |
| API routes | 2 | Route handler tests |
| Page layouts | 1 | Layout snapshot tests |
| Component library | 4 | Design-system + PageSection + CmsHtml + SectionRenderer |
| Utility functions | 2 | proxy.test.ts, html.test.ts |

## Site header tests (14)

Every component and hook in `site-header/internal/` has a co-located `.test.tsx`/`.test.ts` file:

| Test file | Tests |
| --- | --- |
| `CTAButton.test.tsx` | Renders "Make an appointment" text, passes href |
| `DesktopNav.test.tsx` | Renders nav structure, handles empty/loading states |
| `LocaleSwitcher.test.tsx` | Renders language options, handles locale change |
| `MegaMenu.test.tsx` | Two-level dropdown behavior, keyboard nav, hover states |
| `MobileDrawer.test.tsx` | Open/close toggle, animation, overlay click |
| `MobileMenu.test.tsx` | Mobile nav rendering, accordion behavior |
| `NavigationAnchor.test.tsx` | Active state styling, link rendering |
| `UtilityBar.test.tsx` | Mobile utility bar rendering |
| `useDrawer.test.ts` | State transitions, open/close cycle |
| `useNavigationState.test.ts` | Scroll-spy active section tracking |
| `usePill.test.ts` | Active-pill position calculation |
| `leafMetaLabel.test.ts` | Label derivation for leaf items |
| `SiteHeaderClient.test.tsx` | Client hydration wrapper |
| `components/design-system.test.tsx` | `ButtonLink` variants, `SectionHeading`, `MediaFrame` |

## CMS tests (6)

| Test file | Tests |
| --- | --- |
| `client.test.ts` | HTTP client: fetch, error handling, retry logic |
| `cms-api.test.ts` | `getPage`, `getSite`, `getPageResult`, `getSitemapPages` |
| `cms-gateway.test.ts` | `createCmsGateway`, `one`, `all`, `fetchOne`, `fetchAll` |
| `navigation.test.ts` | `hrefForPage`, `hrefForLocaleSlug`, `buildNavigationTree` |
| `page-normalizer.test.ts` | `toPageDTO`, `toSectionDTO`, `toContactDTO`, item-level DTOs |
| `section-normalizers.test.ts` | Section-type dispatch, auto-drafting |

### Test fixtures

`frontend/src/lib/cms/__tests__/__fixtures__/` contains 4 JSON files with mock Strapi responses:
- `content-page.json` — Full CMS page response with sections
- `global-settings.json` — Global singleton response
- `navigation-pages.json` — Navigation tree response
- `sitemap-pages.json` — Sitemap page list response

## API route tests (2)

| Test file | Tests |
| --- | --- |
| `health/route.test.ts` | Health endpoint: success, timeout error, response shape |
| `revalidate/route.test.ts` | Revalidation: auth, payload parsing, tag derivation |

## Layout and component tests (4)

| Test file | Tests |
| --- | --- |
| `layouts.test.tsx` | Snapshot tests for all 7 page-layout components |
| `PageSection.test.tsx` | Background/rhythm/container class composition |
| `CmsHtml.test.tsx` | HTML sanitization, iframe allow-listing |
| `SectionRenderer.test.tsx` | Section type dispatch, home vs standard rendering |

## Test conventions

- **Co-location**: Tests live next to their source files (same directory) or in `__tests__/` subdirectories
- **Naming**: `.test.ts` for logic, `.test.tsx` for components
- **Framework**: Vitest + React Testing Library
- **Fixtures**: JSON mock data in `__fixtures__/`
- **No E2E tests**: No Playwright or Cypress setup — full coverage via unit + integration tests

## Coverage gaps

- **Home sections** (8 components) have no dedicated tests — they are implicitly covered by layout snapshot tests
- **Backend bootstrap scripts** have no tests
- **Python tools** have no test suite (they are operational scripts)

## Related

- [[site-header-internals]] — 14 test files for header components
- [[../modules/cms]] — 6 test files for CMS gateway + DTOs
