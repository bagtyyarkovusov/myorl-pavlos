# ADR-009: Use Clinic Maps on Next.js Contact Pages

## Status
Accepted

## Context
ADR-002 deferred maps for v1 because clinic coordinates were absent from the live semantic data. The current Contact page implementation now has enough structured clinic data to render useful map affordances:

- `sections.contact` stores clinic cards in the DynamicZone model from ADR-006.
- Clinic entries can carry optional `latitude` and `longitude` fields.
- Clinic entries also carry `addressHtml`, which can serve as a map query fallback when coordinates are absent.
- The existing DTO seam from ADR-001 can pass optional location data without exposing raw Strapi payloads to the layout.

The previous ADR text now conflicts with the current product direction and code: Contact pages should include maps when the content can support them.

## Decision
Contact pages render clinic cards plus a clinic map when usable clinic location data exists.

Concretely:

- `sections.contact` remains the single CMS section source for Contact page clinic data.
- Clinic cards still require `name` and `addressHtml`.
- `latitude` and `longitude` remain optional DTO fields, but they are no longer ignored by the frontend.
- When coordinates exist, the map query uses the first coordinate-bearing clinic.
- When coordinates are absent but an address exists, the frontend may use the first clinic address as a map query fallback.
- When no usable map query exists, the Contact page falls back to static clinic cards with no map.
- No new backend map-provider field is introduced for this decision.
- `not-found`, `search-results`, and `sitemap` remain frontend-native behaviors as decided in ADR-002.

## Amendment (2026-05-09)

The current implementation renders the clinic map from `globalSettings.address` rather than from clinic coordinates or clinic address fallback as specified above. The coordinate-first logic (`buildContactMapModel`) exists in `frontend/src/lib/contact/contact-render-model.ts` but is consumed only by `StructuredDataComposer.tsx` and tests — not by `ContactPage.tsx` for map rendering.

This is a known gap between the ADR decision and the page renderer. The schema and normalizer are correct; the wiring to the page layout is pending. Until fixed, the effective behavior is:

- Map renders from `globalSettings.address` when present.
- Clinic coordinates are normalized and available in the DTO but not used for map rendering.
- Static clinic cards render correctly regardless of map data availability.

## Alternatives Considered

- Keep ADR-002 as-is and remove map rendering.
  Rejected because the current product direction explicitly includes maps and the code already supports the behavior through the Contact section data.

- Add a dedicated CMS map URL field.
  Rejected for now because the existing clinic coordinates/address data is enough for v1 and avoids schema churn.

- Require coordinates before showing any map.
  Rejected because address fallback still gives users useful visit context while preserving the no-map fallback for incomplete content.

## Consequences

- Positive: Contact pages give users visit context directly on the page.
- Positive: The Contact page behavior remains content-driven through the existing DynamicZone and DTO seams.
- Positive: Missing coordinates no longer block map UX when a clinic address is available.
- Negative: The frontend now owns map query construction.
- Negative: Address-based map fallback depends on provider geocoding quality.

## Trade-offs
We accept a small amount of frontend map-query logic to avoid a new CMS field and keep Contact page rendering tied to existing structured clinic data.

## Related
- [ADR-001](./ADR-001-nextjs-semantic-dto-boundary.md) - Semantic DTO boundary
- [ADR-002](./ADR-002-nextjs-v1-contact-and-system-pages.md) - Previous v1 Contact decision, superseded in part
- [ADR-006](./ADR-006-dynamiczone-single-section-container.md) - DynamicZone section source
