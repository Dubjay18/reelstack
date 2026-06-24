package auth_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Dubjay18/reelstack/api/internal/auth"
	"github.com/Dubjay18/reelstack/api/internal/users"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// ── Mock service ─────────────────────────────────────────────────────────────

type mockAuthService struct {
	registerFn       func(email, password, username string) (*users.User, error)
	loginFn          func(email, password string) (string, error)
	googleRedirectFn func(state string) string
	googleCallbackFn func(ctx context.Context, code string) (string, error)
}

func (m *mockAuthService) RegisterUser(email, password, username string) (*users.User, error) {
	return m.registerFn(email, password, username)
}
func (m *mockAuthService) LoginUser(email, password string) (string, error) {
	return m.loginFn(email, password)
}
func (m *mockAuthService) GoogleRedirectURL(state string) string {
	return m.googleRedirectFn(state)
}
func (m *mockAuthService) GoogleCallback(ctx context.Context, code string) (string, error) {
	return m.googleCallbackFn(ctx, code)
}

// ── Test helpers ──────────────────────────────────────────────────────────────

func newApp(svc auth.IAuthService) *fiber.App {
	app := fiber.New(fiber.Config{ErrorHandler: func(c *fiber.Ctx, err error) error {
		code := fiber.StatusInternalServerError
		if e, ok := err.(*fiber.Error); ok {
			code = e.Code
		}
		return c.Status(code).JSON(fiber.Map{"error": err.Error(), "success": false})
	}})
	h := auth.NewHandler(svc, "http://localhost:3000")
	h.RegisterRoutes(app)
	return app
}

func doRequest(app *fiber.App, method, url string, body interface{}, cookies ...*http.Cookie) *http.Response {
	var bodyReader io.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		bodyReader = bytes.NewReader(b)
	}
	req := httptest.NewRequest(method, url, bodyReader)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	for _, c := range cookies {
		req.AddCookie(c)
	}
	resp, _ := app.Test(req, -1)
	return resp
}

func parseBody(resp *http.Response) map[string]interface{} {
	var m map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&m) //nolint:errcheck
	return m
}

// ── Table-driven handler tests ────────────────────────────────────────────────

func TestRegisterOK(t *testing.T) {
	uid := uuid.New()
	svc := &mockAuthService{
		registerFn: func(email, password, username string) (*users.User, error) {
			return &users.User{ID: uid, Email: email, Username: username}, nil
		},
		loginFn: func(email, password string) (string, error) {
			return "jwt-token-123", nil
		},
	}
	app := newApp(svc)
	resp := doRequest(app, http.MethodPost, "/api/v1/auth/register", map[string]string{
		"email": "jane@example.com", "password": "secret", "username": "jane",
	})
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("want 201, got %d", resp.StatusCode)
	}
	body := parseBody(resp)
	if body["token"] != "jwt-token-123" {
		t.Errorf("expected token in response, got %v", body)
	}
}

func TestRegisterDuplicate(t *testing.T) {
	svc := &mockAuthService{
		registerFn: func(email, password, username string) (*users.User, error) {
			return nil, fiber.NewError(fiber.StatusConflict, "user already exists")
		},
	}
	app := newApp(svc)
	resp := doRequest(app, http.MethodPost, "/api/v1/auth/register", map[string]string{
		"email": "dup@example.com", "password": "secret", "username": "dup",
	})
	if resp.StatusCode != http.StatusConflict {
		t.Fatalf("want 409, got %d", resp.StatusCode)
	}
}

func TestRegisterBadBody(t *testing.T) {
	svc := &mockAuthService{}
	app := newApp(svc)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register",
		strings.NewReader("{not-json}"))
	req.Header.Set("Content-Type", "application/json")
	resp, _ := app.Test(req, -1)
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("want 400, got %d", resp.StatusCode)
	}
}

func TestRegisterMissingFields(t *testing.T) {
	svc := &mockAuthService{}
	app := newApp(svc)
	resp := doRequest(app, http.MethodPost, "/api/v1/auth/register", map[string]string{
		"email": "nopass@example.com",
		// password and username missing
	})
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("want 400, got %d", resp.StatusCode)
	}
}

func TestLoginOK(t *testing.T) {
	svc := &mockAuthService{
		loginFn: func(email, password string) (string, error) {
			return "login-jwt-456", nil
		},
	}
	app := newApp(svc)
	resp := doRequest(app, http.MethodPost, "/api/v1/auth/login", map[string]string{
		"email": "user@example.com", "password": "correct",
	})
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("want 200, got %d", resp.StatusCode)
	}
	body := parseBody(resp)
	if body["token"] != "login-jwt-456" {
		t.Errorf("expected token in response, got %v", body)
	}
}

func TestLoginWrongPassword(t *testing.T) {
	svc := &mockAuthService{
		loginFn: func(email, password string) (string, error) {
			return "", fiber.NewError(fiber.StatusUnauthorized, "invalid email or password")
		},
	}
	app := newApp(svc)
	resp := doRequest(app, http.MethodPost, "/api/v1/auth/login", map[string]string{
		"email": "user@example.com", "password": "wrong",
	})
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("want 401, got %d", resp.StatusCode)
	}
}

func TestGoogleRedirectOK(t *testing.T) {
	svc := &mockAuthService{
		googleRedirectFn: func(state string) string {
			return "https://accounts.google.com/o/oauth2/auth?state=" + state
		},
	}
	app := newApp(svc)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/google", nil)
	resp, _ := app.Test(req, -1)

	// Fiber's Redirect returns 302 by default; our handler uses StatusTemporaryRedirect (307)
	if resp.StatusCode != http.StatusTemporaryRedirect {
		t.Fatalf("want 307, got %d", resp.StatusCode)
	}
	location := resp.Header.Get("Location")
	if !strings.Contains(location, "accounts.google.com") {
		t.Errorf("expected Location to contain accounts.google.com, got %q", location)
	}
	// State cookie must be set
	var found bool
	for _, c := range resp.Cookies() {
		if c.Name == "oauth_state" && c.Value != "" {
			found = true
		}
	}
	if !found {
		t.Error("expected oauth_state cookie to be set")
	}
}

func TestGoogleCallbackOK(t *testing.T) {
	const wantToken = "google-jwt-789"
	svc := &mockAuthService{
		googleCallbackFn: func(ctx context.Context, code string) (string, error) {
			return wantToken, nil
		},
	}
	app := newApp(svc)

	stateCookie := &http.Cookie{Name: "oauth_state", Value: "my-state-value"}
	resp := doRequest(app, http.MethodGet,
		"/api/v1/auth/google/callback?code=authcode&state=my-state-value",
		nil, stateCookie)

	if resp.StatusCode != http.StatusTemporaryRedirect {
		t.Fatalf("want 307 redirect, got %d", resp.StatusCode)
	}
	loc := resp.Header.Get("Location")
	wantLoc := "http://localhost:3000/auth/callback?token=" + wantToken
	if loc != wantLoc {
		t.Errorf("expected Location %q, got %q", wantLoc, loc)
	}
}

func TestGoogleCallbackBadState(t *testing.T) {
	svc := &mockAuthService{}
	app := newApp(svc)

	stateCookie := &http.Cookie{Name: "oauth_state", Value: "correct-state"}
	resp := doRequest(app, http.MethodGet,
		"/api/v1/auth/google/callback?code=authcode&state=WRONG-state",
		nil, stateCookie)

	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("want 400, got %d", resp.StatusCode)
	}
}
