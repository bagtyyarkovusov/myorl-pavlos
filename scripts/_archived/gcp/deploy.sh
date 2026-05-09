#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Production Deploy Script for GCP VM
# =============================================================================
# Run this on the server, or via CI SSH. It expects:
#   - docker & docker compose available
#   - .env file present in project root with all required vars
#   - docker-compose.prod.yml present
# =============================================================================

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.prod.yml"
ENV_FILE="${PROJECT_DIR}/.env"
BACKUP_DIR="${PROJECT_DIR}/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MAX_BACKUPS=7

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
  echo -e "${GREEN}[deploy]${NC} $1"
}

warn() {
  echo -e "${YELLOW}[deploy]${NC} $1"
}

error() {
  echo -e "${RED}[deploy]${NC} $1"
}

# -----------------------------------------------------------------------------
# Pre-flight checks
# -----------------------------------------------------------------------------
log "Starting deployment at ${TIMESTAMP}"

if [ ! -f "${COMPOSE_FILE}" ]; then
  error "Compose file not found: ${COMPOSE_FILE}"
  exit 1
fi

if [ ! -f "${ENV_FILE}" ]; then
  error "Environment file not found: ${ENV_FILE}"
  exit 1
fi

cd "${PROJECT_DIR}"

# Load env for backup commands
set -a
source "${ENV_FILE}"
set +a

# -----------------------------------------------------------------------------
# Database backup before deployment
# -----------------------------------------------------------------------------
log "Creating pre-deployment database backup..."
mkdir -p "${BACKUP_DIR}"

if docker compose -f "${COMPOSE_FILE}" ps | grep -q postgres; then
  docker compose -f "${COMPOSE_FILE}" exec -T postgres \
    pg_dump -U "${POSTGRES_USER:-strapi}" -d "${POSTGRES_DB:-strapi}" \
    > "${BACKUP_DIR}/pre-deploy-${TIMESTAMP}.sql" 2>/dev/null || warn "Backup failed, continuing..."

  # Rotate old backups
  ls -t "${BACKUP_DIR}"/pre-deploy-*.sql 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm -f
  log "Backup completed."
else
  warn "Postgres not running — skipping backup (first deploy?)."
fi

# -----------------------------------------------------------------------------
# Pull latest code (if running via CI, code is already pulled)
# -----------------------------------------------------------------------------
if [ -d "${PROJECT_DIR}/.git" ]; then
  log "Pulling latest code..."
  git -C "${PROJECT_DIR}" pull origin main
fi

# -----------------------------------------------------------------------------
# Build & deploy
# -----------------------------------------------------------------------------
log "Building and starting services..."
docker compose -f "${COMPOSE_FILE}" pull 2>/dev/null || true
docker compose -f "${COMPOSE_FILE}" up --build -d

# -----------------------------------------------------------------------------
# Health checks
# -----------------------------------------------------------------------------
log "Running health checks..."

HEALTH_TIMEOUT=120
HEALTH_INTERVAL=5
ELAPSED=0

# Wait for postgres
while ! docker compose -f "${COMPOSE_FILE}" exec -T postgres pg_isready -U "${POSTGRES_USER:-strapi}" >/dev/null 2>&1; do
  if [ "$ELAPSED" -ge "$HEALTH_TIMEOUT" ]; then
    error "Postgres health check timed out after ${HEALTH_TIMEOUT}s"
    exit 1
  fi
  sleep "$HEALTH_INTERVAL"
  ELAPSED=$((ELAPSED + HEALTH_INTERVAL))
done
log "  ✓ Postgres healthy"

# Wait for Strapi
ELAPSED=0
while ! curl -sf http://localhost:1337/admin >/dev/null 2>&1; do
  if [ "$ELAPSED" -ge "$HEALTH_TIMEOUT" ]; then
    error "Strapi health check timed out after ${HEALTH_TIMEOUT}s"
    exit 1
  fi
  sleep "$HEALTH_INTERVAL"
  ELAPSED=$((ELAPSED + HEALTH_INTERVAL))
done
log "  ✓ Strapi healthy"

# Wait for Next.js
ELAPSED=0
while ! curl -sf http://localhost:3000 >/dev/null 2>&1; do
  if [ "$ELAPSED" -ge "$HEALTH_TIMEOUT" ]; then
    error "Next.js health check timed out after ${HEALTH_TIMEOUT}s"
    exit 1
  fi
  sleep "$HEALTH_INTERVAL"
  ELAPSED=$((ELAPSED + HEALTH_INTERVAL))
done
log "  ✓ Next.js healthy"

# -----------------------------------------------------------------------------
# Cleanup
# -----------------------------------------------------------------------------
log "Pruning old Docker images..."
docker image prune -af --filter "until=168h" >/dev/null 2>&1 || true

log "Deployment successful at $(date +%Y%m%d_%H%M%S)"
