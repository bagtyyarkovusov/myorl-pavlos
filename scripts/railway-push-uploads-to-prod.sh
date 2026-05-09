#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Push Local Uploads to Railway Production Volume
# =============================================================================
# One-time or bulk sync of local backend/public/uploads/ into the Railway
# strapi-backend volume. Railway should normally be the source of truth for
# uploads; use this only for initial migration or intentional replacement.
#
# Usage:
#   ./scripts/railway-push-uploads-to-prod.sh --force
# =============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPLOADS_DIR="${ROOT_DIR}/backend/public/uploads"
CHUNK_SIZE="35m"
force=0

usage() {
  cat <<'USAGE'
Usage:
  scripts/railway-push-uploads-to-prod.sh --force

Push local backend/public/uploads/ into the Railway production volume.
This is DESTRUCTIVE on the Railway side — existing production uploads will be
replaced.

Options:
  --force    Required flag. Without it, the script refuses to proceed.
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
  echo "Refusing to overwrite Railway uploads without --force." >&2
  echo "Railway is the source of truth. Did you mean railway-pull-uploads-to-local.sh?" >&2
  exit 2
fi

for bin in ssh scp railway tar; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "Missing required command: $bin" >&2
    exit 1
  fi
done

if [[ ! -d "${UPLOADS_DIR}" ]]; then
  echo "Uploads directory not found: ${UPLOADS_DIR}" >&2
  exit 1
fi

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
  exit 1
fi

SSH_HOST="${INSTANCE_ID}@ssh.railway.com"
SSH_KEY="${HOME}/.ssh/railway_debug"
SSH_OPTS="-i ${SSH_KEY} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"

# Verify SSH works
if ! ssh $SSH_OPTS "$SSH_HOST" "echo ok" >/dev/null 2>&1; then
  echo "SSH to Railway failed. Ensure ~/.ssh/railway_debug exists and is registered." >&2
  exit 1
fi

local_count="$(find "$UPLOADS_DIR" -type f | wc -l | tr -d ' ')"
echo "[push-uploads] Local uploads: ${local_count} files"

echo "[push-uploads] Creating local tarball..."
tar czf /tmp/uploads-push.tar.gz -C "${UPLOADS_DIR%/*}" uploads

push_size="$(stat -f%z /tmp/uploads-push.tar.gz 2>/dev/null || stat -c%s /tmp/uploads-push.tar.gz 2>/dev/null)"
echo "[push-uploads] Tarball size: ${push_size} bytes"

echo "[push-uploads] Splitting into ${CHUNK_SIZE} chunks..."
rm -rf /tmp/railway-push-chunks
mkdir -p /tmp/railway-push-chunks
split -b "$CHUNK_SIZE" /tmp/uploads-push.tar.gz /tmp/railway-push-chunks/push-chunk-

chunk_list="$(ls -1 /tmp/railway-push-chunks/push-chunk-*)"
chunk_count="$(echo "$chunk_list" | wc -l | tr -d ' ')"
echo "[push-uploads] Uploading ${chunk_count} chunks via SCP..."

for chunk in $chunk_list; do
  name="$(basename "$chunk")"
  echo "[push-uploads] Uploading ${name}..."
  scp $SSH_OPTS "$chunk" "${SSH_HOST}:/tmp/"
done

echo "[push-uploads] Reassembling and extracting on Railway..."
ssh $SSH_OPTS "$SSH_HOST" "
  cat /tmp/push-chunk-* > /tmp/uploads-push.tar.gz
  rm -rf /app/public/uploads/*
  tar xzf /tmp/uploads-push.tar.gz -C /app/public/
  rm -f /tmp/push-chunk-* /tmp/uploads-push.tar.gz
  echo 'Files in uploads:'
  find /app/public/uploads -type f | wc -l
" 2>/dev/null

echo "[push-uploads] Cleaning up local temp files..."
rm -rf /tmp/railway-push-chunks /tmp/uploads-push.tar.gz

echo "[push-uploads] Done."
