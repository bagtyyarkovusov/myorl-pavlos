#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Daily Backup Script for Production Database & Uploads
# =============================================================================
# Recommended cron: 0 3 * * * /home/USER/myorl-pavlos/scripts/backup.sh
# =============================================================================

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.prod.yml"
ENV_FILE="${PROJECT_DIR}/.env"
BACKUP_DIR="${PROJECT_DIR}/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MAX_DAILY_BACKUPS=14

log() {
  echo "[backup] $(date '+%Y-%m-%d %H:%M:%S') — $1"
}

if [ ! -f "${ENV_FILE}" ]; then
  echo "Environment file not found: ${ENV_FILE}"
  exit 1
fi

cd "${PROJECT_DIR}"

set -a
source "${ENV_FILE}"
set +a

mkdir -p "${BACKUP_DIR}"

# -----------------------------------------------------------------------------
# Database backup
# -----------------------------------------------------------------------------
log "Dumping PostgreSQL database..."
docker compose -f "${COMPOSE_FILE}" exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-strapi}" -d "${POSTGRES_DB:-strapi}" \
  | gzip > "${BACKUP_DIR}/db-${TIMESTAMP}.sql.gz"

log "Database backup saved: db-${TIMESTAMP}.sql.gz"

# -----------------------------------------------------------------------------
# Uploads backup (Strapi media library)
# -----------------------------------------------------------------------------
UPLOADS_VOLUME="$(docker compose -f "${COMPOSE_FILE}" ps -q strapi 2>/dev/null || true)"
if [ -n "$UPLOADS_VOLUME" ]; then
  log "Backing up Strapi uploads..."
  docker run --rm -v myorl-pavlos_uploads:/data -v "${BACKUP_DIR}:/backup" alpine \
    tar czf "/backup/uploads-${TIMESTAMP}.tar.gz" -C /data .
  log "Uploads backup saved: uploads-${TIMESTAMP}.tar.gz"
fi

# -----------------------------------------------------------------------------
# Rotate old backups
# -----------------------------------------------------------------------------
log "Rotating old backups (keeping last ${MAX_DAILY_BACKUPS})..."
ls -t "${BACKUP_DIR}"/db-*.sql.gz 2>/dev/null | tail -n +$((MAX_DAILY_BACKUPS + 1)) | xargs -r rm -f
ls -t "${BACKUP_DIR}"/uploads-*.tar.gz 2>/dev/null | tail -n +$((MAX_DAILY_BACKUPS + 1)) | xargs -r rm -f

log "Backup complete."
