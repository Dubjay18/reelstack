package curators

import (
	"context"
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

	// Get the computed_at from any row to report staleness
	var computedAt time.Time
	if len(entries) > 0 {
		score, err := s.repo.GetScore(ctx, entries[0].UserID.String())
		if err == nil {
			computedAt = score.ComputedAt
		}
	}

	return entries, computedAt, nil
}

func (s *CuratorService) GetUserScore(ctx context.Context, userID string) (*CuratorScore, error) {
	score, err := s.repo.GetScore(ctx, userID)
	if err != nil {
		// Return default zero score for users without a row
		return &CuratorScore{}, nil
	}
	return score, nil
}

func (s *CuratorService) GetUserScoreWithRank(ctx context.Context, userID string) (*CuratorScore, *int, error) {
	score, rank, err := s.repo.GetScoreWithRank(ctx, userID)
	if err != nil {
		// Return default zero score for users without a row
		return &CuratorScore{}, nil, nil
	}
	return score, rank, nil
}
