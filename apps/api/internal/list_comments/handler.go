package list_comments

import (
	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	svc IListCommentService
}

func NewHandler(svc IListCommentService) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterRoutes(r fiber.Router, authMiddleware fiber.Handler, optionalAuthMiddleware fiber.Handler) {
	lc := r.Group("/api/v1/lists/:listId/comments")
	lc.Get("", optionalAuthMiddleware, h.GetComments)
	lc.Post("", authMiddleware, h.CreateComment)
	lc.Delete("/:id", authMiddleware, h.DeleteComment)
}

func (h *Handler) GetComments(c *fiber.Ctx) error {
	listID := c.Params("listId")

	comments, err := h.svc.GetComments(c.UserContext(), listID)
	if err != nil {
		if err == ErrListNotFound {
			return fiber.NewError(fiber.StatusNotFound, "list not found")
		}
		if err == ErrListNotPublic {
			return fiber.NewError(fiber.StatusForbidden, "cannot view comments on a private list")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "failed to retrieve comments")
	}

	if comments == nil {
		comments = []*ListComment{}
	}

	return c.Status(fiber.StatusOK).JSON(comments)
}

func (h *Handler) CreateComment(c *fiber.Ctx) error {
	listID := c.Params("listId")

	var input CreateListCommentInput
	if err := c.BodyParser(&input); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}

	userID := c.Locals("userID").(string)

	comment, err := h.svc.CreateComment(c.UserContext(), userID, listID, input)
	if err != nil {
		if err == ErrBodyRequired || err == ErrBodyTooLong || err == ErrInvalidType {
			return fiber.NewError(fiber.StatusBadRequest, err.Error())
		}
		if err == ErrListNotFound {
			return fiber.NewError(fiber.StatusNotFound, "list not found")
		}
		if err == ErrListNotPublic {
			return fiber.NewError(fiber.StatusForbidden, "cannot comment on a private list")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create comment")
	}

	return c.Status(fiber.StatusCreated).JSON(comment)
}

func (h *Handler) DeleteComment(c *fiber.Ctx) error {
	commentID := c.Params("id")
	userID := c.Locals("userID").(string)

	if err := h.svc.DeleteComment(c.UserContext(), commentID, userID); err != nil {
		if err == ErrNotFound {
			return fiber.NewError(fiber.StatusNotFound, "comment not found")
		}
		if err == ErrForbidden {
			return fiber.NewError(fiber.StatusForbidden, "you can only delete your own comments")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "failed to delete comment")
	}

	return c.SendStatus(fiber.StatusNoContent)
}
