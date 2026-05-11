# CI/CD Pipelines & Dev/Prod Workflow

> Canonical reference for continuous integration, deployment automation, and environment workflows.

---

## 1. CI/CD Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        GitHub (main branch)                 │
└──────────────────────┬──────────────────────────────────────┘
                       │ push / pull_request
┌──────────────────────▼──────────────────────────────────────┐
│              CI Pipeline (`.github/workflows/ci.yml`)       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────┐ │
│  │ frontend │ │ backend  │ │ manifest │ │ docker │ │ e2e  │ │
│  │  lint    │ │typecheck │ │  python  │ │ build  │ │      │ │
│  │  test    │ │  build   │ │  tests   │ │ images │ │      │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ └──────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       │ reusable workflow_call
┌──────────────────────▼──────────────────────────────────────┐
│          Deploy Pipeline (`.github/workflows/deploy-        │
│                    railway.yml`)                            │
│  ┌──────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────┐  │
│  │ ci-gate  │ │deploy-backend│ │deploy-frontend│ │smoke   │  │
│  │          │ │   (Strapi)   │ │   (Next.js)   │ │ test   │  │
│  └──────────┘ └──────────────┘ └──────────────┘ └────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │
              ┌────────┴────────┐
              ▼                 ▼
        ┌──────────┐      ┌──────────┐
        │ Railway  │      │ Railway  │
        │ Backend  │      │ Frontend │
        │ (Strapi) │      │(Next.js) │
        └──────────┘      └──────────┘
```

---

## 2. Continuous Integration (`ci.yml`)

**Triggers:** `push` to `main`, `pull_request` to `main`, `workflow_call` (reused by deploy pipeline).

### 2.1 Frontend Job

| Step | Command | Purpose |
|------|---------|---------|
| Format check | `npm run format:check` | Prettier compliance |
| Lint | `npm run lint` | ESLint |
| Typecheck | `npm run typecheck` | `tsc --noEmit` |
| Test with coverage | `npm run test -- --coverage` | Vitest + v8 coverage |
| Build | `npm run build` | Next.js standalone build |

- **Node.js:** 20
- **Working dir:** `frontend/`
- **Artifacts:** Coverage report uploaded via `actions/upload-artifact@v4`

### 2.2 Backend Job

| Step | Command | Purpose |
|------|---------|---------|
| Typecheck | `npx tsc --noEmit` | TypeScript strict check |
| Strapi build | `npm run build` | Admin panel + API build |

- **Node.js:** 20
- **Working dir:** `backend/`

### 2.3 Manifest Job (Python Tools)

| Step | Script | Purpose |
|------|--------|---------|
| Environment drift detector | `tests/test_environments.py` | Assert compose files match `tools/environments.py` |
| Port guard tests | `tests/test_check_environment.py` | Port conflict validation |
| Backup runner tests | `tests/test_backup_runner.py` | Backup/restore/drill logic |
| Migration runner tests | `tests/test_migration_runner.py` | Forward-only migration enforcement |

- **Python:** 3.11
- **Dependency:** `PyYAML>=6.0`

### 2.4 Docker Job

| Step | Command | Purpose |
|------|---------|---------|
| Build backend image | `docker build ./backend` | Validate `backend/Dockerfile` |
| Build frontend image | `docker build -f frontend/Dockerfile .` | Validate `frontend/Dockerfile` |
| Validate compose | `docker compose -f docker-compose.dev.yml config` | YAML syntax + env resolution |

### 2.5 E2E Job

| Step | Command | Purpose |
|------|---------|---------|
| Install Playwright | `npx playwright install --with-deps chromium` | Browser binaries |
| Build frontend | `npm run build` | Production-like build with dummy env |
| Run tests | `npx playwright test` | Headless Chromium tests |

- **Node.js:** 20
- **Working dir:** `frontend/`
- **Env:** `STRAPI_URL=http://localhost:1337`, `STRAPI_TOKEN=dummy`

---

## 3. Production Deployment (`deploy-railway.yml`)

**Triggers:** `push` to `main`, `workflow_dispatch` (manual).

**Concurrency:** `group: railway-production`, `cancel-in-progress: false` — prevents overlapping deploys.

### 3.1 CI Gate

Reuses `ci.yml` via `workflow_call`. All 5 CI jobs must pass before deployment begins.

### 3.2 Deploy Backend

