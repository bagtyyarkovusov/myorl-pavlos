-- Forward-only production migration.

CREATE TABLE IF NOT EXISTS search_query_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT NOT NULL,
    locale TEXT NOT NULL,
    result_count INTEGER NOT NULL,
    session_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
