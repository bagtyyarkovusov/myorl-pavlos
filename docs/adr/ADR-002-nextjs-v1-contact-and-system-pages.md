# ADR-002: Launch Contact Pages Without Maps and Handle Core System Pages in Next.js

## Status
Accepted; superseded in part by ADR-009

## Context
The current contact content is strong enough for static cards, but clinic coordinates are still absent from the live semantic data. At the same time, `404`, `search-results`, and `sitemap` are layout behaviors that fit better as frontend-native routes than as CMS-authored page bodies.

The social-link component also lacks usable icon metadata, and one live Russian link still targets legacy Google Plus.

## Decision
For v1:

- render `contact` pages as static contact cards only
- require `name` and `addressHtml` for clinic cards
- treat latitude and longitude as optional and ignore them in the DTO
- derive social platform in Next.js instead of using backend `icon`
- suppress any unresolved social item, including the current Google Plus link
- treat `not-found`, `search-results`, and `sitemap` as frontend-native behaviors

## Alternatives Considered
- Add new backend fields for social platform and map fallbacks before the frontend starts.
  Rejected because it adds schema churn without solving the immediate launch path.
- Block v1 until coordinates are backfilled.
  Rejected because maps are not required for the content-first release.

## Consequences
- Positive: removes current map and social-icon gaps from the critical path.
- Positive: makes the v1 frontend simpler and more predictable.
- Negative: map UX is postponed to a later phase.
- Negative: the unresolved legacy social entry is intentionally hidden until reviewed.

## Trade-offs
This keeps the launch focused on stable content delivery instead of waiting for optional feature parity.

## Superseded Scope
ADR-009 supersedes the contact-map portion of this decision. Contact pages now intentionally support clinic maps when enough clinic location data exists. The system-page and social-link decisions in this ADR remain accepted.
