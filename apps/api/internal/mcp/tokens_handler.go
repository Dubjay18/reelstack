package mcp

import (
	"errors"
	"log/slog"
	"strings"

	"github.com/gofiber/fiber/v2"
)

// TokensHandler exposes REST endpoints for users to manage their own MCP
// Personal Access Tokens from the Reelstack web app (settings page).
type TokensHandler struct {
	svc *TokenService
}

func NewTokensHandler(svc *TokenService) *TokensHandler {
	return &TokensHandler{svc: svc}
}

func (h *TokensHandler) RegisterRoutes(r fiber.Router, authMW fiber.Handler) {
	r.Post("/api/v1/mcp-tokens", authMW, h.Create)
	r.Get("/api/v1/mcp-tokens", authMW, h.List)
	r.Delete("/api/v1/mcp-tokens/:id", authMW, h.Revoke)
}

type createTokenRequest struct {
	Name string `json:"name"`
}

func (h *TokensHandler) Create(c *fiber.Ctx) error {
	userID, _ := c.Locals("userID").(string)

	var req createTokenRequest
	if err := c.BodyParser(&req); err != nil || strings.TrimSpace(req.Name) == "" {
		return fiber.NewError(fiber.StatusBadRequest, "name is required")
	}

	plaintext, token, err := h.svc.CreateToken(c.UserContext(), userID, strings.TrimSpace(req.Name))
	if err != nil {
		slog.Error("mcp: failed to create token", "error", err, "user_id", userID)
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create token")
	}

	// The plaintext token is only ever shown here, at creation time.
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"token":      plaintext,
		"id":         token.ID,
		"name":       token.Name,
		"created_at": token.CreatedAt,
	})
}

func (h *TokensHandler) List(c *fiber.Ctx) error {
	userID, _ := c.Locals("userID").(string)

	tokens, err := h.svc.ListTokens(c.UserContext(), userID)
	if err != nil {
		slog.Error("mcp: failed to list tokens", "error", err, "user_id", userID)
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list tokens")
	}
	return c.JSON(fiber.Map{"tokens": tokens})
}

func (h *TokensHandler) Revoke(c *fiber.Ctx) error {
	userID, _ := c.Locals("userID").(string)
	id := c.Params("id")

	if err := h.svc.Revoke(c.UserContext(), id, userID); err != nil {
		if errors.Is(err, ErrTokenNotFound) {
			return fiber.NewError(fiber.StatusNotFound, "token not found")
		}
		slog.Error("mcp: failed to revoke token", "error", err, "user_id", userID)
		return fiber.NewError(fiber.StatusInternalServerError, "failed to revoke token")
	}
	return c.SendStatus(fiber.StatusNoContent)
}
