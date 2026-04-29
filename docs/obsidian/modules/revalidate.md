---
module: Revalidate
symbols: 9
cohesion: 74%
source: gitnexus://repo/gemini-export/cluster/Revalidate
route: /api/revalidate
---

# Module: Revalidate — `/api/revalidate` route handler

> Single Next.js route file decomposed into 9 named helpers. Receives Strapi webhooks, authenticates, derives Next.js cache tags, calls `revalidateTag`.

## Code location

- [../../../frontend/src/app/api/revalidate/route.ts](../../../frontend/src/app/api/revalidate/route.ts)

## Members (9)

All in `route.ts`:

| Symbol | Role |
| --- | --- |
| `POST` | HTTP entry — only public export besides defaults |
| `parsePayload` | Parses Strapi webhook body |
| `resolveProvidedSecret`, `readBearerSecret` | Inline auth (no middleware) |
| `deriveTags`, `deriveStrapiWebhookTags` | Map model + locale → cache tags |
| `isPageModel`, `isTagModel` | Model-name guards |
| `stringValue` | Defensive string coercion |

## Indexed flows (6)

From `gitnexus_route_map`:

- `POST → IsPageModel`
- `POST → StringValue`
- `POST → Add`
- `POST → IsTagModel`
- `POST → NormalizeOrigin`
- `POST → ReadBearerSecret`

See [[../processes/revalidate-webhook]] for the full trace.

## Auth model

There is **no middleware** wrapping this route. Bearer-secret auth is handled inline by `resolveProvidedSecret` + `readBearerSecret`. If you ever introduce shared `withAuth`/`withRateLimit` wrappers, this is the natural first migration target.

## Consumers

`route_map` reports 0 internal consumers — driven externally by the Strapi revalidation webhook configured in [../../../tools/setup_strapi_revalidation_webhook.py](../../../tools/setup_strapi_revalidation_webhook.py).

## Cohesion: 74%

Leaks are mostly edges into `Cms` (`getCmsConfig` to read the secret + origin) and Next.js `revalidateTag` import.

## Related

- [[cms]] — `getCmsConfig` consumed for auth + origin
- [[tools]] — `setup_strapi_revalidation_webhook.py` configures the producer
- [[../processes/revalidate-webhook]]
