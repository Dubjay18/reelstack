package embed

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/Dubjay18/reelstack/api/internal/lists"
	"github.com/Dubjay18/reelstack/api/internal/users"
	"github.com/Dubjay18/reelstack/api/pkg/db"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
)

func TestGetEmbedList_Integration(t *testing.T) {
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

	userA := uuid.NewString()

	// Cleanup test DB
	cleanup := func() {
		_, _ = database.Exec("DELETE FROM list_items WHERE list_id IN (SELECT id FROM lists WHERE user_id = $1)", userA)
		_, _ = database.Exec("DELETE FROM lists WHERE user_id = $1", userA)
		_, _ = database.Exec("DELETE FROM users WHERE id = $1", userA)
	}
	cleanup()
	defer cleanup()

	// Insert test user
	_, err = database.Exec("INSERT INTO users (id, username, email) VALUES ($1, 'embeduser', 'embeduser@test.com')", userA)
	if err != nil {
		t.Fatalf("failed to insert test user: %v", err)
	}

	listsRepo := lists.NewListRepository(database)

	// Create a public list
	publicList := &lists.List{
		ID:       uuid.NewString(),
		UserID:   userA,
		Title:    "Embed Public List",
		Slug:     lists.GenerateSlug("Embed Public List"),
		IsPublic: true,
	}
	err = listsRepo.CreateList(context.Background(), publicList)
	if err != nil {
		t.Fatalf("failed to create public list: %v", err)
	}

	// Create a private list
	privateList := &lists.List{
		ID:       uuid.NewString(),
		UserID:   userA,
		Title:    "Embed Private List",
		Slug:     lists.GenerateSlug("Embed Private List"),
		IsPublic: false,
	}
	err = listsRepo.CreateList(context.Background(), privateList)
	if err != nil {
		t.Fatalf("failed to create private list: %v", err)
	}

	// Add item to public list
	item1 := &lists.ListItem{
		ID:        uuid.NewString(),
		TMDBID:    707,
		MediaType: "movie",
		Position:  1,
	}
	err = listsRepo.AddItemToList(context.Background(), publicList.ID, item1)
	if err != nil {
		t.Fatalf("failed to add item to public list: %v", err)
	}

	userRepo := users.NewUserRepository(database)
	handler := NewHandler(userRepo, listsRepo)

	app := fiber.New()
	handler.RegisterRoutes(app)

	// Test 1: Fetch public list
	req1 := httptest.NewRequest("GET", "/api/v1/embed/embeduser/embed-public-list", nil)
	resp1, err := app.Test(req1)
	if err != nil {
		t.Fatalf("failed to execute request for public list: %v", err)
	}
	defer resp1.Body.Close()

	if resp1.StatusCode != http.StatusOK {
		t.Errorf("expected status 200 for public list, got %d", resp1.StatusCode)
	}

	// Verify Cache-Control header
	cc := resp1.Header.Get("Cache-Control")
	if cc != "public, max-age=300" {
		t.Errorf("expected Cache-Control 'public, max-age=300', got '%s'", cc)
	}

	bodyBytes1, _ := io.ReadAll(resp1.Body)
	var rawResponse map[string]interface{}
	if err := json.Unmarshal(bodyBytes1, &rawResponse); err != nil {
		t.Fatalf("failed to unmarshal JSON response: %v", err)
	}

	// Verify structure
	listObj, ok := rawResponse["list"].(map[string]interface{})
	if !ok || listObj["title"] != "Embed Public List" {
		t.Errorf("unexpected list object in response: %v", rawResponse["list"])
	}

	itemsArr, ok := rawResponse["items"].([]interface{})
	if !ok || len(itemsArr) != 1 {
		t.Errorf("expected 1 list item in response, got: %v", rawResponse["items"])
	}

	// Test 2: Fetch private list
	req2 := httptest.NewRequest("GET", "/api/v1/embed/embeduser/embed-private-list", nil)
	resp2, err := app.Test(req2)
	if err != nil {
		t.Fatalf("failed to execute request for private list: %v", err)
	}
	defer resp2.Body.Close()

	if resp2.StatusCode != http.StatusNotFound {
		t.Errorf("expected status 404 for private list, got %d", resp2.StatusCode)
	}

	// Test 3: Fetch non-existent list
	req3 := httptest.NewRequest("GET", "/api/v1/embed/embeduser/doesnotexist", nil)
	resp3, err := app.Test(req3)
	if err != nil {
		t.Fatalf("failed to execute request for non-existent list: %v", err)
	}
	defer resp3.Body.Close()

	if resp3.StatusCode != http.StatusNotFound {
		t.Errorf("expected status 404 for non-existent list, got %d", resp3.StatusCode)
	}

	// Test 4: Fetch non-existent user
	req4 := httptest.NewRequest("GET", "/api/v1/embed/nonexistentuser/embed-public-list", nil)
	resp4, err := app.Test(req4)
	if err != nil {
		t.Fatalf("failed to execute request for non-existent user: %v", err)
	}
	defer resp4.Body.Close()

	if resp4.StatusCode != http.StatusNotFound {
		t.Errorf("expected status 404 for non-existent user, got %d", resp4.StatusCode)
	}
}
