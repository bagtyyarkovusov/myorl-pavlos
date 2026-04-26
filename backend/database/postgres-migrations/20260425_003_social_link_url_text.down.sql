-- Rehearsal rollback only.
-- Production rollbacks must be new forward migrations.
-- Refuse to shrink if data would be truncated.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM components_items_social_links
    WHERE length(url) > 255
  ) THEN
    RAISE EXCEPTION 'components_items_social_links.url has values longer than 255 characters';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM components_blocks_social_links
    WHERE length(url) > 255
  ) THEN
    RAISE EXCEPTION 'components_blocks_social_links.url has values longer than 255 characters';
  END IF;
END $$;

ALTER TABLE components_items_social_links
  ALTER COLUMN url TYPE varchar(255);

ALTER TABLE components_blocks_social_links
  ALTER COLUMN url TYPE varchar(255);
