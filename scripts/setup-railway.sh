#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Railway Project Setup Script
# =============================================================================
# Automates as much of the Railway setup as possible via CLI.
# Some steps still require the Railway dashboard — the script will pause
# and tell you exactly what to click.
#
# Prerequisites:
#   - npm install -g @railway/cli
#   - RAILWAY_TOKEN exported in your shell (Project Token from Railway dashboard)
#   - .env file populated at repo root with real values
#
# Usage:
#   export RAILWAY_TOKEN="your-project-token"
#   ./scripts/setup-railway.sh
# =============================================================================

PROJECT_NAME="myorl-pavlos"
ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[setup]${NC} $1"; }
warn() { echo -e "${YELLOW}[setup]${NC} $1"; }
error() { echo -e "${RED}[setup]${NC} $1"; }
info() { echo -e "${BLUE}[setup]${NC} $1"; }

# -----------------------------------------------------------------------------
# Pre-flight checks
# -----------------------------------------------------------------------------
log "Starting Railway setup for ${PROJECT_NAME}..."

if ! command -v railway &> /dev/null; then
  error "Railway CLI not found. Install it first:"
  error "  npm install -g @railway/cli"
  exit 1
fi

if [[ -z "${RAILWAY_TOKEN:-}" ]]; then
  error "RAILWAY_TOKEN is not set. Get a Project Token from:"
  error "  Railway Dashboard → Project Settings → Tokens"
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  error "Environment file not found: ${ENV_FILE}"
  error "Copy .env.production.example to .env and fill in real values first."
  exit 1
fi

# Load env file for variable syncing later
set -a
source "${ENV_FILE}"
set +a

# -----------------------------------------------------------------------------
# Step 1: Create or link Railway project
# -----------------------------------------------------------------------------
info "Step 1/7: Project Setup"

if railway status --json &> /dev/null; then
  log "Already linked to a Railway project."
else
  warn "No project linked. You have two options:"
  echo ""
  echo "  A) Create NEW project:   railway init"
  echo "  B) Link EXISTING project: railway link"
  echo ""
  read -rp "Create new project? [Y/n]: " answer
  if [[ "${answer:-Y}" =~ ^[Yy]$ ]]; then
    railway init --name "${PROJECT_NAME}"
  else
    railway link
  fi
fi

PROJECT_ID=$(railway status --json 2>/dev/null | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || true)
if [[ -z "$PROJECT_ID" ]]; then
  error "Could not determine project ID. Run 'railway status' to verify."
  exit 1
fi
log "Project ID: ${PROJECT_ID}"

# -----------------------------------------------------------------------------
# Step 2: Add Managed PostgreSQL
# -----------------------------------------------------------------------------
info "Step 2/7: Add Managed PostgreSQL"

warn "Railway CLI cannot auto-add databases with custom names."
warn "Please do this ONE step in the dashboard:"
echo ""
echo "  1. Open https://railway.app/dashboard"
echo "  2. Go to your ${PROJECT_NAME} project"
echo "  3. Click + New → Database → Add PostgreSQL"
echo "  4. Name it: postgres"
echo ""
read -rp "Press ENTER once PostgreSQL is added..."

# Verify Postgres exists
if railway variables --service postgres &> /dev/null; then
  log "PostgreSQL service detected."
else
  warn "Could not auto-detect 'postgres' service. Make sure it's named exactly 'postgres'."
fi

# -----------------------------------------------------------------------------
# Step 3: Create Empty Application Services
# -----------------------------------------------------------------------------
info "Step 3/7: Create Application Services"

warn "Railway CLI service creation is interactive. Please run these commands:"
echo ""
echo "  # Create backend service"
echo "  railway add"
echo "  → Select: Empty Service"
echo "  → Name: strapi-backend"
echo ""
echo "  # Create frontend service"
echo "  railway add"
echo "  → Select: Empty Service"
echo "  → Name: nextjs-frontend"
echo ""
read -rp "Press ENTER once both services are created..."

# -----------------------------------------------------------------------------
# Step 4: Link Config-as-Code (railway.toml)
# -----------------------------------------------------------------------------
info "Step 4/7: Link railway.toml Config File"

warn "Each service must point to its own railway.toml. In the dashboard:"
echo ""
echo "  strapi-backend  → Settings → Root Directory → /backend"
echo "  strapi-backend  → Settings → Config as Code File → /backend/railway.toml"
echo ""
echo "  nextjs-frontend → Settings → Root Directory → /"
echo "  nextjs-frontend → Settings → Config as Code File → /frontend/railway.toml"
echo ""
read -rp "Press ENTER once config files are linked..."

# -----------------------------------------------------------------------------
# Step 5: Set Environment Variables
# -----------------------------------------------------------------------------
info "Step 5/7: Set Environment Variables"

log "Pushing environment variables to Railway services..."

