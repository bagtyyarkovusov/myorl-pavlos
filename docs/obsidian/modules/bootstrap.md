---
module: Bootstrap
symbols: 13
cohesion: 67%
source: gitnexus://repo/gemini-export/cluster/Bootstrap
---

# Module: Bootstrap — Strapi seeders

> Code that runs at Strapi boot to seed permissions and content-manager configuration. Lower cohesion (67%) because the indexer pulled in unrelated symbols by name collision.

## Code location

- [../../../backend/src/bootstrap/](../../../backend/src/bootstrap/)

## Members (relevant)

| Symbol | File | Role |
| --- | --- | --- |
| `seedNavigationPermissions` | `navigation-permissions.ts` | Sets default API perms for navigation plugin |
| `seedNavigationConfig`, `shouldRestoreConfig` | `navigation-config.ts` | Restores nav config on boot |
| `seedContentManagerConfig` | `content-manager-config.ts` | Pins admin layout to repo defaults |
| `mergeMetadatas`, `sanitizeListLayout`, `sanitizeEditLayout`, `getFallbackListLayout`, `buildSeedConfig` | `content-manager-config.ts` | Helpers for the above |

## Members (cluster noise)

The community detector also pulled in symbols that **logically don't belong**:

- `u`, `has` from `artifacts/design-references/claude-design/tailwind-browser.js` — minified vendor JS, see [[../audits/audit-2026-04-30#headline]]
- `toItemArray`, `toSectionDTO` from `frontend/src/lib/cms/page-normalizer.ts` — these belong to [[cms]]; they probably ended up here because they share short helper names with bootstrap symbols and have low fan-out.

This is why cohesion is 67%, not 90%+.

## Active risk (2026-04-30)

None of the actual bootstrap files are touched in the current diff.

## Related

- [[../00-MOC-Backend]] — Strapi entry points
- [[scripts]] — `backend/scripts/*.js` ad-hoc cleanup tasks
