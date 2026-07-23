-- Migration: 015_list_comments
-- Creates the list_comments table for comments and suggestions on user lists

CREATE TABLE IF NOT EXISTS list_comments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id     UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(10) NOT NULL DEFAULT 'comment' CHECK (type IN ('comment', 'suggestion')),
    body        TEXT NOT NULL,
    parent_id   UUID REFERENCES list_comments(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_list_comments_list
    ON list_comments(list_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_list_comments_parent
    ON list_comments(parent_id);

CREATE INDEX IF NOT EXISTS idx_list_comments_user
    ON list_comments(user_id);
