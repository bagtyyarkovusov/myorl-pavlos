-- Rehearsal rollback only.
-- Production rollbacks must be new forward migrations.
-- Run on PostgreSQL only. Do not run inside a transaction block.

DROP INDEX CONCURRENTLY IF EXISTS idx_tags_locale_slug;
