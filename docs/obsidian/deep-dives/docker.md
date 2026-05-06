---
module: Docker infrastructure
source: code reading (Dockerfile*, docker-compose*)
---

# Deep dive: Docker infrastructure

> Containerized development and production environments with PostgreSQL, Strapi, Next.js, and Caddy reverse proxy.

## Services

### Development (`docker-compose.dev.yml`)

| Service | Image | Port | Purpose |
| --- | --- | --- | --- |
| `postgres` | `postgres:16` | `5432` | PostgreSQL database |
| `strapi` | `./backend/Dockerfile` | `1337` | Strapi CMS backend |
| `nextjs` | `./frontend/Dockerfile` | `3000` | Next.js frontend |

### Production (`docker-compose.prod.yml`)

| Service | Image | Port | Purpose |
| --- | --- | --- | --- |
| `postgres` | `postgres:16` | internal only | PostgreSQL database |
| `strapi` | `./backend/Dockerfile` | internal only | Strapi CMS backend |
| `nextjs` | `./frontend/Dockerfile` | internal only | Next.js frontend |
| `caddy` | `caddy:2` | `80`, `443` | Reverse proxy + auto TLS |

## Networking

- **Development**: Services communicate over Docker's default bridge network. All ports are exposed to the host.
- **Production**: Services are on a dedicated `internal` bridge network. Only Caddy exposes ports to the host (80/443 for HTTP/HTTPS). Strapi, Next.js, and PostgreSQL are internal-only.

## Volumes

| Volume | Service | Purpose |
| --- | --- | --- |
| `pgdata` / `pgdata-prod` | postgres | Persistent database storage |
| `uploads` (prod) | strapi | Uploaded media files |
| `caddy-data` / `caddy-config` (prod) | caddy | TLS certificates + Caddy state |

## Environment variables

### Required for production

| Variable | Service | Purpose |
| --- | --- | --- |
| `POSTGRES_USER` | postgres, strapi | Database user |
| `POSTGRES_PASSWORD` | postgres, strapi | Database password |
| `POSTGRES_DB` | postgres, strapi | Database name |
| `STRAPI_TOKEN` | nextjs | Strapi API read token |
| `STRAPI_URL` | nextjs | Strapi internal URL |
| `STRAPI_REVALIDATE_SECRET` | strapi, nextjs | Revalidation webhook secret |
| `NEXT_PUBLIC_SITE_URL` | nextjs | Public site URL |
| `STRAPI_CORS_ORIGINS` | strapi | CORS allowed origins |
| `APP_KEYS` | strapi | Strapi session encryption keys |
| `API_TOKEN_SALT` | strapi | API token salt |
| `ADMIN_JWT_SECRET` | strapi | Admin JWT secret |
| `JWT_SECRET` | strapi | User JWT secret |

## Health checks

- **PostgreSQL**: `pg_isready` probe, 5s interval (dev), 10s interval (prod)
- **Strapi**: Depends on PostgreSQL being healthy before starting
- **Next.js**: Depends on Strapi being started before building

## Build args

The Next.js Dockerfile accepts `STRAPI_URL` as a build arg to bake the Strapi URL into the Next.js build. This avoids runtime fetch failures during static generation at build time.

## Related

- [[../../docker-compose.dev.yml]] — dev compose file
- [[../../docker-compose.rehearsal.yml]] — rehearsal compose file
- [[../../docker-compose.prod.yml]] — prod compose file
- [[../../backend/Dockerfile]] — Strapi Dockerfile
- [[../../frontend/Dockerfile]] — Next.js Dockerfile
