package auth

import (
	"crypto/rand"
	"encoding/base64"
	"log/slog"
	"time"

	"github.com/gofiber/fiber/v2"
)

const (
	stateCookieName = "oauth_state"
	stateCookieTTL  = 5 * time.Minute
)

// Handler holds the auth service and exposes HTTP handlers for Fiber.
type Handler struct {
	svc    IAuthService
	appURL string
}

// NewHandler constructs an auth Handler.
func NewHandler(svc IAuthService, appURL string) *Handler {
	return &Handler{svc: svc, appURL: appURL}
}

// RegisterRoutes mounts all auth routes under /api/auth.
func (h *Handler) RegisterRoutes(r fiber.Router) {
	auth := r.Group("/api/v1/auth")
	auth.Post("/register", h.Register)
	auth.Post("/login", h.Login)
	auth.Get("/google", h.GoogleRedirect)
	auth.Get("/google/callback", h.GoogleCallback)
}



type registerRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Username string `json:"username"`
}

// Register godoc
//
//	@Summary     Register a new user
//	@Tags        auth
//	@Accept      json
//	@Produce     json
//	@Param       body body registerRequest true "Registration payload"
//	@Success     201  {object} map[string]interface{}
//	@Failure     400  {object} map[string]interface{}
//	@Failure     409  {object} map[string]interface{}
//	@Router      /api/v1/auth/register [post]
func (h *Handler) Register(c *fiber.Ctx) error {
	var req registerRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	if req.Email == "" || req.Password == "" || req.Username == "" {
		return fiber.NewError(fiber.StatusBadRequest, "email, password, and username are required")
	}

	user, err := h.svc.RegisterUser(req.Email, req.Password, req.Username)
	if err != nil {
		if err.Error() == "user already exists" {
			return fiber.NewError(fiber.StatusConflict, err.Error())
		}
		slog.Error("failed to register user", "error", err)
		return fiber.NewError(fiber.StatusInternalServerError, "failed to register user")
	}

	// Issue a JWT immediately after registration so the client is signed in.
	token, err := h.svc.LoginUser(req.Email, req.Password)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "user created but token generation failed")
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"token":   token,
		"user": fiber.Map{
			"id":       user.ID,
			"email":    user.Email,
			"username": user.Username,
		},
	})
}


type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// Login godoc
//
//	@Summary     Login with email and password
//	@Tags        auth
//	@Accept      json
//	@Produce     json
//	@Param       body body loginRequest true "Login payload"
//	@Success     200  {object} map[string]interface{}
//	@Failure     400  {object} map[string]interface{}
//	@Failure     401  {object} map[string]interface{}
//	@Router      /api/v1/auth/login [post]
func (h *Handler) Login(c *fiber.Ctx) error {
	var req loginRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	if req.Email == "" || req.Password == "" {
		return fiber.NewError(fiber.StatusBadRequest, "email and password are required")
	}

	token, err := h.svc.LoginUser(req.Email, req.Password)
	if err != nil {
		if err.Error() == "invalid email or password" {
			return fiber.NewError(fiber.StatusUnauthorized, err.Error())
		}
		slog.Error("failed to login user", "error", err)
		return fiber.NewError(fiber.StatusInternalServerError, "failed to login user")
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"token":   token,
	})
}


// GoogleRedirect generates a CSRF state token, stores it in a short-lived
// cookie, and redirects the browser to Google's consent screen.
func (h *Handler) GoogleRedirect(c *fiber.Ctx) error {
	state, err := generateState()
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to generate state")
	}

	c.Cookie(&fiber.Cookie{
		Name:     stateCookieName,
		Value:    state,
		Expires:  time.Now().Add(stateCookieTTL),
		HTTPOnly: true,
		SameSite: "Lax",
		Secure:   false, // set true in prod behind TLS
	})

	redirectURL := h.svc.GoogleRedirectURL(state)
	return c.Redirect(redirectURL, fiber.StatusTemporaryRedirect)
}


// GoogleCallback validates the CSRF state, exchanges the code for a profile,
// upserts the user, and returns a signed JWT.
func (h *Handler) GoogleCallback(c *fiber.Ctx) error {
	state := c.Query("state")
	cookieState := c.Cookies(stateCookieName)

	if state == "" || cookieState == "" || state != cookieState {
		return fiber.NewError(fiber.StatusBadRequest, "invalid or missing OAuth state")
	}

	// Clear the state cookie immediately.
	c.Cookie(&fiber.Cookie{
		Name:    stateCookieName,
		Value:   "",
		Expires: time.Unix(0, 0),
	})

	code := c.Query("code")
	if code == "" {
		return fiber.NewError(fiber.StatusBadRequest, "missing authorization code")
	}

	token, err := h.svc.GoogleCallback(c.Context(), code)
	if err != nil {
		slog.Error("Google auth callback failed", "error", err)
		return fiber.NewError(fiber.StatusUnauthorized, "Google authentication failed")
	}

	return c.Redirect(h.appURL+"/auth/callback?token="+token, fiber.StatusTemporaryRedirect)
}


// generateState produces a cryptographically random, URL-safe base64 string.
func generateState() (string, error) {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}
