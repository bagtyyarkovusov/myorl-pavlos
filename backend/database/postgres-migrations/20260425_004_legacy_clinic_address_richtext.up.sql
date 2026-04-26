-- Forward-only production migration.
-- Run on PostgreSQL only. This widens private legacy clinic HTML addresses.

ALTER TABLE components_blocks_clinics
  ALTER COLUMN address TYPE text;
