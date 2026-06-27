package notifications_test

import (
	"context"
	"os"
	"testing"

	"github.com/Dubjay18/reelstack/api/internal/notifications"
	"github.com/Dubjay18/reelstack/api/pkg/db"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
)

func TestNotificationSystem_Integration(t *testing.T) {
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
		_, _ = database.Exec("DELETE FROM notifications WHERE user_id IN ($1, $2) OR actor_id IN ($1, $2)", userA, userB)
		_, _ = database.Exec("DELETE FROM users WHERE id IN ($1, $2)", userA, userB)
	}
	cleanup()
	defer cleanup()

	// Insert test users
	_, err = database.Exec("INSERT INTO users (id, username, email) VALUES ($1, 'notifusera', 'notifusera@test.com'), ($2, 'notifuserb', 'notifuserb@test.com')", userA, userB)
	if err != nil {
		t.Fatalf("failed to insert test users: %v", err)
	}

	repo := notifications.NewNotificationRepository(database)
	svc := notifications.NewNotificationService(repo)

	ctx := context.Background()

	// Create test notification (userA is the recipient, userB is the actor)
	err = svc.CreateNotification(ctx, userA, userB, "new_follower", nil)
	if err != nil {
		t.Fatalf("failed to create notification: %v", err)
	}

	// Verify notification retrieved
	notifs, err := svc.GetNotifications(ctx, userA)
	if err != nil {
		t.Fatalf("failed to get notifications: %v", err)
	}
	if len(notifs) != 1 {
		t.Errorf("expected 1 notification, got %d", len(notifs))
	} else {
		n := notifs[0]
		if n.UserID != userA || n.ActorID != userB || n.Type != "new_follower" || n.IsRead {
			t.Errorf("unexpected notification content: %+v", n)
		}
		if n.ActorUsername == nil || *n.ActorUsername != "notifuserb" {
			t.Errorf("expected actor username 'notifuserb', got '%v'", n.ActorUsername)
		}

		// Mark as read
		err = svc.MarkAsRead(ctx, n.ID, userA)
		if err != nil {
			t.Fatalf("failed to mark as read: %v", err)
		}
	}

	// Verify status updated to read
	notifs, err = svc.GetNotifications(ctx, userA)
	if err != nil {
		t.Fatalf("failed to get notifications: %v", err)
	}
	if len(notifs) != 1 || !notifs[0].IsRead {
		t.Errorf("expected notification to be read, got %+v", notifs)
	}

	// Create another notification
	err = svc.CreateNotification(ctx, userA, userB, "list_created", nil)
	if err != nil {
		t.Fatalf("failed to create second notification: %v", err)
	}

	// Mark all read
	err = svc.MarkAllAsRead(ctx, userA)
	if err != nil {
		t.Fatalf("failed to mark all as read: %v", err)
	}

	// Verify all are read
	notifs, err = svc.GetNotifications(ctx, userA)
	if err != nil {
		t.Fatalf("failed to get notifications: %v", err)
	}
	for _, n := range notifs {
		if !n.IsRead {
			t.Errorf("expected all notifications to be read, but found unread: %+v", n)
		}
	}
}
