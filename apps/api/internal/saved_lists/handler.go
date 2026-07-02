package saved_lists

import (
	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	svc ISavedListService
}

func NewHandler(svc ISavedListService) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterRoutes(r fiber.Router, authMiddleware fiber.Handler) {
	lists := r.Group("/api/v1/lists", authMiddleware)
	lists.Post("/:listId/save", h.Save)
	lists.Delete("/:listId/save", h.Unsave)
	lists.Get("/:listId/save-status", h.GetSaveStatus)

	r.Get("/api/v1/saved-lists", authMiddleware, h.GetSavedLists)
}

func (h *Handler) Save(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	listID := c.Params("listId")

	if err := h.svc.Save(c.UserContext(), userID, listID); err != nil {
		if err == ErrCannotSaveOwnList {
			return fiber.NewError(fiber.StatusBadRequest, err.Error())
		}
		if err == ErrListNotFound {
			return fiber.NewError(fiber.StatusNotFound, "list not found")
		}
		if err == ErrListNotPublic {
			return fiber.NewError(fiber.StatusBadRequest, err.Error())
		}
		return fiber.NewError(fiber.StatusInternalServerError, "failed to save list")
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"success": true})
}

func (h *Handler) Unsave(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	listID := c.Params("listId")

	if err := h.svc.Unsave(c.UserContext(), userID, listID); err != nil {
		if err == ErrListNotFound {
			return fiber.NewError(fiber.StatusNotFound, "list not found")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "failed to unsave list")
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"success": true})
}

func (h *Handler) GetSaveStatus(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	listID := c.Params("listId")

	isSaved, err := h.svc.IsSaved(c.UserContext(), userID, listID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to check save status")
	}

	saveCount, err := h.svc.GetSaveCount(c.UserContext(), listID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to get save count")
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"saved":      isSaved,
		"save_count": saveCount,
	})
}

func (h *Handler) GetSavedLists(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	lists, err := h.svc.GetSavedLists(c.UserContext(), userID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to retrieve saved lists")
	}

	return c.Status(fiber.StatusOK).JSON(lists)
}
