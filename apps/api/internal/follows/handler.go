package follows

import (
	"github.com/Dubjay18/reelstack/api/internal/users"
	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	svc IFollowService
}

func NewHandler(svc IFollowService) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterRoutes(r fiber.Router, authMiddleware fiber.Handler) {
	// Actions requiring authentication
	r.Post("/api/v1/users/:id/follow", authMiddleware, h.Follow)
	r.Delete("/api/v1/users/:id/follow", authMiddleware, h.Unfollow)
	r.Get("/api/v1/users/:id/follow-status", authMiddleware, h.GetFollowStatus)

	// Open listings
	r.Get("/api/v1/users/:id/followers", h.GetFollowers)
	r.Get("/api/v1/users/:id/following", h.GetFollowing)
}

func (h *Handler) Follow(c *fiber.Ctx) error {
	followerID := c.Locals("userID").(string)
	followingID := c.Params("id")

	if err := h.svc.Follow(c.UserContext(), followerID, followingID); err != nil {
		if err == ErrCannotFollowSelf {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"error":   err.Error(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "failed to follow user",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"success": true})
}

func (h *Handler) Unfollow(c *fiber.Ctx) error {
	followerID := c.Locals("userID").(string)
	followingID := c.Params("id")

	if err := h.svc.Unfollow(c.UserContext(), followerID, followingID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "failed to unfollow user",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"success": true})
}

func (h *Handler) GetFollowStatus(c *fiber.Ctx) error {
	followerID := c.Locals("userID").(string)
	followingID := c.Params("id")

	isFollowing, err := h.svc.IsFollowing(c.UserContext(), followerID, followingID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "failed to check follow status",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"is_following": isFollowing,
	})
}

func (h *Handler) GetFollowers(c *fiber.Ctx) error {
	userID := c.Params("id")
	followersList, err := h.svc.GetFollowers(c.UserContext(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "failed to get followers",
		})
	}

	publicFollowers := make([]users.PublicProfile, len(followersList))
	for i, u := range followersList {
		publicFollowers[i] = u.ToPublicProfile()
	}

	return c.JSON(publicFollowers)
}

func (h *Handler) GetFollowing(c *fiber.Ctx) error {
	userID := c.Params("id")
	followingList, err := h.svc.GetFollowing(c.UserContext(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "failed to get following",
		})
	}

	publicFollowing := make([]users.PublicProfile, len(followingList))
	for i, u := range followingList {
		publicFollowing[i] = u.ToPublicProfile()
	}

	return c.JSON(publicFollowing)
}
