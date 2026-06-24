package users

import (
	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	svc IUserService
}

func NewHandler(svc IUserService) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterRoutes(r fiber.Router) {
	r.Get("/api/v1/users/:identifier", h.GetPublicProfile)
}

func (h *Handler) GetPublicProfile(c *fiber.Ctx) error {
	identifier := c.Params("identifier")
	profile, err := h.svc.GetPublicProfile(c.UserContext(), identifier)
	if err != nil {
		if err == ErrNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"success": false,
				"error":   "user not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "failed to retrieve public profile",
		})
	}

	return c.Status(fiber.StatusOK).JSON(profile)
}