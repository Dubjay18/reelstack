-- Migration: 002_streaming_cache
-- Caches streaming availability data per (tmdb_id, media_type, country).
-- Avoids hammering Watchmode API on every page load.

CREATE TABLE IF NOT EXISTS streaming_cache (
    tmdb_id     INTEGER     NOT NULL,
    media_type  VARCHAR(10) NOT NULL CHECK (media_type IN ('movie', 'tv')),
    country     VARCHAR(5)  NOT NULL,
    providers   JSONB       NOT NULL DEFAULT '[]',
    cached_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tmdb_id, media_type, country)
);

-- For TTL cleanup job (future): find stale rows efficiently
CREATE INDEX IF NOT EXISTS idx_streaming_cache_cached_at ON streaming_cache(cached_at);
