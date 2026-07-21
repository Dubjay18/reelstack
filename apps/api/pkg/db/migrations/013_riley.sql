-- Riley AI agent: generated artifacts (news digest + curated lists).
-- Each cron run inserts a fresh row per kind; reads take the latest per kind.
CREATE TABLE IF NOT EXISTS riley_artifacts (
    id         BIGSERIAL PRIMARY KEY,
    kind       TEXT NOT NULL, -- 'digest' | 'top_movies' | 'top_series' | 'top_ten'
    payload    JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_riley_artifacts_kind_created
    ON riley_artifacts (kind, created_at DESC);
