# ADR-011: Full-Site Search via Self-Hosted Meilisearch

## Status
Accepted

## Context
The site has hundreds of medical articles (Pages) across two locales (`el`, `ru`) plus a Video Directory of Video Entries — but no way to search them. The header has no search affordance, the `/search-results` route is a placeholder stub in `FrontendNativePage`, and the schema.org `SearchAction` declared at `/search-results?q={search_term_string}` makes a promise to crawlers the site does not yet keep.

Without search, patients depend on the header mega-menu and the Human Site Map for discovery. Neither surfaces information by procedure name, symptom, or colloquial term. Russian-speaking patients are particularly affected: Russian content has gaps relative to Greek, so a "search returns zero in your locale" interaction terminates in a dead end.

Three architectural pressures shape the engine choice:

1. **Greek + Russian language analyzers are mandatory.** Greek polytonic/monotonic normalization, accent insensitivity, and Cyrillic morphology stemming all materially affect recall on medical vocabulary. Engines without first-class language packs are excluded.
2. **The Canonical Export Adapter does full `pg_dump` → `pg_restore` migrations** that bypass Strapi lifecycle hooks. Any indexing strategy that depends only on webhook-driven updates will silently desync after every bulk migration.
3. **Cost sensitivity.** This is a single-clinic site. Predictable monthly cost matters; surprise overage bills do not.

Alternatives considered:

- **PostgreSQL FTS** — runs on existing infrastructure (free, no new service), but Greek tokenization in PG is weak (`unaccent` + `pg_trgm` workarounds, no real stemming). Russian works but the asymmetric quality across locales is a permanent compromise.
- **Algolia (SaaS)** — best-in-class typo and synonyms UI, strong language support, but search-count overages bill aggressively, vendor lock-in is meaningful (proprietary data shapes), and the free-tier ceiling is one viral blog post away from breaking.
- **Typesense (self-host or Cloud)** — roughly equivalent to Meilisearch in features and language support; either would work. Choice between the two is largely aesthetic.
- **Meilisearch (self-host or Cloud)** — Greek and Russian as first-class language packs, built-in typo tolerance, synonyms, faceting, locale-aware tokenizers, native instant-search SDK. ~$5/mo predictable on Railway. Data shapes are nearly identical to Typesense — migration cost is bounded if we ever change our minds.

## Decision

**Self-host Meilisearch on Railway as a separate service**, with the following non-negotiables.

### Engine and infrastructure

- **One Meilisearch service per environment** (dev / rehearsal / production), mirroring the PostgreSQL pattern.
- **Two indexes per environment: `el` and `ru`.** Each carries both Pages and Video Entries as **Search Documents** distinguished by a `type` facet. The locale boundary equals the index boundary; per-index analyzer configuration is the mechanism that gives correct Greek and Russian tokenization.
- **The Port Allocation Contract** and **Environment Manifest** (`tools/environments.py`) are the source of truth for per-environment Meilisearch identity (container, host port, volume, master-key env-var name).

### Corpus

- **Pages** are indexed with `title`, `excerpt`, and a flattened `body` (raw `content` HTML stripped to text, plus FAQ/accordion section text walked from `pageSections`).
- **Video Entries** are indexed with `title` + tag names only. Transcripts are **not** indexed (no transcript pipeline exists; adding one is a separate project).
- **Section Sub-pages** (`hideFromMenu: true`) are indexed — they are real content reachable via section hubs.
- **System layouts** (`not-found`, `search-results`, `sitemap`, `appointment-form`) are excluded.
- **Tag** entities are not indexed as primary search documents; tag slugs surface as facets on Pages and Video Entries.

### Indexing pipeline

- **Single transformation path.** The `frontend/src/lib/search/index-document.ts` module is the only place Page DTOs and Video Entry DTOs become Search Documents. It reuses the existing CMS gateway and DTO normalizers — the same shape that renders pages is the shape that gets indexed.
- **Real-time updates** flow Strapi webhook (on entry create/update/delete) → `POST /api/search/reindex` (Next.js, HMAC-validated) → Meilisearch upsert/delete.
- **Bulk reindex** is owned by `tools/seed_search_index.py`. It crawls Strapi and POSTs batches to the same Next.js endpoint. Used for initial seed, drift repair, and post-migration rebuild.
- **Migration integration is mandatory.** A new `tools/orchestrate_migration.py` chains `pg_restore` → verify Strapi boot → reindex search → smoke-test a known query as one command. Bulk migration without reindex is treated as a defect.

### Query path (hybrid)

- **Instant dropdown**: browser talks directly to Meilisearch via `instant-meilisearch` with a **scoped search-only key** (`NEXT_PUBLIC_MEILI_SEARCH_KEY`, scoped to `actions: ["search"]`, `indexes: ["el", "ru"]`). Latency target ~30-80ms per keystroke.
- **Dedicated `/search-results` page**: server-rendered by Next.js using the **master key** server-side. Implements the Q3 locale fallback logic, `localizations` relation lookup, no-JS form fallback, and SSR for crawler compatibility.
- **The master key is never present in the browser bundle.** Enforced by `import "server-only"` in the admin client module — accidental client-side import becomes a build error.

