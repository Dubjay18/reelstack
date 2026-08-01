package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"time"

	"github.com/jmoiron/sqlx"
)

// Password-reset and email-verification tokens are single-use, short-lived,
// and stored only as a SHA-256 hash — the plaintext is emailed once and
// never persisted. This mirrors the mcp_tokens pattern (internal/mcp/tokens.go)
// rather than reusing the stateless 72h login JWT, since these flows need
// early invalidation on use/expiry that a session JWT can't give us.
var (
	ErrTokenInvalid = errors.New("auth: invalid token")
	ErrTokenExpired = errors.New("auth: token expired")
	ErrTokenUsed    = errors.New("auth: token already used")
)

const (
	passwordResetTokenTTL = 1 * time.Hour
	verificationTokenTTL  = 24 * time.Hour
)

func hashToken(plaintext string) string {
	sum := sha256.Sum256([]byte(plaintext))
	return hex.EncodeToString(sum[:])
}

func generateToken() (string, error) {
	secret := make([]byte, 32)
	if _, err := rand.Read(secret); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(secret), nil
}

type tokenRow struct {
	ID        string     `db:"id"`
	UserID    string     `db:"user_id"`
	ExpiresAt time.Time  `db:"expires_at"`
	UsedAt    *time.Time `db:"used_at"`
}

// consumeTokenRow validates and marks a fetched token row as used, applying
// the shared expired/used/invalid rules for both token tables below. The
// UPDATE itself is the source of truth for "used" (guarded by `used_at IS
// NULL` and a RowsAffected check) so two concurrent Consume calls for the
// same token can't both succeed — the in-memory row is only used for the
// fast-path/expiry checks.
func consumeTokenRow(ctx context.Context, db *sqlx.DB, table string, row *tokenRow) error {
	if row.UsedAt != nil {
		return ErrTokenUsed
	}
	if time.Now().After(row.ExpiresAt) {
		return ErrTokenExpired
	}
	res, err := db.ExecContext(ctx, `UPDATE `+table+` SET used_at = NOW() WHERE id = $1 AND used_at IS NULL`, row.ID)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrTokenUsed
	}
	return nil
}

// ── Password reset tokens ───────────────────────────────────────────────────

type PasswordResetTokenRepository struct {
	db *sqlx.DB
}

func NewPasswordResetTokenRepository(db *sqlx.DB) *PasswordResetTokenRepository {
	return &PasswordResetTokenRepository{db: db}
}

// Create generates and stores a new reset token for userID, returning the
// plaintext to be emailed.
func (r *PasswordResetTokenRepository) Create(ctx context.Context, userID string) (string, error) {
	plaintext, err := generateToken()
	if err != nil {
		return "", err
	}
	_, err = r.db.ExecContext(ctx, `
		INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)`,
		userID, hashToken(plaintext), time.Now().Add(passwordResetTokenTTL))
	if err != nil {
		return "", err
	}
	return plaintext, nil
}

// Consume validates plaintext, marks it used, and returns the owning user ID.
func (r *PasswordResetTokenRepository) Consume(ctx context.Context, plaintext string) (string, error) {
	var row tokenRow
	err := r.db.GetContext(ctx, &row, `
		SELECT id, user_id, expires_at, used_at
		FROM password_reset_tokens WHERE token_hash = $1`, hashToken(plaintext))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", ErrTokenInvalid
		}
		return "", err
	}
	if err := consumeTokenRow(ctx, r.db, "password_reset_tokens", &row); err != nil {
		return "", err
	}
	return row.UserID, nil
}

// ── Email verification tokens ───────────────────────────────────────────────

type EmailVerificationTokenRepository struct {
	db *sqlx.DB
}

func NewEmailVerificationTokenRepository(db *sqlx.DB) *EmailVerificationTokenRepository {
	return &EmailVerificationTokenRepository{db: db}
}

// Create generates and stores a new verification token for userID, returning
// the plaintext to be emailed.
func (r *EmailVerificationTokenRepository) Create(ctx context.Context, userID string) (string, error) {
	plaintext, err := generateToken()
	if err != nil {
		return "", err
	}
	_, err = r.db.ExecContext(ctx, `
		INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)`,
		userID, hashToken(plaintext), time.Now().Add(verificationTokenTTL))
	if err != nil {
		return "", err
	}
	return plaintext, nil
}

// Consume validates plaintext, marks it used, and returns the owning user ID.
func (r *EmailVerificationTokenRepository) Consume(ctx context.Context, plaintext string) (string, error) {
	var row tokenRow
	err := r.db.GetContext(ctx, &row, `
		SELECT id, user_id, expires_at, used_at
		FROM email_verification_tokens WHERE token_hash = $1`, hashToken(plaintext))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", ErrTokenInvalid
		}
		return "", err
	}
	if err := consumeTokenRow(ctx, r.db, "email_verification_tokens", &row); err != nil {
		return "", err
	}
	return row.UserID, nil
}
