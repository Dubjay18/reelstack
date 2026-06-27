package lists

import (
	"context"
	"os"
	"testing"

	"github.com/Dubjay18/reelstack/api/pkg/db"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
)

func TestListService_AccessControl(t *testing.T) {
	// Load environment variables (to get DATABASE_URL)
	_ = godotenv.Load("../../.env")
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgresql://postgres:postgres@localhost:5432/reelstack?sslmode=disable"
	}

	database, err := db.Connect(dbURL)
	if err != nil {
		t.Fatalf("failed to connect to test database: %v", err)
	}
	defer database.Close()

	// Create test users in DB (so lists can reference them via FK)
	userA := uuid.NewString()
	userB := uuid.NewString()

	// Cleanup test DB
	cleanup := func() {
		_, _ = database.Exec("DELETE FROM list_items WHERE list_id IN (SELECT id FROM lists WHERE user_id IN ($1, $2))", userA, userB)
		_, _ = database.Exec("DELETE FROM lists WHERE user_id IN ($1, $2)", userA, userB)
		_, _ = database.Exec("DELETE FROM users WHERE id IN ($1, $2)", userA, userB)
	}
	cleanup()
	defer cleanup()

	// Insert test users
	_, err = database.Exec("INSERT INTO users (id, username, email) VALUES ($1, 'usera', 'usera@test.com'), ($2, 'userb', 'userb@test.com')", userA, userB)
	if err != nil {
		t.Fatalf("failed to insert test users: %v", err)
	}

	repo := NewListRepository(database)
	svc := NewListService(repo, nil, nil)
	ctx := context.Background()

	// 1. Create a public list for User A
	publicList := &List{
		ID:       uuid.NewString(),
		UserID:   userA,
		Title:    "My Public Movie List",
		IsPublic: true,
	}
	err = svc.CreateList(ctx, publicList)
	if err != nil {
		t.Fatalf("failed to create public list: %v", err)
	}

	// 2. Create a private list for User A
	privateList := &List{
		ID:       uuid.NewString(),
		UserID:   userA,
		Title:    "My Private Watchlist",
		IsPublic: false,
	}
	err = svc.CreateList(ctx, privateList)
	if err != nil {
		t.Fatalf("failed to create private list: %v", err)
	}

	// 3. Test GetListByID Visibility checks
	// Anyone can read public list
	_, err = svc.GetListByID(ctx, publicList.ID, "")
	if err != nil {
		t.Errorf("anonymous user should be able to read public list, got err: %v", err)
	}
	_, err = svc.GetListByID(ctx, publicList.ID, userB)
	if err != nil {
		t.Errorf("User B should be able to read User A's public list, got err: %v", err)
	}

	// Owner can read private list
	_, err = svc.GetListByID(ctx, privateList.ID, userA)
	if err != nil {
		t.Errorf("Owner (User A) should be able to read private list, got err: %v", err)
	}

	// Non-owner cannot read private list
	_, err = svc.GetListByID(ctx, privateList.ID, userB)
	if err != ErrForbidden {
		t.Errorf("expected ErrForbidden for non-owner viewing private list, got: %v", err)
	}
	_, err = svc.GetListByID(ctx, privateList.ID, "")
	if err != ErrForbidden {
		t.Errorf("expected ErrForbidden for anonymous viewing private list, got: %v", err)
	}

	// 4. Test UpdateList Ownership checks
	publicList.Title = "Updated Public Movie List"
	// Non-owner cannot update public list
	err = svc.UpdateList(ctx, publicList, userB)
	if err != ErrForbidden {
		t.Errorf("expected ErrForbidden for non-owner updating list, got: %v", err)
	}
	// Owner can update
	err = svc.UpdateList(ctx, publicList, userA)
	if err != nil {
		t.Errorf("owner should be able to update list, got err: %v", err)
	}

	// 5. Test Item mutations (AddItemToList, GetItemsByListID, UpdateListItem, DeleteListItem)
	item := &ListItem{
		ID:        uuid.NewString(),
		TMDBID:    550,
		MediaType: "movie",
		Position:  1,
	}

	// Non-owner cannot add item
	err = svc.AddItemToList(ctx, publicList.ID, item, userB)
	if err != ErrForbidden {
		t.Errorf("expected ErrForbidden for non-owner adding item, got: %v", err)
	}

	// Owner can add item
	err = svc.AddItemToList(ctx, publicList.ID, item, userA)
	if err != nil {
		t.Fatalf("failed to add item as owner: %v", err)
	}

	// Anyone can see items in public list
	items, err := svc.GetItemsByListID(ctx, publicList.ID, "")
	if err != nil || len(items) != 1 {
		t.Errorf("failed to get items for public list: %v (len=%d)", err, len(items))
	}

	// Non-owner cannot see items in private list (if we added any)
	_, err = svc.GetItemsByListID(ctx, privateList.ID, userB)
	if err != ErrForbidden {
		t.Errorf("expected ErrForbidden for non-owner reading private list items, got: %v", err)
	}

	// Non-owner cannot update item
	item.Notes = ptr("nice movie")
	err = svc.UpdateListItem(ctx, item, userB)
	if err != ErrForbidden {
		t.Errorf("expected ErrForbidden for non-owner updating item, got: %v", err)
	}

	// Owner can update item
	err = svc.UpdateListItem(ctx, item, userA)
	if err != nil {
		t.Errorf("failed to update item as owner: %v", err)
	}

	// Non-owner cannot delete item
	err = svc.DeleteListItem(ctx, item.ID, userB)
	if err != ErrForbidden {
		t.Errorf("expected ErrForbidden for non-owner deleting item, got: %v", err)
	}

	// Owner can delete item
	err = svc.DeleteListItem(ctx, item.ID, userA)
	if err != nil {
		t.Errorf("failed to delete item as owner: %v", err)
	}

	// 6. Test DeleteList Ownership checks
	// Non-owner cannot delete list
	err = svc.DeleteList(ctx, publicList.ID, userB)
	if err != ErrForbidden {
		t.Errorf("expected ErrForbidden for non-owner deleting list, got: %v", err)
	}

	// Owner can delete list
	err = svc.DeleteList(ctx, publicList.ID, userA)
	if err != nil {
		t.Errorf("failed to delete list as owner: %v", err)
	}
}

func ptr(s string) *string {
	return &s
}
