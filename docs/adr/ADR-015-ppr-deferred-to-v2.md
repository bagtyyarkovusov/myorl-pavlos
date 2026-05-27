# ADR-015: Partial Prerendering (PPR) Deferred to v2

## Status
Accepted (2026-05-27) — amends [ADR-014](ADR-014-isr-revalidation-replaces-force-dynamic.md)

## Context

[ADR-014](ADR-014-isr-revalidation-replaces-force-dynamic.md) replaced `force-dynamic` with ISR + tag-based revalidation and called out Partial Prerendering (PPR) as the eventual goal:

> Search-params-dependent slices (testimonials pagination, directory tag filtering) flow through existing `<Suspense>` boundaries. Next.js 16 PPR renders the static shell from cache; the dynamic slice streams from a fresh request. **The shell + dynamic split must be verified per layout variant before declaring victory.**

That verification has not been done. Next.js 16's PPR opt-in is `cacheComponents: true` in `next.config.ts`. Enabling it today would surface several problems on the launch critical path:

1. **`[slug]/page.tsx` fetches data outside `<Suspense>`.** Lines 66-69 `await getPage(...)` and `await getSite(...)` in parallel **before** the `<Suspense>` boundary at line 83. With PPR enabled, this forces the entire page into the dynamic path — defeating the purpose. The refactor would move data fetching into a child component wrapped in `<Suspense>` with cached data above.
2. **13 layout variants × 2 locales × hreflang variants** = a long-tail of permutations to verify. The shell+dynamic split must be correct for each, and "correct" requires running every variant under PPR and observing the actual response shape.
3. **PPR is still experimental in Next.js 16.2.** The `cacheComponents` flag is opt-in and the API may iterate before stabilising in 16.3+. Refactoring to fit the experimental API now risks re-doing the work.
4. **The SEO launch is content-gated, not perf-gated.** ISR + `revalidate=600` + tag webhooks already deliver ~50-150ms TTFB on cache hits and editor latency ≤2s. PPR's incremental win matters more at 10,000+ page scale; we have 325 pages.

Alternatives considered:

- **Enable PPR site-wide pre-launch.** Adds 2-3 days of engineering plus verification of 13 layout variants to a launch already gated on a 3-4 week editorial sprint. Pure risk on the critical path with bounded user-visible upside at our scale.
- **Pilot PPR on the home page only.** Contained blast radius (one route). Still adds a refactor task to the launch window. Defers the same site-wide verification question.
- **Defer to v2 (chosen).** Ship the launch on ISR + Suspense streaming. Collect real LCP/TTFB data from `/api/web-vitals` (issue #168 telemetry). Re-evaluate when there's data to base the cost/benefit on.

## Decision

**Do not enable `cacheComponents: true` for v1. Schedule PPR enablement as a v2 task contingent on Web Vitals telemetry.**

Concretely:

- `next.config.ts` does **not** set `cacheComponents`.
- The `<Suspense>` boundaries placed in [ADR-014](ADR-014-isr-revalidation-replaces-force-dynamic.md) stay where they are; they continue to provide streaming benefits even without PPR.
- The trigger for revisiting PPR is **LCP p75 > 2.5s on the production telemetry** (the threshold called out in ADR-014's Consequences). If LCP stays under target, PPR's incremental win does not justify the refactor cost.
- When PPR is enabled (whenever that lands), [ADR-014](ADR-014-isr-revalidation-replaces-force-dynamic.md)'s call to "verify the shell + dynamic split per layout variant" becomes the v2 acceptance gate.

## Consequences

- The SEO launch ships with ISR + Suspense streaming, not PPR. TTFB and LCP are measured by the Web Vitals telemetry pipeline shipped in #168.
- ADR-014's PPR aspiration remains on the roadmap but is no longer implicit. Future engineers reading ADR-014 should follow the link here to understand why PPR was deferred and what its trigger is.
- A static brand card (`app/[locale]/opengraph-image.tsx`, `app/[locale]/[slug]/opengraph-image.tsx`) was added pre-launch as a separate concern; it is unrelated to PPR but worth noting that the OG image fallback also benefits from the same ISR cache layer.
- If the Web Vitals telemetry shows LCP comfortably under 2.5s p75 after launch, PPR may be deferred indefinitely. The launch posture is "ship measured, iterate on data" — not "ship every Next.js 16 feature because it exists."
