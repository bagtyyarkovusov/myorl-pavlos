-- Rehearsal/dev rollback only.
-- Removes media links created by 20260522_001_sync_locale_page_media.up.sql

BEGIN;

DELETE FROM files_related_mph fr
USING _migration_locale_media_sync_20260522 audit
WHERE fr.id = audit.files_related_mph_id;

DROP TABLE IF EXISTS _migration_locale_media_sync_20260522;

COMMIT;
