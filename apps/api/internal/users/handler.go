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

func (h *Handler) RegisterRoutes(r fiber.Router, authMiddleware fiber.Handler) {
	r.Get("/api/v1/users/check-username", h.CheckUsernameAvailability)
	r.Get("/api/v1/users/:identifier", h.GetPublicProfile)
	r.Put("/api/v1/users/profile", authMiddleware, h.UpdateProfile)
}

func (h *Handler) GetPublicProfile(c *fiber.Ctx) error {
	identifier := c.Params("identifier")
	profile, err := h.svc.GetPublicProfile(c.UserContext(), identifier)
	if err != nil {
		if err == ErrNotFound {
			return fiber.NewError(fiber.StatusNotFound, "user not found")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "failed to retrieve public profile")
	}

	return c.Status(fiber.StatusOK).JSON(profile)
}

func (h *Handler) UpdateProfile(c *fiber.Ctx) error {
	userIDVal := c.Locals("userID")
	userID, ok := userIDVal.(string)
	if !ok || userID == "" {
		return fiber.NewError(fiber.StatusUnauthorized, "unauthorized")
	}

	var input UpdateProfileInput
	if err := c.BodyParser(&input); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}

	updatedUser, token, err := h.svc.UpdateProfile(c.UserContext(), userID, input)
	if err != nil {
		switch err {
		case ErrNotFound:
			return fiber.NewError(fiber.StatusNotFound, "user not found")
		case ErrUsernameTaken:
			return fiber.NewError(fiber.StatusConflict, "username already taken")
		case ErrInvalidInput:
			return fiber.NewError(fiber.StatusBadRequest, "invalid username or bio format")
		default:
			return fiber.NewError(fiber.StatusInternalServerError, "failed to update profile")
		}
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"user":    updatedUser,
		"token":   token,
	})
}

func (h *Handler) CheckUsernameAvailability(c *fiber.Ctx) error {
	username := c.Query("username")
	if username == "" {
		return fiber.NewError(fiber.StatusBadRequest, "username query parameter is required")
	}

	if !usernameRegex.MatchString(username) {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"available": false,
			"error":     "invalid username format",
		})
	}

	available, err := h.svc.CheckUsernameAvailability(c.UserContext(), username)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to check username availability")
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"available": available,
	})
}
