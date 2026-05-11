#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Push local Docker Postgres database to Railway production
# =============================================================================
# Usage:
#   ./scripts/railway-push-db-to-prod.sh --force
#
# WARNING: This OVERWRITES the Railway production database with your local
# Docker database. Always verify your local data first.
#
# Environment overrides:
#   POSTGRES_SERVICE   Railway database service name, default: Postgres
#   LOCAL_CONTAINER    Local postgres container, default: myorl-pg
#   LOCAL_DB           Local database name, default: strapi
#   LOCAL_USER         Local database user, default: strapi
#   BACKUP_DIR         Backup directory, default: ./backups
# =============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-Postgres}"
LOCAL_CONTAINER="${LOCAL_CONTAINER:-myorl-pg}"
LOCAL_DB="${LOCAL_DB:-strapi}"
LOCAL_USER="${LOCAL_USER:-strapi}"
BACKUP_DIR="${BACKUP_DIR:-${ROOT_DIR}/backups}"

force=0

usage() {
  cat <<'USAGE'
Usage:
  scripts/railway-push-db-to-prod.sh --force

Push the local Docker Postgres database to Railway production.
THIS IS DESTRUCTIVE — it replaces the production database.

Required flags:
  --force    Confirm you understand this overwrites production data
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force)
      force=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ "$force" != "1" ]]; then
  echo "Refusing to overwrite production Postgres without --force." >&2
  echo "This replaces the Railway production database with local data." >&2
  exit 2
fi

for bin in docker railway; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "Missing required command: $bin" >&2
    exit 1
  fi

done

mkdir -p "$BACKUP_DIR"
stamp="$(date +%Y%m%d_%H%M%S)"
prod_backup="${BACKUP_DIR}/railway_pre_push_${stamp}.dump"
local_dump="local_source_${stamp}.dump"

echo "[push] Getting Railway database connection..."
railway_db_url="$(
  railway variables --service "$POSTGRES_SERVICE" --json \
    | jq -r '.DATABASE_PUBLIC_URL // empty'
)"

if [[ -z "$railway_db_url" ]]; then
  echo "Railway ${POSTGRES_SERVICE}.DATABASE_PUBLIC_URL is missing." >&2
  exit 1
fi

echo "[push] Backing up Railway production database..."
docker run --rm \
  -v "${BACKUP_DIR}:/backup" \
  postgres:18 \
  pg_dump "$railway_db_url" -Fc --no-acl --no-owner -f "/backup/$(basename "${prod_backup}")"

echo "[push] Saved production backup: ${prod_backup}"

echo "[push] Dumping local Docker database..."
docker exec "$LOCAL_CONTAINER" pg_dump -U "$LOCAL_USER" -d "$LOCAL_DB" -Fc --no-acl --no-owner \
  > "${BACKUP_DIR}/${local_dump}"

echo "[push] Restoring local dump to Railway production..."
docker run --rm \
  -v "${BACKUP_DIR}:/backup" \
  postgres:18 \
  pg_restore --clean --if-exists --no-owner --no-acl \
    --dbname "$railway_db_url" \
    "/backup/${local_dump}"

echo "[push] Production database updated."
echo "[push] Backup saved at: ${prod_backup}"
echo "[push] If something went wrong, restore with:"
echo "       pg_restore --clean --if-exists --no-owner --no-acl --dbname '<RAILWAY_URL>' ${prod_backup}"
