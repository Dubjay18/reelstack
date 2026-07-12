package curators_test

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"github.com/Dubjay18/reelstack/api/internal/curators"
	"github.com/google/uuid"
)

// ── Mock repository ──────────────────────────────────────────────────────────

type mockRepo struct {
	refreshFn    func(ctx context.Context) error
	leaderboardFn func(ctx context.Context, limit, offset int) ([]curators.LeaderboardEntry, error)
	scoreFn      func(ctx context.Context, userID string) (*curators.CuratorScore, error)
	scoreRankFn  func(ctx context.Context, userID string) (*curators.CuratorScore, *int, error)
}

func (m *mockRepo) RefreshView(ctx context.Context) error {
	if m.refreshFn != nil {
		return m.refreshFn(ctx)
	}
	return nil
}

func (m *mockRepo) GetLeaderboard(ctx context.Context, limit, offset int) ([]curators.LeaderboardEntry, error) {
	if m.leaderboardFn != nil {
		return m.leaderboardFn(ctx, limit, offset)
	}
	return nil, nil
}

func (m *mockRepo) GetScore(ctx context.Context, userID string) (*curators.CuratorScore, error) {
	if m.scoreFn != nil {
		return m.scoreFn(ctx, userID)
	}
	return nil, nil
}

func (m *mockRepo) GetScoreWithRank(ctx context.Context, userID string) (*curators.CuratorScore, *int, error) {
	if m.scoreRankFn != nil {
		return m.scoreRankFn(ctx, userID)
	}
	return nil, nil, nil
}

// ── Tests ────────────────────────────────────────────────────────────────────

func TestRefreshScores(t *testing.T) {
	called := false
	repo := &mockRepo{
		refreshFn: func(ctx context.Context) error {
			called = true
			return nil
		},
	}
	svc := curators.NewCuratorService(repo)

	err := svc.RefreshScores(context.Background())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if !called {
		t.Fatal("expected RefreshView to be called")
	}
}

func TestGetLeaderboard_DefaultParams(t *testing.T) {
	repo := &mockRepo{
		leaderboardFn: func(ctx context.Context, limit, offset int) ([]curators.LeaderboardEntry, error) {
			if limit != 20 {
				t.Errorf("expected default limit 20, got %d", limit)
			}
			if offset != 0 {
				t.Errorf("expected default offset 0, got %d", offset)
			}
			return nil, nil
		},
	}
	svc := curators.NewCuratorService(repo)

	_, _, err := svc.GetLeaderboard(context.Background(), 0, -1)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestGetLeaderboard_CapsLimit(t *testing.T) {
	repo := &mockRepo{
		leaderboardFn: func(ctx context.Context, limit, offset int) ([]curators.LeaderboardEntry, error) {
			if limit != 20 {
				t.Errorf("expected capped limit 20, got %d", limit)
			}
			return nil, nil
		},
	}
	svc := curators.NewCuratorService(repo)

	_, _, err := svc.GetLeaderboard(context.Background(), 500, 0)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestGetLeaderboard_ReturnsEntries(t *testing.T) {
	now := time.Now()
	entries := []curators.LeaderboardEntry{
		{
			UserID:   uuid.New(),
			Username: "alice",
			Score:    850,
			Rank:     1,
		},
		{
			UserID:   uuid.New(),
			Username: "bob",
			Score:    720,
			Rank:     2,
		},
	}

	repo := &mockRepo{
		leaderboardFn: func(ctx context.Context, limit, offset int) ([]curators.LeaderboardEntry, error) {
			return entries, nil
		},
		scoreFn: func(ctx context.Context, userID string) (*curators.CuratorScore, error) {
			return &curators.CuratorScore{ComputedAt: now}, nil
		},
	}
	svc := curators.NewCuratorService(repo)

	result, computedAt, err := svc.GetLeaderboard(context.Background(), 20, 0)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(result) != 2 {
		t.Fatalf("expected 2 entries, got %d", len(result))
	}
	if result[0].Username != "alice" {
		t.Errorf("expected first entry to be alice, got %s", result[0].Username)
	}
	if computedAt.IsZero() {
		t.Error("expected non-zero computed_at")
	}
}

func TestGetLeaderboard_Empty(t *testing.T) {
	repo := &mockRepo{
		leaderboardFn: func(ctx context.Context, limit, offset int) ([]curators.LeaderboardEntry, error) {
			return []curators.LeaderboardEntry{}, nil
		},
	}
	svc := curators.NewCuratorService(repo)

	result, _, err := svc.GetLeaderboard(context.Background(), 20, 0)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(result) != 0 {
		t.Errorf("expected 0 entries, got %d", len(result))
	}
}

func TestGetUserScore_Exists(t *testing.T) {
	userID := uuid.New()
	expected := &curators.CuratorScore{
		UserID:        userID,
		Score:         850,
		FollowerScore: 200,
		SavesScore:    150,
		CreationScore: 250,
		ActivityScore: 250,
	}

	repo := &mockRepo{
		scoreFn: func(ctx context.Context, uid string) (*curators.CuratorScore, error) {
			return expected, nil
		},
	}
	svc := curators.NewCuratorService(repo)

	score, err := svc.GetUserScore(context.Background(), userID.String())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if score.Score != 850 {
		t.Errorf("expected score 850, got %d", score.Score)
	}
}

func TestGetUserScore_NoScore(t *testing.T) {
	repo := &mockRepo{
		scoreFn: func(ctx context.Context, uid string) (*curators.CuratorScore, error) {
			return nil, sql.ErrNoRows
		},
	}
	svc := curators.NewCuratorService(repo)

	score, err := svc.GetUserScore(context.Background(), uuid.New().String())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if score == nil {
		t.Fatal("expected non-nil score (default zero)")
	}
	if score.Score != 0 {
		t.Errorf("expected default score 0, got %d", score.Score)
	}
}

func TestGetUserScoreWithRank_Exists(t *testing.T) {
	userID := uuid.New()
	expectedScore := &curators.CuratorScore{
		UserID: userID,
		Score:  850,
	}
	expectedRank := 5

	repo := &mockRepo{
		scoreRankFn: func(ctx context.Context, uid string) (*curators.CuratorScore, *int, error) {
			return expectedScore, &expectedRank, nil
		},
	}
	svc := curators.NewCuratorService(repo)

	score, rank, err := svc.GetUserScoreWithRank(context.Background(), userID.String())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if score.Score != 850 {
		t.Errorf("expected score 850, got %d", score.Score)
	}
	if rank == nil || *rank != 5 {
		t.Errorf("expected rank 5, got %v", rank)
	}
}

func TestGetUserScoreWithRank_NoScore(t *testing.T) {
	repo := &mockRepo{
		scoreRankFn: func(ctx context.Context, uid string) (*curators.CuratorScore, *int, error) {
			return nil, nil, sql.ErrNoRows
		},
	}
	svc := curators.NewCuratorService(repo)

	score, rank, err := svc.GetUserScoreWithRank(context.Background(), uuid.New().String())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if score == nil {
		t.Fatal("expected non-nil score (default zero)")
	}
	if score.Score != 0 {
		t.Errorf("expected default score 0, got %d", score.Score)
	}
	if rank != nil {
		t.Errorf("expected nil rank, got %v", rank)
	}
}
