-- Migration: 017_push_tokens
-- Stores Expo push tokens per device so the server can deliver push
-- notifications. A user can have multiple rows (multiple devices); a token
-- is globally unique per install (re-registering repoints it to whichever
-- user is currently logged in on that device).

CREATE TABLE IF NOT EXISTS push_tokens (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token        TEXT NOT NULL UNIQUE,
    platform     VARCHAR(10) NOT NULL,
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
