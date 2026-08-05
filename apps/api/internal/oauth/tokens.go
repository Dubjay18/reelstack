package oauth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// accessAudience scopes OAuth access-token JWTs distinctly from both the
// internal service-to-service JWT (internal/mcp, aud="reelstack-mcp") and
// authorization-code JWTs (aud="reelstack-oauth-code"), even though all
// three share the same JWT_SECRET.
const accessAudience = "reelstack-mcp-oauth"

const accessTokenTTL = time.Hour
const refreshTokenTTL = 90 * 24 * time.Hour
const refreshTokenPrefix = "rlst_mcp_rt_"

// MintAccessToken issues a stateless, short-lived Bearer token for the MCP
// endpoint — same HS256/secret scheme as internal/mcp.MintInternalToken,
// scoped by aud so it can never be replayed as an internal token or vice
// versa.
func MintAccessToken(userID, clientID, secret string) (string, error) {
	tk := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":       userID,
		"client_id": clientID,
		"aud":       accessAudience,
		"exp":       time.Now().Add(accessTokenTTL).Unix(),
	})
	return tk.SignedString([]byte(secret))
}

// ResolveAccessToken validates a token minted by MintAccessToken and
// returns the user ID it was scoped to. Consumed by
// internal/mcp.AuthMiddleware as a third accepted token kind, alongside
// the existing internal-JWT and Personal Access Token checks.
func ResolveAccessToken(tokenString, secret string) (string, error) {
	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		return "", errors.New("oauth: invalid or expired access token")
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", errors.New("oauth: invalid access token claims")
	}
	if aud, _ := claims["aud"].(string); aud != accessAudience {
		return "", errors.New("oauth: token not scoped for MCP access")
	}
	userID, _ := claims["sub"].(string)
	if userID == "" {
		return "", errors.New("oauth: token missing subject")
	}
	return userID, nil
}

// ErrRefreshTokenNotFound is returned when a refresh token's hash doesn't
// resolve to an active (unrevoked, unexpired) token.
var ErrRefreshTokenNotFound = errors.New("oauth: refresh token not found")

// RefreshToken is a long-lived, revocable token that exchanges for fresh
// access tokens without re-running the full authorization flow. Unlike
// access tokens (stateless JWTs), refresh tokens must be revocable, so —
// mirroring internal/mcp.TokenService's Personal Access Tokens — only
// their SHA-256 hash is ever persisted.
type RefreshToken struct {
	ID        string       `db:"id"`
	UserID    string       `db:"user_id"`
	ClientID  string       `db:"client_id"`
	TokenHash string       `db:"token_hash"`
	CreatedAt time.Time    `db:"created_at"`
	ExpiresAt time.Time    `db:"expires_at"`
	RevokedAt sql.NullTime `db:"revoked_at"`
}

type IRefreshTokenRepository interface {
	Create(ctx context.Context, t *RefreshToken) error
	FindActiveByHash(ctx context.Context, hash string) (*RefreshToken, error)
	Revoke(ctx context.Context, id string) error
}

type RefreshTokenRepository struct {
	db *sqlx.DB
}

func NewRefreshTokenRepository(db *sqlx.DB) *RefreshTokenRepository {
	return &RefreshTokenRepository{db: db}
}

func (r *RefreshTokenRepository) Create(ctx context.Context, t *RefreshToken) error {
	_, err := r.db.NamedExecContext(ctx, `
		INSERT INTO oauth_refresh_tokens (id, user_id, client_id, token_hash, expires_at)
		VALUES (:id, :user_id, :client_id, :token_hash, :expires_at)`, t)
	return err
}

func (r *RefreshTokenRepository) FindActiveByHash(ctx context.Context, hash string) (*RefreshToken, error) {
	var t RefreshToken
	err := r.db.GetContext(ctx, &t, `
		SELECT id, user_id, client_id, token_hash, created_at, expires_at, revoked_at
		FROM oauth_refresh_tokens
		WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()`, hash)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrRefreshTokenNotFound
		}
		return nil, err
	}
	return &t, nil
}

func (r *RefreshTokenRepository) Revoke(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `UPDATE oauth_refresh_tokens SET revoked_at = NOW() WHERE id = $1`, id)
	return err
}

// TokenService mints and resolves OAuth access + refresh tokens.
type TokenService struct {
	refreshRepo IRefreshTokenRepository
	jwtSecret   string
}

func NewTokenService(refreshRepo IRefreshTokenRepository, jwtSecret string) *TokenService {
	return &TokenService{refreshRepo: refreshRepo, jwtSecret: jwtSecret}
}

// ResolveAccessToken lets internal/mcp.AuthMiddleware validate an OAuth
// Bearer token without importing this package's JWT internals directly.
func (s *TokenService) ResolveAccessToken(tokenString string) (string, error) {
	return ResolveAccessToken(tokenString, s.jwtSecret)
}

// IssueGrant mints a fresh access token and a fresh, persisted refresh
// token for userID/clientID — used both for the initial authorization_code
// exchange and for refresh_token rotation.
func (s *TokenService) IssueGrant(ctx context.Context, userID, clientID string) (accessToken, refreshToken string, expiresIn int, err error) {
	accessToken, err = MintAccessToken(userID, clientID, s.jwtSecret)
	if err != nil {
		return "", "", 0, fmt.Errorf("mint access token: %w", err)
	}

	secret := make([]byte, 32)
	if _, err = rand.Read(secret); err != nil {
		return "", "", 0, err
	}
	refreshToken = refreshTokenPrefix + base64.RawURLEncoding.EncodeToString(secret)

	rt := &RefreshToken{
		ID:        uuid.NewString(),
		UserID:    userID,
		ClientID:  clientID,
		TokenHash: hashToken(refreshToken),
		ExpiresAt: time.Now().Add(refreshTokenTTL),
	}
	if err = s.refreshRepo.Create(ctx, rt); err != nil {
		return "", "", 0, fmt.Errorf("persist refresh token: %w", err)
	}

	return accessToken, refreshToken, int(accessTokenTTL.Seconds()), nil
}

// Rotate resolves and revokes an existing refresh token, then issues a new
// access + refresh token pair for the same user/client. Rotating on every
// use means a stolen refresh token stops working the moment the legitimate
// client next refreshes, bounding the damage window.
func (s *TokenService) Rotate(ctx context.Context, refreshToken, clientID string) (accessToken, newRefreshToken string, expiresIn int, err error) {
	rt, err := s.refreshRepo.FindActiveByHash(ctx, hashToken(refreshToken))
	if err != nil {
		return "", "", 0, err
	}
	if rt.ClientID != clientID {
		return "", "", 0, errors.New("oauth: refresh token does not belong to this client")
	}
	if err = s.refreshRepo.Revoke(ctx, rt.ID); err != nil {
		return "", "", 0, fmt.Errorf("revoke used refresh token: %w", err)
	}
	return s.IssueGrant(ctx, rt.UserID, rt.ClientID)
}

func hashToken(plaintext string) string {
	sum := sha256.Sum256([]byte(plaintext))
	return hex.EncodeToString(sum[:])
}
