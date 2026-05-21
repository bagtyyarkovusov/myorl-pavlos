-- Forward-only data migration.
-- Copy featuredImage / imageCenter from a sibling locale when a page
-- localization has no media linked but another locale of the same document does.
--
-- Fixes bilingual parity gaps from MODX import (e.g. ru/mediteraneo missing
-- logo-mediteraneo.jpg while el/mediteraneo has it).
--
-- Run: python3 tools/migration_runner.py up --target=dev

BEGIN;

CREATE TABLE IF NOT EXISTS _migration_locale_media_sync_20260522 (
  files_related_mph_id INTEGER PRIMARY KEY,
  target_page_id INTEGER NOT NULL,
  document_id VARCHAR(255) NOT NULL,
  target_locale VARCHAR(255) NOT NULL,
  donor_locale VARCHAR(255) NOT NULL,
  field VARCHAR(255) NOT NULL,
  file_id INTEGER NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

WITH media AS (
  SELECT
    fr.related_id AS page_id,
    fr.field,
    fr.file_id
  FROM files_related_mph fr
  WHERE fr.related_type = 'api::page.page'
    AND fr.field IN ('featuredImage', 'imageCenter')
),
targets AS (
  SELECT
    p.id,
    p.document_id,
    p.locale,
    p.slug
  FROM pages p
  WHERE NOT EXISTS (
    SELECT 1
    FROM media m
    WHERE m.page_id = p.id
  )
),
donor_candidates AS (
  SELECT
    t.id AS target_page_id,
    t.document_id,
    t.locale AS target_locale,
    t.slug,
    donor.locale AS donor_locale,
    m.field,
    m.file_id,
    ROW_NUMBER() OVER (
      PARTITION BY t.id
      ORDER BY
        CASE m.field WHEN 'featuredImage' THEN 0 ELSE 1 END,
        CASE donor.locale WHEN 'el' THEN 0 WHEN 'ru' THEN 1 ELSE 2 END,
        donor.id DESC
    ) AS rn
  FROM targets t
  JOIN pages donor
    ON donor.document_id = t.document_id
   AND donor.id <> t.id
  JOIN media m
    ON m.page_id = donor.id
),
inserted AS (
  INSERT INTO files_related_mph (file_id, related_id, related_type, field, "order")
  SELECT
    dc.file_id,
    dc.target_page_id,
    'api::page.page',
    dc.field,
    1.0
  FROM donor_candidates dc
  WHERE dc.rn = 1
    AND NOT EXISTS (
      SELECT 1
      FROM files_related_mph fr
      WHERE fr.related_id = dc.target_page_id
        AND fr.related_type = 'api::page.page'
        AND fr.field = dc.field
    )
  RETURNING id, related_id, field, file_id
)
INSERT INTO _migration_locale_media_sync_20260522 (
  files_related_mph_id,
  target_page_id,
  document_id,
  target_locale,
  donor_locale,
  field,
  file_id
)
SELECT
  inserted.id,
  inserted.related_id,
  dc.document_id,
  dc.target_locale,
  dc.donor_locale,
  inserted.field,
  inserted.file_id
FROM inserted
JOIN donor_candidates dc
  ON dc.target_page_id = inserted.related_id
 AND dc.field = inserted.field
 AND dc.rn = 1;

COMMIT;
