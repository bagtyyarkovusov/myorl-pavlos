# Deployment & Operations

> Docker-based infrastructure with Python tooling for migration, backup, and rehearsal.

## Docker Compose Environments

### Development (`docker-compose.dev.yml`)

```yaml
services:
  postgres:
    image: postgres:18
    ports: ["55432:5432"]
    volumes: [pgdata_dev]
  
  strapi:
    build: ./backend
    ports: ["1337:1337"]
    volumes: [./backend:/app]
    depends_on: [postgres]
  
  nextjs:
    build: ./frontend
    ports: ["3000:3000"]
    volumes: [./frontend:/app]
    depends_on: [strapi]
```

All services have hot reload via volume mounts.

### Production (`docker-compose.prod.yml`)

Same services plus Caddy reverse proxy. Only Caddy exposes ports (80/443). Internal services communicate over Docker network.

### Rehearsal (`docker-compose.rehearsal.yml`)

Disposable PostgreSQL on port `55532` for migration validation. Cleaned up after each run.

## Environment Manifest

The **single source of truth** for deployment target identity lives in `tools/environments.py`:

```python
ENVIRONMENTS = {
    "dev": {
        "host_port": 55432,
        "container_name": "myorl-pg",
        "volume_name": "pgdata_dev",
        "db_name": "strapi",
        "compose_file": "docker-compose.dev.yml",
    },
    "rehearsal": {
        "host_port": 55532,
        "container_name": "myorl-pg-rehearsal",
        "volume_name": "pgdata-rehearsal",
        "db_name": "strapi_rehearsal",
        "compose_file": "docker-compose.rehearsal.yml",
    },
}
```

Every Python tool imports `ENVIRONMENTS` instead of carrying its own config.

## Port Guard

Preflight validation module (`tools/check_environment.py`) that verifies before any database operation:
- Port availability
- Container conflicts
- Source database existence
- Environment configuration

Fails fast with actionable errors.

## Backup / Restore / Drill

`tools/backup_runner.py` wraps `pg_dump` and `psql`:

| Mode | Command | Description |
|------|---------|-------------|
| Backup | `python tools/backup_runner.py backup` | Full/schema-only/data-only dump, gzip, 30-day retention |
| Restore | `python tools/backup_runner.py restore` | Drop/recreate/import cycle. Blocked for prod without `--force`. |
| Drill | `python tools/backup_runner.py drill` | Backup → restore → verify row counts. Blocked for prod entirely. |

## Migration Runner

`tools/migration_runner.py` enforces the Forward-Only Migration policy (ADR-003):

- Discovers migrations in `backend/database/postgres-migrations/`
- Tracks applied state in `_migrations` table with SHA-256 checksums
- **Edited-migration guard**: fatal error if a previously-applied `.up.sql` changes
- **Prod safety**: `up` requires `--force` for production; `down` blocked entirely
- **Idempotent apply**: skips already-applied; applies pending in filename order

## Rehearsal Orchestrator

`tools/orchestrate_rehearsal.py` validates cutover safety:

1. Checks dev Postgres is running (ADR-008)
2. Exports Strapi state from dev Postgres
3. Spins up rehearsal PostgreSQL
4. Imports state
5. Runs `migration_runner.py up`
6. Verifies row counts and query plans
7. Tears down rehearsal container

## CI/CD Pipeline

See [`docs/runbooks/ci-cd-and-workflow.md`](../runbooks/ci-cd-and-workflow.md) for the complete pipeline reference.

Summary:
- **CI** (`ci.yml`): frontend → backend → python tools → docker → e2e
- **Deploy** (`deploy-railway.yml`): CI gate → backend → frontend → smoke test
- **Platform:** Railway with config-as-code (`backend/railway.toml`, `frontend/railway.toml`)

## Port Allocation Contract

| Port | Owner |
|------|-------|
| `3000` | Next.js frontend (dev HMR) |
| `1337` | Strapi CMS backend (dev) |
| `5432` | Native/system PostgreSQL (other projects) |
| `55432` | Dev Docker PostgreSQL (`myorl-pg`) |
| `55532` | Rehearsal Docker PostgreSQL (`myorl-pg-rehearsal`) |
| internal | Production PostgreSQL (no host exposure) |

## Local Development Commands

```bash
npm run dev           # Full Docker dev stack
npm run dev:local     # Native Node + SQLite (no-Docker fallback)
npm run dev:db        # PostgreSQL only
npm run dev:down      # Stop Docker stack
```

## Related

- [docker-deep-dive.md](docker-deep-dive.md) — Docker architecture details
- [backend-moc.md](backend-moc.md) — Backend configuration
