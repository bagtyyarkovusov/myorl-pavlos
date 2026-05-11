#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
CONTAINER="${POSTGRES_CONTAINER:-myorl-pg-prod}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/strapi_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting database backup..."

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: PostgreSQL container '${CONTAINER}' is not running." >&2
  exit 1
fi

docker exec "${CONTAINER}" pg_dump -U "${POSTGRES_USER:-strapi}" "${POSTGRES_DB:-strapi}" \
  | gzip > "${BACKUP_FILE}"

if [ ! -s "${BACKUP_FILE}" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Backup file is empty. Check container and database name." >&2
  rm -f "${BACKUP_FILE}"
  exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup saved: ${BACKUP_FILE} ($(wc -c < "${BACKUP_FILE}") bytes)"

pruned=0
if [ -d "${BACKUP_DIR}" ]; then
  while IFS= read -r -d '' old_file; do
    rm -f "${old_file}"
    pruned=$((pruned + 1))
  done < <(find "${BACKUP_DIR}" -name "strapi_*.sql.gz" -mtime "+${RETENTION_DAYS}" -print0 2>/dev/null || true)
fi

if [ "${pruned}" -gt 0 ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Pruned ${pruned} backup(s) older than ${RETENTION_DAYS} days."
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] No old backups to prune (retention: ${RETENTION_DAYS} days)."
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup complete."

CRON_LINE="0 2 * * * cd $(pwd) && bash $(pwd)/tools/db-backup.sh >> $(pwd)/backups/backup.log 2>&1"
echo ""
echo "To schedule daily backups at 2 AM, add this line to your crontab (crontab -e):"
echo "${CRON_LINE}"
