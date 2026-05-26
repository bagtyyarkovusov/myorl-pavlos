# ADR-013: Canonical Home is `/el`, Apex Permanently Redirects

## Status
Accepted (2026-05-26) — implemented via #157, #158

## Context

The legacy MODX site served the EL home at `myorl.gr/` (no locale prefix). Google has been indexing this URL for years; the brand's accumulated PageRank is concentrated on the bare apex.

The new Next.js site uses flat locale routes (`/el/...` and `/ru/...`) per [ADR-004](ADR-004-flat-locale-routes-and-localized-navigation-labels.md). The home page's Strapi slug is `index`; the navigation helper `hrefForLocaleSlug("el", "index")` collapses to `/el` (not `/el/index`).

Before this ADR, the apex handling was inconsistent:

- `frontend/src/app/page.tsx` used `redirect("/el")` from `next/navigation`, which emits HTTP **307 Temporary** by default. Modern Google transfers ranking equity reliably through 301/308 (Permanent) but treats 307 as a hint that the original URL may return.
- `frontend/src/proxy.ts` used `NextResponse.redirect(url)` (also 307) for bare-slug → `/el/<slug>` fallbacks, affecting every historical Greek URL in Google's index.

Three options were on the table for the canonical home:

- **Render the EL home at apex `/`.** Preserves backlink equity exactly. But creates an asymmetric URL space — apex becomes an exception to the `/<locale>/<slug>` rule — complicates hreflang (where does the apex sit in the alternate set?), and makes editorial mental model inconsistent.
- **Language picker at `/`.** Explicit user choice, but extra click for every visitor, worst SEO of the three (no content at apex; locale-specific home rankings split between `/el` and `/ru` with no clear apex authority).
- **Locale-prefixed canonical (chosen).** `/el` is the EL home, apex `/` permanently redirects to `/el`. Every page lives at `/<locale>/...` without exception.

## Decision

**`https://myorl.gr/el` is the Canonical Home for EL. `https://myorl.gr/ru` is the Canonical Home for RU. The apex `https://myorl.gr/` does not render a page — it returns HTTP 308 Permanent Redirect to `/el`.**

Concretely:

- `app/page.tsx` switches from `redirect("/el")` (307) to `permanentRedirect("/el")` (308) — `next/navigation` provides both.
- `proxy.ts` removes the bare-slug-to-locale logic from middleware. Bare-slug → `/el/<slug>` moves to `next.config.ts:redirects()` as a wildcard rule with `permanent: true` (308). `proxy.ts` retains **only** the `/` → `/el` Accept-Language fallback, also upgraded to 308 since the locale default never changes for SEO purposes.
- The third 307 emit site (`[locale]/[slug]/page.tsx:76`, section-hub folder → first child) **stays 307**. The first-child target changes when editors reorder children; a permanent cache would pin it incorrectly.
- The sitemap lists `https://myorl.gr/el` (and `https://myorl.gr/ru`); it never lists `https://myorl.gr`.
- `metadata.ts` emits `<link rel="canonical" href="https://myorl.gr/el">` on the EL home, `https://myorl.gr/ru` on the RU home.
- hreflang `alternates.languages` lists `el` and `ru`; `x-default` is added pointing at `/el` (the brand default).

## Consequences

- Existing PageRank on `myorl.gr/` transfers to `/el` via the 308. Modern Google transfers ~95-100% equity through 308 in the same-host case.
- External backlinks to `myorl.gr/` (Google Business Profile, Doctoranytime, Facebook bio, blog mentions) become one-hop redirects to `/el`. Not stacked; acceptable.
- The URL space is symmetric. Every editor-managed page conforms to `/<locale>/<slug>`. Editorial mental model has no exceptions.
- Future locale additions (e.g., English) follow the same pattern — `/en` becomes another Canonical Home, no special-casing.
- `x-default` is required for the locale-prefixed pattern; without it, Google may serve EL content to global searchers when no `el` match exists. Adding `x-default → /el` makes the brand default explicit.
- The `permanentRedirect` migration must land in the same release as the proxy.ts wildcard move — otherwise a window exists where apex requests are 307'd while bare-slug requests are 308'd, splitting equity signals.
