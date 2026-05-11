# Production Deployment Runbook

## Required Environment Variables

Create a `.env.prod` file at the project root:

```bash
# ──── PostgreSQL ────
POSTGRES_USER=strapi
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=strapi

# ──── Strapi Secrets ────
APP_KEYS=<four-comma-separated-random-keys>
API_TOKEN_SALT=<random-base64>
ADMIN_JWT_SECRET=<random-base64>
TRANSFER_TOKEN_SALT=<random-base64>
JWT_SECRET=<random-base64>
ENCRYPTION_KEY=<random-base64>

# ──── Strapi Token ────
STRAPI_TOKEN=<full-access-api-token>

# ──── CORS ────
STRAPI_CORS_ORIGINS=https://myorl.gr,https://www.myorl.gr

# ──── Next.js ────
NEXT_PUBLIC_SITE_URL=https://myorl.gr
STRAPI_REVALIDATE_SECRET=<random-base64>

# ──── Internal (Docker network) ────
STRAPI_URL=http://strapi:1337
```

Generate secrets:
```bash
openssl rand -base64 32  # for each STRAPI_*_SECRET, JWT_SECRET, etc.
```

## First Deploy

```bash
# Build and start
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# Check logs
docker compose -f docker-compose.prod.yml logs -f

# Create admin user (first time only)
docker exec -it myorl-strapi-prod npm run strapi admin:create-user
```

## Strapi Admin

After first deploy, access `https://myorl.gr/admin` (or the server IP). Create the admin user via the UI or CLI, then:
1. Configure API token (Settings → API Tokens → create full-access token)
2. Copy token into `.env.prod` as `STRAPI_TOKEN`
3. Redeploy: `docker compose -f docker-compose.prod.yml up -d`

## Webhook Setup

The revalidation webhook must be recreated per deploy. After Strapi is running:

```bash
# From project root
python3 tools/setup_strapi_revalidation_webhook.py \
  --database-url "postgres://strapi:<password>@localhost:5432/strapi"
```

## Database Backups

See [postgres-backup.md](./postgres-backup.md).

## Rollback

```bash
docker compose -f docker-compose.prod.yml down
# Restore from backup
# Bring up again
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

## Health Checks

```bash
# Strapi
curl -s http://localhost:1337/admin/init | python3 -m json.tool

# Next.js
curl -s http://localhost:3000

# PostgreSQL
docker exec myorl-pg-prod pg_isready -U strapi -d strapi
```
