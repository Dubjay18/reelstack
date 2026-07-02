-- Migration: 008_watchlist
-- Adds is_watchlist flag to lists — one per user

ALTER TABLE lists ADD COLUMN IF NOT EXISTS is_watchlist BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_lists_watchlist_per_user ON lists(user_id) WHERE is_watchlist = TRUE;
