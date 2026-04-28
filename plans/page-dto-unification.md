# Plan: Unify Page DTO Transform

> Source PRD: [#29 — RFC: Unify Page DTO transform — eliminate dual-pathway divergence](https://github.com/bagtyyarkovusov/gemini-export/issues/29)
> Issues: #29 (RFC), #30-#33 (slices)

## Architectural decisions

- **Deep module**: `page-normalizer.ts` with 4 exports (`PAGE_POPULATE`, `toPageDTO(raw, config?)`, `pageResponseSchema`, `pageListSchema`). Small interface, large internal implementation (~500 lines). All internal helpers are private to the module.
- **Routes**: unchanged — `/api/pages` via both Zod (`cms-api.ts`) and TypeScript (`client.ts`) pathways.
- **Schema**: `schemas.ts` → renamed to `strapi-validators.ts`, keeps only `globalResponseSchema`. All page-related Zod schemas move to `page-normalizer.ts`.
- **Key models**: `PageDTO` (28 fields), `StrapiPagePayload` (raw Strapi shape). No type changes — only transform unification.
- **Populate config**: Single `PAGE_POPULATE` constant eliminates triplication across `cms-api.ts:derivePopulate()`, `client.ts:pagePopulate`, and implicit schema.
- **Config as parameter**: `toPageDTO(raw, config?)` accepts explicit `CmsConfig`. When omitted, falls back to `getCmsConfig()`. Makes the function pure/testable.
- **Backward compat**: Helper files (`seo.ts`, `media.ts`, `references.ts`, `section-normalizers.ts`) remain as thin re-exports. No breaking import changes.
- **Out of scope**: Global settings transform, navigation tree building, section renderer components, social link normalization, HTTP fetch layer merging, per-caller populate minimization.

---

## Phase 1: Deep module — `page-normalizer.ts` with parity tests

**User stories**: 1, 3, 5, 6, 7, 9, 10

### What to build

Replace the existing `page-normalizer.ts` (69 lines, TS-pathway-only) with a unified deep module that absorbs all Page DTO transformation logic currently spread across 6 files. The module exposes 4 public exports:

- `PAGE_POPULATE` — canonical Strapi populate config (single source of truth, identical to existing `derivePopulate()` and `pagePopulate`)
- `toPageDTO(raw, config?)` — canonical transform accepting optional `CmsConfig` for absolute URL construction
- `isFrontendNativeSystemLayout(layoutVariant)` — unchanged, kept for consumers
- `pageResponseSchema` — Zod schema for single-page Strapi responses; validates raw JSON then delegates to `toPageDTO()`
- `pageListSchema` — Zod schema for page-list Strapi responses; maps each entity through `toPageDTO()`

All helper functions currently in `seo.ts`, `media.ts`, `references.ts`, `text.ts`, `section-normalizers.ts`, and `buildAlternateUrls` from `navigation.ts` are absorbed as private module internals. Old files are NOT modified yet.

Write `page-normalizer.test.ts` with parity tests comparing new unified output against both old pipeline outputs.

### TDD: RED → GREEN → REFACTOR

**RED**: Write parity tests that fail (module doesn't exist yet).
**GREEN**: Implement the unified module. All parity tests pass.
**REFACTOR**: Clean up, ensure no duplication between Zod schemas and toPageDTO logic.

### Acceptance criteria

- [ ] `page-normalizer.ts` exists in `frontend/src/lib/cms/` with all 5 exports
- [ ] `PAGE_POPULATE` matches existing `pagePopulate`/`derivePopulate()` structure
- [ ] `toPageDTO` always populates `sections` and `contact` (never empty/undefined)
- [ ] `toPageDTO` produces absolute `alternateUrls` when `CmsConfig` is provided
- [ ] `toPageDTO` coerces `isFolder`, `hideFromMenu` to boolean; `menuIndex` to number
- [ ] `pageResponseSchema.parse(fixture)` returns a fully populated `PageDTO`
- [ ] `pageListSchema.parse(fixture)` returns an array of fully populated `PageDTO[]`
- [ ] `page-normalizer.test.ts` passes parity checks against old pipeline outputs
- [ ] Old files (`schemas.ts`, `cms-api.ts`, `client.ts`, helper files) are NOT modified
- [ ] `npx vitest run page-normalizer` passes
- [ ] No circular imports introduced

---

## Phase 2: Wire `cms-api.ts` to the unified Zod pathway

**User stories**: 2, 3, 4, 8

### What to build

Update `cms-api.ts` to consume the new `page-normalizer.ts` module. Replace `derivePopulate()` and inline Zod transform logic with imports from the unified module. Rename `schemas.ts` to `strapi-validators.ts`, stripping out all page-related schemas (keeping only `globalResponseSchema` and its Zod primitives).

### TDD: RED → GREEN → REFACTOR

**RED**: Update `cms-api.test.ts` import paths to point to new module — tests should pass since new schemas produce equivalent output.
**GREEN**: Wire `cms-api.ts`, verifying sections + contact are populated through Zod pathway (most impactful divergence fix).
**REFACTOR**: Remove `derivePopulate()` from `cms-api.ts`.

### Acceptance criteria

- [ ] `cms-api.ts` imports `PAGE_POPULATE`, `pageResponseSchema`, `pageListSchema` from `./page-normalizer`
- [ ] `cms-api.ts` no longer contains `derivePopulate()`
- [ ] `schemas.ts` is renamed to `strapi-validators.ts` with only `globalResponseSchema` + its primitives
- [ ] `cms-api.test.ts` passes with updated import paths
- [ ] Manual verification: `getPage(locale, slug)` has non-empty `sections` and non-undefined `contact`

---

## Phase 3: Wire `client.ts` to the unified TS pathway

**User stories**: 2, 4, 8

### What to build

Update `client.ts` to consume the new module. Replace the duplicate `pagePopulate` const and manual `toPageDTO` import chain with imports from `page-normalizer.ts`. Remove `buildAlternateUrls()` from `navigation.ts` (moved into the deep module). Update `dto.ts` re-export paths.

### TDD: RED → GREEN → REFACTOR

**RED**: Update `navigation.test.ts` to verify `buildAlternateUrls` import changes (no behavior change).
**GREEN**: Wire `client.ts`, verify cache-tagged navigation uses same populate config as cms-api.
**REFACTOR**: Remove `buildAlternateUrls` and `absoluteHref` from `navigation.ts`. Clean up dead imports in `navigation.ts`.

### Acceptance criteria

- [ ] `client.ts` imports `PAGE_POPULATE` and `toPageDTO` from `./page-normalizer`
- [ ] `client.ts` no longer contains its own `pagePopulate` const
- [ ] `navigation.ts` no longer exports `buildAlternateUrls()`
- [ ] `navigation.ts` keeps `buildNavigationTree`, `hrefForPage`, `hrefForLocaleSlug`, `toLocalizationList`
- [ ] `dto.ts` imports `toPageDTO` from `./page-normalizer`
- [ ] `navigation.test.ts` passes
- [ ] `npm run build` succeeds

---

## Phase 4: Helper files → thin re-exports for backward compat

**User stories**: 4, 6

### What to build

Convert the absorbed helper files into thin re-export modules that delegate to `page-normalizer.ts`. Each file re-exports only its original public API, now implemented by the deep module. Preserves backward compatibility for any residual imports while centralizing the actual logic.

### TDD: RED → GREEN → REFACTOR

**RED**: Run full test suite to establish baseline.
**GREEN**: Replace each helper with re-exports. Verify all tests pass.
**REFACTOR**: No further refactoring needed — Phase 4 is the refactor step.

### Acceptance criteria

- [ ] `seo.ts` re-exports `toSeoDTO`, `deriveSeoTitle` from `./page-normalizer`
- [ ] `media.ts` re-exports `toMediaDTO` from `./page-normalizer`
- [ ] `references.ts` re-exports `toPageRefDTO`, `toTagDTO` from `./page-normalizer`
- [ ] `section-normalizers.ts` re-exports `toSemanticSections`, `toContactDetailDTO`, `toContactClinicDTO` from `./page-normalizer`
- [ ] `text.ts` re-exports `normalizeOptionalText`, `optionalString` from `./page-normalizer`
- [ ] Full test suite passes: `npx vitest run`
- [ ] Typecheck passes: `npx tsc --noEmit`
- [ ] Build succeeds: `npm run build`
- [ ] No circular imports introduced