| Step | Detail |
|------|--------|
| CLI | `npm install -g @railway/cli` |
| Validation | Assert `RAILWAY_TOKEN`, `RAILWAY_BACKEND_SERVICE`, `STRAPI_PUBLIC_URL` exist |
| Deploy | `railway up --service <backend> --detach` |
| Health poll | `GET /admin/init` every 10s, up to 6 min |

- **Environment:** `production`
- **Config-as-code:** `backend/railway.toml`

### 3.3 Deploy Frontend

| Step | Detail |
|------|--------|
| Depends on | `deploy-backend` (must be healthy) |
| Validation | Assert `RAILWAY_TOKEN`, `RAILWAY_FRONTEND_SERVICE` exist |
| Deploy | `railway up --service <frontend> --detach` |

- **Config-as-code:** `frontend/railway.toml`
- **Important:** Railway service Root Directory must be `/` (not `/frontend`) because the Dockerfile copies from monorepo root.

### 3.4 Smoke Test

| Check | Endpoint | Expectation |
|-------|----------|-------------|
| Frontend root | `NEXT_PUBLIC_SITE_URL/` | HTTP 200 |
| Frontend locale | `NEXT_PUBLIC_SITE_URL/el` | HTTP 200 |
| Health API | `NEXT_PUBLIC_SITE_URL/api/health` | `"ok":true` |
| Strapi admin | `STRAPI_PUBLIC_URL/admin/init` | HTTP 200 |

- **Failure:** Emits `::error::Production smoke test failed!` and blocks the pipeline.

---

## 4. Environment Workflows

### 4.1 Development (`dev`)

**Command:** `npm run dev`

Brings up the full Docker Compose stack:

| Service | Container | Image | Port | Volume |
|---------|-----------|-------|------|--------|
| PostgreSQL | `myorl-pg` | `postgres:18` | `55432:5432` | `pgdata_dev` |
| Strapi | `myorl-strapi-dev` | `node:20-alpine` | `1337:1337` | `./backend:/app` |
| Next.js | `myorl-nextjs-dev` | `node:24-slim` (Dockerfile.dev) | `3000:3000` | `./frontend:/app` |

**Key behaviors:**
- Hot reload on all services via bind mounts
- `npm ci` / `npm install` auto-runs when lockfile changes
- Named `node_modules` volumes persist across restarts
- Next.js rewrites `/uploads/*` → Strapi for media proxy
- Strapi CORS allows `localhost:3000` by default

**Alternative commands:**

| Command | Purpose |
|---------|---------|
| `npm run dev:local` | Native host dev (Strapi + Next.js concurrently; Strapi uses SQLite fallback) |
| `npm run dev:db` | PostgreSQL only (for tool development) |
| `npm run dev:down` | Stop all Docker dev containers |

### 4.2 Rehearsal (`rehearsal`)

**Command:** `python3 tools/orchestrate_rehearsal.py`

Validates migrations and query performance against a disposable copy of production data.

| Step | Action |
|------|--------|
| 1. Preflight | Port Guard checks environment safety |
| 2. Export | `npx strapi export` from dev Postgres (canonical source per ADR-008) |
| 3. Start DB | `docker-compose.rehearsal.yml` on port `55532` |
| 4. Import | `npx strapi import` into rehearsal DB |
| 5. Migrate | `tools/migration_runner.py up` applies forward-only indexes |
| 6. Verify | 4 hot-path `EXPLAIN ANALYZE` queries check index usage |
| 7. Report | `artifacts/reports/postgres_rehearsal_explain_report.json` |
| 8. Cleanup | Container + volume removed unless `--keep-running` |

**Report verdict:** `ok` or `regressions` based on index usage.

### 4.3 Production (`production`)

**Platform:** Railway (managed PostgreSQL + container services).

**Deploy methods:**

1. **Automated:** Push to `main` triggers `deploy-railway.yml`
2. **Manual (GitHub Actions):** `workflow_dispatch` on `deploy-railway.yml`
3. **Manual (Local CLI):** `scripts/deploy-railway.sh` (requires `RAILWAY_TOKEN`)

**Services:**

| Service | Name | Build | Healthcheck |
|---------|------|-------|-------------|
| Backend | `strapi-backend` | `backend/Dockerfile` | `GET /admin` (120s timeout) |
| Frontend | `nextjs-frontend` | `frontend/Dockerfile` | `GET /` (120s timeout) |

**Media storage:** Railway volume attached to `strapi-backend` at `/app/public/uploads`.

