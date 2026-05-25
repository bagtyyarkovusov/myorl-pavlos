-- Forward-only production migration.
-- Indexes for /admin/search-analytics aggregation queries.
-- Queries filter on created_at (last 30d) and result_count (= 0 or > 0),
-- grouped by (query, locale).

CREATE INDEX IF NOT EXISTS idx_search_query_log_created_at
  ON search_query_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_query_log_result_count_created_at
  ON search_query_log (result_count, created_at DESC);
