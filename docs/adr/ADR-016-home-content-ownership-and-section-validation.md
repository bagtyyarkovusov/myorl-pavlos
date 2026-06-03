# ADR-016: Home Content Ownership and Section Validation

**Status:** Accepted

**Date:** 2026-06-03

The locale **Canonical Home** remains the Strapi `index` **Page**, and its patient-facing homepage copy is owned by Strapi sections rather than frontend i18n fallbacks. Legacy MODX is the homepage content specification, current client corrections take precedence over legacy data, and backfill runs through a scripted dry-run/apply plan that fills missing fields and reports conflicts before overwriting existing Strapi content.

## Decision

- Add home-specific section components for editor-owned homepage slots, starting with **Home Hero Section**, **Home Testimonials Teaser**, and **Home Notice Section**.
- Keep ADR-006's single shared `pageSections` DynamicZone instead of splitting home/article/contact section fields.
- Enforce layout-specific correctness with validation rules: home pages may use the approved home section set, while invalid section types are blocked on save.
- Remove hard-coded patient-facing homepage fallback copy from the frontend after seeding Strapi values; keep UI labels and controls in i18n.
- Keep **Home Quick Access Cards** derived from target page navigation label/title and excerpt; do not use frontend fallback descriptions.
- Keep social links in **Global Settings**; audit and remove the legacy `sections.social-links` page section after duplicate data is handled.

## Considered Options

- **Separate DynamicZone fields per page layout.** Rejected for now because it reverses ADR-006's unified section model and requires a larger schema/data migration.
- **One generic home-teaser component with variants.** Rejected because explicit home section names are clearer for editors and less ambiguous in the frontend.
- **Manual Strapi editing.** Rejected because the legacy MODX source exists and a scripted plan gives repeatable dev/staging/prod rollout with conflict visibility.

## Consequences

- Editors get clear home-specific blocks without losing the shared section model used across the rest of the site.
- Homepage migration must inspect MODX data and current Strapi values before applying changes.
- Validation becomes the guardrail for editor mistakes that Strapi's shared DynamicZone UI cannot hide per `layoutVariant` by default.
