package users

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/Dubjay18/reelstack/api/internal/lists"
	"github.com/Dubjay18/reelstack/api/pkg/cache"
	"github.com/Dubjay18/reelstack/api/pkg/db"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
)

func TestGetPublicProfile_Integration(t *testing.T) {
	// Load environment variables (to get DATABASE_URL and REDIS_URL)
	_ = godotenv.Load("../../.env")
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgresql://postgres:postgres@localhost:5432/reelstack?sslmode=disable"
	}
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://localhost:6379"
	}

	database, err := db.Connect(dbURL)
	if err != nil {
		t.Fatalf("failed to connect to test database: %v", err)
	}
	defer database.Close()

	redisClient, err := cache.NewClient(redisURL)
	if err != nil {
		t.Fatalf("failed to connect to redis: %v", err)
	}
	defer redisClient.Close()

	userA := uuid.NewString()

	// Cleanup test DB and Redis
	cleanup := func() {
		_, _ = database.Exec("DELETE FROM list_items WHERE list_id IN (SELECT id FROM lists WHERE user_id = $1)", userA)
		_, _ = database.Exec("DELETE FROM lists WHERE user_id = $1", userA)
		_, _ = database.Exec("DELETE FROM users WHERE id = $1", userA)
		ctx := context.Background()
		_ = redisClient.Delete(ctx, "profile:user:"+userA)
		_ = redisClient.Delete(ctx, "profile:user:profileuser")
	}
	cleanup()
	defer cleanup()

	// Insert test user
	_, err = database.Exec("INSERT INTO users (id, username, email, bio) VALUES ($1, 'profileuser', 'profileuser@test.com', 'testing bio')", userA)
	if err != nil {
		t.Fatalf("failed to insert test user: %v", err)
	}

	// Insert public and private lists
	listsRepo := lists.NewListRepository(database)
	
	publicList := &lists.List{
		ID:       uuid.NewString(),
		UserID:   userA,
		Title:    "Public List 1",
		Slug:     lists.GenerateSlug("Public List 1"),
		IsPublic: true,
	}
	err = listsRepo.CreateList(context.Background(), publicList)
	if err != nil {
		t.Fatalf("failed to create public list: %v", err)
	}

	privateList := &lists.List{
		ID:       uuid.NewString(),
		UserID:   userA,
		Title:    "Private List",
		Slug:     lists.GenerateSlug("Private List"),
		IsPublic: false,
	}
	err = listsRepo.CreateList(context.Background(), privateList)
	if err != nil {
		t.Fatalf("failed to create private list: %v", err)
	}

	// Add list items
	item1 := &lists.ListItem{
		ID:        uuid.NewString(),
		TMDBID:    101,
		MediaType: "movie",
		Position:  1,
	}
	err = listsRepo.AddItemToList(context.Background(), publicList.ID, item1)
	if err != nil {
		t.Fatalf("failed to add item to public list: %v", err)
	}

	userRepo := NewUserRepository(database)
	usersSvc := NewUserService(userRepo, listsRepo, redisClient, "testsecret")
	usersHandler := NewHandler(usersSvc)

	app := fiber.New()
	usersHandler.RegisterRoutes(app, func(c *fiber.Ctx) error {
		c.Locals("userID", userA)
		return c.Next()
	})

	// Test 1: Fetch by username
	req1 := httptest.NewRequest("GET", "/api/v1/users/profileuser", nil)
	resp1, err := app.Test(req1)
	if err != nil {
		t.Fatalf("failed to execute request by username: %v", err)
	}
	defer resp1.Body.Close()

	bodyBytes1, _ := io.ReadAll(resp1.Body)
	if resp1.StatusCode != http.StatusOK {
		t.Errorf("expected status 200 by username, got %d. Body: %s", resp1.StatusCode, string(bodyBytes1))
	}

	var profile1 PublicProfile
	if err := json.Unmarshal(bodyBytes1, &profile1); err != nil {
		t.Fatalf("failed to unmarshal public profile response: %v", err)
	}

	// Verify fields
	if profile1.Username != "profileuser" {
		t.Errorf("expected username 'profileuser', got '%s'", profile1.Username)
	}
	if profile1.Bio == nil || *profile1.Bio != "testing bio" {
		t.Errorf("expected bio 'testing bio', got '%v'", profile1.Bio)
	}
	if len(profile1.PublicLinks) != 1 || profile1.PublicLinks[0].Title != "Public List 1" {
		t.Errorf("expected only 1 public list (Public List 1), got %d public lists", len(profile1.PublicLinks))
	}
	if profile1.ItemCount != 1 {
		t.Errorf("expected item count 1, got %d", profile1.ItemCount)
	}

	// Ensure email is NOT in response JSON
	var rawJSON map[string]interface{}
	_ = json.Unmarshal(bodyBytes1, &rawJSON)
	if _, emailExists := rawJSON["email"]; emailExists {
		t.Error("security risk: email field should not be exposed in PublicProfile JSON response")
	}

	// Test 2: Fetch by userID
	req2 := httptest.NewRequest("GET", "/api/v1/users/"+userA, nil)
	resp2, err := app.Test(req2)
	if err != nil {
		t.Fatalf("failed to execute request by userID: %v", err)
	}
	defer resp2.Body.Close()

	if resp2.StatusCode != http.StatusOK {
		t.Errorf("expected status 200 by userID, got %d", resp2.StatusCode)
	}

	bodyBytes2, _ := io.ReadAll(resp2.Body)
	var profile2 PublicProfile
	_ = json.Unmarshal(bodyBytes2, &profile2)
	if profile2.ID.String() != userA {
		t.Errorf("expected userID '%s', got '%s'", userA, profile2.ID.String())
	}

	// Test 3: Redis caching verification
	// We delete the user from database
	_, err = database.Exec("DELETE FROM users WHERE id = $1", userA)
	if err != nil {
		t.Fatalf("failed to delete user for caching test: %v", err)
	}

	// Now fetch again by username. Since it's cached in Redis, it should still return 200 and the cached profile!
	req3 := httptest.NewRequest("GET", "/api/v1/users/profileuser", nil)
	resp3, err := app.Test(req3)
	if err != nil {
		t.Fatalf("failed to execute third request: %v", err)
	}
	defer resp3.Body.Close()

	if resp3.StatusCode != http.StatusOK {
		t.Errorf("expected status 200 from cached user, got %d", resp3.StatusCode)
	}

	// Test 4: Cache expiration/clear
	// Manually delete cache key
	_ = redisClient.Delete(context.Background(), "profile:user:profileuser")

	// Fetch again. Since it was deleted from DB and cache is now cleared, it should return 404!
	req4 := httptest.NewRequest("GET", "/api/v1/users/profileuser", nil)
	resp4, err := app.Test(req4)
	if err != nil {
		t.Fatalf("failed to execute fourth request: %v", err)
	}
	defer resp4.Body.Close()

	if resp4.StatusCode != http.StatusNotFound {
		t.Errorf("expected status 404 after cache deletion, got %d", resp4.StatusCode)
	}
}

