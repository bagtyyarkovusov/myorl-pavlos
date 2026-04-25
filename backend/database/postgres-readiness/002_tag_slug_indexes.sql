-- Forward-only PostgreSQL hardening migration.
-- Do not run inside a transaction block because of CONCURRENTLY.

-- Tag slugs are canonical across translation pairs but live rows are localized,
-- so `(locale, slug)` is the lookup-safe shape for current REST filters.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tags_locale_slug
  ON tags (locale, slug);
