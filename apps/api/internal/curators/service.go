package curators

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"
	"time"
)

type ICuratorService interface {
	RefreshScores(ctx context.Context) error
	GetLeaderboard(ctx context.Context, limit, offset int) ([]LeaderboardEntry, time.Time, error)
	GetUserScore(ctx context.Context, userID string) (*CuratorScore, error)
	GetUserScoreWithRank(ctx context.Context, userID string) (*CuratorScore, *int, error)
}

type CuratorService struct {
	repo ICuratorRepository
}

func NewCuratorService(repo ICuratorRepository) *CuratorService {
	return &CuratorService{repo: repo}
}

func (s *CuratorService) RefreshScores(ctx context.Context) error {
	return s.repo.RefreshView(ctx)
}

func (s *CuratorService) GetLeaderboard(ctx context.Context, limit, offset int) ([]LeaderboardEntry, time.Time, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	entries, err := s.repo.GetLeaderboard(ctx, limit, offset)
	if err != nil {
		return nil, time.Time{}, err
	}

	// Every row shares the same computed_at (one materialized view refresh);
	// the query now selects it directly, so no second round-trip is needed.
	var computedAt time.Time
	if len(entries) > 0 {
		computedAt = entries[0].ComputedAt
	}

	return entries, computedAt, nil
}

func (s *CuratorService) GetUserScore(ctx context.Context, userID string) (*CuratorScore, error) {
	score, err := s.repo.GetScore(ctx, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			// User has no score row yet (e.g. materialized view hasn't
			// refreshed since they signed up) — that's a default zero, not a failure.
			return &CuratorScore{}, nil
		}
		slog.Error("failed to get curator score", "error", err, "user_id", userID)
		return nil, err
	}
	return score, nil
}

func (s *CuratorService) GetUserScoreWithRank(ctx context.Context, userID string) (*CuratorScore, *int, error) {
	score, rank, err := s.repo.GetScoreWithRank(ctx, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return &CuratorScore{}, nil, nil
		}
		slog.Error("failed to get curator score with rank", "error", err, "user_id", userID)
		return nil, nil, err
	}
	return score, rank, nil
}
