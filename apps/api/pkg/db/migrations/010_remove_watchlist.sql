-- Migration: 010_remove_watchlist
-- Removes the is_watchlist feature — no more default Watchlist per user

DROP INDEX IF EXISTS idx_lists_watchlist_per_user;

ALTER TABLE lists DROP COLUMN IF EXISTS is_watchlist;
