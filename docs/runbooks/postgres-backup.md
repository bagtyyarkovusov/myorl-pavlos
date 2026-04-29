# PostgreSQL Backup & Restore Runbook

## Backup (dump)

```bash
# Full dump (schema + data)
docker exec gemini-pg-prod pg_dump -U strapi -d strapi \
  --clean --if-exists --no-owner \
  > backups/strapi_$(date +%Y%m%d_%H%M%S).sql

# Data-only dump (faster, smaller)
docker exec gemini-pg-prod pg_dump -U strapi -d strapi \
  --data-only --inserts \
  > backups/strapi_data_$(date +%Y%m%d_%H%M%S).sql
```

## Restore

```bash
# Drop and recreate from full dump
docker exec -i gemini-pg-prod psql -U strapi -d postgres \
  -c "DROP DATABASE IF EXISTS strapi;"
docker exec -i gemini-pg-prod psql -U strapi -d postgres \
  -c "CREATE DATABASE strapi OWNER strapi;"
docker exec -i gemini-pg-prod psql -U strapi -d strapi \
  < backups/strapi_YYYYMMDD_HHMMSS.sql
```

## Automated (cron)

Add to crontab on the host:

```bash
# Daily backup at 3 AM, keep 14 days
0 3 * * * cd /opt/myorl && docker exec gemini-pg-prod pg_dump -U strapi -d strapi --clean --if-exists --no-owner > backups/strapi_$(date +\%Y\%m\%d).sql && find backups/ -name 'strapi_*.sql' -mtime +14 -delete
```

## Uploads (media files)

Media files live in the `uploads` Docker volume. Back up separately:

```bash
# Backup uploads
docker run --rm -v gemini-export_uploads:/data -v $(pwd)/backups:/backup \
  alpine tar czf /backup/uploads_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .

# Restore uploads
docker run --rm -v gemini-export_uploads:/data -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/uploads_YYYYMMDD_HHMMSS.tar.gz -C /data
```

## Verification

After restore, verify:
```sql
SELECT COUNT(*) FROM pages WHERE published_at IS NOT NULL;
-- Should match pre-restore count

SELECT COUNT(*) FROM components_items_social_links;
-- Should be 0 (Google Plus removed in Phase 7)
```
