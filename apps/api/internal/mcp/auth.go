package mcp

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// internalAudience marks a short-lived JWT minted by Riley's own backend to
// call the MCP server on a specific user's behalf, once that user has
// approved the action in chat. It is never issued to, or accepted from,
// external MCP clients.
const internalAudience = "reelstack-mcp"

const internalTokenTTL = 5 * time.Minute

type contextKey string

const userIDContextKey contextKey = "mcp_user_id"

// MintInternalToken issues a short-lived token Riley's backend can present
// to the MCP server as the given user, after that user has approved the
// action in chat. Reuses the same HS256 signing scheme as the regular user
// session JWTs (see internal/auth/token.go), scoped by audience so a normal
// session token can never be replayed here and vice versa.
func MintInternalToken(userID, secret string) (string, error) {
	tk := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": userID,
		"aud": internalAudience,
		"exp": time.Now().Add(internalTokenTTL).Unix(),
	})
	return tk.SignedString([]byte(secret))
}

// resolveInternalToken validates a token minted by MintInternalToken and
// returns the user ID it was scoped to.
func resolveInternalToken(tokenString, secret string) (string, error) {
	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		return "", errors.New("mcp: invalid internal token")
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", errors.New("mcp: invalid internal token claims")
	}
	if aud, _ := claims["aud"].(string); aud != internalAudience {
		return "", errors.New("mcp: token not scoped for MCP")
	}
	userID, _ := claims["sub"].(string)
	if userID == "" {
		return "", errors.New("mcp: token missing subject")
	}
	return userID, nil
}

// AuthMiddleware resolves the Bearer token on every MCP request to a user
// ID and stores it in the request context, rejecting the request with 401
// otherwise. Two token kinds are accepted: a short-lived internal JWT
// (Riley's own backend, see MintInternalToken) or a long-lived Personal
// Access Token (external MCP clients, see TokenService.CreateToken).
func AuthMiddleware(jwtSecret string, tokens *TokenService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				http.Error(w, "missing or malformed Authorization header", http.StatusUnauthorized)
				return
			}
			tokenString := strings.TrimPrefix(authHeader, "Bearer ")

			var userID string
			if id, err := resolveInternalToken(tokenString, jwtSecret); err == nil {
				userID = id
			} else if id, err := tokens.ResolveUserID(r.Context(), tokenString); err == nil {
				userID = id
			} else {
				http.Error(w, "invalid or revoked token", http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), userIDContextKey, userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// UserIDFromContext returns the authenticated user ID resolved by
// AuthMiddleware, if any.
func UserIDFromContext(ctx context.Context) (string, bool) {
	userID, ok := ctx.Value(userIDContextKey).(string)
	return userID, ok && userID != ""
}
