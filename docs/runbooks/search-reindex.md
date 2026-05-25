# Search Reindex Runbook

How to operate the Meilisearch-backed **Search Index** — initial seed, drift repair, post-migration rebuild, and incident response.

For architectural context see [ADR-011](../adr/ADR-011-full-site-search-via-meilisearch.md). Domain terms (**Search Index**, **Search Document**, **Search Synonym Dictionary**, **Search Query Log**) are defined in [CONTEXT.md](../../CONTEXT.md).

## Provisioning a new environment

Meilisearch is deployed as a separate service per environment. Dev and rehearsal use Docker Compose; production uses Railway.

### Dev / rehearsal (Docker Compose)

The `docker-compose.dev.yml` and `docker-compose.rehearsal.yml` files already include a `meilisearch` service. To stand up a fresh instance:

```bash
# Dev
docker compose -f docker-compose.dev.yml up -d meilisearch

# Rehearsal
docker compose -f docker-compose.rehearsal.yml up -d meilisearch
```

Verify the service is healthy:

```bash
# Dev
curl http://localhost:57700/health
# → {"status":"available"}

# Rehearsal
curl http://localhost:57701/health
# → {"status":"available"}
```

The master key defaults to `dev-master-key-do-not-use-in-prod` (dev) or `rehearsal-master-key-do-not-use-in-prod` (rehearsal) unless overridden via `MEILI_MASTER_KEY_DEV` / `MEILI_MASTER_KEY_REHEARSAL`. For dev/rehearsal, the master key doubles as the search key — no scoped key provisioning is required.

### Production (Railway)

Meilisearch runs as an internal-only Railway service, reachable from the Next.js service via Railway's private network (`http://meilisearch:7700`). No host port is exposed to the public internet.

#### Step 1: Create the Railway service

In the Railway project dashboard:

1. **New Service → Docker Image** — enter `getmeili/meilisearch:v1.11`.
2. Name the service `meilisearch` (this becomes the internal DNS name).
3. Under **Networking**, keep it **Private** (no public domain). The Next.js service reaches it at `http://meilisearch:7700` via Railway's internal network.

#### Step 2: Attach a persistent volume

1. In the `meilisearch` service, go to **Volumes**.
2. Add a volume with mount path `/meili_data` (this is where Meilisearch persists indexes, keys, and dumps).
3. Name the volume `meilidata_prod`.

#### Step 3: Generate and set the master key

Generate a cryptographically random master key:

```bash
openssl rand -hex 32
```

Set it as a **shared variable** (available to both `meilisearch` and `nextjs` services) in the Railway dashboard:

| Variable | Scope | Value |
|----------|-------|-------|
| `MEILI_MASTER_KEY` | Shared (`meilisearch` + `nextjs`) | `<output from openssl rand -hex 32>` |

The Meilisearch service reads `MEILI_MASTER_KEY` automatically — Meilisearch maps it to the `MEILI_MASTER_KEY` env var at startup. If the service starts without a master key, Meilisearch auto-generates one and logs it (check the deploy log).

#### Step 4: Derive a scoped search-only key

Once the Meilisearch service is healthy, generate a scoped API key that is restricted to search operations on the `el` and `ru` indexes. This key is safe to expose to the browser (via `NEXT_PUBLIC_*`).

Use the internal-healthcheck endpoint exposed by Railway to reach Meilisearch from a Railway shell, or tunnel via the Railway CLI:

```bash
# From a Railway shell in the meilisearch service:
curl -X POST "http://localhost:7700/keys" \
  -H "Authorization: Bearer $MEILI_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Search-only key (el + ru)",
    "description": "Scoped to search action on el and ru indexes. Safe for browser exposure.",
    "actions": ["search"],
    "indexes": ["el", "ru"],
    "expiresAt": null
  }'
```

The response includes a `key` field — this is the scoped search-only key. Copy it.

