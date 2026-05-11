# Railway Production Deployment Runbook

This runbook covers deploying the **myorl-pavlos** stack (Next.js + Strapi + PostgreSQL) to [Railway](https://railway.app) using the **CLI-first** approach.

> The repository includes `railway.toml` (config-as-code), `scripts/setup-railway.sh` (one-time setup), and `scripts/deploy-railway.sh` (day-to-day deploys).

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Railway Project (myorl-pavlos)             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │  PostgreSQL │◄───│    Strapi   │◄───│   Next.js   │ │
│  │  (managed)  │    │   Backend   │    │   Frontend  │ │
│  └─────────────┘    └──────┬──────┘    └──────┬──────┘ │
│                            │                    │       │
│                 api.yourdomain.com      yourdomain.com │
└─────────────────────────────────────────────────────────┘
```

- **No Caddy / NGINX needed** — Railway handles SSL, routing, and load balancing.
- **No server maintenance** — no SSH, OS updates, or Docker pruning.
- **Config-as-code** — `railway.toml` at repo root defines both services.

---

## Prerequisites

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Get a Project Token
# Railway Dashboard → Project Settings → Tokens → New Token
export RAILWAY_TOKEN="your-project-token-here"

# 3. Prepare environment file
cp .env.production.example .env
nano .env   # Fill in all real values
```

> **Never commit `.env` or `sshRailway.txt` to Git.** Both are already in `.gitignore`.

---

## One-Time Setup

Run the interactive setup script. It automates everything possible via CLI and pauses for the few steps that still need the dashboard.

```bash
./scripts/setup-railway.sh
```

The script walks through these phases:

| Phase | What It Does | Automated? |
|---|---|---|
| 1. Project | Creates or links Railway project | ✅ CLI |
| 2. PostgreSQL | Adds managed database | ⚠️ One dashboard click |
| 3. Services | Creates `strapi-backend` and `nextjs-frontend` | ⚠️ Two CLI prompts |
| 4. Config | Links `railway.toml` to each service | ⚠️ Two dashboard clicks |
| 5. Variables | Pushes `.env` values + generates secrets | ✅ CLI |
| 6. Deploy | Builds and deploys both services | ✅ CLI |
| 7. Domains | Generates public URLs | ⚠️ CLI or dashboard |

### Manual steps explained

**Add PostgreSQL (Phase 2)**
```
Dashboard → + New → Database → Add PostgreSQL → Name it "postgres"
```

**Create services (Phase 3)**
```bash
railway add
# → Empty Service → Name: strapi-backend

railway add
# → Empty Service → Name: nextjs-frontend
```

**Link config file (Phase 4)**
```
strapi-backend  → Settings → Root Directory → /backend
strapi-backend  → Settings → Config as Code File → /backend/railway.toml

nextjs-frontend → Settings → Root Directory → /
nextjs-frontend → Settings → Config as Code File → /frontend/railway.toml
```

**Generate domains (Phase 7)**
```bash
railway domain --service strapi-backend
railway domain --service nextjs-frontend
```

Then update cross-service variables:
```bash
railway variables --service nextjs-frontend --set \
  "STRAPI_URL=https://strapi-backend-xxx.up.railway.app"

railway variables --service strapi-backend --set \
  "STRAPI_CORS_ORIGINS=https://nextjs-frontend-xxx.up.railway.app"
```

---

## Day-to-Day Deploys

After setup, deployments are one command:

```bash
./scripts/deploy-railway.sh
```

This deploys backend first, waits for health, then deploys frontend.

Or deploy services individually:
```bash
# Backend only
railway up backend --service strapi-backend --path-as-root --detach --ci

# Frontend only
railway up . --service nextjs-frontend --detach --ci
```

---

## Production Database & Uploads as Source of Truth

After the initial Docker-to-Railway promotion, **Railway Postgres is the canonical
database** and **Railway Volume (`strapi-backend-volume`) is the canonical uploads
store**. Local Docker databases and `backend/public/uploads/` should be treated as
disposable mirrors.

### Uploads Volume Setup

The `strapi-backend` service uses a Railway Volume mounted at `/app/public/uploads`
to persist media files across deployments. Without this volume, every redeploy would
wipe all uploaded images.

**Current volume:**
```
strapi-backend-volume → /app/public/uploads · 4.9 GB max
```

To check volume status:
```bash
railway volume list
```

### Refresh local uploads from production

To pull the current production uploads into your local dev environment:

```bash
./scripts/railway-pull-uploads-to-local.sh
```

This script:
1. Creates a compressed archive of the Railway uploads volume
2. Downloads it in chunks (Railway SSH bandwidth is ~150 KB/s)
3. Extracts into `backend/public/uploads/`
4. Verifies file counts match

> **Warning:** This overwrites your local `backend/public/uploads/`. The script
> creates a timestamped backup in `backups/` first.

### Initial volume population (one-time)

If you ever need to re-populate the volume (e.g., after creating a new one):

```bash
# From repo root — creates chunked tarball and uploads via SCP
./scripts/railway-push-uploads-to-prod.sh
```

Or manually:
```bash
tar czf uploads.tar.gz -C backend/public uploads
# Then SCP to Railway and extract into /app/public/uploads/
```

To refresh local Docker from production:

```bash
npm run db:pull:prod -- --force
```

This command:

1. Takes a best-effort backup of the current local Docker database in `backups/`.
2. Removes the local `pgdata_dev` Docker volume.
3. Starts the local Postgres container.
4. Dumps Railway Postgres using a Postgres 18 client.
5. Restores that dump into local Docker Postgres.

Do not push local Docker data back to production after this cutover unless you
are intentionally doing a full production replacement with a fresh backup and a
rollback plan.

---

## Environment Variables

### Push `.env` changes to Railway

```bash
# Push to all services
./scripts/railway-push-env.sh all

# Or target one service
./scripts/railway-push-env.sh backend
./scripts/railway-push-env.sh frontend
```

### Reference variables (Railway auto-provides)

For the Postgres connection, use Railway's reference syntax in the dashboard or CLI:

```bash
railway variables --service strapi-backend --set "DATABASE_HOST=\${{Postgres.PGHOST}}"
railway variables --service strapi-backend --set "DATABASE_PORT=\${{Postgres.PGPORT}}"
railway variables --service strapi-backend --set "DATABASE_NAME=\${{Postgres.PGDATABASE}}"
railway variables --service strapi-backend --set "DATABASE_USERNAME=\${{Postgres.PGUSER}}"
railway variables --service strapi-backend --set "DATABASE_PASSWORD=\${{Postgres.PGPASSWORD}}"
```

> The `setup-railway.sh` script sets these automatically.

---

## `railway.toml` — Config as Code

Each app service has its own Railway config file:

```toml
# backend/railway.toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"
watchPatterns = ["/backend/**"]

[deploy]
healthcheckPath = "/admin"
healthcheckTimeout = 120

# frontend/railway.toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "frontend/Dockerfile"
watchPatterns = ["/frontend/**", "/packages/shared-types/**", "/data/manifests/**"]

[deploy]
healthcheckPath = "/"
healthcheckTimeout = 120
```

The frontend service root directory must stay at the repository root (`/`).
Its Dockerfile copies `./frontend`, `./packages/shared-types`, and
`./data/manifests`, so setting the Railway root directory to `/frontend` hides
required build inputs and changes how `dockerfilePath` is resolved.

### What this gives you

- **No dashboard config drift** — code always wins over dashboard settings.
- **Watch paths** — changing frontend code doesn't rebuild the backend (and vice versa).
- **Health checks** — Railway waits for `/admin` and `/` before marking deploys healthy.
- **Dockerfile builds** — explicit control over build process (no Nixpacks auto-detection).

---

## GitHub Actions CI/CD

The repository includes `.github/workflows/deploy-railway.yml` which:

1. Runs the full CI gate (lint, typecheck, tests, build, e2e)
2. Deploys backend via `railway up`
3. Polls backend `/admin` until healthy (max 6 min)
4. Deploys frontend via `railway up`
5. Smoke-tests both public URLs

### Required secrets

| Secret | Value |
|---|---|
| `RAILWAY_TOKEN` | Project token from Railway dashboard |
| `RAILWAY_BACKEND_SERVICE` | `strapi-backend` |
| `RAILWAY_FRONTEND_SERVICE` | `nextjs-frontend` |
| `STRAPI_PUBLIC_URL` | Backend public domain |
| `NEXT_PUBLIC_SITE_URL` | Frontend public domain |

### Optional: require manual approval

Go to **GitHub Settings → Environments → production** and enable "Required reviewers." Every push to `main` will wait for your approval before deploying.

---

## Custom Domains

```bash
# Add domain to backend
railway domain --service strapi-backend
# Then add custom domain in dashboard → Networking → Add Custom Domain

# Add domain to frontend
railway domain --service nextjs-frontend
```

Railway handles SSL automatically via Let's Encrypt.

---

## Useful CLI Commands

```bash
# View project status
railway status

# Stream logs
railway logs --service strapi-backend
railway logs --service nextjs-frontend

# SSH into running container (debugging)
railway ssh --service strapi-backend

# Run one-off command with prod env vars
railway run --service strapi-backend npm run strapi import

# Connect to database locally
railway connect postgres

# List variables
railway variables --service strapi-backend

# Redeploy without pushing new code (e.g. after var changes)
railway redeploy --service strapi-backend --yes
```

---

## Troubleshooting

### `railway up` fails with "Unauthorized"
- Ensure `RAILWAY_TOKEN` is a **Project Token** (not an Account API Token).
- Project tokens are scoped to one project. Account tokens are for `railway login`.

### Build fails: "Cannot find module"
- Check that `railway.toml` is linked in each service's settings.
- Verify `root` and `dockerfilePath` point to the right locations.

### Strapi can't connect to database
- `DATABASE_SSL` must be `true` for Railway managed Postgres.
- Reference variables must resolve. Check in dashboard: Variables tab → look for green "linked" icons.

### Frontend build fails
- `STRAPI_URL` must be a **public URL** (not an internal Railway hostname).
- Ensure backend deployed and healthy before frontend deploy.

### Services rebuild on every push
- Verify `watchPatterns` in `railway.toml`.
- Backend should only watch `/backend/**`.
- Frontend should watch `/frontend/**`, `/packages/shared-types/**`, `/data/manifests/**`.

---

## Migration from GCP VM

1. **Export data** from your VM:
   ```bash
   docker compose -f docker-compose.prod.yml exec postgres \
     pg_dump -U strapi strapi > export.sql
   ```
2. **Import to Railway Postgres**:
   ```bash
   railway connect postgres < export.sql
   ```
3. **Copy uploads** — attach a Railway Volume to `strapi-backend` at `/app/public/uploads`,
   then SCP or `strapi transfer --only files` to populate it.
4. **Update DNS** to point at Railway domains.
5. **Delete VM** after verifying everything works.

---

## Reference

- [Railway Docs](https://docs.railway.com)
- [Railway CLI Deploying](https://docs.railway.com/cli/deploying)
- [Railway CLI SSH](https://docs.railway.com/cli/ssh)
- [Railway Config as Code](https://docs.railway.com/config-as-code/reference)
- [Railway PostgreSQL](https://docs.railway.com/databases/postgresql)
