package embed

import (
	"github.com/Dubjay18/reelstack/api/internal/lists"
	"github.com/Dubjay18/reelstack/api/internal/users"
	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	userRepo users.IUserRepository
	listRepo lists.IListRepository
}

func NewHandler(userRepo users.IUserRepository, listRepo lists.IListRepository) *Handler {
	return &Handler{
		userRepo: userRepo,
		listRepo: listRepo,
	}
}

func (h *Handler) RegisterRoutes(r fiber.Router) {
	r.Get("/api/v1/embed/:username/:slug", h.GetEmbedList)
}

func (h *Handler) GetEmbedList(c *fiber.Ctx) error {
	username := c.Params("username")
	slug := c.Params("slug")

	// 1. Resolve user by username
	user, err := h.userRepo.GetUserByUsername(username)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "database error resolving user",
		})
	}
	if user == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "user not found",
		})
	}

	// 2. Resolve list by user ID and slug
	list, err := h.listRepo.GetListBySlug(c.UserContext(), user.ID.String(), slug)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "database error resolving list",
		})
	}

	// 3. Visibility check: Only public lists are embeddable
	if list == nil || !list.IsPublic {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "list not found",
		})
	}

	// 4. Retrieve list items
	items, err := h.listRepo.GetItemsByListID(c.UserContext(), list.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "database error retrieving items",
		})
	}

	// 5. Set Cache-Control header
	c.Set("Cache-Control", "public, max-age=300")

	// 6. Return response
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"list":  list,
		"items": items,
	})
}