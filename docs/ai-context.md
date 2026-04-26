# AI context: GitNexus, Obsidian, and single source of truth

## Source of truth (in order)

| What | Source of truth | Do not use as sole authority for… |
|------|----------------|----------------------------------|
| **Product / architecture decisions** | [`docs/adr/`](./adr/) (ADRs) | Ad-hoc Obsidian pages or `.cursor` rules alone |
| **What the system actually does** | Code — especially [`frontend/src/lib/cms/`](../frontend/src/lib/cms/) | MOCs (they are navigation, not a spec) |
| **How the repo is structured and linked** (human nav) | [`docs/obsidian/`](./obsidian/) MOCs | Decisions; always link to ADRs |
| **Symbol-level understanding / impact (AI & tools)** | GitNexus graph for repo **`gemini-export`** | Architecture decisions; re-run analyze when the tree diverges a lot |
| **Agent reminders** | [`.cursor/rules/`](../.cursor/rules/) | Replacing ADRs; they point here and to MOC/ADR paths |

**Default workflow from now on:** new or changed *rules* and *contracts* for the product are recorded in an **ADR** first; **Obsidian** gets a link or a short MOC update; **GitNexus** is re-indexed when needed (`npx gitnexus analyze` at repo root); **Cursor rules** only summarize and point—never the only place a decision lives.

---

## GitNexus (this repo)

**Canonical repository name:** `gemini-export`

- MCP resource: `gitnexus://repo/gemini-export/context`
- List all indexed repos: `gitnexus://repos`
- After large refactors or long gaps, re-index from the repo root: `npx gitnexus analyze`

**Multiple indexes on one machine** (e.g. `auto.tm-main`): always use **`gemini-export`** for this workspace when calling GitNexus tools or resources.

---

## Obsidian

Maps of content: [obsidian/README.md](./obsidian/README.md) · [obsidian/00-MOC-Architecture.md](./obsidian/00-MOC-Architecture.md) · [obsidian/00-MOC-Frontend.md](./obsidian/00-MOC-Frontend.md).  
Obsidian is for **navigation and discovery**, not a parallel decision log. Decisions live in `docs/adr/`.
