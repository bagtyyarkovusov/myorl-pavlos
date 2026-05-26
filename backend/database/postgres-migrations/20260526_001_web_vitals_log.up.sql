CREATE TABLE IF NOT EXISTS web_vitals_log (
    id BIGSERIAL PRIMARY KEY,
    metric TEXT NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    path TEXT NOT NULL,
    locale TEXT NOT NULL,
    device_type TEXT NOT NULL,
    session_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
