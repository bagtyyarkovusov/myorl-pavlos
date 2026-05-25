-- Rehearsal rollback only.
-- Production rollbacks must be new forward migrations.

DROP INDEX IF EXISTS idx_search_query_log_created_at;
DROP INDEX IF EXISTS idx_search_query_log_result_count_created_at;
