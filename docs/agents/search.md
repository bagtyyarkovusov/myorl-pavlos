# Agents Guide: Search

How agents should navigate, modify, and test the **Search Index** subsystem. See [ADR-011](../adr/ADR-011-full-site-search-via-meilisearch.md) for the architectural rationale and [docs/runbooks/search-reindex.md](../runbooks/search-reindex.md) for operator procedures.

Domain terms (**Search Index**, **Search Document**, **Search Synonym Dictionary**, **Search Query Log**) are defined in [CONTEXT.md](../../CONTEXT.md) — use them verbatim.

## File map

| Concern | Path |
|---------|------|
| Meilisearch client singletons (admin + scoped) | `frontend/src/lib/search/meili-client.ts` |
| DTO → Search Document transformation | `frontend/src/lib/search/index-document.ts` |
| Locale fallback + `localizations` redirect | `frontend/src/lib/search/locale-fallback.ts` |
| Synonym dictionaries (YAML, per-locale) | `frontend/src/lib/search/synonyms.{el,ru}.yaml` |
| Synonym expansion from CMS content | `tools/expand_search_synonyms.py` (reads Meili export + `synonyms.*.seed.yaml`) |
| Strapi → search webhook setup | `tools/setup_strapi_search_webhook.py` — see [search-reindex runbook](../runbooks/search-reindex.md#strapi_webhook_secret-management) |
| Stop words (YAML, per-locale) | `frontend/src/lib/search/stopwords.{el,ru}.yaml` |
| Webhook + bulk reindex API | `frontend/src/app/api/search/reindex/route.ts` |
| Query log API (anonymous) | `frontend/src/app/api/search/log/route.ts` |
| SSR search results | `frontend/src/app/[locale]/search-results/page.tsx` |
| Header overlay (client) | `frontend/src/components/search/SearchOverlay.tsx` |
| Result card (shared) | `frontend/src/components/search/ResultCard.tsx` |
| Internal analytics view | `frontend/src/app/admin/search-analytics/page.tsx` |
| Bulk reindex / drift repair (Python) | `tools/seed_search_index.py` |
| Migration orchestrator | `tools/orchestrate_migration.py` |
| Per-environment Meilisearch identity | `tools/environments.py` |

## Principles

1. **The CMS gateway is the source of truth for content shape.** Indexing logic reuses `frontend/src/lib/cms/page-normalizer.ts` and the normalized DTO types. Do **not** read Strapi raw in `index-document.ts`.
2. **The Python tool orchestrates; the Next.js endpoint transforms.** `tools/seed_search_index.py` calls `POST /api/search/reindex` in bulk mode. There is no Python-side DTO transformation.
3. **The master key never appears in the browser bundle.** `lib/search/meili-client.ts` imports `"server-only"` at the top. Any agent adding a new client module touching the master key must do the same.
4. **Two indexes (`el`, `ru`), per-locale analyzers.** Do not collapse to one index. Do not add per-content-type indexes.
5. **Section Sub-pages are indexed; system layouts are not.** The `isFrontendNativeSystemLayout()` check from `page-normalizer.ts` is the canonical filter.
6. **Privacy is a hard constraint.** The `search_query_log` table schema is the privacy contract. No IP, no user account, no persistent identifier. Adding such fields requires updating the privacy notice and is a separate ADR.

## When changing search-related code

| Change type | Required follow-up |
|------------|--------------------|
| Modified `index-document.ts` (changed indexed fields, weights, or body extraction) | Full reindex of dev (`tools/seed_search_index.py --target dev --mode full`) and rehearsal. Update `index-document.test.ts`. |
| Added or modified synonyms/stopwords YAML | Run `tools/seed_search_index.py --target dev --mode sync-synonyms`. Commit YAML change. |
| Bulk synonym expansion from page corpus | Export Meili docs (`tools/data/search-synonym-source-{el,ru}.json`), run `python3 tools/expand_search_synonyms.py --write`, then `sync-synonyms`. |
| Modified `meili-client.ts` or query-path code | Run integration tests against a real Meili container (Vitest + Testcontainers). |
| Modified webhook receiver | Replay a known webhook payload against dev via curl. Confirm a known doc indexes correctly. |
| Modified the search query log schema | Forward-only migration via `tools/migration_runner.py`. Update ADR-011 privacy section. Update privacy notice CMS page in both locales. |
| Added a new content type to the index | Update `index-document.ts`, the seed tool's crawl path, ADR-011 corpus section, CONTEXT.md if a new term is introduced. |

## Testing

- **Unit tests** for `index-document.ts` follow the `page-normalizer.test.ts` pattern (pure transformation, no Meili).
- **Integration tests** for `meili-client.ts` use Testcontainers to spin up a real Meili instance — assert highlights, typo tolerance, locale filtering, faceting.
- **API route tests** for `/api/search/reindex` follow the `frontend/src/app/api/revalidate/route.ts` pattern.
- **E2E tests** for the overlay and results page follow `frontend/e2e/pages/*.spec.ts` conventions — viewport projects, `toHaveScreenshot`, `waitForTimeout` for motion settle.
- **Python tests** for the seed tool follow `tests/test_cms_html_cleanup.py` — assert production safety (`--force` required), drift count correctness, and bulk payload shape.

Mock Meilisearch SDK at the **network boundary**, not via clever wrappers. Real Meili in integration tests is cheap (Testcontainers spins up in ~3 seconds).

## Common agent pitfalls

1. **Indexing from Strapi raw rather than via the gateway.** Produces shape drift between rendered pages and indexed documents. Always go through the gateway.
2. **Using the master key in a client component.** Build will fail thanks to `"server-only"` — but reviewing agents should flag any new path that touches Meili admin operations from a non-server context.
3. **Forgetting locale fallback when adding a new query call.** The `searchWithFallback` helper in `meili-client.ts` is the canonical query entry point; raw `searchInLocale` skips Q3 semantics.
4. **Treating the search query log like a generic analytics table.** Privacy regression is the worst-case outcome. Adding any field that could correlate to a user is out of scope without an ADR.
5. **Running a bulk reindex against production without `--force`.** The tool refuses, but agents should understand why.

## Pointers

- Implementation brief: [PRD #117](https://github.com/bagtyyarkovusov/myorl-pavlos/issues/117).
- Operator procedures: [docs/runbooks/search-reindex.md](../runbooks/search-reindex.md).
- Architectural rationale: [docs/adr/ADR-011-full-site-search-via-meilisearch.md](../adr/ADR-011-full-site-search-via-meilisearch.md).
- Port allocation: [CONTEXT.md → Search Stack](../../CONTEXT.md).