> **Key restrictions**: `actions: ["search"]`, `indexes: ["el", "ru"]`. This key cannot create, update, or delete documents, change settings, or access indexes outside `el`/`ru`. It is safe for the `NEXT_PUBLIC_MEILI_SEARCH_KEY` env var.

#### Step 5: Set production environment variables

In the Railway dashboard, set the following variables on the **Next.js service** (or as shared variables):

| Variable | Source | Notes |
|----------|--------|-------|
| `MEILI_HOST` | `http://meilisearch:7700` | Internal Railway networking; no scheme other than `http` |
| `MEILI_MASTER_KEY` | Step 3 | **Server-only** — must NOT appear in `NEXT_PUBLIC_*` |
| `NEXT_PUBLIC_MEILI_SEARCH_KEY` | Step 4 (`key` field) | Scoped search-only key; browser-safe |
| `SEARCH_ENABLED` | `true` | Activates search in the deployed environment |
| `NEXT_PUBLIC_SEARCH_ENABLED` | `true` | Activates the client-side search UI |

The `NEXT_PUBLIC_MEILI_HOST` env var is **not needed** in Railway production because the browser-based instant dropdown connects through a different path (see ADR-011). The SSR path uses `MEILI_HOST` server-side.

#### Step 6: Verify end-to-end

After deploying both services with the new env vars:

```bash
# From within the Next.js service container or Railway shell:
# 1. Meilisearch health
curl -s http://meilisearch:7700/health
# → {"status":"available"}

# 2. Seed the index
python3 tools/seed_search_index.py --target production --mode full --force

# 3. Smoke test a known query (server-side)
curl -X POST "http://meilisearch:7700/indexes/el/search" \
  -H "Authorization: Bearer $MEILI_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"q":"ρινοπλαστική","limit":3}'
# → at least one hit with title, href, _formatted.title
```

#### Master key safety check

The master key must never appear in a client bundle or be prefixed with `NEXT_PUBLIC_`. Verify:

```bash
# In the built frontend output, search for the master key value:
grep -r "$MEILI_MASTER_KEY" frontend/.next/static/
# → must return nothing (exit code 1)
```

The `meili-client.ts` module imports `"server-only"` which causes a build error if master-keyed code is imported from a client component. This is a compile-time guard.

#### Railway config-as-code (optional)

For teams that prefer config-as-code over dashboard clicks, create a `railway/services/meilisearch.toml` file:

```toml
# Railway Config-as-Code — Meilisearch Service
# Provision with: railway up --service meilisearch
[build]
builder = "NIXPACKS"

[deploy]
image = "getmeili/meilisearch:v1.11"
startCommand = "meilisearch"
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 5
```

Note: Railway's config-as-code for prebuilt images has limited support. The primary provisioning path is the dashboard-based procedure above.

### Re-provisioning after data loss

If the Meilisearch persistent volume is destroyed or corrupted:

1. Re-create the volume per Step 2.
2. Re-deploy the service — Meilisearch starts fresh with no indexes.
3. Re-generate the master key (Step 3) and scoped key (Step 4).
4. Update all env vars with the new key values.
5. Run a full seed: `python3 tools/seed_search_index.py --target production --mode full --force`.
6. Run the smoke test (Step 6).

## Quick reference

