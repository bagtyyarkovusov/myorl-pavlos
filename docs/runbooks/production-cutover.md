# Production Cutover Runbook

> **For content-only updates** (new pages, text edits, navigation changes),
> use [content-promotion.md](./content-promotion.md) (`strapi transfer`) instead.
> This runbook is for full database replacement (initial deploy, major migrations).

This runbook documents two paths for migrating from the rehearsal environment
to production. Choose the path that matches your production hosting setup.

## Prerequisites

1. Rehearsal report passes: `artifacts/reports/postgres_rehearsal_explain_report.json` shows `"verdict": "ok"`
2. `tools/check_environment.py --target=production` passes (if applicable)
3. Strapi version matches between source and target
4. Production secrets are configured in `.env.prod`

## Path A: Shell Access (VPS, EC2, Dedicated Server)

Use this path when you have SSH access to the production server and can run
Docker commands directly.

### 1. Export from Rehearsal

```bash
python3 tools/migrate_to_postgres.py --from=postgres --to=production
```

This creates an export tarball at `artifacts/exports/strapi-export-*.tar.gz`.

### 2. Copy to Production Server

```bash
scp artifacts/exports/strapi-export-*.tar.gz \
  user@production-server:/opt/gemini-export/
```

### 3. Back Up Production Database

Before overwriting, back up the existing production database:

```bash
ssh user@production-server "cd /opt/gemini-export && bash tools/db-backup.sh"
```

### 4. Import on Production

```bash
ssh user@production-server \
  "docker exec gemini-strapi-prod npm run strapi import -- --file /opt/gemini-export/strapi-export-*.tar.gz --force"
```

### 5. Verify

```bash
ssh user@production-server \
  "docker exec gemini-pg-prod psql -U strapi -d strapi -c 'SELECT COUNT(*) FROM pages WHERE published_at IS NOT NULL;'"
```

## Path B: Platform-Managed (Railway, Render, etc.)

Use this path when you do not have shell access to the production container
and only have a `DATABASE_URL`.

### 1. pg_dump from Rehearsal

```bash
python3 tools/migrate_to_postgres.py \
  --from=postgres \
  --to=production \
  --production-url "$DATABASE_URL"
```

This uses `pg_dump` from the rehearsal container and `pg_restore` into the
managed PostgreSQL instance.

### 2. Back Up Managed Database

Before overwriting, create a backup:

```bash
pg_dump "$DATABASE_URL" --clean --if-exists > backups/production_pre_cutover_$(date +%Y%m%d_%H%M%S).sql
```

### 3. Verify Schema Compatibility

Ensure the target database schema matches the rehearsal schema:

```bash
pg_dump "$DATABASE_URL" --schema-only > /tmp/target_schema.sql
pg_dump "postgres://strapi:strapi@localhost:55532/strapi_rehearsal" --schema-only > /tmp/rehearsal_schema.sql
diff /tmp/target_schema.sql /tmp/rehearsal_schema.sql
```

### 4. Restore

If schema is compatible, restore:

```bash
python3 tools/migrate_to_postgres.py \
  --from=postgres \
  --to=production \
  --production-url "$DATABASE_URL"
```

### 5. Verify

```bash
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM pages WHERE published_at IS NOT NULL;"
```

## Rollback

### Shell Access

```bash
# Stop services
ssh user@production-server "cd /opt/gemini-export && docker compose -f docker-compose.prod.yml down"

# Restore from backup
ssh user@production-server "docker exec -i gemini-pg-prod psql -U strapi -d strapi < backups/strapi_YYYYMMDD_HHMMSS.sql"

# Restart
ssh user@production-server "cd /opt/gemini-export && docker compose -f docker-compose.prod.yml up -d"
```

### Platform-Managed

```bash
# Restore from pre-cutover backup
psql "$DATABASE_URL" < backups/production_pre_cutover_YYYYMMDD_HHMMSS.sql
```

## Safety Checklist

- [ ] Rehearsal report shows `"verdict": "ok"`
- [ ] `tools/check_environment.py --target=production` passes
- [ ] Strapi version matches between source and target
- [ ] Production database backed up before overwrite
- [ ] Row counts match between rehearsal and production after cutover
- [ ] Uploads/media files synced separately (if applicable)

## Further Reading

- [PostgreSQL Rehearsal Runbook](./postgres-rehearsal.md)
- [PostgreSQL Backup & Restore](./postgres-backup.md)
- [Production Deployment](./production-deployment.md)
- `CONTEXT.md` — Domain glossary
