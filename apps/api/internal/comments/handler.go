package comments

import (
	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	svc ICommentService
}

func NewHandler(svc ICommentService) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterRoutes(r fiber.Router, authMiddleware fiber.Handler) {
	content := r.Group("/api/v1/content")
	content.Get("/:type/:tmdbId/comments", h.GetComments)
	content.Post("/:type/:tmdbId/comments", authMiddleware, h.CreateComment)
	content.Delete("/:type/:tmdbId/comments/:id", authMiddleware, h.DeleteComment)
}

func (h *Handler) GetComments(c *fiber.Ctx) error {
	tmdbID, err := c.ParamsInt("tmdbId")
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid tmdbId")
	}
	mediaType := c.Params("type")
	if mediaType != "movie" && mediaType != "tv" {
		return fiber.NewError(fiber.StatusBadRequest, "type must be 'movie' or 'tv'")
	}

	comments, err := h.svc.GetComments(c.UserContext(), tmdbID, mediaType)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to retrieve comments")
	}

	if comments == nil {
		comments = []*Comment{}
	}

	return c.Status(fiber.StatusOK).JSON(comments)
}

func (h *Handler) CreateComment(c *fiber.Ctx) error {
	tmdbID, err := c.ParamsInt("tmdbId")
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid tmdbId")
	}
	mediaType := c.Params("type")
	if mediaType != "movie" && mediaType != "tv" {
		return fiber.NewError(fiber.StatusBadRequest, "type must be 'movie' or 'tv'")
	}

	var input CreateCommentInput
	if err := c.BodyParser(&input); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}

	userID := c.Locals("userID").(string)

	comment, err := h.svc.CreateComment(c.UserContext(), userID, tmdbID, mediaType, input)
	if err != nil {
		if err == ErrBodyRequired || err == ErrBodyTooLong {
			return fiber.NewError(fiber.StatusBadRequest, err.Error())
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
