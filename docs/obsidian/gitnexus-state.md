# GitNexus index state

> Snapshot of what GitNexus currently knows about this repo. Captured **2026-04-30** against HEAD `94d7996`.
>
> If a tool warns the index is stale, run `npx gitnexus analyze` from the repo root.

## Index health check

| Field | Value |
| --- | --- |
| Repo name (in GitNexus) | `gemini-export` |
| Path | `/Users/bagtyyar/Projects/gemini-export` |
| Last indexed | 2026-04-29T18:31:31Z |
| Last commit indexed | `94d7996` (`feat: Docker deployment, frontend header/section refactor, component tests, docs, and tool cleanup`) |
| Files | 311 |
| Symbols (nodes) | 2,702 |
| Relationships (edges) | 4,053 |
| Communities (clusters) | 73 |
| Processes (execution flows) | 121 |
| Embeddings | **0** |

## Index hygiene (2026-04-30 cleanup)

| Action | Result |
| --- | --- |
| Excluded `tools/_archived/` via `.gitnexusignore` | Dropped ~246 dead symbols (largest cluster removed) |
| Excluded `artifacts/design-references/` via `.gitnexusignore` | Dropped ~267 noise symbols from minified `tailwind-browser.js` |
| Re-indexed with `--force` | Index now matches HEAD exactly; 0 uncommitted changes detected |

## Known gaps in the index

- **No embeddings.** `query` falls back to BM25 keyword ranking only — semantic similarity is disabled. Phrase your queries with concrete keywords. To enable, re-run analyze with `--embeddings`.
- **Working tree is clean.** `gitnexus_detect_changes` reports only 2 auto-updated symbols (AGENTS.md, CLAUDE.md snippets from the analyzer itself) with 0 affected processes. Index matches HEAD exactly.
- **Strapi backend routes are not indexed as `Route` nodes.** The Next.js `Route` detector only crawls `frontend/src/app/` — the actual CMS API surface (3 collections: `page`, `global`, `tag`) lives in the Strapi backend and does not appear in `gitnexus_route_map`.

## Tooling reference

| Tool | When to use |
| --- | --- |
| `gitnexus_query` | "Show me execution flows related to {concept}" |
| `gitnexus_context` | "Tell me everything about symbol X" — callers, callees, processes |
| `gitnexus_impact` | "What breaks if I change X?" — required before edits per [[../../CLAUDE]] |
| `gitnexus_detect_changes` | "What does my current diff affect?" — required before commit |
| `gitnexus_route_map` | API route → handler → consumers map |
| `gitnexus_cypher` | Raw graph queries when the structured tools don't fit |
| `gitnexus_rename` | Multi-file coordinated rename (do not find-and-replace) |

## Resources reference

- `gitnexus://repo/gemini-export/context` — stats + staleness check
- `gitnexus://repo/gemini-export/clusters` — all functional areas
- `gitnexus://repo/gemini-export/cluster/{name}` — module members
- `gitnexus://repo/gemini-export/processes` — all execution flows
- `gitnexus://repo/gemini-export/process/{name}` — step-by-step trace
- `gitnexus://repo/gemini-export/schema` — graph schema for Cypher

## Graph schema (quick)

- **Nodes:** `File`, `Folder`, `Function`, `Class`, `Interface`, `Method`, `Community`, `Process`, `Route`, `Tool`
- **Edges:** all via single `CodeRelation` table with a `type` property: `CONTAINS`, `DEFINES`, `CALLS`, `IMPORTS`, `EXTENDS`, `IMPLEMENTS`, `HAS_METHOD`, `HAS_PROPERTY`, `ACCESSES`, `METHOD_OVERRIDES`, `METHOD_IMPLEMENTS`, `MEMBER_OF`, `STEP_IN_PROCESS`, `HANDLES_ROUTE`, `FETCHES`, `HANDLES_TOOL`, `ENTRY_POINT_OF`

## Related vault notes

- [[00-MOC-CodeIntelligence]] — index of graph-derived docs
- [[audits/audit-2026-05-01]] — current codebase audit
- [[00-MOC-Architecture]] — ADRs and code boundaries
