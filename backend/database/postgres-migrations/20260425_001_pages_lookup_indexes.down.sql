-- Rehearsal rollback only.
-- Production rollbacks must be new forward migrations.
-- Run on PostgreSQL only. Do not run inside a transaction block.

DROP INDEX CONCURRENTLY IF EXISTS idx_pages_published_locale_type_layout_menu_slug;
DROP INDEX CONCURRENTLY IF EXISTS idx_pages_published_locale_menu_slug;
DROP INDEX CONCURRENTLY IF EXISTS idx_pages_published_locale_slug;
