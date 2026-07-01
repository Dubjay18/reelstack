package notifications

import (
	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	svc INotificationService
}

func NewHandler(svc INotificationService) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterRoutes(r fiber.Router, authMiddleware fiber.Handler) {
	notifs := r.Group("/api/v1/notifications", authMiddleware)
	notifs.Get("", h.GetNotifications)
	notifs.Put("/read-all", h.MarkAllAsRead)
	notifs.Put("/:id/read", h.MarkAsRead)
}

func (h *Handler) GetNotifications(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	notifs, err := h.svc.GetNotifications(c.UserContext(), userID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to retrieve notifications")
	}
	return c.JSON(notifs)
}

func (h *Handler) MarkAsRead(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	id := c.Params("id")
	if err := h.svc.MarkAsRead(c.UserContext(), id, userID); err != nil {
		if err == ErrNotFound {
			return fiber.NewError(fiber.StatusNotFound, "notification not found")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "failed to mark notification as read")
	}
	return c.JSON(fiber.Map{"success": true})
}

func (h *Handler) MarkAllAsRead(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	if err := h.svc.MarkAllAsRead(c.UserContext(), userID); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to mark all notifications as read")
	}
	return c.JSON(fiber.Map{"success": true})
}
