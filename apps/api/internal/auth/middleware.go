package auth

import (
	"context"
	"net/http"
	"strings"

	"github.com/gofiber/fiber/v2"
)

// reads bearer token from Authorization header and validates it
func AuthMiddleware(secret string) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, "Missing Authorization header", http.StatusUnauthorized)
				return
			}

			tokenString := strings.TrimPrefix(authHeader, "Bearer ")
			userID, err := ValidateToken(tokenString, secret)
			if err != nil || userID == "" {
				http.Error(w, "Invalid token", http.StatusUnauthorized)
				return
			}

			// Store the userID in the request context for further use
			ctx := context.WithValue(r.Context(), "userID", userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// FiberAuthMiddleware parses JWT token from Authorization header and sets userID context.
func FiberAuthMiddleware(secret string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error":   "Missing Authorization header",
			})
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		userID, err := ValidateToken(tokenString, secret)
		if err != nil || userID == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error":   "Invalid token",
			})
		}

		c.Locals("userID", userID)
		return c.Next()
	}
}