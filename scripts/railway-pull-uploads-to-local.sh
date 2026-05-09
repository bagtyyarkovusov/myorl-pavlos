#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Pull Uploads from Railway Volume to Local Dev
# =============================================================================
# Safely copies the production uploads volume into backend/public/uploads/.
# Railway is the source of truth for media files.
#
# Usage:
#   ./scripts/railway-pull-uploads-to-local.sh --force
# =============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPLOADS_DIR="${ROOT_DIR}/backend/public/uploads"
BACKUP_DIR="${ROOT_DIR}/backups"
CHUNK_SIZE="35m"
force=0

usage() {
  cat <<'USAGE'
Usage:
  scripts/railway-pull-uploads-to-local.sh --force

Pull the Railway production uploads volume into local backend/public/uploads/.
This treats Railway as source of truth and backs up the local directory first.

Options:
  --force    Required flag. Without it, the script refuses to overwrite local uploads.
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
  echo "Refusing to overwrite local uploads without --force." >&2
  echo "Railway is the source of truth. Local files will be backed up first." >&2
  exit 2
fi

for bin in ssh scp railway; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "Missing required command: $bin" >&2
    exit 1
  fi
done

# Get active Railway deployment instance ID for strapi-backend
INSTANCE_ID="$(
  railway status --json 2>/dev/null \
    | python3 -c "
import sys, json
d = json.load(sys.stdin)
for env in d['environments']['edges']:
    for si in env['node']['serviceInstances']['edges']:
        if si['node'].get('serviceName') == 'strapi-backend':
            for dep in si['node'].get('activeDeployments', []):
                for inst in dep.get('instances', []):
                    if inst.get('status') == 'RUNNING':
                        print(inst['id'])
                        break
" 2>/dev/null
)"

if [[ -z "$INSTANCE_ID" ]]; then
  echo "Could not determine Railway strapi-backend instance ID." >&2
  echo "Ensure Railway CLI is linked and the service is running." >&2
  exit 1
fi

SSH_HOST="${INSTANCE_ID}@ssh.railway.com"
SSH_KEY="${HOME}/.ssh/railway_debug"
SSH_OPTS="-i ${SSH_KEY} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"

# Verify SSH works
if ! ssh $SSH_OPTS "$SSH_HOST" "echo ok" >/dev/null 2>&1; then
  echo "SSH to Railway failed. Ensure ~/.ssh/railway_debug exists and is registered." >&2
  echo "Run: railway ssh keys add" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
stamp="$(date +%Y%m%d_%H%M%S)"
local_backup="${BACKUP_DIR}/uploads_before_railway_pull_${stamp}.tar.gz"

echo "[pull-uploads] Creating local backup: ${local_backup} ..."
tar czf "$local_backup" -C "${UPLOADS_DIR%/*}" uploads 2>/dev/null || true
echo "[pull-uploads] Local backup saved."

echo "[pull-uploads] Archiving Railway uploads volume..."
ssh $SSH_OPTS "$SSH_HOST" "tar czf /tmp/uploads-pull.tar.gz -C /app/public uploads" 2>/dev/null

railway_size="$(ssh $SSH_OPTS "$SSH_HOST" "stat -c%s /tmp/uploads-pull.tar.gz" 2>/dev/null)"
echo "[pull-uploads] Railway archive size: ${railway_size} bytes"

echo "[pull-uploads] Splitting archive into ${CHUNK_SIZE} chunks for download..."
ssh $SSH_OPTS "$SSH_HOST" "split -b ${CHUNK_SIZE} /tmp/uploads-pull.tar.gz /tmp/pull-chunk-" 2>/dev/null

chunk_list="$(ssh $SSH_OPTS "$SSH_HOST" "ls -1 /tmp/pull-chunk-*" 2>/dev/null)"
chunk_count="$(echo "$chunk_list" | wc -l | tr -d ' ')"
echo "[pull-uploads] Downloading ${chunk_count} chunks via SCP..."

rm -rf /tmp/railway-pull-chunks
mkdir -p /tmp/railway-pull-chunks

for chunk in $chunk_list; do
  name="$(basename "$chunk")"
  echo "[pull-uploads] Downloading ${name}..."
  scp $SSH_OPTS "${SSH_HOST}:${chunk}" /tmp/railway-pull-chunks/ 2>/dev/null
done

echo "[pull-uploads] Reassembling archive..."
cat /tmp/railway-pull-chunks/pull-chunk-* > /tmp/uploads-pull.tar.gz

echo "[pull-uploads] Verifying reassembled size..."
local_size="$(stat -f%z /tmp/uploads-pull.tar.gz 2>/dev/null || stat -c%s /tmp/uploads-pull.tar.gz 2>/dev/null)"
if [[ "$local_size" != "$railway_size" ]]; then
  echo "[pull-uploads] ERROR: Size mismatch! Railway=${railway_size} Local=${local_size}" >&2
  exit 1
fi

echo "[pull-uploads] Extracting into ${UPLOADS_DIR} ..."
rm -rf "${UPLOADS_DIR:?}/*"
tar xzf /tmp/uploads-pull.tar.gz -C "${UPLOADS_DIR%/*}"

local_count="$(find "$UPLOADS_DIR" -type f | wc -l | tr -d ' ')"
echo "[pull-uploads] Local uploads now contains ${local_count} files."

echo "[pull-uploads] Cleaning up remote temp files..."
ssh $SSH_OPTS "$SSH_HOST" "rm -f /tmp/uploads-pull.tar.gz /tmp/pull-chunk-*" 2>/dev/null || true

echo "[pull-uploads] Done."
echo "[pull-uploads] Backup saved at: ${local_backup}"
