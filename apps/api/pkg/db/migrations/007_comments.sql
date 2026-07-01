-- Migration: 007_comments
-- Creates the comments table for user discussions under movies/TV shows

CREATE TABLE IF NOT EXISTS comments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tmdb_id     INTEGER NOT NULL,
    media_type  VARCHAR(10) NOT NULL CHECK (media_type IN ('movie', 'tv')),
    body        TEXT NOT NULL,
    parent_id   UUID REFERENCES comments(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_content
    ON comments(tmdb_id, media_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_parent
    ON comments(parent_id);

CREATE INDEX IF NOT EXISTS idx_comments_user
    ON comments(user_id);
