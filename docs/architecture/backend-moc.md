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

## Extensions and components

- [../../backend/src/extensions/](../../backend/src/extensions/)
- [../../backend/src/components/](../../backend/src/components/)
- [../../backend/src/bootstrap/](../../backend/src/bootstrap/)

## Environment

- [../../backend/.env.example](../../backend/.env.example) — Strapi env vars template
- Root [../../.env.example](../../.env.example) — shared env (STRAPI_URL, STRAPI_TOKEN, etc.)

## Deep dives

| Doc | Content |
| --- | --- |
| [backend-api-deep-dive.md](backend-api-deep-dive.md) | Full API architecture: 3 collections, controllers, services, routes |
| [strapi-components-deep-dive.md](strapi-components-deep-dive.md) | 22 component schemas: 11 items, 10 sections, 1 shared |

## Docker and deployment

- [docker-deep-dive.md](docker-deep-dive.md)
- [../runbooks/production-deployment.md](../runbooks/production-deployment.md)
- [../runbooks/postgres-backup.md](../runbooks/postgres-backup.md)

## Migration and ops

- [../migration/strapi_schema.md](../migration/strapi_schema.md)
- [../migration/strapi_injection_readiness.md](../migration/strapi_injection_readiness.md)
- [../runbooks/postgres-rehearsal.md](../runbooks/postgres-rehearsal.md)

## Related

- [README.md](README.md) — ADRs, code boundaries
- [frontend-moc.md](frontend-moc.md) — CMS DTO contract in `frontend/src/lib/cms/`
