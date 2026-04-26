-- Rehearsal rollback only.
-- Production rollbacks must be new forward migrations.
-- Refuse to shrink if data would be truncated.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM components_blocks_clinics
    WHERE length(address) > 255
  ) THEN
    RAISE EXCEPTION 'components_blocks_clinics.address has values longer than 255 characters';
  END IF;
END $$;

ALTER TABLE components_blocks_clinics
  ALTER COLUMN address TYPE varchar(255);
