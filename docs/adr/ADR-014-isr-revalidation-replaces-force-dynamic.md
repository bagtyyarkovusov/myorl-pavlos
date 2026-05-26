# ADR-014: ISR + Tag-Based Revalidation Replaces `force-dynamic`

## Status
Proposed

## Context

Before this ADR, the Next.js site declared `export const dynamic = "force-dynamic"` at four places:

| File | Purpose |
|---|---|
| `frontend/src/app/[locale]/layout.tsx` | Forces the entire locale subtree dynamic. |
| `frontend/src/app/[locale]/[slug]/page.tsx` | Forces every CMS page dynamic. |
| `frontend/src/app/[locale]/search-results/page.tsx` | Intrinsically dynamic (user query). |
| `frontend/src/app/admin/search-analytics/page.tsx` | Admin, never SEO-crawled. |

Layout-level `force-dynamic` overrides per-page configuration in App Router — so even if a page declares `revalidate`, the layout's `force-dynamic` forces SSR on every request.

Consequences of the current state:

- For a 325-page site × Googlebot crawl rate × dev/preview crawls × organic visitor traffic, every page render runs the full Strapi DTO pipeline (DB query + section normalization + related-topics resolution + JSON-LD composition). Cold TTFB is ~600-1500ms.
- LCP is gated by cold SSR. Repeat visits to the same page never benefit from a static cache.
- Crawl budget is murdered: Googlebot's per-site request rate is capped by perceived server load; slow SSR responses depress the crawl rate, slowing index updates of new/changed content.
- Infrastructure cost scales linearly with crawl rate + visitor count, with no caching headroom.

The revalidation rails are already laid:

- `frontend/src/app/api/revalidate/route.ts` exists, accepts `?secret=...&tag=...`, calls `revalidateTag(tag, { expire: 0 })`. The whole tag-based invalidation pipeline is built.
- The endpoint is **never called** because the pages are not statically rendered.

The `force-dynamic` choice was deliberate at the time of migration cutover (editor changes appear in <100ms; no cache staleness debt during rapid content iteration). It made sense for migration; it does not make sense for SEO ambitions.

Alternatives considered:

- **Keep `force-dynamic`.** Editor latency: <100ms. SEO: untenable.
- **Static generation (SSG) at build time only.** Fastest serve. Editor edits don't appear until next deploy. Unacceptable for an actively-edited medical site.
- **ISR with `revalidate=N` + tag-based webhooks (chosen).** Static-cached for crawlers and repeat visitors. Refreshed periodically (the safety net). Tag-revalidated on Strapi save (the immediacy guarantee). Editor latency: ≤2 seconds.

## Decision

**Remove `force-dynamic` from the locale subtree, replace with ISR + tag-based revalidation.**

Concretely:

- Remove `export const dynamic = "force-dynamic"` from:
  - `frontend/src/app/[locale]/layout.tsx`
  - `frontend/src/app/[locale]/[slug]/page.tsx`
- Add `export const revalidate = 600` (10 minutes) on `[locale]/[slug]/page.tsx`. This is the time-based safety net.
- **Keep `force-dynamic`** on `[locale]/search-results/page.tsx` (the user query is the input; static caching is wrong) and `admin/search-analytics/page.tsx` (admin route, never SEO-crawled).
- Wire Strapi lifecycle hooks for the following content types to POST to `/api/revalidate?secret=...&tag=...`:
  - `Page` — tags: `page-<documentId>`, `locale-<locale>`
  - `Video Entry` — tags: `video-<documentId>`, `locale-<locale>`
  - `Global Settings` — tag: `locale-<locale>` (invalidates the whole subtree; chrome changes affect all pages)
  - `Tag` — tags: every page with that tag (or simply `locale-<locale>`)
- Search-params-dependent slices (testimonials pagination, directory tag filtering) flow through existing `<Suspense>` boundaries. Next.js 16 PPR renders the static shell from cache; the dynamic slice streams from a fresh request. The shell + dynamic split must be verified per layout variant before declaring victory.

### Revalidation contract

| Trigger | Tags revalidated | Effect |
|---|---|---|
| Editor saves a Page | `page-<documentId>`, `locale-<locale>` | That page refreshes; nothing else |
| Editor saves Global Settings | `locale-<locale>` | Whole locale subtree refreshes (header/footer/global chrome changed) |
| Editor saves a Tag | `locale-<locale>` | Whole locale subtree refreshes (tag labels surface throughout) |
| `tools/orchestrate_migration.py` finishes a `pg_restore` | `locale-el`, `locale-ru` (both) | Whole site refreshes after bulk restore (lifecycle hooks bypassed) |
| URL Mapping create/update/delete (ADR-012) | `url-mappings` | `next.config.ts` redirects table re-materializes (build-time pull) |

## Consequences

- Editor latency: ≤2 seconds end-to-end (Strapi DB commit → lifecycle hook → POST to `/api/revalidate` → `revalidateTag` → next request renders fresh).
- Crawl budget: expected 5–10× headroom improvement; Google sees fast static responses and adjusts crawl rate upward.
- LCP at p75: target <2.5s (from current ~3-4s under cold SSR), with TTFB ~50-150ms from the edge cache.
- Infrastructure cost: significantly lower CPU pressure on the Next.js service; Strapi load shifts from per-request to per-revalidation.
- The revalidation contract becomes **load-bearing across systems**. ADR-011 (search reindex) and this ADR (page cache invalidation) both fire on the same Strapi lifecycle events. Both webhook receivers must be idempotent; both must tolerate the other's retries.
- Bulk `pg_restore` operations bypass Strapi lifecycle (the same gotcha noted in ADR-011). `tools/orchestrate_migration.py` already chains `pg_restore` → search reindex; it must also POST `locale-el` and `locale-ru` revalidation tags after restore. A missing call here results in stale page cache after migration.
- `force-dynamic` regressions are easy to introduce. A lint rule or a custom check in `tools/audit_nextjs_content_hygiene.py` should flag any new `export const dynamic = "force-dynamic"` outside the two approved files (`search-results`, `search-analytics`).
