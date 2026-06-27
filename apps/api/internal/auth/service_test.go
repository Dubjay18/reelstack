package auth_test

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Dubjay18/reelstack/api/internal/auth"
	"github.com/Dubjay18/reelstack/api/internal/users"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// ── Mock repository ───────────────────────────────────────────────────────────

type mockUserRepo struct {
	createFn            func(u *users.User) error
	getByEmailFn        func(email string) (*users.User, error)
	getByIDFn           func(id string) (*users.User, error)
	getUserByUsernameFn func(username string) (*users.User, error)
	getByGoogleIDFn     func(googleID string) (*users.User, error)
	upsertGoogleFn      func(u *users.User) error
}

func (m *mockUserRepo) CreateUser(u *users.User) error          { return m.createFn(u) }
func (m *mockUserRepo) GetUserByEmail(email string) (*users.User, error) {
	return m.getByEmailFn(email)
}
func (m *mockUserRepo) GetUserByID(id string) (*users.User, error) {
	return m.getByIDFn(id)
}
func (m *mockUserRepo) GetUserByUsername(username string) (*users.User, error) {
	if m.getUserByUsernameFn != nil {
		return m.getUserByUsernameFn(username)
	}
	return nil, sql.ErrNoRows
}
func (m *mockUserRepo) GetUserByGoogleID(googleID string) (*users.User, error) {
	return m.getByGoogleIDFn(googleID)
}
func (m *mockUserRepo) UpsertGoogleUser(u *users.User) error { return m.upsertGoogleFn(u) }
func (m *mockUserRepo) UpdateUser(u *users.User) error { return nil }
func (m *mockUserRepo) GetFollowCounts(userID string) (followers int, following int, err error) {
	return 0, 0, nil
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const (
	testSecret       = "test-jwt-secret"
	testClientID     = "client-id"
	testClientSecret = "client-secret"
	testRedirectURL  = "http://localhost:8080/api/v1/auth/google/callback"
)

func newService(repo users.IUserRepository) *auth.AuthService {
	return auth.NewAuthService(repo, testSecret, testClientID, testClientSecret, testRedirectURL)
}

// mockGoogleServer starts a local HTTP server that returns a fixed userinfo JSON.
func mockGoogleServer(t *testing.T, responseJSON string) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(responseJSON)) //nolint:errcheck
	}))
	t.Cleanup(srv.Close)
	return srv
}

// ── Tests ─────────────────────────────────────────────────────────────────────

func TestRegisterUser_OK(t *testing.T) {
	repo := &mockUserRepo{
		getByEmailFn: func(email string) (*users.User, error) {
			return nil, sql.ErrNoRows // not found
		},
		createFn: func(u *users.User) error { return nil },
	}
	svc := newService(repo)
	user, err := svc.RegisterUser("new@example.com", "password123", "newuser")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if user.Email != "new@example.com" {
		t.Errorf("expected email new@example.com, got %s", user.Email)
	}
	if user.PasswordHash == nil {
		t.Error("expected PasswordHash to be set")
	}
}

func TestRegisterUser_Duplicate(t *testing.T) {
	existing := &users.User{ID: uuid.New(), Email: "dup@example.com", Username: "dup"}
	repo := &mockUserRepo{
		getByEmailFn: func(email string) (*users.User, error) { return existing, nil },
	}
	svc := newService(repo)
	_, err := svc.RegisterUser("dup@example.com", "password", "dup")
	if err == nil {
		t.Fatal("expected error for duplicate registration, got nil")
	}
	if !strings.Contains(err.Error(), "already exists") {
		t.Errorf("unexpected error message: %v", err)
	}
}

func TestLoginUser_OK(t *testing.T) {
	// Generate hash at runtime so it never goes stale.
	hashBytes, err := bcrypt.GenerateFromPassword([]byte("secret"), bcrypt.MinCost)
	if err != nil {
		t.Fatalf("bcrypt: %v", err)
	}
	hash := string(hashBytes)
	repo := &mockUserRepo{
		getByEmailFn: func(email string) (*users.User, error) {
			return &users.User{
				ID:           uuid.New(),
				Email:        email,
				PasswordHash: &hash,
			}, nil
		},
	}
	svc := newService(repo)
	token, err := svc.LoginUser("user@example.com", "secret")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if token == "" {
		t.Error("expected a non-empty JWT token")
	}
}

