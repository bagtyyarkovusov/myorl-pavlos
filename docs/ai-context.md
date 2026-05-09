# AI context: Architecture and single source of truth

## Source of truth (in order)

| What | Source of truth | Do not use as sole authority for… |
|------|----------------|----------------------------------|
| **Product / architecture decisions** | [`docs/adr/`](./adr/) (ADRs) | Ad-hoc notes or `.cursor` rules alone |
| **What the system actually does** | Code — especially [`frontend/src/lib/cms/`](../frontend/src/lib/cms/) | MOCs (they are navigation, not a spec) |
| **How the repo is structured** (human nav) | [`docs/architecture/`](./architecture/) | Decisions; always link to ADRs |
| **Agent reminders** | [`.cursor/rules/`](../.cursor/rules/) | Replacing ADRs; they point here and to architecture/ADR paths |

**Default workflow:** new or changed *rules* and *contracts* for the product are recorded in an **ADR** first; **architecture docs** get a link or short update; **Cursor rules** only summarize and point—never the only place a decision lives.

---

## Architecture docs

Map of content: [architecture/README.md](./architecture/README.md) · [architecture/frontend.md](./architecture/frontend.md) · [architecture/backend.md](./architecture/backend.md).

Architecture docs are for **navigation and discovery**, not a parallel decision log. Decisions live in `docs/adr/`.

### Doc structure

| Layer | Location | Purpose |
| --- | --- | --- |
| MOCs | `docs/architecture/README.md` | Top-level navigation |
| Module docs | `docs/architecture/*-module.md` | Per-module overviews |
| Deep dives | `docs/architecture/*-deep-dive.md` | Architecture deep dives |
| Analysis | `docs/architecture/*.md` | System overview, data flow, deployment, ADR alignment |

---

## Project identity

- **Name**: gemini-export (myORL)
- **Repo**: `bagtyyarkovusov/gemini-export`
- **Stack**: Next.js 16 + Strapi 5.42.1 + PostgreSQL 16
- **Locales**: Greek (el), Russian (ru)