func TestUpdateProfile_Integration(t *testing.T) {
	_ = godotenv.Load("../../.env")
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgresql://postgres:postgres@localhost:5432/reelstack?sslmode=disable"
	}
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://localhost:6379"
	}

	database, err := db.Connect(dbURL)
	if err != nil {
		t.Fatalf("failed to connect to test database: %v", err)
	}
	defer database.Close()

	redisClient, err := cache.NewClient(redisURL)
	if err != nil {
		t.Fatalf("failed to connect to redis: %v", err)
	}
	defer redisClient.Close()

	userA := uuid.NewString()
	userB := uuid.NewString()

	cleanup := func() {
		_, _ = database.Exec("DELETE FROM users WHERE id IN ($1, $2)", userA, userB)
		ctx := context.Background()
		_ = redisClient.Delete(ctx, "profile:user:"+userA)
		_ = redisClient.Delete(ctx, "profile:user:profilea")
		_ = redisClient.Delete(ctx, "profile:user:profileanew")
		_ = redisClient.Delete(ctx, "profile:user:profileb")
	}
	cleanup()
	defer cleanup()

	// Insert test users
	_, err = database.Exec("INSERT INTO users (id, username, email, bio) VALUES ($1, 'profilea', 'profilea@test.com', 'original bio')", userA)
	if err != nil {
		t.Fatalf("failed to insert test user A: %v", err)
	}
	_, err = database.Exec("INSERT INTO users (id, username, email, bio) VALUES ($1, 'profileb', 'profileb@test.com', 'other bio')", userB)
	if err != nil {
		t.Fatalf("failed to insert test user B: %v", err)
	}

	listsRepo := lists.NewListRepository(database)
	userRepo := NewUserRepository(database)
	usersSvc := NewUserService(userRepo, listsRepo, redisClient, "testsecret")
	usersHandler := NewHandler(usersSvc)

	// App with authenticated user ID set in local context
	var currentUserID string
	mockAuth := func(c *fiber.Ctx) error {
		if currentUserID == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error":   "unauthorized",
			})
		}
		c.Locals("userID", currentUserID)
		return c.Next()
	}

	app := fiber.New()
	usersHandler.RegisterRoutes(app, mockAuth)

	// Test 1: Unauthorized Update Profile
	currentUserID = ""
	req1 := httptest.NewRequest("PUT", "/api/v1/users/profile", nil)
	resp1, _ := app.Test(req1)
	if resp1.StatusCode != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", resp1.StatusCode)
	}

	// Test 2: Successful Profile Update (Username & Bio)
	currentUserID = userA
	body := `{"username":"profileanew","bio":"new bio content"}`
	req2 := httptest.NewRequest("PUT", "/api/v1/users/profile", io.NopCloser(strings.NewReader(body)))
	req2.Header.Set("Content-Type", "application/json")
	resp2, err := app.Test(req2)
	if err != nil {
		t.Fatalf("failed to request profile update: %v", err)
	}
	defer resp2.Body.Close()

	if resp2.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp2.Body)
		t.Fatalf("expected status 200, got %d. Body: %s", resp2.StatusCode, string(bodyBytes))
	}

	var res2 struct {
		Success bool   `json:"success"`
		Token   string `json:"token"`
		User    User   `json:"user"`
	}
	_ = json.NewDecoder(resp2.Body).Decode(&res2)
	if !res2.Success {
		t.Error("expected Success to be true")
	}
	if res2.User.Username != "profileanew" {
		t.Errorf("expected username 'profileanew', got '%s'", res2.User.Username)
	}
	if res2.User.Bio == nil || *res2.User.Bio != "new bio content" {
		t.Errorf("expected bio 'new bio content', got '%v'", res2.User.Bio)
	}
	if res2.Token == "" {
		t.Error("expected new JWT token to be generated and returned")
	}

	// Test 3: Username already taken Conflict
	currentUserID = userB
	bodyConflict := `{"username":"profileanew"}`
	req3 := httptest.NewRequest("PUT", "/api/v1/users/profile", io.NopCloser(strings.NewReader(bodyConflict)))
	req3.Header.Set("Content-Type", "application/json")
	resp3, _ := app.Test(req3)
	if resp3.StatusCode != http.StatusConflict {
		t.Errorf("expected status 409 for conflict, got %d", resp3.StatusCode)
	}

	// Test 4: Invalid Username Format validation (bad request)
	currentUserID = userA
	bodyInvalid := `{"username":"ab"}` // too short, min length is 3
	req4 := httptest.NewRequest("PUT", "/api/v1/users/profile", io.NopCloser(strings.NewReader(bodyInvalid)))
	req4.Header.Set("Content-Type", "application/json")
	resp4, _ := app.Test(req4)
	if resp4.StatusCode != http.StatusBadRequest {
		t.Errorf("expected status 400 for bad username format, got %d", resp4.StatusCode)
	}

	// Test 5: Check Username Availability - Taken
	req5 := httptest.NewRequest("GET", "/api/v1/users/check-username?username=profileb", nil)
	resp5, _ := app.Test(req5)
	if resp5.StatusCode != http.StatusOK {
		t.Errorf("expected status 200, got %d", resp5.StatusCode)
	}
	var res5 struct {
		Available bool `json:"available"`
	}
	_ = json.NewDecoder(resp5.Body).Decode(&res5)
	if res5.Available {
		t.Error("expected 'profileb' username to be unavailable")
	}

	// Test 6: Check Username Availability - Available
	req6 := httptest.NewRequest("GET", "/api/v1/users/check-username?username=profile_new_available", nil)
	resp6, _ := app.Test(req6)
	if resp6.StatusCode != http.StatusOK {
		t.Errorf("expected status 200, got %d", resp6.StatusCode)
	}
	var res6 struct {
		Available bool `json:"available"`
	}
	_ = json.NewDecoder(resp6.Body).Decode(&res6)
	if !res6.Available {
		t.Error("expected 'profile_new_available' username to be available")
	}

	// Test 7: Check Username Availability - Invalid Format
	req7 := httptest.NewRequest("GET", "/api/v1/users/check-username?username=ab", nil)
	resp7, _ := app.Test(req7)
	if resp7.StatusCode != http.StatusOK {
		t.Errorf("expected status 200 for validation check, got %d", resp7.StatusCode)
	}
	var res7 struct {
		Available bool   `json:"available"`
		Error     string `json:"error"`
	}
	_ = json.NewDecoder(resp7.Body).Decode(&res7)
	if res7.Available {
		t.Error("expected invalid username format to be unavailable")
	}
	if res7.Error == "" {
		t.Error("expected error message for invalid format")
	}
}
