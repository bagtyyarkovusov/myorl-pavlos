---
module: Scripts
symbols: 42
cohesion: 86%
source: gitnexus://repo/gemini-export/cluster/Scripts
---

# Module: Scripts — `backend/scripts/*.js`

> Node.js one-off cleanup tasks that talk to Strapi over its REST/admin API. Run manually, not on a schedule.

## Code location

- [../../../backend/scripts/](../../../backend/scripts/)

## Notable members

| Symbol | File | Purpose |
| --- | --- | --- |
| `main`, `parseArgs`, `applySlugUpdates` | `apply-homepage-link-plan.js` | Apply pre-computed homepage link rewrites |
| `main`, `parseArgs` | `apply-page-model-plan.js` | Apply page-model migration plan |
| `main`, `fetchDocument`, `compareTabs`, `compareFaq`, `compareContact`, `compareDocument`, `findSection`, `sleep`, `hasPublishedDocument` | `remove-legacy-pageblocks.js` | Diff + delete legacy `pageBlocks` |
| `main`, `extractEmail`, `buildEmailMarkup`, `fetchContactDocument`, `normalizeClinics`, `normalizeContactDetails`, `hasPublishedDocument` | `clean-contact-pages.js` | Normalize Contact page entries |
| `slugCollisions` | `verify-nextjs-contract.js` | Sanity-check Strapi slugs against Next.js routes |

## Cohesion: 86%

High — these scripts share helpers (`parseArgs`, `hasPublishedDocument`) but rarely import each other; they each independently call Strapi.

## Operational note

These scripts are **destructive** in some cases (`remove-legacy-pageblocks`, `clean-contact-pages`). They are not gated by an ADR; treat them as one-shots with `--dry-run` flags where present. Verify against staging before running on prod data.

## Related

- [[bootstrap]] — Strapi boot-time seeders (different concern)
- [[tools]] — Python migration tooling
- [[../00-MOC-Backend]]
