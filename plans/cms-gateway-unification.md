# Plan: Unify Strapi HTTP Clients into CmsGateway

> Source PRD: [#34](https://github.com/anomalyco/gemini-export/issues/34)

## Architectural decisions

- **Routes**: `/api/pages`, `/api/global` (Strapi REST v4); gateway auto-prepends `STRAPI_URL`
- **Schema**: `CmsGateway` interface with `pages` (convenience tier) + `fetchOne`/`fetchAll`/`fetch` (generic tier); `CmsError` with `kind: "not_found" | "timeout" | "network" | "server_error" | "validation"`, plus `status`, `url`, `issues`, `raw`
- **Key models**: `PageDTO`, `GlobalSettingsDTO`, `NavigationNodeDTO`, `CmsError`, `FetchOneOptions`, `FetchAllOptions`
- **Auth**: `Authorization: Bearer ${token}` injected by gateway on every request
- **Service boundaries**: Gateway core (`cms-gateway.ts`) is framework-agnostic (zero Next.js/React imports); ISR/cache wiring lives in `cms-gateway-setup.ts` (marked `server-only`)
- **Dependency injection**: `createCmsGateway({ fetchFn, baseUrl, token, cache?, timeoutMs? })` factory — no global `setFetchForTesting()`
- **Strapi envelope**: `{ id, attributes: {...} }` → `{ ...attributes, id }` unwrapped before Zod validation, so schemas describe domain types
- **Pagination**: Internal `while` loop in `fetchAll` with `maxPages` safety cap; callers never see page/cursor params

---

## Phase 1: Gateway core + unified error model

**User stories**: 3 (injectable fetch), 4 (unified CmsError), 5 (Zod validation always on), 6 (generic fetchAll), 9 (Strapi envelope auto-unwrap)

### What to build

Create `cms-gateway.ts` with the `createCmsGateway(config)` factory. The factory accepts `baseUrl`, `token`, `fetchFn` (injectable), `timeoutMs` (default 10000), and optional `cache` strategy. Returns a `CmsGateway` object exposing `fetchOne`, `fetchAll`, `fetch`.

`fetchOne<T>(endpoint, schema, opts)` does a single request, auto-unwraps the Strapi envelope, validates with Zod, returns `T | null`.

`fetchAll<T>(endpoint, schema, opts)` paginates internally: `while (page <= maxPages)` loop, stopping when `response.data.length < pageSize` or `pageCount` reached.

`fetch(endpoint, init)` is an escape hatch returning raw `Response`.

Update `errors.ts`: the existing `CmsError` class gains `kind`, `issues`, `raw` fields matching the PRD spec.

Add `cms-gateway.test.ts` with factory-injected mock fetch covering all success/error paths.

### Acceptance criteria

- [ ] `createCmsGateway({ fetchFn: mockFetch })` returns a working gateway instance
- [ ] `gateway.fetchOne("/api/global", schema, { locale: "el" })` returns validated result or null
- [ ] `gateway.fetchAll("/api/pages", schema, { locale: "el" })` auto-paginates across multiple pages
- [ ] `gateway.fetch("/api/health")` returns raw Response
- [ ] All errors are `CmsError` instances with correct `kind` discriminator
- [ ] Strapi `{ data: [{ id, attributes }] }` shape unwrapped before Zod validation
- [ ] Gateway file has zero imports from `next`, `react`, `server-only`
- [ ] `cms-gateway.test.ts` covers: single fetch, multi-page pagination, 404→null, validation error, network error, timeout, pagination stops at `maxPages`, auth header injected, envelope unwrap

---

## Phase 2: Pages convenience API (`cms.pages.all` / `cms.pages.one`)

**User stories**: 1 (fetch all pages with one call), 2 (fetch single page by slug with one call)

### What to build

Add `cms.pages.all(opts?)` and `cms.pages.one(slug, opts?)` to the gateway module. These are pre-bound to `/api/pages` with the page DTO schemas used internally. Pagination is transparent.

### Acceptance criteria

- [ ] `cms.pages.all({ locale: "el" })` returns `PageDTO[]` for all published Greek pages
- [ ] `cms.pages.one("about", { locale: "el" })` returns `PageDTO | null` for that slug
- [ ] Pagination is hidden — callers don't pass page/cursor params
- [ ] `cms.pages.all({ fields: ["slug"], sort: ["slug:asc"] })` passes narrow Strapi query params
- [ ] `cms.pages.one("not-found", { locale: "el" })` returns `null` (doesn't throw)
- [ ] Tests added for both methods using factory-injected mock fetch with existing fixtures

---

## Phase 3: Production ISR + React.cache setup

**User stories**: 8 (ISR cache tags per-request)

### What to build

Create `cms-gateway-setup.ts` — the ONLY file that imports Next.js/React dependencies. Imports factory from Phase 1, reads `STRAPI_URL`/`STRAPI_TOKEN` from `getCmsConfig()`, passes `cache.dedupe` as `React.cache`, passes `cache.fetchInit` returning `{ next: { revalidate, tags } }` for ISR. Marked `server-only`. Exports the configured `cms` gateway instance.

### Acceptance criteria

- [ ] `cms-gateway-setup.ts` imports `server-only`, `React.cache`, factory from Phase 1
- [ ] Exports a configured `CmsGateway` instance as `cms`
- [ ] `cache.fetchInit` injects `next.revalidate` and `next.tags` into outgoing fetch
- [ ] `cache.dedupe` wraps gateway methods with `React.cache`
- [ ] File is importable in Next.js server environment without errors
- [ ] No other file in the CMS layer imports Next.js or React

---

## Phase 4: Migrate `cms-api.ts` callers + tests

**User stories**: 3 (injectable fetch in tests), 5 (Zod validation via gateway), 7 (parallel fetches via `Promise.allSettled`)

### What to build

Refactor all `validatedFetch` call sites in `cms-api.ts` to use the gateway from Phases 1+2:
- `getPageResult` → `cms.pages.one(slug, opts)` via gateway
- `getPage` → `getPageResult` + `notFound()`
- `getSite` → parallel `cms.pages.all({ locale })` + `cms.fetchOne("/api/global", schema, opts)`
- `getSitemapPages` → `cms.pages.all({ locale: "all" })` with sitemap filter

Retire `CmsPageError`/`PageResult` types. Errors are `CmsError` instances. Update `cms-api.test.ts` to use factory injection.

### Acceptance criteria

- [ ] `getPage(locale, slug)` returns `PageDTO` via `cms.pages.one()`
- [ ] `getPageResult(locale, slug)` returns `{ ok, page }` or `{ ok, error }` via gateway
- [ ] `getSite(locale)` fires pages + global in parallel via `Promise.allSettled`
- [ ] `getSitemapPages()` returns pages via `cms.pages.all()` with sitemap filter
- [ ] All code paths handle `CmsError` instances
- [ ] `cms-api.test.ts` passes with factory-injected mock fetch
- [ ] `notFound()` is called only in `getPage`

---

## Phase 5: Migrate `client.ts` caller (`fetchNavigation`) + tests

**User stories**: 1 (fetch all pages with one call), 8 (ISR cache tags per-request)

### What to build

Replace `fetchNavigation` in `client.ts` with a thin wrapper using the production gateway from Phase 3. Remove `fetchStrapi`, `fetchAllPages`, `normalizeEntity`, and `appendSearchParams` from the file. Add tests for `fetchNavigation` using factory-injected mock.

### Acceptance criteria

- [ ] `fetchNavigation(locale)` returns `NavigationNodeDTO[]` via `cms.pages.all()`
- [ ] ISR cache tags `[navigation:${locale}, "pages"]` passed correctly
- [ ] Pagination loop gone from client code
- [ ] `buildNavigationTree` called with same input shape as before
- [ ] Tests for `fetchNavigation` exist
- [ ] No `fetchStrapi`, `fetchAllPages`, `normalizeEntity`, or `appendSearchParams` remain in `client.ts`

---

## Phase 6: Final cleanup — delete old modules

**User stories**: 10 (one place for all HTTP fetch logic)

### What to build

Delete `cms-fetch.ts`. Delete `client.ts` (or reduce to wrapper). Remove `setFetchForTesting`/`resetFetch` exports. Verify no imports remain. Run full test suite and build.

### Acceptance criteria

- [ ] `cms-fetch.ts` is deleted
- [ ] `client.ts` is deleted (or reduced to only `fetchNavigation` wrapper)
- [ ] `setFetchForTesting` and `resetFetch` exports are removed
- [ ] No remaining calls to `setFetchForTesting` in any test file
- [ ] No remaining imports of `cms-fetch` in any file
- [ ] Full test suite passes
- [ ] `npm run build` succeeds in the frontend workspace
- [ ] There is exactly one place where HTTP fetch logic for CMS access lives (the gateway)
