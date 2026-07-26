// Package mcp exposes Reelstack's list-writing capabilities as a Model
// Context Protocol server, so external MCP clients (Claude Desktop, Claude
// Code, other agents) and Riley's own chat companion can create/modify a
// user's lists through the same authenticated, ownership-checked tools.
package mcp

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// ErrTokenNotFound is returned when a token id/hash doesn't resolve to an
// active (non-revoked) token.
var ErrTokenNotFound = errors.New("mcp: token not found")

const tokenPrefix = "rlst_mcp_"

// Token is a Personal Access Token external MCP clients use to authenticate
// as a specific Reelstack user. Only its SHA-256 hash is ever persisted.
type Token struct {
	ID         string     `json:"id" db:"id"`
	UserID     string     `json:"user_id" db:"user_id"`
	Name       string     `json:"name" db:"name"`
	TokenHash  string     `json:"-" db:"token_hash"`
	CreatedAt  time.Time  `json:"created_at" db:"created_at"`
	LastUsedAt *time.Time `json:"last_used_at" db:"last_used_at"`
	RevokedAt  *time.Time `json:"revoked_at" db:"revoked_at"`
}

type ITokenRepository interface {
	Create(ctx context.Context, t *Token) error
	ListByUser(ctx context.Context, userID string) ([]*Token, error)
	Revoke(ctx context.Context, id, userID string) error
	FindActiveByHash(ctx context.Context, hash string) (*Token, error)
	TouchLastUsed(ctx context.Context, id string) error
}

type TokenRepository struct {
	db *sqlx.DB
}

func NewTokenRepository(db *sqlx.DB) *TokenRepository {
	return &TokenRepository{db: db}
}

func (r *TokenRepository) Create(ctx context.Context, t *Token) error {
	query := `
		INSERT INTO mcp_tokens (id, user_id, name, token_hash, created_at)
		VALUES (:id, :user_id, :name, :token_hash, NOW())`
	_, err := r.db.NamedExecContext(ctx, query, t)
	return err
}

func (r *TokenRepository) ListByUser(ctx context.Context, userID string) ([]*Token, error) {
	var tokens []*Token
	err := r.db.SelectContext(ctx, &tokens, `
		SELECT id, user_id, name, token_hash, created_at, last_used_at, revoked_at
		FROM mcp_tokens
		WHERE user_id = $1 AND revoked_at IS NULL
		ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	return tokens, nil
}

func (r *TokenRepository) Revoke(ctx context.Context, id, userID string) error {
	res, err := r.db.ExecContext(ctx,
		`UPDATE mcp_tokens SET revoked_at = NOW() WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`,
		id, userID)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrTokenNotFound
	}
	return nil
}

func (r *TokenRepository) FindActiveByHash(ctx context.Context, hash string) (*Token, error) {
	var t Token
	err := r.db.GetContext(ctx, &t, `
		SELECT id, user_id, name, token_hash, created_at, last_used_at, revoked_at
		FROM mcp_tokens
		WHERE token_hash = $1 AND revoked_at IS NULL`, hash)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrTokenNotFound
		}
		return nil, err
	}
	return &t, nil
}

func (r *TokenRepository) TouchLastUsed(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `UPDATE mcp_tokens SET last_used_at = NOW() WHERE id = $1`, id)
	return err
}

// TokenService issues and validates MCP Personal Access Tokens.
type TokenService struct {
	repo ITokenRepository
}

func NewTokenService(repo ITokenRepository) *TokenService {
	return &TokenService{repo: repo}
}

// CreateToken generates a new PAT for userID. The plaintext is returned once
// and never stored — only its hash is persisted.
func (s *TokenService) CreateToken(ctx context.Context, userID, name string) (plaintext string, token *Token, err error) {
	secret := make([]byte, 32)
	if _, err = rand.Read(secret); err != nil {
		return "", nil, err
	}
	plaintext = tokenPrefix + base64.RawURLEncoding.EncodeToString(secret)

	token = &Token{ID: uuid.NewString(), UserID: userID, Name: name, TokenHash: hashToken(plaintext)}
	if err = s.repo.Create(ctx, token); err != nil {
		return "", nil, err
	}
	return plaintext, token, nil
}

func (s *TokenService) ListTokens(ctx context.Context, userID string) ([]*Token, error) {
	return s.repo.ListByUser(ctx, userID)
}

func (s *TokenService) Revoke(ctx context.Context, id, userID string) error {
	return s.repo.Revoke(ctx, id, userID)
}

// ResolveUserID validates a PAT's plaintext and returns the owning user's ID.
func (s *TokenService) ResolveUserID(ctx context.Context, plaintext string) (string, error) {
	token, err := s.repo.FindActiveByHash(ctx, hashToken(plaintext))
	if err != nil {
		return "", err
	}
	_ = s.repo.TouchLastUsed(ctx, token.ID) // best-effort, never fail auth on this
	return token.UserID, nil
}

func hashToken(plaintext string) string {
	sum := sha256.Sum256([]byte(plaintext))
	return hex.EncodeToString(sum[:])
}