**Sync scripts:**

| Direction | Script | Warning |
|-----------|--------|---------|
| Prod DB → local | `scripts/railway-pull-db-to-docker.sh --force` | Destroys local dev DB; backs up first |
| Prod uploads → local | `scripts/railway-pull-uploads-to-local.sh` | Backs up local first |
| Local uploads → prod | `scripts/railway-push-uploads-to-prod.sh --force` | Destructive; requires `--force` |

### 4.4 Self-Hosted Production (`docker-compose.prod.yml`)

For on-premise or VPS deployment (not currently used; Railway is canonical).

| Service | Image | Network | Ports |
|---------|-------|---------|-------|
| PostgreSQL | `postgres:18` | `internal` | None (internal only) |
| Strapi | Built from `backend/Dockerfile` | `internal` | Internal |
| Next.js | Built from `frontend/Dockerfile` | `internal` | Internal |
| Caddy | `caddy:2` | `internal` | `80:80`, `443:443` |

Caddy reverse-proxies `/api/*` → Strapi `:1337`, everything else → Next.js `:3000`.

---

## 5. Required Secrets & Environment Variables

### 5.1 GitHub Actions Secrets

| Secret | Used in | Purpose |
|--------|---------|---------|
| `RAILWAY_TOKEN` | `deploy-railway.yml` | Railway CLI authentication |
| `RAILWAY_BACKEND_SERVICE` | `deploy-railway.yml` | Backend service name |
| `RAILWAY_FRONTEND_SERVICE` | `deploy-railway.yml` | Frontend service name |
| `STRAPI_PUBLIC_URL` | `deploy-railway.yml` | Backend healthcheck URL |
| `NEXT_PUBLIC_SITE_URL` | `deploy-railway.yml` | Frontend smoke-test URL |
| `STRAPI_PREVIEW_TOKEN` | `ci.yml` (e2e) | Dummy token for build-time CMS access |

### 5.2 Railway Environment Variables

Pushed via `scripts/railway-push-env.sh` or `scripts/setup-railway.sh`.

**Backend:**
- `DATABASE_URL` (managed by Railway PostgreSQL plugin)
- `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY`
- `STRAPI_CORS_ORIGINS`
- `STRAPI_REVALIDATE_SECRET`

**Frontend:**
- `STRAPI_URL`
- `STRAPI_TOKEN`
- `NEXT_PUBLIC_SITE_URL`
- `STRAPI_REVALIDATE_SECRET`

---

## 6. Rollback Procedures

### 6.1 Railway Rollback

Railway retains previous deployments. Roll back via:
- **Dashboard:** Select service → Deployments → Redeploy previous successful deployment.
- **CLI:** `railway up --service <name> --environment production` from a previous commit.

### 6.2 Database Rollback

Use `tools/backup_runner.py`:

```bash
# Restore from most recent backup (requires --force for production)
python tools/backup_runner.py restore --target production --force
```

### 6.3 Content Rollback

Use Strapi transfer to pull production content back to dev:

```bash
npm run transfer:pull
```

---

## 7. Pre-Commit Hooks

**Hook:** `.husky/pre-commit`

Runs `lint-staged` on every commit:
- Prettier write for `*.{ts,tsx,js,jsx,json,css,md}`
- ESLint fix for `*.{ts,tsx,js,jsx}`

---

## 8. Operational Runbooks

| Topic | Document |
|-------|----------|
| Content promotion (dev → prod) | [`content-promotion.md`](./content-promotion.md) |
| PostgreSQL backup / restore | [`postgres-backup.md`](./postgres-backup.md) |
| Rehearsal pipeline | [`postgres-rehearsal.md`](./postgres-rehearsal.md) |
| Production cutover | [`production-cutover.md`](./production-cutover.md) |
| Production deployment | [`production-deployment.md`](./production-deployment.md) |
| Railway-specific deployment | [`railway-deployment.md`](./railway-deployment.md) |

---

## 9. Related

- [`docs/architecture/deployment.md`](../architecture/deployment.md) — Docker architecture and environment manifest
- [`docs/adr/ADR-003-postgres-readiness-indexes.md`](../adr/ADR-003-postgres-readiness-indexes.md) — Forward-only migrations
- [`docs/adr/ADR-008-dev-postgres-is-canonical-strapi-state-store.md`](../adr/ADR-008-dev-postgres-is-canonical-strapi-state-store.md) — Dev Postgres as canonical store
