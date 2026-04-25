# ADR-001: Use a Semantic DTO Boundary Between Next.js and Strapi

## Status
Accepted

## Context
The populated Strapi system now exposes a semantic content model built around `pageType`, `layoutVariant`, and named section fields. Legacy migration fields such as `templateId`, `pageBlocks`, and `legacySourceResourceId` still exist in storage for safety, but they are not the right long-term contract for a new Next.js App Router frontend.

The frontend also needs one place to absorb backend-specific details:

- locale-scoped navigation
- semantic section normalization
- social platform derivation
- contact-page filtering rules
- frontend-native handling for specific `system` layouts

## Decision
Build a server-side DTO layer in Next.js and treat it as the only boundary that understands raw Strapi payloads.

The DTO boundary must:

- read only the supported public contract
- ignore `templateId`, `pageBlocks`, and `legacySourceResourceId`
- normalize structured page data by `pageType`
- derive social platform from URL and label
- build navigation per locale from localized `parentPage`, `menuIndex`, `isFolder`, and `hideFromMenu`

## Alternatives Considered
- Render directly from raw Strapi payloads.
  Rejected because it would leak legacy migration fields into frontend code and multiply shape handling across templates.
- De-localize structural fields first, then build the frontend.
  Rejected because live bilingual drift still exists and would freeze incorrect structure into the contract.

## Consequences
- Positive: frontend templates stay stable while backend cleanup continues.
- Positive: v1 can ship against semantic sections without waiting for `pageBlocks` removal.
- Negative: one more mapping layer must be maintained.
- Negative: DTO tests become important once the Next.js app exists.

## Trade-offs
This choice adds an explicit adapter layer, but it isolates current backend cleanup work from the frontend implementation and makes the rollout safer.