# Helper to push vars to a service
push_vars() {
  local service=$1
  shift
  log "Setting variables for ${service}..."
  for var in "$@"; do
    local key=$(echo "$var" | cut -d= -f1)
    local val=$(echo "$var" | cut -d= -f2-)
    if [[ -n "$val" ]]; then
      railway variables --service "$service" --set "${key}=${val}" || warn "Failed to set ${key}"
    fi
  done
}

# Generate secrets if not present
if [[ -z "${APP_KEYS:-}" || "$APP_KEYS" == "key1,key2,key3,key4" ]]; then
  log "Generating Strapi secrets..."
  APP_KEYS=$(for _ in {1..4}; do openssl rand -base64 32; done | paste -sd ',' -)
  API_TOKEN_SALT=${API_TOKEN_SALT:-$(openssl rand -base64 32)}
  ADMIN_JWT_SECRET=${ADMIN_JWT_SECRET:-$(openssl rand -base64 32)}
  TRANSFER_TOKEN_SALT=${TRANSFER_TOKEN_SALT:-$(openssl rand -base64 32)}
  JWT_SECRET=${JWT_SECRET:-$(openssl rand -base64 32)}
  ENCRYPTION_KEY=${ENCRYPTION_KEY:-$(openssl rand -base64 32)}
  STRAPI_REVALIDATE_SECRET=${STRAPI_REVALIDATE_SECRET:-$(openssl rand -base64 32)}
fi

# Backend vars
push_vars strapi-backend \
  "NODE_ENV=production" \
  "HOST=0.0.0.0" \
  "PORT=1337" \
  "DATABASE_CLIENT=postgres" \
  "DATABASE_HOST=\${{Postgres.PGHOST}}" \
  "DATABASE_PORT=\${{Postgres.PGPORT}}" \
  "DATABASE_NAME=\${{Postgres.PGDATABASE}}" \
  "DATABASE_USERNAME=\${{Postgres.PGUSER}}" \
  "DATABASE_PASSWORD=\${{Postgres.PGPASSWORD}}" \
  "DATABASE_SSL=true" \
  "APP_KEYS=${APP_KEYS}" \
  "API_TOKEN_SALT=${API_TOKEN_SALT}" \
  "ADMIN_JWT_SECRET=${ADMIN_JWT_SECRET}" \
  "TRANSFER_TOKEN_SALT=${TRANSFER_TOKEN_SALT}" \
  "JWT_SECRET=${JWT_SECRET}" \
  "ENCRYPTION_KEY=${ENCRYPTION_KEY}" \
  "STRAPI_REVALIDATE_SECRET=${STRAPI_REVALIDATE_SECRET}" \
  "STRAPI_CORS_ORIGINS=${STRAPI_CORS_ORIGINS:-}" \
  "DEPLOY_ENV=production"

# Frontend vars
push_vars nextjs-frontend \
  "NODE_ENV=production" \
  "STRAPI_URL=${STRAPI_URL:-}" \
  "STRAPI_TOKEN=${STRAPI_TOKEN:-}" \
  "NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL:-}" \
  "STRAPI_REVALIDATE_SECRET=${STRAPI_REVALIDATE_SECRET}" \
  "GOOGLE_PLACES_API_KEY=${GOOGLE_PLACES_API_KEY:-}" \
  "GOOGLE_PLACE_ID=${GOOGLE_PLACE_ID:-}" \
  "DEPLOY_ENV=production"

log "Variables pushed. Note: Reference variables (\${{Postgres.*}}) may need manual verification in dashboard."

# -----------------------------------------------------------------------------
# Step 6: Deploy
# -----------------------------------------------------------------------------
info "Step 6/7: Deploy Services"

log "Deploying strapi-backend..."
railway up --service strapi-backend --detach --ci || error "Backend deploy failed"

log "Waiting 30s for backend to initialize..."
sleep 30

log "Deploying nextjs-frontend..."
railway up --service nextjs-frontend --detach --ci || error "Frontend deploy failed"

# -----------------------------------------------------------------------------
# Step 7: Generate Domains
# -----------------------------------------------------------------------------
info "Step 7/7: Generate Public Domains"

warn "Generate domains in the dashboard or via CLI:"
echo ""
echo "  railway domain --service strapi-backend"
echo "  railway domain --service nextjs-frontend"
echo ""
echo "Then update these variables and redeploy:"
echo "  nextjs-frontend: STRAPI_URL=https://your-backend-domain.up.railway.app"
echo "  strapi-backend:  STRAPI_CORS_ORIGINS=https://your-frontend-domain.up.railway.app"
echo ""

# -----------------------------------------------------------------------------
# Done
# -----------------------------------------------------------------------------
log "Setup complete! 🚀"
echo ""
echo "Next steps:"
echo "  1. Generate domains (see above)"
echo "  2. Open Strapi admin and create an API token"
echo "  3. Add STRAPI_TOKEN to nextjs-frontend variables"
echo "  4. Run: ./scripts/deploy-railway.sh for future deploys"
