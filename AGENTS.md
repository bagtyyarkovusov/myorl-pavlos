## Agent skills

### Issue tracker

GitHub Issues on `bagtyyarkovusov/myorl-pavlos`. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical defaults: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — ADRs at `docs/adr/`, `CONTEXT.md` at root. See `docs/agents/domain.md`.

### Search subsystem

Meilisearch-backed full-site search. Architecture in [ADR-011](docs/adr/ADR-011-full-site-search-via-meilisearch.md), operator procedures in [docs/runbooks/search-reindex.md](docs/runbooks/search-reindex.md), agent file map in [docs/agents/search.md](docs/agents/search.md). Implementation brief: [PRD #117](https://github.com/bagtyyarkovusov/myorl-pavlos/issues/117).

### Documentation inventory for agents

Read these in this order when entering the project:

1. **`CONTEXT.md`** — Domain glossary and canonical vocabulary. Read first.
2. **`docs/adr/`** — Architecture Decision Records (11 accepted ADRs). Source of truth for product decisions.
3. **`docs/architecture/README.md`** — Architecture MOC. Navigation entry point for deep dives.
4. **`docs/runbooks/ci-cd-and-workflow.md`** — CI/CD pipelines and dev/prod/rehearsal workflow.

**Do not rely on** (removed or outdated):
- Old migration docs (MODX → Strapi)
- Audit snapshots (`docs/audit.md`, `docs/strapi-nextjs-audit.md`, etc.)
- Content readiness assessments
- Implementation plans (formerly in `plans/`)
- `.cursor/rules/` or `docs/obsidian/` (removed; content migrated to `docs/architecture/`)

**Per-area quick reference:**
- Frontend: `frontend/README.md`, `frontend/AGENTS.md`, `docs/architecture/frontend.md`
- Backend: `backend/README.md`, `docs/architecture/backend.md`
- CMS contract: `docs/api-contract.md`
- Styling tokens: `docs/frontend-token-contract.md`
