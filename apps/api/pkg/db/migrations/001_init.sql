-- Migration: 001_init
-- Creates core tables: users, lists, list_items, follows

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username    VARCHAR(50)  UNIQUE NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT,                           -- NULL for OAuth-only users
    avatar_url  TEXT,
    bio         VARCHAR(160),
    google_id   VARCHAR(255) UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email    ON users(email);

-- ── Lists ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lists (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    is_public   BOOLEAN NOT NULL DEFAULT TRUE,
    slug        VARCHAR(120) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_lists_user_id  ON lists(user_id);
CREATE INDEX IF NOT EXISTS idx_lists_slug     ON lists(slug);
CREATE INDEX IF NOT EXISTS idx_lists_public   ON lists(is_public) WHERE is_public = TRUE;

-- ── List Items ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS list_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id     UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    tmdb_id     INTEGER NOT NULL,
    media_type  VARCHAR(10) NOT NULL CHECK (media_type IN ('movie', 'tv')),
    watched     BOOLEAN NOT NULL DEFAULT FALSE,
    watched_at  TIMESTAMPTZ,
    notes       TEXT,
    position    INTEGER NOT NULL DEFAULT 0,       -- for drag-to-reorder
    added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (list_id, tmdb_id, media_type)
);

CREATE INDEX IF NOT EXISTS idx_list_items_list_id ON list_items(list_id);
CREATE INDEX IF NOT EXISTS idx_list_items_tmdb_id ON list_items(tmdb_id);

-- ── Follows (data model present, UI in V2) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS follows (
    follower_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
