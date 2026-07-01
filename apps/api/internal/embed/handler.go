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

	user, err := h.userRepo.GetUserByUsername(username)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "database error resolving user")
	}
	if user == nil {
		return fiber.NewError(fiber.StatusNotFound, "user not found")
	}

	list, err := h.listRepo.GetListBySlug(c.UserContext(), user.ID.String(), slug)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "database error resolving list")
	}

	if list == nil || !list.IsPublic {
		return fiber.NewError(fiber.StatusNotFound, "list not found")
	}

	items, err := h.listRepo.GetItemsByListID(c.UserContext(), list.ID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "database error retrieving items")
	}

	c.Set("Cache-Control", "public, max-age=300")

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"list":  list,
		"items": items,
	})
}
