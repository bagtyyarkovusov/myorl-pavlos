# GitNexus index state

> Snapshot of what GitNexus currently knows about this repo. Captured **2026-04-30** against working copy `e5da5d6`.
>
> If a tool warns the index is stale, run `npx gitnexus analyze` from the repo root.

## Index health check

| Field | Value |
| --- | --- |
| Repo name (in GitNexus) | `gemini-export` |
| Path | `/Users/bagtyyar/Projects/gemini-export` |
| Last indexed | 2026-04-29T16:23:43Z |
| Last commit indexed | `e5da5d6` (`fix: remove duplicate gray title in mega menu, make navLabel accent blue`) |
| Files | 338 |
| Symbols (nodes) | 5243 |
| Relationships (edges) | 8139 |
| Communities (clusters) | 151 |
| Processes (execution flows) | 238 |
| Embeddings | **0** |

## Known gaps in the index

- **No embeddings.** `query` falls back to BM25 keyword ranking only — semantic similarity is disabled. Phrase your queries with concrete keywords, not vague concepts. To enable, re-run analyze with embeddings configured.
- **Indexing minified output.** `artifacts/design-references/claude-design/tailwind-browser.js` contributes **267 symbols** (single-letter names like `K`, `Z`, `j`) that dominate the top-callers ranking and inflate the `Claude-design` cluster (151 symbols, 48% cohesion). Consider adding it to the GitNexus ignore list.
- **Working tree drift.** As of 2026-04-30 the working copy has **84 uncommitted symbol changes across 47 files** (CRITICAL risk per `detect_changes`). Impact analysis on changed symbols reflects pre-edit state until those commits land + index is refreshed. See [[audits/audit-2026-04-30|2026-04-30 audit]].
- **`_archived` is still in the graph.** The `_archived` cluster is the **largest** (246 symbols), composed entirely of legacy MODX → Strapi migration scripts under `tools/_archived/`. Many are being deleted in the current WIP. Re-index after that lands to drop them from query/impact results.

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

Lightweight reads (~100–500 tokens) for navigation:

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
- [[audits/audit-2026-04-30]] — current codebase audit
- [[00-MOC-Architecture]] — ADRs and code boundaries
