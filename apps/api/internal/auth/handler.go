package auth

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"log/slog"
	"strings"
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
	auth.Post("/forgot-password", h.ForgotPassword)
	auth.Post("/reset-password", h.ResetPassword)
	auth.Post("/verify-email", h.VerifyEmail)
}

// RegisterAuthedRoutes mounts auth routes that require an authenticated user.
func (h *Handler) RegisterAuthedRoutes(r fiber.Router, authMiddleware fiber.Handler) {
	auth := r.Group("/api/v1/auth", authMiddleware)
	auth.Post("/resend-verification", h.ResendVerification)
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
		if errors.Is(err, ErrUserAlreadyExists) {
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
		if errors.Is(err, ErrInvalidCredentials) {
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
//
// Optional query parameter:
//
//   - redirect_uri: the URL the API should redirect back to after a successful
//     Google login. Both web (http://...) and mobile deep-link (reelstack://...)
//     schemes are accepted. When provided, it is Base64-encoded and appended to
//     the OAuth state string (separated by "___") so it survives the round-trip
//     through Google's servers. When omitted, the API falls back to its
//     configured APP_URL + "/auth/callback".
func (h *Handler) GoogleRedirect(c *fiber.Ctx) error {
	state, err := generateState()
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to generate state")
	}

	// Determine if connection is secure (HTTPS) or running in production behind a reverse proxy.
	secure := c.Get("X-Forwarded-Proto") == "https" || c.Protocol() == "https" || strings.HasPrefix(h.appURL, "https://")

	c.Cookie(&fiber.Cookie{
		Name:     stateCookieName,
		Value:    state,
		Expires:  time.Now().Add(stateCookieTTL),
		HTTPOnly: true,
		SameSite: "Lax",
		Secure:   secure,
	})

	// Support custom redirection (e.g. mobile deep linking)
	customRedirect := c.Query("redirect_uri")
	oAuthState := state
	if customRedirect != "" {
		encodedRedirect := base64.RawURLEncoding.EncodeToString([]byte(customRedirect))
		oAuthState = state + "___" + encodedRedirect
	}

	redirectURL := h.svc.GoogleRedirectURL(oAuthState)
	return c.Redirect(redirectURL, fiber.StatusTemporaryRedirect)
}

// GoogleCallback validates the CSRF state, exchanges the code for a Google
// profile, upserts the user, issues a signed JWT, and redirects the client.
//
// If the incoming state contains a "___"-encoded redirect_uri (injected by
// GoogleRedirect), the JWT token is appended as a query param to that URI.
// Otherwise the default APP_URL + "/auth/callback" destination is used.
func (h *Handler) GoogleCallback(c *fiber.Ctx) error {
	state := c.Query("state")
	cookieState := c.Cookies(stateCookieName)

	var originalState string
	var customRedirectDecoded string

	if strings.Contains(state, "___") {
		parts := strings.Split(state, "___")
		originalState = parts[0]
		if len(parts) > 1 {
			decodedBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
			if err == nil {
				customRedirectDecoded = string(decodedBytes)
			}
		}
	} else {
		originalState = state
	}

	if originalState == "" || cookieState == "" || originalState != cookieState {
		slog.Error("OAuth state validation failed",
			"query_state", state,
			"parsed_original_state", originalState,
			"cookie_state", cookieState,
		)
		return fiber.NewError(fiber.StatusBadRequest, "invalid or missing OAuth state")
	}

	// Clear the state cookie immediately, matching the original security options.
	secure := c.Get("X-Forwarded-Proto") == "https" || c.Protocol() == "https" || strings.HasPrefix(h.appURL, "https://")
	c.Cookie(&fiber.Cookie{
		Name:     stateCookieName,
		Value:    "",
		Expires:  time.Unix(0, 0),
		HTTPOnly: true,
		SameSite: "Lax",
		Secure:   secure,
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

	redirectDest := h.appURL + "/auth/callback?token=" + token
	if customRedirectDecoded != "" {
		if strings.Contains(customRedirectDecoded, "?") {
			redirectDest = customRedirectDecoded + "&token=" + token
		} else {
			redirectDest = customRedirectDecoded + "?token=" + token
		}
	}

	return c.Redirect(redirectDest, fiber.StatusTemporaryRedirect)
}

type forgotPasswordRequest struct {
	Email string `json:"email"`
}

// ForgotPassword always returns 200 regardless of whether the email is
// registered, so this endpoint can't be used to enumerate accounts.
func (h *Handler) ForgotPassword(c *fiber.Ctx) error {
	var req forgotPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	if req.Email == "" {
		return fiber.NewError(fiber.StatusBadRequest, "email is required")
	}

	if err := h.svc.RequestPasswordReset(c.UserContext(), req.Email); err != nil {
		slog.Error("failed to request password reset", "error", err)
		return fiber.NewError(fiber.StatusInternalServerError, "failed to process request")
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": "If that email is registered, a reset link has been sent.",
	})
}

type resetPasswordRequest struct {
	Token       string `json:"token"`
	NewPassword string `json:"new_password"`
}

func (h *Handler) ResetPassword(c *fiber.Ctx) error {
	var req resetPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	if req.Token == "" || req.NewPassword == "" {
		return fiber.NewError(fiber.StatusBadRequest, "token and new_password are required")
	}

	if err := h.svc.ResetPassword(c.UserContext(), req.Token, req.NewPassword); err != nil {
		switch {
		case errors.Is(err, ErrTokenInvalid), errors.Is(err, ErrTokenUsed), errors.Is(err, ErrTokenExpired):
			return fiber.NewError(fiber.StatusBadRequest, "invalid or expired reset link")
		default:
			slog.Error("failed to reset password", "error", err)
			return fiber.NewError(fiber.StatusInternalServerError, "failed to reset password")
		}
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"success": true})
}

type verifyEmailRequest struct {
	Token string `json:"token"`
}

func (h *Handler) VerifyEmail(c *fiber.Ctx) error {
	var req verifyEmailRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	if req.Token == "" {
		return fiber.NewError(fiber.StatusBadRequest, "token is required")
	}

	if err := h.svc.VerifyEmail(c.UserContext(), req.Token); err != nil {
		switch {
		case errors.Is(err, ErrTokenInvalid), errors.Is(err, ErrTokenUsed), errors.Is(err, ErrTokenExpired):
			return fiber.NewError(fiber.StatusBadRequest, "invalid or expired verification link")
		default:
			slog.Error("failed to verify email", "error", err)
			return fiber.NewError(fiber.StatusInternalServerError, "failed to verify email")
		}
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"success": true})
}

// ResendVerification re-sends the verification email for the authenticated user.
func (h *Handler) ResendVerification(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(string)
	if !ok || userID == "" {
		return fiber.NewError(fiber.StatusUnauthorized, "authentication required")
	}

	if err := h.svc.ResendVerification(c.UserContext(), userID); err != nil {
		slog.Error("failed to resend verification email", "error", err)
		return fiber.NewError(fiber.StatusInternalServerError, "failed to resend verification email")
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"success": true})
}

// generateState produces a cryptographically random, URL-safe base64 string.
func generateState() (string, error) {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}