func TestLoginUser_WrongPassword(t *testing.T) {
	hashBytes, _ := bcrypt.GenerateFromPassword([]byte("secret"), bcrypt.MinCost)
	hash := string(hashBytes)
	repo := &mockUserRepo{
		getByEmailFn: func(email string) (*users.User, error) {
			return &users.User{ID: uuid.New(), Email: email, PasswordHash: &hash}, nil
		},
	}
	svc := newService(repo)
	_, err := svc.LoginUser("user@example.com", "wrong-password")
	if err == nil {
		t.Fatal("expected error for wrong password, got nil")
	}
}

func TestGoogleCallback_NewUser(t *testing.T) {
	// Swap out the profile fetcher with one that returns a fixed profile.
	auth.SetGoogleProfileFetcher(func(accessToken string) (*auth.GoogleProfile, error) {
		return &auth.GoogleProfile{
			ID:      "google-sub-111",
			Email:   "alice@gmail.com",
			Name:    "Alice Smith",
			Picture: "https://example.com/alice.jpg",
		}, nil
	})
	t.Cleanup(func() { auth.ResetGoogleProfileFetcher() })

	repo := &mockUserRepo{
		getByGoogleIDFn: func(googleID string) (*users.User, error) {
			return nil, sql.ErrNoRows
		},
		getByEmailFn: func(email string) (*users.User, error) {
			return nil, sql.ErrNoRows
		},
		upsertGoogleFn: func(u *users.User) error { return nil },
	}
	svc := newService(repo)

	// We don't need a real OAuth exchange; intercept at the profile-fetcher level.
	// Wrap GoogleCallback so the code exchange is skipped via a test-only path.
	token, err := svc.GoogleCallbackWithToken(context.Background(), "fake-access-token")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if token == "" {
		t.Error("expected a non-empty JWT")
	}
}

func TestGoogleCallback_ExistingUser(t *testing.T) {
	uid := uuid.New()
	googleID := "google-sub-222"
	auth.SetGoogleProfileFetcher(func(accessToken string) (*auth.GoogleProfile, error) {
		return &auth.GoogleProfile{
			ID:      googleID,
			Email:   "bob@gmail.com",
			Name:    "Bob Jones",
			Picture: "https://example.com/bob.jpg",
		}, nil
	})
	t.Cleanup(func() { auth.ResetGoogleProfileFetcher() })

	repo := &mockUserRepo{
		getByGoogleIDFn: func(gid string) (*users.User, error) {
			return &users.User{ID: uid, Email: "bob@gmail.com", Username: "bobjones", GoogleID: &googleID}, nil
		},
		getByEmailFn: func(email string) (*users.User, error) {
			return nil, sql.ErrNoRows
		},
		upsertGoogleFn: func(u *users.User) error { return nil },
	}
	svc := newService(repo)

	token, err := svc.GoogleCallbackWithToken(context.Background(), "fake-access-token")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if token == "" {
		t.Error("expected a non-empty JWT")
	}
}

func TestGoogleCallback_ProfileFetchError(t *testing.T) {
	auth.SetGoogleProfileFetcher(func(accessToken string) (*auth.GoogleProfile, error) {
		return nil, errors.New("google API down")
	})
	t.Cleanup(func() { auth.ResetGoogleProfileFetcher() })

	svc := newService(&mockUserRepo{
		getByGoogleIDFn: func(string) (*users.User, error) { return nil, sql.ErrNoRows },
		getByEmailFn:    func(string) (*users.User, error) { return nil, sql.ErrNoRows },
	})

	_, err := svc.GoogleCallbackWithToken(context.Background(), "bad-token")
	if err == nil {
		t.Fatal("expected error when profile fetch fails")
	}
}