| Task | Command |
|------|---------|
| Initial seed (dev) | `python3 tools/seed_search_index.py --target dev --mode full` |
| Initial seed (rehearsal) | `python3 tools/seed_search_index.py --target rehearsal --mode full` |
| Initial seed (production) | `python3 tools/seed_search_index.py --target prod --mode full --force` |
| Full reindex after `pg_restore` (production) | `python3 tools/orchestrate_migration.py --target production --backup backups/strapi_full_*.sql.gz --force` |
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
python3 tools/orchestrate_migration.py --target production --backup backups/strapi_full_<timestamp>.sql.gz --force
```

The orchestrator runs a four-step pipeline:

| # | Step | What it does | Exit on failure |
|---|------|-------------|----------------|
| 1 | `restore` | Delegates to `backup_runner.py restore` — drops DB, recreates, psql restores, verifies row counts | Abort — a failed restore leaves the database in an undefined state; re-run from a known-good backup |
| 2 | `verify-strapi` | Polls Strapi `/admin/init` until 200 (120s timeout) | Abort — Strapi must be reachable before reindex can pull data from it |
| 3 | `reindex` | Delegates to `seed_search_index.py --mode full` — crawls Strapi, bulk-posts to `/api/search/reindex` | Abort — partial index must not replace a healthy one |
| 4 | `smoke` | Queries Meilisearch for known term `ρινοπλαστική` and asserts ≥1 hit | Abort — zero results means the index is empty or broken |

**Rollback behavior**: If any step fails, the pipeline stops immediately with exit code 1. Steps 1–3 are destructive and must be re-run from the beginning after fixing the root cause. Step 4 (smoke) failure means the index is empty — re-run from step 3 if Strapi is still healthy, or from step 1 if the restore is suspect.

This sequence is non-skippable. Manual `pg_restore` without the orchestrator is a defect.

## Search Query Log TTL — 90-day prune job

The **Search Query Log** (`search_query_log` table) accumulates anonymous query records. A 90-day TTL is enforced by a scheduled prune job to back the GDPR-defensible privacy posture (see [ADR-011](../adr/ADR-011-full-site-search-via-meilisearch.md)).

### Quick reference

| Task | Command |
|------|---------|
| Prune dev | `python3 tools/prune_search_query_log.py --target dev` |
| Prune rehearsal | `python3 tools/prune_search_query_log.py --target rehearsal` |
| Prune production | `python3 tools/prune_search_query_log.py --target production --force` |
| Dry-run (count rows, no delete) | `python3 tools/prune_search_query_log.py --target <env> --dry-run` |
| Shell wrapper (production) | `bash tools/prune-search-log.sh production` |

Production-targeted operations refuse to run without `--force`, matching the safety pattern of `migration_runner.py` and `backup_runner.py`.

### SQL

```sql
DELETE FROM search_query_log WHERE created_at < NOW() - INTERVAL '90 days';
```

**Idempotent**: running the prune twice in a row deletes zero additional rows the second time. The predicate targets rows whose `created_at` is strictly before the 90-day cutoff — rows exactly at the boundary are preserved.

### Scheduling

The tool is designed to run as a daily cron job. The companion bash script at `tools/prune-search-log.sh` wraps the Python tool with logging and suggests crontab lines:

```bash
# Production — prune search_query_log nightly at 3 AM
0 3 * * * cd /path/to/repo && bash /path/to/repo/tools/prune-search-log.sh production >> logs/prune-search-log.log 2>&1
```

In Railway (production), the same SQL can be run as a scheduled task via `psql` with `DATABASE_URL`, or invoked manually post-deployment until a Railway-native scheduler is provisioned.

### Manual invocation

```bash
# Dry-run first to see what would be deleted
python3 tools/prune_search_query_log.py --target dev --dry-run

# Execute
python3 tools/prune_search_query_log.py --target dev
```

### Failure signals

A non-zero exit code indicates:
- Docker container not running
- Database unreachable
- psql execution error

The bash wrapper writes timestamped log lines to `LOG_FILE` (default: stdout). Cron invocations should redirect to a log file for visibility.

### Verification

After running, verify the prune had effect by checking row counts:

```bash
docker exec -i myorl-pg psql -U strapi -d strapi -At \
  -c "SELECT COUNT(*) FROM search_query_log;"
```

## Related runbooks

- [Postgres rehearsal](postgres-rehearsal.md) — validates query plans before production migration.
- [Postgres backup](postgres-backup.md) — backup/restore semantics for the Strapi state store.
- [Production cutover](production-cutover.md) — full cutover sequence (now extended with the reindex step).
- [Production deployment](production-deployment.md) — Railway deployment workflow.