### Locale handling (locale-first with smart fallback)

- Default: visitor's locale only.
- Zero current-locale results → transparently query the other locale, surface results with a localized "no results in your language" banner.
- Each fallback result is rewritten via the Strapi `localizations` relation: if a translation in the visitor's locale exists, the link is swapped to that.
- Opt-in `?allLangs=1` toggle on `/search-results` for explicit cross-locale search.
- **Latin-script transliteration** ("rhinoplasty" → "ρινοπλαστική" / "ринопластика") is **deferred** — requires a transliteration map and complicates query analysis.

### Ranking and synonyms

- **Default Meilisearch ranking rules** `[words, typo, proximity, attribute, sort, exactness]`, extended with `_rankBoost:desc` between `attribute` and `sort`. Pages carry `_rankBoost: 100`, Video Entries `_rankBoost: 50` — the article-first nudge that matches editorial intent.
- **`searchableAttributes`** ordered `["title", "excerpt", "body"]` — title hits outrank body hits.
- **Synonyms and stop words** live in the repo as YAML (`frontend/src/lib/search/synonyms.el.yaml`, `stopwords.el.yaml`, and the `ru` equivalents). Dev-owned in v1 — editors request additions, dev commits PRs. Migrating to Strapi-managed synonyms is a v2 decision triggered only by dictionary growth past ~100 entries.
- **Default typo tolerance**: 1 typo for 5-8 char words, 2 typos for 9+. Tunable but unchanged at launch.
- **No explicit "did you mean" UI** in v1 — Meilisearch silently includes typo-tolerant matches.

### Analytics and privacy

- A `search_query_log` Postgres table (created via forward-only migration through `tools/migration_runner.py`) records `{ query, locale, result_count, session_id, created_at }` for every search.
- **No IP address.** **No user account ID.** Session ID is `crypto.randomUUID()` stored in `sessionStorage`, never persisted across sessions, never tied to identity.
- **90-day automatic TTL** enforced by a scheduled SQL job.
- Internal `/admin/search-analytics` view surfaces top queries and zero-result queries — the input to the editor's synonym and content backlog.
- Disclosed in the user-facing privacy notice (CMS page in both locales).

This privacy model is **GDPR-defensible under the anonymous-data carve-out** and is the mechanism by which the system **gets smarter over time** without becoming a surveillance product.

### Feature flag and graceful degradation

- `SEARCH_ENABLED` per-environment env flag controls user-visible activation independently of code deployment.
- When `false` (or Meilisearch is unreachable): header search icon hides, `/search-results` renders a placeholder, webhook receiver returns 200 (no-op), client modules return null from the search-client singleton.

### Rollout

Five independently revertable phases:

1. Infra + docs (no UI).
2. Indexing pipeline only — verified via curl against dev.
3. Dedicated `/search-results` page (SSR).
4. Header dropdown / overlay.
5. Analytics layer.

The implementing agent should use the `/prototype` skill before committing to Phase 3 + 4 UI details — variant exploration on the dropdown, mobile overlay, filter sidebar/bottom-sheet pattern, and empty/error states benefits from throwaway prototypes.

## Consequences

### Positive

- Patients gain working search across all medical content in their language.
- Meaningful "smartness" — typos, stemming, synonyms, locale-aware tokenization — without ML infrastructure.
- A clear path to getting smarter over time (analytics-driven synonym and content backlog).
- Migration tooling is hardened: drift-after-`pg_restore` becomes impossible by construction.
- Schema.org `SearchAction` contract becomes real; Google's sitelinks search box works.
- ~$5/month operational cost; no vendor lock-in worth worrying about.

### Negative

- New service to operate (Meilisearch container + persistent volume on Railway). Backups, monitoring, version upgrades become operational concerns.
- A new key-management surface (master vs scoped search key) that did not exist before.
- The webhook → reindex path adds a failure mode editors do not currently have (a published article that does not appear in search). Mitigated by the bulk reindex tool, the `/admin/search-analytics` zero-result list, and (in v2) a nightly safety-net cron.
- Locale fallback semantics are subtle and need explicit user-facing copy in both locales — UI complexity for an edge case that is itself driven by gaps in Russian translation work.

### Reversible parts

- **Synonyms YAML → Strapi-managed** is a one-way upgrade we can make later.
- **Meilisearch → Typesense** is a non-trivial but bounded migration (similar data shapes).
- **Lexical → hybrid lexical+vector** (semantic search) is an additive upgrade Meilisearch 1.6+ supports — turn it on if analytics demand it.

### Hard-to-reverse parts

- The Search Query Log privacy model is encoded in the table schema and disclosed in the privacy notice. Changing it (e.g., adding identifiers) is a privacy regression and would require user-facing notice updates.
- The two-index-per-locale topology is the architecture's locale-tokenization seam. Collapsing to a single index would silently regress Greek or Russian search quality.
- The `tools/orchestrate_migration.py` contract (restore + reindex + verify as one command) is now part of the production cutover ritual; future migration tooling must preserve the chain.
