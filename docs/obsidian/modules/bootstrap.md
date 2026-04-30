---
module: Bootstrap
symbols: 13 (7 + 6)
cohesion: 56%–91%
source: gitnexus_cypher (cluster="Bootstrap")
---

# Module: Bootstrap — Strapi seeders + misclassified symbols

> Strapi lifecycle seed scripts for content-manager config, navigation plugin, and navigation permissions. Contains cluster noise from misclassified `navigation.ts` symbols.

## Code location

| File | Purpose |
| --- | --- |
| `backend/src/bootstrap/content-manager-config.ts` | Seeds content-manager list/edit layouts and field metadata |
| `backend/src/bootstrap/navigation-config.ts` | Seeds the navigation plugin configuration |
| `backend/src/bootstrap/navigation-permissions.ts` | Seeds navigation plugin permissions |
| `backend/src/bootstrap/migrate-sections.ts` | Migrates dedicated section fields into unified `pageSections` DynamicZone |

## Members

### Seed scripts (9)

| Symbol | File | Purpose |
| --- | --- | --- |
| `seedContentManagerConfig` | `content-manager-config.ts` | Entry: seeds CM config on bootstrap |
| `buildSeedConfig` | `content-manager-config.ts` | Builds seed payload from content type schema |
| `getFallbackListLayout` | `content-manager-config.ts` | Generates list-layout if none configured |
| `mergeMetadatas` | `content-manager-config.ts` | Merges default + custom field metadata |
| `sanitizeEditLayout` | `content-manager-config.ts` | Strips invalid edit-layout entries |
| `sanitizeListLayout` | `content-manager-config.ts` | Strips invalid list-layout entries |
| `seedNavigationConfig` | `navigation-config.ts` | Seeds navigation plugin config |
| `shouldRestoreConfig` | `navigation-config.ts` | Checks if config restoration is needed |
| `seedNavigationPermissions` | `navigation-permissions.ts` | Seeds navigation permissions |

### Cluster noise (4 — misclassified from other modules)

| Symbol | File | Actual module |
| --- | --- | --- |
| `buildNavigationTree` | `examples/next_page_dto.ts` | [[examples]] |
| `buildNavigationTree` | `frontend/src/lib/cms/navigation.ts` | [[cms]] |
| `wouldCreateCycle` | `frontend/src/lib/cms/navigation.ts` | [[cms]] |
| `get` | `tools/strapi_client.py` | [[tools]] |

## Cohesion: 56% (core)

The core seeder group (content-manager + navigation configs) has high internal cohesion but the cluster is polluted by 4 misclassified symbols that drag cohesion down to 56%. After the re-index removed `artifacts/design-references/` noise, the `Claude-design` symbols no longer bleed into this cluster.

## Related

- [[scripts]] — backend JS cleanup scripts
- [[00-MOC-Backend]] — Strapi entry points
