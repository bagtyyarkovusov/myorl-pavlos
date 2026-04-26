-- Forward-only production migration.
-- Run on PostgreSQL only. This is metadata-only for PostgreSQL varchar -> text.

ALTER TABLE components_items_social_links
  ALTER COLUMN url TYPE text;

ALTER TABLE components_blocks_social_links
  ALTER COLUMN url TYPE text;
