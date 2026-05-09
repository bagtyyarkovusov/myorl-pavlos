#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Quick Deploy Script for Railway
# =============================================================================
# Usage:
#   export RAILWAY_TOKEN="your-project-token"
#   ./scripts/deploy-railway.sh
# =============================================================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[deploy]${NC} $1"; }
warn() { echo -e "${YELLOW}[deploy]${NC} $1"; }
error() { echo -e "${RED}[deploy]${NC} $1"; }

if ! command -v railway &> /dev/null; then
  error "Railway CLI not found. Install: npm install -g @railway/cli"
  exit 1
fi

if [[ -z "${RAILWAY_TOKEN:-}" ]]; then
  error "RAILWAY_TOKEN not set."
  exit 1
fi

# Verify we're linked
if ! railway status &> /dev/null; then
  error "Not linked to a Railway project. Run: railway link"
  exit 1
fi

log "Deploying strapi-backend..."
railway up backend --service strapi-backend --path-as-root --detach --ci

log "Waiting for backend health..."
BACKEND_URL=$(railway variables --service strapi-backend --json 2>/dev/null | grep -o '"STRAPI_CORS_ORIGINS":"[^"]*"' | cut -d'"' -f4 || true)
if [[ -n "$BACKEND_URL" ]]; then
  for i in $(seq 1 30); do
    if curl -sf "${BACKEND_URL}/admin" >/dev/null 2>&1; then
      log "Backend is healthy"
      break
    fi
    sleep 5
  done
else
  warn "Could not determine backend URL. Skipping health check."
  sleep 30
fi

log "Deploying nextjs-frontend..."
railway up . --service nextjs-frontend --detach --ci

log "Deploy complete! Check Railway dashboard for status."
