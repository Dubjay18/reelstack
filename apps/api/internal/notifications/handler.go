package notifications

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/gofiber/fiber/v2"
)

// queryTimeout bounds each DB call independently of the client's request
// context, so a client that disconnects mid-poll (useNotifications polls
// every 30s) doesn't turn into an untraceable canceled-context 500.
const queryTimeout = 5 * time.Second

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

func userIDFromLocals(c *fiber.Ctx) (string, error) {
	userID, ok := c.Locals("userID").(string)
	if !ok || userID == "" {
		return "", fiber.NewError(fiber.StatusUnauthorized, "unauthorized")
	}
	return userID, nil
}

func (h *Handler) GetNotifications(c *fiber.Ctx) error {
	userID, err := userIDFromLocals(c)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), queryTimeout)
	defer cancel()

	notifs, err := h.svc.GetNotifications(ctx, userID)
	if err != nil {
		slog.Error("failed to get notifications", "error", err, "user_id", userID)
		return fiber.NewError(fiber.StatusInternalServerError, "failed to retrieve notifications")
	}
	if notifs == nil {
		notifs = []*Notification{}
	}
	return c.JSON(notifs)
}

func (h *Handler) MarkAsRead(c *fiber.Ctx) error {
	userID, err := userIDFromLocals(c)
	if err != nil {
		return err
	}
	id := c.Params("id")

	ctx, cancel := context.WithTimeout(context.Background(), queryTimeout)
	defer cancel()

	if err := h.svc.MarkAsRead(ctx, id, userID); err != nil {
		if errors.Is(err, ErrNotFound) {
			return fiber.NewError(fiber.StatusNotFound, "notification not found")
		}
		slog.Error("failed to mark notification as read", "error", err, "user_id", userID, "notification_id", id)
		return fiber.NewError(fiber.StatusInternalServerError, "failed to mark notification as read")
	}
	return c.JSON(fiber.Map{"success": true})
}

func (h *Handler) MarkAllAsRead(c *fiber.Ctx) error {
	userID, err := userIDFromLocals(c)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), queryTimeout)
	defer cancel()

	if err := h.svc.MarkAllAsRead(ctx, userID); err != nil {
		slog.Error("failed to mark all notifications as read", "error", err, "user_id", userID)
		return fiber.NewError(fiber.StatusInternalServerError, "failed to mark all notifications as read")
	}
	return c.JSON(fiber.Map{"success": true})
}
