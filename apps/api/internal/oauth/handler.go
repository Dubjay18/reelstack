package oauth

import (
	"errors"
	"log/slog"
	"strings"

	"github.com/gofiber/fiber/v2"
)

// Handler exposes the OAuth 2.1 authorization-server endpoints: discovery
// metadata, dynamic client registration, the consent-issued-code endpoint,
// and the token endpoint.
type Handler struct {
	clients    *ClientService
	tokens     *TokenService
	jwtSecret  string
	apiBaseURL string
	webAppURL  string
}

func NewHandler(clients *ClientService, tokens *TokenService, jwtSecret, apiBaseURL, webAppURL string) *Handler {
	return &Handler{
		clients:    clients,
		tokens:     tokens,
		jwtSecret:  jwtSecret,
		apiBaseURL: apiBaseURL,
		webAppURL:  webAppURL,
	}
}

// Tokens exposes the underlying TokenService so main.go can thread it into
// mcp.AuthMiddleware as the third accepted token kind.
func (h *Handler) Tokens() *TokenService {
	return h.tokens
}

func (h *Handler) RegisterRoutes(r fiber.Router, authMW fiber.Handler) {
	r.Get("/.well-known/oauth-protected-resource", h.protectedResourceMetadata)
	r.Get("/.well-known/oauth-authorization-server", h.authorizationServerMetadata)
	r.Post("/api/v1/oauth/register", h.register)
	r.Get("/api/v1/oauth/clients/:clientID", h.getClient)
	r.Post("/api/v1/oauth/consent", authMW, h.consent)
	r.Post("/api/v1/oauth/token", h.token)
}

func (h *Handler) protectedResourceMetadata(c *fiber.Ctx) error {
	return c.JSON(buildProtectedResourceMetadata(h.apiBaseURL))
}

func (h *Handler) authorizationServerMetadata(c *fiber.Ctx) error {
	return c.JSON(buildAuthorizationServerMetadata(h.apiBaseURL, h.webAppURL))
}

type registerRequest struct {
	ClientName   string   `json:"client_name"`
	RedirectURIs []string `json:"redirect_uris"`
}

// register implements RFC 7591 dynamic client registration for public
// (secret-less, PKCE-only) clients. No authentication is required — that's
// the point of DCR: a client Reelstack has never seen before registers
// itself the moment a user starts adding the connector.
func (h *Handler) register(c *fiber.Ctx) error {
	var req registerRequest
	if err := c.BodyParser(&req); err != nil || len(req.RedirectURIs) == 0 {
		return fiber.NewError(fiber.StatusBadRequest, "redirect_uris is required")
	}

	client, err := h.clients.Register(c.UserContext(), req.ClientName, req.RedirectURIs)
	if err != nil {
		if errors.Is(err, ErrInvalidRedirectURI) {
			return fiber.NewError(fiber.StatusBadRequest, err.Error())
		}
		slog.Error("oauth: failed to register client", "error", err)
		return fiber.NewError(fiber.StatusInternalServerError, "failed to register client")
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"client_id":                  client.ClientID,
		"client_name":                client.Name(),
		"redirect_uris":              []string(client.RedirectURIs),
		"token_endpoint_auth_method": "none",
	})
}

// getClient is a public, read-only lookup the web consent page uses to
// show the user which app (name) and which host (redirect_uri) they're
// about to authorize, before they click Approve — deliberately returns
// only the fields needed to render that, nothing sensitive.
func (h *Handler) getClient(c *fiber.Ctx) error {
	client, err := h.clients.Get(c.UserContext(), c.Params("clientID"))
	if err != nil {
		if errors.Is(err, ErrClientNotFound) {
			return fiber.NewError(fiber.StatusNotFound, "unknown client_id")
		}
		slog.Error("oauth: failed to look up client", "error", err)
		return fiber.NewError(fiber.StatusInternalServerError, "failed to look up client")
	}
	return c.JSON(fiber.Map{
		"client_name":   client.Name(),
		"redirect_uris": []string(client.RedirectURIs),
	})
}

type consentRequest struct {
	ClientID            string `json:"client_id"`
	RedirectURI         string `json:"redirect_uri"`
	CodeChallenge       string `json:"code_challenge"`
	CodeChallengeMethod string `json:"code_challenge_method"`
	State               string `json:"state"`
}

