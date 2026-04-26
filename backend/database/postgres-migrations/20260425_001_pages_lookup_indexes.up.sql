-- Forward-only production migration.
-- Run on PostgreSQL only. Do not run inside a transaction block.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pages_published_locale_slug
  ON pages (locale, slug)
  WHERE published_at IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pages_published_locale_menu_slug
  ON pages (locale, menu_index, slug)
  WHERE published_at IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pages_published_locale_type_layout_menu_slug
  ON pages (locale, page_type, layout_variant, menu_index, slug)
  WHERE published_at IS NOT NULL;
