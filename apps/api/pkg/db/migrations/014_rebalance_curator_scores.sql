-- Migration: 014_rebalance_curator_scores
-- Rebalances the curator reputation formula (see 012_curator_scores.sql):
--
-- 1. Followers and saves are externally-validated signals (another real
--    user has to act) and are now weighted more heavily (350 each, up
--    from 250) at the expense of self-directed list/item creation.
-- 2. Creation score no longer lets raw list *count* alone reach the top
--    of its own cap — list-count and item-count are each independently
--    capped (100 + 100), so spamming empty public lists tops out at half
--    of a much smaller 200-point factor instead of nearly maxing a
--    250-point one.
-- 3. Activity score's `last_active` no longer falls back to the account's
--    created_at/updated_at timestamps — a brand-new, zero-content account
--    used to score the maximum activity bonus (250/1000) the instant it
--    signed up. It's now derived only from real list/list-item activity,
--    and its own cap is reduced to 100 since recency alone isn't a
--    curation-quality signal.
--
-- Total cap stays at 1000 (350+350+200+100) so the frontend's hardcoded
-- `score / 1000` progress bar (apps/web leaderboard page) needs no change.

DROP MATERIALIZED VIEW IF EXISTS curator_scores;

CREATE MATERIALIZED VIEW curator_scores AS
WITH user_stats AS (
    SELECT
        u.id AS user_id,
        COALESCE(f.follower_count, 0) AS follower_count,
        COALESCE(s.total_saves, 0) AS total_saves,
        COALESCE(l.public_list_count, 0) AS public_list_count,
        COALESCE(li.total_items, 0) AS total_items,
        GREATEST(la_lists.max_created, la_items.max_added) AS last_active
    FROM users u
    LEFT JOIN (
        SELECT following_id, COUNT(*) AS follower_count
        FROM follows GROUP BY following_id
    ) f ON f.following_id = u.id
    LEFT JOIN (
        SELECT l.user_id, SUM(ls.save_count) AS total_saves
        FROM lists l
        JOIN (
            SELECT list_id, COUNT(*) AS save_count
            FROM saved_lists GROUP BY list_id
        ) ls ON ls.list_id = l.id
        GROUP BY l.user_id
    ) s ON s.user_id = u.id
    LEFT JOIN (
        SELECT user_id, COUNT(*) AS public_list_count
        FROM lists WHERE is_public = TRUE
        GROUP BY user_id
    ) l ON l.user_id = u.id
    LEFT JOIN (
        SELECT l.user_id, COUNT(*) AS total_items
        FROM list_items li
        JOIN lists l ON l.id = li.list_id
        WHERE l.is_public = TRUE
        GROUP BY l.user_id
    ) li ON li.user_id = u.id
    LEFT JOIN (
        SELECT user_id, MAX(created_at) AS max_created
        FROM lists GROUP BY user_id
    ) la_lists ON la_lists.user_id = u.id
    LEFT JOIN (
        SELECT l.user_id, MAX(li.added_at) AS max_added
        FROM list_items li JOIN lists l ON l.id = li.list_id
        GROUP BY l.user_id
    ) la_items ON la_items.user_id = u.id
),
scored AS (
    SELECT
        user_id,
        LEAST(350, follower_count * 7) AS follower_score,
        LEAST(350, total_saves * 14) AS saves_score,
        LEAST(100, public_list_count * 10) + LEAST(100, total_items) AS creation_score,
        CASE
            WHEN last_active IS NULL THEN 0
            WHEN last_active > NOW() - INTERVAL '7 days' THEN 100
            WHEN last_active > NOW() - INTERVAL '30 days' THEN 75
            WHEN last_active > NOW() - INTERVAL '90 days' THEN 50
            WHEN last_active > NOW() - INTERVAL '180 days' THEN 25
            WHEN last_active > NOW() - INTERVAL '365 days' THEN 10
            ELSE 0
        END AS activity_score
    FROM user_stats
)
SELECT
    user_id,
    follower_score + saves_score + creation_score + activity_score AS score,
    follower_score,
    saves_score,
    creation_score,
    activity_score,
    NOW() AS computed_at
FROM scored;

CREATE UNIQUE INDEX IF NOT EXISTS idx_curator_scores_user_id ON curator_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_curator_scores_score ON curator_scores(score DESC);
