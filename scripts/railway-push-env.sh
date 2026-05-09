#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Push .env variables to Railway services
# =============================================================================
# Reads .env file and syncs variables to Railway.
# Skips empty values and comments.
#
# Usage:
#   export RAILWAY_TOKEN="your-project-token"
#   ./scripts/railway-push-env.sh [backend|frontend|all]
# =============================================================================

ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env"
TARGET="${1:-all}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: .env file not found at ${ENV_FILE}"
  exit 1
fi

if ! command -v railway &> /dev/null; then
  echo "Error: Railway CLI not found. Install: npm install -g @railway/cli"
  exit 1
fi

push_to_service() {
  local service=$1
  echo "Pushing variables to ${service}..."

  while IFS='=' read -r key val; do
    # Skip comments and empty lines
    [[ "$key" =~ ^[[:space:]]*# ]] && continue
    [[ -z "$key" ]] && continue
    # Trim whitespace
    key=$(echo "$key" | xargs)
    val=$(echo "$val" | xargs)
    [[ -z "$val" ]] && continue
    railway variables --service "$service" --set "${key}=${val}"
  done < <(grep -v '^\s*$' "$ENV_FILE")

  echo "Done: ${service}"
}

case "$TARGET" in
  backend)
    push_to_service strapi-backend
    ;;
  frontend)
    push_to_service nextjs-frontend
    ;;
  all)
    push_to_service strapi-backend
    push_to_service nextjs-frontend
    ;;
  *)
    echo "Usage: $0 [backend|frontend|all]"
    exit 1
    ;;
esac
