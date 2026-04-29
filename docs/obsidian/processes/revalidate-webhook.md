---
process: POST /api/revalidate
route: /api/revalidate
source: gitnexus_route_map + cluster/Revalidate
---

# Process: `POST /api/revalidate`

> Strapi → Next.js cache invalidation. External webhook posts here, the route authenticates, derives Next.js cache tags, calls `revalidateTag`.

## Indexed flows

`route_map` reports 6 flows originating at `POST` in `frontend/src/app/api/revalidate/route.ts`:

| Flow | What it traces |
| --- | --- |
| `POST → ReadBearerSecret` | Auth — read `Authorization: Bearer …` |
| `POST → NormalizeOrigin` | Reads `getCmsConfig` to validate caller origin |
| `POST → IsPageModel` | Strapi model is `api::page.page` |
| `POST → IsTagModel` | Strapi model is `api::tag.tag` |
| `POST → StringValue` | Defensive coercion of webhook fields |
| `POST → Add` | Tag accumulation into the revalidation set |

## Conceptual flow (rebuilt from members)

```
POST(req)
  → readBearerSecret(req)
  → resolveProvidedSecret(req)        // env → expected secret
  → parsePayload(req)
  → isPageModel(payload) || isTagModel(payload)
  → deriveTags(payload) / deriveStrapiWebhookTags(payload)
  → revalidateTag(tag)  // Next.js
```

(Reconstructed from cluster members; not a direct GitNexus trace because `POST` originates multiple short flows rather than a single linear one.)

## Auth

Inline. No middleware wrapper detected by the indexer. `resolveProvidedSecret` reads the expected secret from env (via `getCmsConfig`); `readBearerSecret` extracts the presented secret from the request header.

If the secret is wrong/missing, `POST` returns 401 before any other helper runs.

## Producer side

The producing webhook is registered against Strapi by [../../tools/setup_strapi_revalidation_webhook.py](../../tools/setup_strapi_revalidation_webhook.py). That script's `webhook_headers` helper sets the bearer this route expects.

## Active risk (2026-04-30)

`POST` and its helpers are not in the current diff, but `getCmsConfig` (consumed for origin + secret) **is**. If `getCmsConfig`'s return shape changes, this route breaks at step 1 (`readBearerSecret`).

## Related

- [[../modules/revalidate]] — module wiki for this route
- [[../modules/cms]] — `getCmsConfig` source of truth
- [[../modules/tools]] — `setup_strapi_revalidation_webhook.py` configures the producer
