package pushtokens

import (
	"errors"
	"log/slog"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	svc IPushTokenService
}

func NewHandler(svc IPushTokenService) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterRoutes(r fiber.Router, authMiddleware fiber.Handler) {
	tokens := r.Group("/api/v1/push-tokens", authMiddleware)
	tokens.Post("", h.Register)
	tokens.Delete("", h.Unregister)
}

func userIDFromLocals(c *fiber.Ctx) (string, error) {
	userID, ok := c.Locals("userID").(string)
	if !ok || userID == "" {
		return "", fiber.NewError(fiber.StatusUnauthorized, "unauthorized")
	}
	return userID, nil
}

type registerRequest struct {
	Token    string `json:"token"`
	Platform string `json:"platform"`
}

func (h *Handler) Register(c *fiber.Ctx) error {
	userID, err := userIDFromLocals(c)
	if err != nil {
		return err
	}

	var req registerRequest
	if err := c.BodyParser(&req); err != nil || strings.TrimSpace(req.Token) == "" {
		return fiber.NewError(fiber.StatusBadRequest, "token is required")
	}

	if err := h.svc.Register(c.UserContext(), userID, req.Token, req.Platform); err != nil {
		if errors.Is(err, ErrInvalidPlatform) {
			return fiber.NewError(fiber.StatusBadRequest, err.Error())
		}
		slog.Error("push_tokens: failed to register", "error", err, "user_id", userID)
		return fiber.NewError(fiber.StatusInternalServerError, "failed to register push token")
	}
	return c.JSON(fiber.Map{"success": true})
}

type unregisterRequest struct {
	Token string `json:"token"`
}

func (h *Handler) Unregister(c *fiber.Ctx) error {
	userID, err := userIDFromLocals(c)
	if err != nil {
		return err
	}

	var req unregisterRequest
	if err := c.BodyParser(&req); err != nil || strings.TrimSpace(req.Token) == "" {
		return fiber.NewError(fiber.StatusBadRequest, "token is required")
	}

	if err := h.svc.Unregister(c.UserContext(), userID, req.Token); err != nil {
		slog.Error("push_tokens: failed to unregister", "error", err, "user_id", userID)
		return fiber.NewError(fiber.StatusInternalServerError, "failed to unregister push token")
	}
	return c.JSON(fiber.Map{"success": true})
}
