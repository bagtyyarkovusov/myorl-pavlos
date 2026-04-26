# ADR-003: Use Forward-Only PostgreSQL Hardening Migrations After Local SQLite Rehearsal

## Status
Accepted

## Context
The live rehearsal environment uses SQLite, which is acceptable for local verification but does not reflect the shared or production deployment posture. Current route lookup and listing queries still full-scan the `pages` table because the necessary lookup indexes are missing.

We also need to keep schema migrations and data cleanup separate.

## Decision
Prepare forward-only PostgreSQL hardening migrations and apply them only after the content model is rehearsed locally.

The rollout path is:

1. keep SQLite for local rehearsal only
2. run content cleanup and manifest review locally
3. rehearse on PostgreSQL with forward-only index migrations
4. apply production changes only after query-plan verification

The initial SQL artifacts cover partial indexes over published pages plus the
localized tag lookup:

- `pages(locale, slug) WHERE published_at IS NOT NULL`
- `pages(locale, menu_index, slug) WHERE published_at IS NOT NULL`
- `pages(locale, page_type, layout_variant, menu_index, slug) WHERE published_at IS NOT NULL`
- `tags(locale, slug)` because live tag rows are localized and `slug` alone has duplicate values across locales

## Alternatives Considered
- Add SQLite-only indexes and treat that as production readiness.
  Rejected because it does not validate the real deployment target.
- Mix DDL and data cleanup into one migration step.
  Rejected because it makes rollback and rehearsal harder.
- Index `tags(slug)` only.
  Rejected because the current localized tag rows reuse canonical slugs across `el` and `ru`.

## Consequences
- Positive: production hardening stays explicit and reversible.
- Positive: query tuning is separated from content cleanup.
- Negative: one more rehearsal step is required before rollout.

## Trade-offs
This slows the path to production slightly, but it reduces deployment risk and keeps migration history clean.
