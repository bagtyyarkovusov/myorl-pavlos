#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-${ROOT_DIR}/docker-compose.dev.yml}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-Postgres}"
LOCAL_CONTAINER="${LOCAL_CONTAINER:-gemini-pg}"
LOCAL_DB="${LOCAL_DB:-strapi}"
LOCAL_USER="${LOCAL_USER:-strapi}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-$(basename "${ROOT_DIR}")}"
LOCAL_VOLUME="${LOCAL_VOLUME:-${COMPOSE_PROJECT_NAME}_pgdata_dev}"
BACKUP_DIR="${BACKUP_DIR:-${ROOT_DIR}/backups}"

force=0

usage() {
  cat <<'USAGE'
Usage:
  scripts/railway-pull-db-to-docker.sh --force

Pull the Railway production Postgres database into the local Docker dev
Postgres container. This treats Railway as source of truth and recreates the
local pgdata volume before restoring.

Environment overrides:
  POSTGRES_SERVICE   Railway database service name, default: Postgres
  COMPOSE_FILE       Compose file, default: docker-compose.dev.yml
  LOCAL_CONTAINER    Local postgres container, default: gemini-pg
  LOCAL_DB           Local database name, default: strapi
  LOCAL_USER         Local database user, default: strapi
  LOCAL_VOLUME       Docker volume to recreate, default: gemini-export_pgdata_dev
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
  echo "Refusing to overwrite local Docker Postgres without --force." >&2
  echo "This removes the local ${LOCAL_VOLUME} volume after taking a best-effort backup." >&2
  exit 2
fi

for bin in docker railway jq; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "Missing required command: $bin" >&2
    exit 1
  fi
done

mkdir -p "$BACKUP_DIR"
stamp="$(date +%Y%m%d_%H%M%S)"
local_backup="${BACKUP_DIR}/local_before_railway_pull_${stamp}.dump"
railway_dump="railway_source_${stamp}.dump"

if docker ps -a --format '{{.Names}}' | grep -qx "$LOCAL_CONTAINER"; then
  docker start "$LOCAL_CONTAINER" >/dev/null 2>&1 || true
  if docker exec "$LOCAL_CONTAINER" pg_isready -U "$LOCAL_USER" -d "$LOCAL_DB" >/dev/null 2>&1; then
    docker exec "$LOCAL_CONTAINER" pg_dump -U "$LOCAL_USER" -d "$LOCAL_DB" -Fc --no-acl --no-owner > "$local_backup"
    echo "Saved local backup: ${local_backup}"
  fi
fi

railway_db_url="$(
  railway variables --service "$POSTGRES_SERVICE" --json \
    | jq -r '.DATABASE_PUBLIC_URL // empty'
)"

if [[ -z "$railway_db_url" ]]; then
  echo "Railway ${POSTGRES_SERVICE}.DATABASE_PUBLIC_URL is missing." >&2
  exit 1
fi

docker compose -f "$COMPOSE_FILE" down --remove-orphans
docker volume rm "$LOCAL_VOLUME" >/dev/null 2>&1 || true
docker compose -f "$COMPOSE_FILE" up -d postgres

for _ in $(seq 1 60); do
  if ! docker ps --format '{{.Names}}' | grep -qx "$LOCAL_CONTAINER"; then
    docker logs --tail 80 "$LOCAL_CONTAINER" >&2 || true
    echo "Local Postgres container exited before becoming ready." >&2
    exit 1
  fi
  if docker exec "$LOCAL_CONTAINER" pg_isready -U "$LOCAL_USER" -d "$LOCAL_DB" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done

if [[ "${ready:-0}" != "1" ]]; then
  docker logs --tail 80 "$LOCAL_CONTAINER" >&2 || true
  echo "Timed out waiting for local Postgres readiness." >&2
  exit 1
fi

docker run --rm \
  -v "${BACKUP_DIR}:/backup" \
  postgres:18 \
  pg_dump "$railway_db_url" -Fc --no-acl --no-owner -f "/backup/${railway_dump}"

docker run --rm \
  -v "${BACKUP_DIR}:/backup" \
  --network container:"$LOCAL_CONTAINER" \
  postgres:18 \
  pg_restore --clean --if-exists --no-owner --no-acl \
    --dbname "postgresql://${LOCAL_USER}:strapi@localhost:5432/${LOCAL_DB}" \
    "/backup/${railway_dump}"

docker exec "$LOCAL_CONTAINER" psql -U "$LOCAL_USER" -d "$LOCAL_DB" -At \
  -c "select 'pages=' || count(*) from pages; select 'tags=' || count(*) from tags; select 'admin_users=' || count(*) from admin_users;"

echo "Local Docker Postgres now mirrors Railway production."
