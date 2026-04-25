# ADR-005: Repair Source Parent Integrity Before PostgreSQL Cutover

## Status
Accepted

## Context
The Next.js frontend will build navigation from localized Strapi `parentPage` relations. The live data audit found published Russian pages whose legacy parent was non-root but whose current Strapi parent relation was missing.

The root cause is import ordering: Russian paired pages can be attached before Russian-only parent sections exist, and earlier importer runs did not reconcile parent links after all pages were present.

## Decision
Repair source-parent integrity in the current Strapi dataset before exporting to PostgreSQL.

The repair must use legacy source IDs and checkpoint document IDs as the authority. It must update parent relations only; it must not change page type, layout variant, slugs, or menu order.

Future imports must run a final parent-reconciliation pass after all localized pages exist.

## Alternatives Considered
- Leave orphaned pages for Next.js to tolerate.
  Rejected because navigation would treat real child pages as root pages.
- Repair after PostgreSQL import.
  Rejected because exporting a corrected tree is simpler to verify and easier to roll back.
- Normalize Greek and Russian hierarchies to one shared structure.
  Rejected because several hierarchy differences are source-authentic localized IA.

## Consequences
- Positive: Next.js navigation can trust Strapi parent relations.
- Positive: PostgreSQL rehearsal starts from corrected content.
- Negative: one small data-repair step is required before database cutover.

## Trade-offs
We prioritize source-authentic localized hierarchy over cross-locale symmetry. The frontend gets a clean localized tree, while editorial review remains limited to real IA choices instead of migration omissions.
