package follows_test

import (
	"context"
	"os"
	"testing"

	"github.com/Dubjay18/reelstack/api/internal/follows"
	"github.com/Dubjay18/reelstack/api/internal/notifications"
	"github.com/Dubjay18/reelstack/api/pkg/db"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
)

func TestFollowSystem_Integration(t *testing.T) {
	_ = godotenv.Load("../../.env")
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgresql://postgres:postgres@localhost:5432/reelstack?sslmode=disable"
	}

	database, err := db.Connect(dbURL)
	if err != nil {
		t.Skip("skipping integration test: database connection failed")
		return
	}
	defer database.Close()

	userA := uuid.NewString()
	userB := uuid.NewString()

	cleanup := func() {
		_, _ = database.Exec("DELETE FROM follows WHERE follower_id IN ($1, $2) OR following_id IN ($1, $2)", userA, userB)
		_, _ = database.Exec("DELETE FROM notifications WHERE user_id IN ($1, $2) OR actor_id IN ($1, $2)", userA, userB)
		_, _ = database.Exec("DELETE FROM users WHERE id IN ($1, $2)", userA, userB)
	}
	cleanup()
	defer cleanup()

	// Insert test users
	_, err = database.Exec("INSERT INTO users (id, username, email) VALUES ($1, 'followera', 'followera@test.com'), ($2, 'followingb', 'followingb@test.com')", userA, userB)
	if err != nil {
		t.Fatalf("failed to insert test users: %v", err)
	}

	notifRepo := notifications.NewNotificationRepository(database)
	notifSvc := notifications.NewNotificationService(notifRepo)

	followRepo := follows.NewFollowRepository(database)
	followSvc := follows.NewFollowService(followRepo, notifSvc)

	ctx := context.Background()

	// Verify initially not following
	isFollowing, err := followSvc.IsFollowing(ctx, userA, userB)
	if err != nil {
		t.Fatalf("failed to check follow status: %v", err)
	}
	if isFollowing {
		t.Error("expected isFollowing to be false initially")
	}

	// Follow B
	err = followSvc.Follow(ctx, userA, userB)
	if err != nil {
		t.Fatalf("failed to follow: %v", err)
	}

	// Verify is following
	isFollowing, err = followSvc.IsFollowing(ctx, userA, userB)
	if err != nil {
		t.Fatalf("failed to check follow status: %v", err)
	}
	if !isFollowing {
		t.Error("expected isFollowing to be true after follow")
	}

	// Check follow counts
	followers, following, err := followSvc.GetFollowCounts(ctx, userB)
	if err != nil {
		t.Fatalf("failed to get counts: %v", err)
	}
	if followers != 1 || following != 0 {
		t.Errorf("expected B to have 1 follower and 0 following, got followers=%d, following=%d", followers, following)
	}

	// Check if notification was created for B
	notifs, err := notifSvc.GetNotifications(ctx, userB)
	if err != nil {
		t.Fatalf("failed to get notifications: %v", err)
	}
	if len(notifs) != 1 {
		t.Errorf("expected B to have 1 notification, got %d", len(notifs))
	} else {
		if notifs[0].Type != "new_follower" || notifs[0].ActorID != userA {
			t.Errorf("unexpected notification: %+v", notifs[0])
		}
	}

	// Unfollow
	err = followSvc.Unfollow(ctx, userA, userB)
	if err != nil {
		t.Fatalf("failed to unfollow: %v", err)
	}

	// Verify follow counts and notification cleanup
	followers, following, err = followSvc.GetFollowCounts(ctx, userB)
	if err != nil {
		t.Fatalf("failed to get counts: %v", err)
	}
	if followers != 0 {
		t.Errorf("expected B to have 0 followers after unfollow, got %d", followers)
	}

	notifs, err = notifSvc.GetNotifications(ctx, userB)
	if err != nil {
		t.Fatalf("failed to get notifications: %v", err)
	}
	if len(notifs) != 0 {
		t.Errorf("expected B notification to be cleaned up after unfollow, got %d", len(notifs))
	}
}
