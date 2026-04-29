---
process: POST /api/revalidate
type: cross_community
source: gitnexus_cypher + context (process="POST → *")
---

# Process: `POST /api/revalidate`

> The ISR (Incremental Static Regeneration) webhook endpoint. Strapi calls this route on content change; it invalidates Next.js cached pages.

## Indexed flows

| Process | Steps | Type |
| --- | --- | --- |
| `POST → _build_url` | 4 | cross_community |
| `POST → NormalizeOrigin` | 3 | cross_community |
| `POST → ReadBearerSecret` | 3 | cross_community |

## Conceptual flow (rebuilt from members)

```
POST (route.ts:19)
  ├─ parsePayload(body)
  │    └─ Validates JSON body has model + entry fields
  ├─ resolveProvidedSecret(headers)
  │    └─ readBearerSecret(authHeader)
  │         └─ Extracts token from "Authorization: Bearer <token>"
  │         └─ Compares against REVALIDATE_SECRET env var
  ├─ deriveTags(model, entry)
  │    ├─ isPageModel(model) → `page-{slug}-{locale}` tags
  │    └─ isTagModel(model) → `tag-{slug}-{locale}` tags
  └─ revalidateTag(tags...) [Next.js ISR API]
       └─ Invalidates cached pages matching those tags
```

## Auth

Bearer token auth via `REVALIDATE_SECRET` env var. The handler reads the `Authorization` header, extracts and validates the token inline — no middleware wrapper.

## Producer side

Strapi sends POST requests to this endpoint via its admin webhook configuration. The webhook payload is:
```json
{
  "model": "page" | "tag",
  "entry": { "slug": "...", "locale": "..." }
}
```

## Consumers

Zero internal consumers — this is an externally-driven endpoint (Strapi webhook + monitoring probes for health).

## Related

- [[../modules/revalidate]] — module overview
- [[cms-gateway-pipeline]] — gateway dependency
- [[page-rendering]] — the pages being invalidated
- [[00-MOC-Frontend]]
