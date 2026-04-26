-- Forward-only production migration.
-- Run on PostgreSQL only. Do not run inside a transaction block.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tags_locale_slug
  ON tags (locale, slug);
