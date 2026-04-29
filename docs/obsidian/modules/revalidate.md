---
module: Revalidate
symbols: 9 (5 + 4)
cohesion: 73%–86%
source: gitnexus_cypher (cluster="Revalidate")
---

# Module: Revalidate — `/api/revalidate` route handler

> The ISR (Incremental Static Regeneration) webhook endpoint. Strapi calls this route on content change; it invalidates Next.js cached pages.

## Code location

- `frontend/src/app/api/revalidate/route.ts` — all members live here

## Members (9)

| Symbol | Kind | Purpose |
| --- | --- | --- |
| `POST` | Function | Route handler entry point |
| `parsePayload` | Function | Parses and validates the Strapi webhook body |
| `deriveTags` | Function | Maps Strapi model + entry to Next.js cache tags |
| `deriveStrapiWebhookTags` | Function | Derives tags from Strapi webhook event |
| `readBearerSecret` | Function | Extracts bearer token from Authorization header |
| `resolveProvidedSecret` | Function | Validates the bearer token against env |
| `isPageModel` | Function | Checks if the webhook body is a page model |
| `isTagModel` | Function | Checks if the webhook body is a tag model |
| `stringValue` | Function | Casts unknown value to string safely |

## Indexed flows

| Process | Steps | Type |
| --- | --- | --- |
| `POST → _build_url` | 4 | cross_community |
| `POST → NormalizeOrigin` | 3 | cross_community |
| `POST → ReadBearerSecret` | 3 | cross_community |

The flow: `POST` → `parsePayload` → `resolveProvidedSecret` (auth) → `deriveTags` (cache tag computation) → `revalidateTag()` (Next.js ISR).

## Auth model

Bearer token auth via `REVALIDATE_SECRET` env var. The handler reads `Authorization: Bearer <token>`, extracts and validates it inline — no middleware wrapper. The audit previously flagged this as an opportunity for a `withAuth` wrapper pattern.

## Consumers

Zero internal consumers — this is an externally-driven endpoint. Strapi's admin panel posts to it via webhook configuration (`setup_strapi_revalidation_webhook.py`).

## Related

- [[cms]] — gateway layer consumed to derive tags
- [[../processes/revalidate-webhook]] — detailed flow trace
- [[00-MOC-Frontend]] — frontend entry points
