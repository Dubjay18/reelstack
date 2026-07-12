package curators_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/Dubjay18/reelstack/api/internal/curators"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// ── Mock service ─────────────────────────────────────────────────────────────

type mockService struct {
	refreshFn     func(ctx context.Context) error
	leaderboardFn func(ctx context.Context, limit, offset int) ([]curators.LeaderboardEntry, time.Time, error)
	scoreFn       func(userID string) (*curators.CuratorScore, error)
	scoreRankFn   func(userID string) (*curators.CuratorScore, *int, error)
}

func (m *mockService) RefreshScores(ctx context.Context) error {
	if m.refreshFn != nil {
		return m.refreshFn(ctx)
	}
	return nil
}

func (m *mockService) GetLeaderboard(ctx context.Context, limit, offset int) ([]curators.LeaderboardEntry, time.Time, error) {
	if m.leaderboardFn != nil {
		return m.leaderboardFn(ctx, limit, offset)
	}
	return nil, time.Time{}, nil
}

func (m *mockService) GetUserScore(ctx context.Context, userID string) (*curators.CuratorScore, error) {
	if m.scoreFn != nil {
		return m.scoreFn(userID)
	}
	return nil, nil
}

func (m *mockService) GetUserScoreWithRank(ctx context.Context, userID string) (*curators.CuratorScore, *int, error) {
	if m.scoreRankFn != nil {
		return m.scoreRankFn(userID)
	}
	return nil, nil, nil
}

// ── Test helpers ─────────────────────────────────────────────────────────────

func newTestApp(svc curators.ICuratorService, cronSecret string) *fiber.App {
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{"error": err.Error()})
		},
	})
	h := curators.NewHandler(svc, cronSecret)
	h.RegisterRoutes(app)
	h.RegisterCronRoute(app)
	return app
}

// ── Leaderboard tests ────────────────────────────────────────────────────────

func TestLeaderboardEndpoint_Success(t *testing.T) {
	now := time.Now()
	entries := []curators.LeaderboardEntry{
		{
			UserID:        uuid.New(),
			Username:      "alice",
			Score:         850,
			Rank:          1,
			FollowersCount: 120,
			ListCount:     8,
		},
	}

	svc := &mockService{
		leaderboardFn: func(ctx context.Context, limit, offset int) ([]curators.LeaderboardEntry, time.Time, error) {
			return entries, now, nil
		},
	}
	app := newTestApp(svc, "test-secret")

	req := httptest.NewRequest(http.MethodGet, "/api/v1/curators/leaderboard", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	var body struct {
		Curators   []curators.LeaderboardEntry `json:"curators"`
		ComputedAt time.Time                   `json:"computed_at"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if len(body.Curators) != 1 {
		t.Fatalf("expected 1 curator, got %d", len(body.Curators))
	}
	if body.Curators[0].Username != "alice" {
		t.Errorf("expected username alice, got %s", body.Curators[0].Username)
	}
	if body.Curators[0].Score != 850 {
		t.Errorf("expected score 850, got %d", body.Curators[0].Score)
	}
}

func TestLeaderboardEndpoint_Empty(t *testing.T) {
	svc := &mockService{
		leaderboardFn: func(ctx context.Context, limit, offset int) ([]curators.LeaderboardEntry, time.Time, error) {
			return []curators.LeaderboardEntry{}, time.Now(), nil
		},
	}
	app := newTestApp(svc, "test-secret")

	req := httptest.NewRequest(http.MethodGet, "/api/v1/curators/leaderboard", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	var body struct {
		Curators []curators.LeaderboardEntry `json:"curators"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if len(body.Curators) != 0 {
		t.Errorf("expected 0 curators, got %d", len(body.Curators))
	}
}

func TestLeaderboardEndpoint_Pagination(t *testing.T) {
	svc := &mockService{
		leaderboardFn: func(ctx context.Context, limit, offset int) ([]curators.LeaderboardEntry, time.Time, error) {
			if limit != 10 {
				t.Errorf("expected limit 10, got %d", limit)
			}
			if offset != 20 {
				t.Errorf("expected offset 20, got %d", offset)
			}
			return nil, time.Now(), nil
		},
	}
	app := newTestApp(svc, "test-secret")

	req := httptest.NewRequest(http.MethodGet, "/api/v1/curators/leaderboard?limit=10&offset=20", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
}

// ── Cron endpoint tests ──────────────────────────────────────────────────────

func TestCronScoresEndpoint_Success(t *testing.T) {
	called := false
	svc := &mockService{
		refreshFn: func(ctx context.Context) error {
			called = true
			return nil
		},
	}
	app := newTestApp(svc, "test-secret")

	req := httptest.NewRequest(http.MethodPost, "/api/v1/cron/scores", nil)
	req.Header.Set("X-Cron-Secret", "test-secret")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	if !called {
		t.Fatal("expected RefreshScores to be called")
	}
}

func TestCronScoresEndpoint_Unauthorized(t *testing.T) {
	svc := &mockService{}
	app := newTestApp(svc, "test-secret")

	req := httptest.NewRequest(http.MethodPost, "/api/v1/cron/scores", nil)
	req.Header.Set("X-Cron-Secret", "wrong-secret")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}

	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", resp.StatusCode)
	}
}

func TestCronScoresEndpoint_NoSecret(t *testing.T) {
	svc := &mockService{}
	app := newTestApp(svc, "wrong-only")

	req := httptest.NewRequest(http.MethodPost, "/api/v1/cron/scores", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}

	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", resp.StatusCode)
	}
}
