# ADR-012: URL Mapping Content Type as the Source of Truth for Legacy → Canonical Redirects

## Status
Proposed

## Context

The site is migrating from MODX (legacy `public_html/`) to Strapi 5 + Next.js 16 on the same domain `myorl.gr`. The legacy URL space differs from the new URL space in two structural ways:

1. **Locale prefix.** Legacy Greek URLs lived at `myorl.gr/<slug>` with no prefix; the new contract requires `myorl.gr/el/<slug>` (ADR-004, Canonical Home — see [ADR-013](ADR-013-canonical-home-locale-prefixed.md)). Russian URLs already carried a `/ru/` prefix on both sides.
2. **Slug renames and retirements.** Some pages were renamed in Strapi (`facelift` → `facelifting`), some were deliberately retired (MODX `deleted=1` rows), and ~325 active pages kept their slugs unchanged.

The current state of redirect handling, before this ADR:

- 18 slug renames live in `data/manifests/slug_redirects_next.json`, loaded into `next.config.ts:async redirects()` at build time.
- 31 second-hop `Redirect 301` rules live in the legacy `public_html/.htaccess` (Cyrillic-Greek slug → ASCII slug). **None are reflected in the new site.** Every URL in these rules is a real, externally-cited URL that Google has been resolving for years.
- 367 legacy URLs are catalogued in `myorl-migrate/old_url_inventory_clean.csv` (the **Legacy URL Inventory** — see CONTEXT.md). ~325 of these are present in current Strapi state; ~41 are MODX-deleted or unpublished.
- `gh-issue-13-seo-redirects-schema.md` (in the `myorl-migrate` plans repo) originally specified a Strapi `UrlMapping` content type with `legacyPaths` — it was never implemented.

The manifest approach is dev-only: every editorial slug change requires a developer commit + Next.js rebuild. With the editorial team expected to continue improving slugs and retiring pages post-launch, this throughput ceiling becomes a real friction surface.

Alternatives considered:

- **Stay with the JSON manifest, expand it to all 367 + 31 entries.** Fast to ship; doubles down on the dev-only friction.
- **TypeScript table in middleware.** Slightly more dynamic than JSON, still dev-only, still no editor visibility.
- **Strapi `UrlMapping` content type (chosen).** Editor-owned post-seed; supports per-row 301/410 distinction; decouples slug-change cadence from deploy cadence.

## Decision

Build a Strapi content type `url-mapping` as the single source of truth for legacy → canonical URL transitions after the MODX cutover. Field schema:

| Field | Type | Notes |
|---|---|---|
| `legacyPath` | string, unique, required | Starts with `/`. Stored as decoded Unicode (e.g., `/αμυγδαλεκτομή`, not `/%CE%B1...`). |
| `destinationPath` | string, required | No trailing slash. Final destination; chains are flattened. |
| `destinationKind` | enum | `internal-301`, `external-301`, `gone-410` |
| `locale` | enum, nullable | `el`, `ru`, or `null` (applies to unprefixed legacy paths). |
| `notes` | text, optional | Editorial. |

### Seeding contract (one-time, idempotent)

The `URL Mapping` collection is seeded by `tools/seed_url_mappings.py` from two inputs:

1. **Legacy URL Inventory** rows where the audit script (`tools/audit_legacy_urls.py`) classifies the row as:
   - **Case 2 — slug renamed** (current Strapi slug differs from MODX alias) → `internal-301` row pointing at `/<locale>/<new-slug>`.
   - **Case 3 — page retired** (no current Strapi equivalent) → `gone-410` row.
   - **Case 1 — slug unchanged** is **not** seeded as a URL Mapping row; it is handled by the `next.config.ts` locale-prefix wildcard.

2. **The 31 second-hop `Redirect 301` rules in legacy `public_html/.htaccess`**, flattened so each Cyrillic-Greek source becomes a single 301 directly to the final new URL (skipping the intermediate ASCII-slug hop). Google explicitly recommends ≤1 redirect hop; this guarantees that.

### Lookup precedence at request time

1. **URL Mapping exact match** (Strapi-driven) — emits 301 / 410.
2. **`next.config.ts` wildcard** (case-1 catch-all) — `/<slug>` matching neither `el|ru|api|admin|_next|uploads|sitemap.xml|robots.txt` → 308 to `/el/<slug>`.
3. Fall through to Next.js page render or 404.

The Strapi lookup is materialised into `next.config.ts:async redirects()` at build time (re-runs on Strapi webhook → frontend rebuild) so the request path remains zero-DB-hit.

### Manifest deprecation

`data/manifests/slug_redirects_next.json` collapses into a one-time seed input. After the initial seed, it is **not** updated. The runtime source of truth is the Strapi collection.

## Consequences

- Editors add redirects via the Strapi admin UI without developer intervention — post-launch slug renames, page retirements, and editorial reorganization flow through Strapi.
- `next.config.ts:redirects()` shrinks to the wildcard catch-all + a small number of developer-special-cased rules (the existing `contact ↔ epikoinonia`, `appointment ↔ rantevou/zapis`, etc.). Per-page redirects all live in Strapi.
- Wildcard / section-prefix redirects (e.g., `/el/contact/:path*`) remain dev-owned in `next.config.ts` — they are not editorial.
- Cyrillic and other non-ASCII legacy paths are stored as decoded Unicode in `legacyPath`. A normalization test verifies that both raw (`/αμυγδαλεκτομή`) and percent-encoded (`/%CE%B1%CE%BC%CF%85%CE%B3%CE%B4%CE%B1%CE%BB%CE%B5%CE%BA%CF%84%CE%BF%CE%BC%CE%AE`) incoming paths resolve to the same destination.
- The build-time materialization couples redirect cadence to deploy cadence. To avoid this, a Strapi lifecycle hook on `url-mapping` create/update/delete posts to `/api/revalidate` with tag `url-mappings`, triggering Next.js to refresh its redirect table. The `revalidate` route already exists ([ADR-014](ADR-014-isr-revalidation-replaces-force-dynamic.md)).
- The `tools/audit_legacy_urls.py` audit script becomes a launch-gate dependency: without it, slug-renamed rows would silently become 404s under the wildcard catch-all.
