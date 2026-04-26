# Obsidian vault (this project)

This folder holds **Map of Content (MOC)** notes to navigate the repo: ADRs, migration docs, and key code paths. It is **not** a second source of truth for decisions—see [../adr/](../adr/). The full **hierarchy (ADR vs code vs GitNexus vs MOCs)** is in [../ai-context.md](../ai-context.md).

## Open in Obsidian

1. **Recommended:** In Obsidian, **Open folder as vault** and select **`docs/obsidian`**. The MOCs use **relative markdown links** to `../adr/`, `../../frontend/...`, and `../migration/`, so they work in Git, GitHub, and editors. Obsidian will follow those links out of the vault.
2. **Alternative:** Open the **repository root** as the vault if you want wikilinks of the form `[[docs/adr/ADR-001-nextjs-semantic-dto-boundary]]` and a single large graph.

## Local `.obsidian` folder

You may get a `docs/obsidian/.obsidian` directory after first open (app settings, plugins). It is **gitignored** so each developer keeps their own; do not commit it unless the team explicitly shares minimal `app.json` for consistency.

## Start here

- [00-MOC-Architecture](00-MOC-Architecture.md) — ADRs, migration entry points, monorepo layout
- [00-MOC-Frontend](00-MOC-Frontend.md) — Next.js, CMS DTO layer, i18n, routes
- [00-MOC-Backend](00-MOC-Backend.md) — Strapi CMS API, configuration, extensions
- [00-MOC-Tools](00-MOC-Tools.md) — Python scripts for migration, audit, and readiness gates

## AI assistants

See also [../ai-context.md](../ai-context.md) for the **GitNexus** repository name and Cursor rules under `.cursor/rules/`.
