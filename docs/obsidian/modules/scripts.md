---
module: Scripts
symbols: ~38 (6 sub-clusters)
cohesion: 73%–100%
source: gitnexus_cypher (cluster="Scripts")
---

# Module: Scripts — `backend/scripts/*.js`

> One-shot Node.js cleanup and verification scripts for the Strapi backend. Not part of the runtime — these are operational tools.

## Code location

- `backend/scripts/` — 5 scripts

## Notable members

| Script | Symbols | Purpose |
| --- | --- | --- |
| `remove-legacy-pageblocks.js` | 14 | Compares old pageblocks content against new sections, reports drift, removes duplicates |
| `clean-contact-pages.js` | 10 | Normalizes contact-page blocks, cleans email markup, removes legacy clinic data |
| `apply-homepage-link-plan.js` | 4 | Applies homepage link repair plan to Strapi content |
| `verify-nextjs-contract.js` | 7 | Verifies frontend contract: checks private keys, legacy duplication, slug collisions |
| `apply-page-model-plan.js` | 3 | Applies page model migration plan |

## Cohesion patterns

| Script | Cohesion | Notes |
| --- | --- | --- |
| `remove-legacy-pageblocks.js` | 98% | Largest script, very self-contained |
| `clean-contact-pages.js` | 89% | Dedicated contact page cleanup |
| `verify-nextjs-contract.js` | 77% | Contract verification with some shared utilities |
| `apply-homepage-link-plan.js` | 73% | Link repair with external dependencies |
| `apply-page-model-plan.js` | 100% | Simple migration script |

## Operational note

These are run-once (or run-on-demand) scripts — they are not part of the Strapi bootstrap lifecycle and not imported by any production code. They exist to perform batch operations (cleanup, verification, link repair) against the Strapi database.

## Related

- [[bootstrap]] — Strapi seeders (runs on every bootstrap, not one-shot)
- [[tools]] — Python tooling for migration and readiness
- [[00-MOC-Backend]] — Strapi entry points
