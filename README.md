# myORL

Bilingual (Greek / Russian) medical website for an ENT clinic. Headless CMS monorepo with a Strapi 5 backend and a Next.js 16 frontend.

## Tech Stack

| Layer | Technology |
|-------|------------|
| CMS | Strapi 5.42.1 + PostgreSQL 18 |
| Frontend | Next.js 16 (App Router, Turbopack) + React 19 + TypeScript 5 |
| Styling | Tailwind CSS v4 + CSS Modules |
| Testing | Vitest + React Testing Library + Playwright |
| Infra | Docker Compose + Caddy reverse proxy |

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Node.js 20](https://nodejs.org/)
- Python 3.11+ (for migration/audit tooling)
- npm

## Quick Start

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Start the full Docker stack (PostgreSQL + Strapi + Next.js)
npm run dev
```

The stack comes up on:
- Next.js frontend → http://localhost:3000
- Strapi admin → http://localhost:1337/admin

### Alternative: Native host (SQLite fallback)

If you prefer running on the host without Docker:

```bash
npm run dev:local
```

This starts Strapi with SQLite and the Next.js dev server in parallel.

## Project Structure

```
├── backend/          # Strapi 5 CMS (content model, API, plugins)
├── frontend/         # Next.js 16 App Router frontend
├── tools/            # Python migration/audit scripts
├── data/manifests/   # Machine-readable manifests (redirects, etc.)
├── docs/
│   ├── adr/          # Architecture Decision Records
│   ├── architecture/ # System architecture deep dives
│   ├── agents/       # Agent skill configuration
│   └── runbooks/     # Operational playbooks
├── tests/            # Python acceptance tests for CI gates
└── CONTEXT.md        # Domain glossary and canonical vocabulary
```

## Common Commands

```bash
# Run frontend unit tests
npm run test

# Run E2E tests
npm run e2e

# Run all CI checks (lint, typecheck, test, build)
npm run lint && npm run typecheck && npm run test

# Database rehearsal (provision dev DB copy)
npm run db:provision

# Stop the Docker stack
npm run dev:down
```

## Documentation

- **Architecture decisions** → [`docs/adr/`](./docs/adr/)
- **Operational runbooks** → [`docs/runbooks/`](./docs/runbooks/)
- **Domain glossary** → [`CONTEXT.md`](./CONTEXT.md)
- **Frontend-specific docs** → [`frontend/README.md`](./frontend/README.md)
- **Backend-specific docs** → [`backend/README.md`](./backend/README.md)
- **Architecture deep dives** → [`docs/architecture/`](./docs/architecture/)

## CI / CD

GitHub Actions runs 5 jobs on every push:
1. Frontend lint / typecheck / test / coverage / build
2. Backend typecheck / build
3. Python tools tests (environment drift, port guard, backup runner, migration runner)
4. Docker image build + compose validation
5. Playwright E2E tests
