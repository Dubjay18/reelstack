-- Migration: 003_follows
-- Placeholder — follows table created in 001_init.
-- Reserved for future social graph indexes if needed.

-- Example future index for taste-compatibility queries:
-- CREATE INDEX IF NOT EXISTS idx_follows_composite ON follows(follower_id, following_id, created_at);

SELECT 1; -- no-op
