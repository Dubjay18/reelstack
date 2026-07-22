package curators

import (
	"context"

	"github.com/jmoiron/sqlx"
)

type ICuratorRepository interface {
	RefreshView(ctx context.Context) error
	GetLeaderboard(ctx context.Context, limit, offset int) ([]LeaderboardEntry, error)
	GetScore(ctx context.Context, userID string) (*CuratorScore, error)
	GetScoreWithRank(ctx context.Context, userID string) (*CuratorScore, *int, error)
}

type CuratorRepository struct {
	db *sqlx.DB
}

func NewCuratorRepository(db *sqlx.DB) *CuratorRepository {
	return &CuratorRepository{db: db}
}

func (r *CuratorRepository) RefreshView(ctx context.Context) error {
	_, err := r.db.ExecContext(ctx, "REFRESH MATERIALIZED VIEW CONCURRENTLY curator_scores")
	return err
}

func (r *CuratorRepository) GetLeaderboard(ctx context.Context, limit, offset int) ([]LeaderboardEntry, error) {
	query := `
		SELECT
			cs.user_id,
			u.username,
			u.avatar_url,
			u.bio,
			cs.score,
			cs.computed_at,
			RANK() OVER (ORDER BY cs.score DESC) AS rank,
			COALESCE(fc.follower_count, 0) AS followers_count,
			COALESCE(lc.list_count, 0) AS list_count
		FROM curator_scores cs
		JOIN users u ON u.id = cs.user_id
		LEFT JOIN (
			SELECT following_id, COUNT(*) AS follower_count
			FROM follows GROUP BY following_id
		) fc ON fc.following_id = cs.user_id
		LEFT JOIN (
			SELECT user_id, COUNT(*) AS list_count
			FROM lists WHERE is_public = TRUE
			GROUP BY user_id
		) lc ON lc.user_id = cs.user_id
		ORDER BY cs.score DESC
		LIMIT $1 OFFSET $2
	`
	var entries []LeaderboardEntry
	if err := r.db.SelectContext(ctx, &entries, query, limit, offset); err != nil {
		return nil, err
	}
	return entries, nil
}

func (r *CuratorRepository) GetScore(ctx context.Context, userID string) (*CuratorScore, error) {
	query := `
		SELECT user_id, score, follower_score, saves_score, creation_score, activity_score, computed_at
		FROM curator_scores
		WHERE user_id = $1
	`
	var score CuratorScore
	if err := r.db.GetContext(ctx, &score, query, userID); err != nil {
		return nil, err
	}
	return &score, nil
}

func (r *CuratorRepository) GetScoreWithRank(ctx context.Context, userID string) (*CuratorScore, *int, error) {
	score, err := r.GetScore(ctx, userID)
	if err != nil {
		return nil, nil, err
	}

	var rank int
	rankQuery := `SELECT COUNT(*) + 1 FROM curator_scores WHERE score > $1`
	if err := r.db.GetContext(ctx, &rank, rankQuery, score.Score); err != nil {
		return score, nil, nil
	}

	return score, &rank, nil
}
