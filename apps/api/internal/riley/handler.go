package riley

import (
	"database/sql"
	"errors"
	"log/slog"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	svc        IService
	cronSecret string
}

func NewHandler(svc IService, cronSecret string) *Handler {
	return &Handler{svc: svc, cronSecret: cronSecret}
}

func (h *Handler) RegisterRoutes(r fiber.Router, authMW fiber.Handler) {
	r.Get("/api/v1/riley/digest", h.GetDigest)
	r.Get("/api/v1/riley/top", h.GetTop)
	r.Get("/api/v1/riley/foryou", authMW, h.GetForYou)
	r.Post("/api/v1/riley/chat", authMW, h.Chat)
	r.Post("/api/v1/riley/lists/confirm", authMW, h.ConfirmListProposal)
}

func (h *Handler) RegisterCronRoute(r fiber.Router) {
	r.Post("/api/v1/cron/riley", h.RefreshArtifacts)
}

func (h *Handler) GetDigest(c *fiber.Ctx) error {
	digest, err := h.svc.GetDigest(c.UserContext())
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return fiber.NewError(fiber.StatusNotFound, "no digest yet")
		}
		slog.Error("riley: failed to fetch digest", "error", err)
		return fiber.NewError(fiber.StatusInternalServerError, "failed to fetch digest")
	}
	return c.JSON(digest)
}

func (h *Handler) GetTop(c *fiber.Ctx) error {
	top, err := h.svc.GetTop(c.UserContext())
	if err != nil {
		slog.Error("riley: failed to fetch top lists", "error", err)
		return fiber.NewError(fiber.StatusInternalServerError, "failed to fetch top lists")
	}
	return c.JSON(top)
}

func (h *Handler) GetForYou(c *fiber.Ctx) error {
	userID, _ := c.Locals("userID").(string)
	if userID == "" {
		return fiber.NewError(fiber.StatusUnauthorized, "unauthorized")
	}

	forYou, err := h.svc.GetForYou(c.UserContext(), userID)
	if err != nil {
		slog.Error("riley: failed to fetch for-you list", "error", err, "user_id", userID)
		return fiber.NewError(fiber.StatusInternalServerError, "failed to fetch recommendations")
	}
	return c.JSON(forYou)
}

type chatRequest struct {
	Messages []ChatMessage `json:"messages"`
}

func (h *Handler) Chat(c *fiber.Ctx) error {
	userID, _ := c.Locals("userID").(string)
	if userID == "" {
		return fiber.NewError(fiber.StatusUnauthorized, "unauthorized")
	}

	var req chatRequest
	if err := c.BodyParser(&req); err != nil || len(req.Messages) == 0 {
		return fiber.NewError(fiber.StatusBadRequest, "messages are required")
	}

	result, err := h.svc.Chat(c.UserContext(), userID, req.Messages)
	if err != nil {
		switch {
		case errors.Is(err, ErrLLMDisabled):
			return fiber.NewError(fiber.StatusServiceUnavailable, "Riley is offline")
		case errors.Is(err, ErrAllProvidersExhausted):
			// Server-side capacity, not this user overspending — their own
			// budget is enforced separately by checkRateLimit. 503 reuses the
			// "Riley is offline" shape the frontend already handles.
			c.Set("Retry-After", "300")
			return fiber.NewError(fiber.StatusServiceUnavailable, "Riley is over capacity — try again shortly")
		case errors.Is(err, ErrRateLimited):
			c.Set("Retry-After", "60")
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":       "Riley needs a breather — try again in a minute",
				"retry_after": 60,
			})
		case errors.Is(err, ErrDailyLimited):
			retryAfter := secondsUntilUTCMidnight()
			c.Set("Retry-After", strconv.Itoa(retryAfter))
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":       "You've hit today's chat limit with Riley — see you tomorrow",
				"retry_after": retryAfter,
			})
		default:
			slog.Error("riley: chat failed", "error", err, "user_id", userID)
			return fiber.NewError(fiber.StatusInternalServerError, "Riley couldn't reply")
		}
	}

	return c.JSON(result)
}

func (h *Handler) ConfirmListProposal(c *fiber.Ctx) error {
	userID, _ := c.Locals("userID").(string)
	if userID == "" {
		return fiber.NewError(fiber.StatusUnauthorized, "unauthorized")
	}

	var proposal ProposedList
	if err := c.BodyParser(&proposal); err != nil || proposal.Title == "" {
		return fiber.NewError(fiber.StatusBadRequest, "a proposed list with a title is required")
	}

	confirmed, err := h.svc.ConfirmListProposal(c.UserContext(), userID, proposal)
	if err != nil {
		if errors.Is(err, ErrListCreateLimited) {
			retryAfter := secondsUntilUTCMidnight()
			c.Set("Retry-After", strconv.Itoa(retryAfter))
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":       "You've hit today's list-creation limit with Riley — see you tomorrow",
				"retry_after": retryAfter,
			})
		}
		slog.Error("riley: list proposal confirmation failed", "error", err, "user_id", userID)
		return fiber.NewError(fiber.StatusInternalServerError, "couldn't create that list")
	}
	return c.Status(fiber.StatusCreated).JSON(confirmed)
}

func (h *Handler) RefreshArtifacts(c *fiber.Ctx) error {
	if h.cronSecret == "" || c.Get("X-Cron-Secret") != h.cronSecret {
		return c.SendStatus(fiber.StatusUnauthorized)
	}

	// Partial failures still land what succeeded; report per-section status.
	status, err := h.svc.Refresh(c.Context())
	code := fiber.StatusOK
	if err != nil {
		code = fiber.StatusInternalServerError
	}
	return c.Status(code).JSON(fiber.Map{
		"success": err == nil,
		"status":  status,
	})
}
