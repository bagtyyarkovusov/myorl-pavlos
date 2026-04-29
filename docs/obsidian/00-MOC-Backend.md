# MOC: Backend (Strapi CMS)

> Entry points for the Strapi backend: API, admin, configuration, components, and deployment.

## API layer

- [../../backend/src/api/page/](../../backend/src/api/page/) — Page content type (controller, routes, services)
- [../../backend/src/api/tag/](../../backend/src/api/tag/) — Tag content type
- [../../backend/src/api/global/](../../backend/src/api/global/) — Global singleton (navigation, site config)
- [../../backend/src/index.ts](../../backend/src/index.ts) — Strapi bootstrap entry

## Configuration

- [../../backend/config/](../../backend/config/) — Database, server, admin, plugins
- [../../backend/types/](../../backend/types/) — Generated TypeScript types
- [../../backend/.strapi-updater.json](../../backend/.strapi-updater.json)

## Extensions and components

- [../../backend/src/extensions/](../../backend/src/extensions/)
- [../../backend/src/components/](../../backend/src/components/)
- [../../backend/src/bootstrap/](../../backend/src/bootstrap/)

## Environment

- [../../backend/.env.example](../../backend/.env.example) — Strapi env vars template
- Root [../../.env.example](../../.env.example) — shared env (STRAPI_URL, STRAPI_TOKEN, etc.)

## Graph-derived docs

| Doc | Content |
| --- | --- |
| [[modules/bootstrap]] | Strapi seed scripts (content-manager config, navigation config, permissions) |
| [[modules/scripts]] | `backend/scripts/*.js` one-shot cleanup + verification |
| [[deep-dives/backend-api]] | Full API architecture: 3 collections, controllers, services, routes |
| [[deep-dives/strapi-components]] | 22 component schemas: 11 items, 10 sections, 1 shared |

## Docker and deployment

- [[deep-dives/docker]]
- [../runbooks/production-deployment.md](../runbooks/production-deployment.md)
- [../runbooks/postgres-backup.md](../runbooks/postgres-backup.md)

## Migration and ops

- [../migration/strapi_schema.md](../migration/strapi_schema.md)
- [../migration/strapi_injection_readiness.md](../migration/strapi_injection_readiness.md)
- [../runbooks/postgres-rehearsal.md](../runbooks/postgres-rehearsal.md)

## Related

- [[00-MOC-Architecture]] — ADRs, code boundaries
- [[00-MOC-Frontend]] — CMS DTO contract in `frontend/src/lib/cms/`
