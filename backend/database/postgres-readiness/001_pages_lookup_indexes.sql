-- Forward-only PostgreSQL hardening migration.
-- Rehearse on PostgreSQL first. Do not run inside a transaction block because of CONCURRENTLY.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pages_locale_slug_published_at
  ON pages (locale, slug, published_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pages_locale_type_layout_published_menu
  ON pages (locale, page_type, layout_variant, published_at, menu_index);