// consent is called by the web app's /oauth/authorize consent page, once
// the already-logged-in user clicks "Approve" — authMW has already
// resolved c.Locals("userID") from their normal session JWT. It mints a
// short-lived authorization code and hands back the URL the page should
// navigate the browser to next, completing the redirect back to the MCP
// client (e.g. Claude Desktop's loopback listener).
func (h *Handler) consent(c *fiber.Ctx) error {
	userID, _ := c.Locals("userID").(string)

	var req consentRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	if req.ClientID == "" || req.RedirectURI == "" || req.CodeChallenge == "" {
		return fiber.NewError(fiber.StatusBadRequest, "client_id, redirect_uri and code_challenge are required")
	}
	if req.CodeChallengeMethod != "S256" {
		return fiber.NewError(fiber.StatusBadRequest, "code_challenge_method must be S256")
	}

	client, err := h.clients.Get(c.UserContext(), req.ClientID)
	if err != nil {
		if errors.Is(err, ErrClientNotFound) {
			return fiber.NewError(fiber.StatusBadRequest, "unknown client_id")
		}
		slog.Error("oauth: failed to look up client", "error", err, "client_id", req.ClientID)
		return fiber.NewError(fiber.StatusInternalServerError, "failed to look up client")
	}
	if !client.HasRedirectURI(req.RedirectURI) {
		return fiber.NewError(fiber.StatusBadRequest, "redirect_uri does not match a registered redirect URI")
	}

	code, err := MintAuthorizationCode(userID, req.ClientID, req.RedirectURI, req.CodeChallenge, req.CodeChallengeMethod, h.jwtSecret)
	if err != nil {
		slog.Error("oauth: failed to mint authorization code", "error", err, "user_id", userID)
		return fiber.NewError(fiber.StatusInternalServerError, "failed to issue authorization code")
	}

	redirectTo := req.RedirectURI + "?code=" + code
	if req.State != "" {
		redirectTo += "&state=" + req.State
	}
	return c.JSON(fiber.Map{"redirect_to": redirectTo})
}

// token implements the RFC 6749 token endpoint for the authorization_code
// and refresh_token grants. No client authentication is required beyond
// PKCE (public client, token_endpoint_auth_method=none) — this mirrors
// what registration advertises in the discovery metadata.
func (h *Handler) token(c *fiber.Ctx) error {
	grantType := c.FormValue("grant_type")
	switch grantType {
	case "authorization_code":
		return h.tokenFromAuthCode(c)
	case "refresh_token":
		return h.tokenFromRefreshToken(c)
	default:
		return fiber.NewError(fiber.StatusBadRequest, "unsupported grant_type")
	}
}

func (h *Handler) tokenFromAuthCode(c *fiber.Ctx) error {
	code := c.FormValue("code")
	redirectURI := c.FormValue("redirect_uri")
	clientID := c.FormValue("client_id")
	codeVerifier := c.FormValue("code_verifier")
	if code == "" || codeVerifier == "" {
		return fiber.NewError(fiber.StatusBadRequest, "code and code_verifier are required")
	}

	claims, err := ResolveAuthorizationCode(code, h.jwtSecret)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid_grant")
	}
	if clientID != "" && claims.ClientID != clientID {
		return fiber.NewError(fiber.StatusBadRequest, "invalid_grant")
	}
	if redirectURI != "" && !strings.EqualFold(claims.RedirectURI, redirectURI) {
		return fiber.NewError(fiber.StatusBadRequest, "invalid_grant")
	}
	if !VerifyPKCE(codeVerifier, claims.CodeChallenge, claims.CodeChallengeMeth) {
		return fiber.NewError(fiber.StatusBadRequest, "invalid_grant")
	}

	accessToken, refreshToken, expiresIn, err := h.tokens.IssueGrant(c.UserContext(), claims.Subject, claims.ClientID)
	if err != nil {
		slog.Error("oauth: failed to issue token grant", "error", err, "user_id", claims.Subject)
		return fiber.NewError(fiber.StatusInternalServerError, "failed to issue token")
	}

	return c.JSON(fiber.Map{
		"access_token":  accessToken,
		"token_type":    "Bearer",
		"expires_in":    expiresIn,
		"refresh_token": refreshToken,
	})
}

func (h *Handler) tokenFromRefreshToken(c *fiber.Ctx) error {
	refreshToken := c.FormValue("refresh_token")
	clientID := c.FormValue("client_id")
	if refreshToken == "" || clientID == "" {
		return fiber.NewError(fiber.StatusBadRequest, "refresh_token and client_id are required")
	}

	accessToken, newRefreshToken, expiresIn, err := h.tokens.Rotate(c.UserContext(), refreshToken, clientID)
	if err != nil {
		if errors.Is(err, ErrRefreshTokenNotFound) {
			return fiber.NewError(fiber.StatusBadRequest, "invalid_grant")
		}
		slog.Error("oauth: failed to rotate refresh token", "error", err)
		return fiber.NewError(fiber.StatusBadRequest, "invalid_grant")
	}

	return c.JSON(fiber.Map{
		"access_token":  accessToken,
		"token_type":    "Bearer",
		"expires_in":    expiresIn,
		"refresh_token": newRefreshToken,
	})
}
