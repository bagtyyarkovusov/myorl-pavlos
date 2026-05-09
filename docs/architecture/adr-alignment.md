# ADR-to-Codebase Alignment Report

> Verification that each Accepted ADR is correctly reflected in the codebase.

## Alignment Table

| ADR | Status | Decision | Verification | Result |
|-----|--------|----------|------------|--------|
| **ADR-001** | Accepted | Semantic DTO Boundary between Next.js and Strapi | `frontend/src/lib/cms/page-normalizer.ts` exports `toPageDTO()`; `frontend/src/lib/cms/dto.ts` re-exports DTO helpers; types defined in `frontend/src/lib/cms/types.ts`; no raw Strapi imports outside `lib/cms/` | ✅ Aligned |
| **ADR-002** | Accepted; partially superseded | Contact pages as static cards; system pages frontend-native | `isFrontendNativeSystemLayout()` in `page-normalizer.ts` returns `true` for `not-found`, `search-results`, `sitemap`, `testimonials-index`; Contact page clinic cards require `name` + `addressHtml` | ✅ Aligned (map portion superseded by ADR-009) |
| **ADR-003** | Accepted | Forward-only PostgreSQL hardening migrations | `backend/database/postgres-migrations/` contains `.up.sql` files; `tools/migration_runner.py` enforces SHA-256 checksums, blocks `down` in prod, requires `--force` for prod `up` | ✅ Aligned |
| **ADR-004** | Accepted | Flat locale routes + localized menu titles | `frontend/src/app/[locale]/[slug]/page.tsx` implements flat `/el/:slug` and `/ru/:slug`; `navLabel = menuTitle ?? title` in `toPageDTO()` | ✅ Aligned |
| **ADR-005** | Accepted | Repair source parent integrity before cutover | Navigation DTO builds from `parentPage` relations; bootstrap scripts reconcile parent links | ✅ Aligned |
| **ADR-006** | Accepted | DynamicZone as single section container | `backend/src/api/page/content-types/page/schema.json` has single `pageSections` DynamicZone with all 10 section components; no dedicated `faqSection`, `accordionSection`, etc. fields | ✅ Aligned |
| **ADR-007** | Accepted | Hybrid Tailwind v4 + CSS Modules | `frontend/src/app/globals.css` has `@theme` block + `:root` semantic aliases; CSS Modules co-located with components; `cn()` utility in `frontend/src/lib/utils.ts` | ✅ Aligned |
| **ADR-008** | Accepted | Dev Postgres is canonical Strapi state store | `tools/environments.py` defines dev Postgres; `tools/orchestrate_rehearsal.py` exports from dev Postgres, fails fast if not running; SQLite path exists as fallback only | ✅ Aligned |
| **ADR-009** | Accepted | Clinic maps on contact pages | `sections.contact` schema includes `latitude` and `longitude` fields; `toContactSection()` in normalizer passes coordinates; frontend ContactPage renders map when data exists | ✅ Aligned |

## Superseded Scope

**ADR-002 → ADR-009**: ADR-002 originally deferred clinic maps because coordinates were absent from semantic data. ADR-009 reinstated map rendering once the data became available. The decisions in ADR-002 about:
- System pages being frontend-native ✅ (still valid)
- Social platform derivation in Next.js ✅ (still valid)
- Contact cards requiring `name` + `addressHtml` ✅ (still valid)

Are all still in force. Only the "ignore latitude/longitude" portion was superseded.

## Cross-References

### ADR-001 (DTO Boundary) touches:
- `frontend/src/lib/cms/page-normalizer.ts`
- `frontend/src/lib/cms/section-normalizer.ts`
- `frontend/src/lib/cms/types.ts`
- `frontend/src/lib/cms/dto.ts`
- `frontend/src/lib/cms/cms-gateway.ts`

### ADR-006 (DynamicZone) touches:
- `backend/src/api/page/content-types/page/schema.json`
- `frontend/src/lib/cms/section-normalizer.ts`
- `frontend/src/components/sections/SectionRenderer.tsx`
- All `frontend/src/components/sections/*Section.tsx` files

### ADR-007 (Styling) touches:
- `frontend/src/app/globals.css`
- `frontend/src/lib/utils.ts`
- All `*.module.css` files in `frontend/src/components/`

### ADR-008 (Canonical Store) touches:
- `tools/environments.py`
- `tools/orchestrate_rehearsal.py`
- `tools/migration_runner.py`
- `docker-compose.dev.yml`

## Gaps

None identified. All 9 Accepted ADRs are correctly implemented in the codebase.

## Related

- [../adr/](../adr/) — Full ADR documents
- [README.md](README.md) — Architecture MOC with ADR links
