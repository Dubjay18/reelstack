package curators

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	svc        ICuratorService
	cronSecret string
}

func NewHandler(svc ICuratorService, cronSecret string) *Handler {
	return &Handler{svc: svc, cronSecret: cronSecret}
}

func (h *Handler) RegisterRoutes(r fiber.Router) {
	r.Get("/api/v1/curators/leaderboard", h.GetLeaderboard)
}

func (h *Handler) RegisterCronRoute(r fiber.Router) {
	r.Post("/api/v1/cron/scores", h.RefreshScores)
}

func (h *Handler) GetLeaderboard(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))

	entries, computedAt, err := h.svc.GetLeaderboard(c.UserContext(), limit, offset)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to fetch leaderboard")
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"curators":    entries,
		"computed_at": computedAt,
	})
}

func (h *Handler) RefreshScores(c *fiber.Ctx) error {
	if h.cronSecret == "" || c.Get("X-Cron-Secret") != h.cronSecret {
		return c.SendStatus(fiber.StatusUnauthorized)
	}

	if err := h.svc.RefreshScores(c.Context()); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to refresh scores")
	}

	return c.JSON(fiber.Map{"success": true})
}
