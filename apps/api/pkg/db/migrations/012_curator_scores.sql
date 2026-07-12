-- Migration: 012_curator_scores
-- Creates a materialized view for curator reputation scores.
-- Refreshed via POST /api/v1/cron/scores (every 6 hours).

DROP MATERIALIZED VIEW IF EXISTS curator_scores;

CREATE MATERIALIZED VIEW curator_scores AS
WITH user_stats AS (
    SELECT
        u.id AS user_id,
        COALESCE(f.follower_count, 0) AS follower_count,
        COALESCE(s.total_saves, 0) AS total_saves,
        COALESCE(l.public_list_count, 0) AS public_list_count,
        COALESCE(li.total_items, 0) AS total_items,
        GREATEST(
            u.updated_at,
            u.created_at,
            la_lists.max_created,
            la_items.max_added
        ) AS last_active
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
        LEAST(250, follower_count * 5) AS follower_score,
        LEAST(250, total_saves * 10) AS saves_score,
        LEAST(250, (public_list_count * 20) + (total_items * 2)) AS creation_score,
        LEAST(250, CASE
            WHEN last_active > NOW() - INTERVAL '7 days' THEN 250
            WHEN last_active > NOW() - INTERVAL '30 days' THEN 200
            WHEN last_active > NOW() - INTERVAL '90 days' THEN 150
            WHEN last_active > NOW() - INTERVAL '180 days' THEN 100
            WHEN last_active > NOW() - INTERVAL '365 days' THEN 50
            ELSE 0
        END) AS activity_score
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
