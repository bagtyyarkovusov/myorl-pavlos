# Search Reindex Runbook

How to operate the Meilisearch-backed **Search Index** — initial seed, drift repair, post-migration rebuild, and incident response.

For architectural context see [ADR-011](../adr/ADR-011-full-site-search-via-meilisearch.md). Domain terms (**Search Index**, **Search Document**, **Search Synonym Dictionary**, **Search Query Log**) are defined in [CONTEXT.md](../../CONTEXT.md).

## Quick reference

| Task | Command |
|------|---------|
| Initial seed (dev) | `python3 tools/seed_search_index.py --target dev --mode full` |
| Initial seed (rehearsal) | `python3 tools/seed_search_index.py --target rehearsal --mode full` |
| Initial seed (production) | `python3 tools/seed_search_index.py --target prod --mode full --force` |
| Full reindex after `pg_restore` (production) | `python3 tools/orchestrate_migration.py --target prod --rebuild-search --force` |
| Single-doc reindex (drift repair) | `python3 tools/seed_search_index.py --target dev --mode single --slug ρινοπλαστική --locale el` |
| Sync synonyms + stop words only | `python3 tools/seed_search_index.py --target dev --mode sync-synonyms` |
| Wipe all indexes (dev only) | `python3 tools/seed_search_index.py --target dev --mode wipe` |

Production-targeted operations refuse to run without `--force`. This matches the safety pattern of `migration_runner.py` and `backup_runner.py`.

## When to reindex

| Situation | What to run |
|-----------|-------------|
| Standing up a new environment (dev / rehearsal / fresh prod) | Full seed |
| After `pg_dump`/`pg_restore` migration of any kind | Orchestrator (`orchestrate_migration.py`) — chains restore + reindex + verify |
| Strapi schema change affecting indexed fields | Full reindex |
| Editor reports "I published a page but search doesn't find it" | Single-doc reindex for that page first; full reindex if drift is suspected sitewide |
| Updated `synonyms.{el,ru}.yaml` or `stopwords.{el,ru}.yaml` | `sync-synonyms` mode |
| Suspect drift but cause unknown | Full reindex (idempotent — safe to run) |

## How real-time sync works

Strapi fires a webhook on every Page and Video Entry create/update/delete. The webhook posts to `/api/search/reindex` on the Next.js service. The receiver:

1. Validates the HMAC signature.
2. Fetches the full DTO via the existing CMS gateway.
3. Transforms via `lib/search/index-document.ts`.
4. Upserts (or deletes) the Search Document in the appropriate locale's Search Index.

**This path is bypassed entirely by `pg_restore`** — direct database operations do not fire Strapi lifecycle events. Bulk reindex via the orchestrator is the required follow-up.

## Verifying the index after a reindex

The seed tool runs a built-in smoke test before reporting success:
- Searches for a known canonical term (e.g., "ρινοπλαστική" in `el`, "ринопластика" in `ru`).
- Fails loudly if the result set is empty.

To verify manually:

```bash
# Dev — direct Meili query via curl (uses MEILI_MASTER_KEY)
curl -X POST "http://localhost:57700/indexes/el/search" \
  -H "Authorization: Bearer $MEILI_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"q":"ρινοπλαστική","limit":3}'
```

A healthy response returns at least one hit with `title`, `href`, and `_formatted.title` (highlighted matches).

## Incident response

### "Search returns zero results for everything"

1. Check `SEARCH_ENABLED` — if `false`, search is intentionally off.
2. Check Meilisearch reachability: `curl $MEILI_HOST/health` should return `{"status":"available"}`.
3. Check index document counts:
   ```
   curl -H "Authorization: Bearer $MEILI_MASTER_KEY" $MEILI_HOST/indexes/el/stats
   ```
   If `numberOfDocuments: 0`, run a full reindex.
4. If counts are non-zero but searches still return nothing, check the analyzer config — synonyms or stop words may be misconfigured. `sync-synonyms` repushes.

### "Search returns stale results / removed page still appears"

1. Run a single-doc reindex with the affected slug.
2. If multiple pages affected, run a full reindex.
3. Check the webhook delivery history in Strapi admin (Settings → Webhooks → activity) — failed deliveries indicate the receiver was unreachable or returned non-2xx.

### "Search is slow"

1. Meilisearch query latency: check Railway service metrics (CPU, memory).
2. If queries against `/api/search/query` (SSR path) are slow but direct Meilisearch is fast, the bottleneck is in Next.js — likely cold function spinup or the locale-fallback resolver doing too many round-trips.

### "Webhook receiver returning 500s"

1. Tail Next.js logs for the `/api/search/reindex` route.
2. Most likely cause: Meilisearch master key mismatch between the env var and the running Meili service (e.g., after a Meili restart with a new key).
3. Re-set `MEILI_MASTER_KEY` and bounce the Next.js service.

## Production cutover ritual

After any database migration to production:

```bash
python3 tools/orchestrate_migration.py --target prod --rebuild-search --force
```

The orchestrator:
1. Runs preflight guards.
2. Performs the `pg_restore`.
3. Waits for Strapi to be reachable.
4. Wipes Meilisearch indexes.
5. Runs the full seed against production Strapi.
6. Pushes synonyms + stop words.
7. Runs the smoke test query.
8. Reports success or fails loudly.

This sequence is non-skippable. Manual `pg_restore` without the orchestrator is a defect.

## Related runbooks

- [Postgres rehearsal](postgres-rehearsal.md) — validates query plans before production migration.
- [Postgres backup](postgres-backup.md) — backup/restore semantics for the Strapi state store.
- [Production cutover](production-cutover.md) — full cutover sequence (now extended with the reindex step).
- [Production deployment](production-deployment.md) — Railway deployment workflow.
