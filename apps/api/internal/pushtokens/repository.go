package pushtokens

import (
	"context"

	"github.com/jmoiron/sqlx"
)

type IPushTokenRepository interface {
	Upsert(ctx context.Context, userID, token, platform string) error
	DeleteByToken(ctx context.Context, token string) error
	DeleteByUserAndToken(ctx context.Context, userID, token string) error
	GetTokensForUser(ctx context.Context, userID string) ([]string, error)
}

type PushTokenRepository struct {
	db *sqlx.DB
}

func NewPushTokenRepository(db *sqlx.DB) *PushTokenRepository {
	return &PushTokenRepository{db: db}
}

// Upsert registers token for userID, or re-points it if it was previously
// registered under a different user (e.g. a shared/reinstalled device).
func (r *PushTokenRepository) Upsert(ctx context.Context, userID, token, platform string) error {
	query := `
		INSERT INTO push_tokens (id, user_id, token, platform, last_used_at, created_at)
		VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
		ON CONFLICT (token) DO UPDATE
		SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform, last_used_at = NOW()`
	_, err := r.db.ExecContext(ctx, query, userID, token, platform)
	return err
}

// DeleteByToken removes a token regardless of owner — used when Expo's push
// API reports the token as no longer valid (e.g. DeviceNotRegistered).
func (r *PushTokenRepository) DeleteByToken(ctx context.Context, token string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM push_tokens WHERE token = $1`, token)
	return err
}

// DeleteByUserAndToken removes a token scoped to its owner — used when a
// user logs out on their own device.
func (r *PushTokenRepository) DeleteByUserAndToken(ctx context.Context, userID, token string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM push_tokens WHERE user_id = $1 AND token = $2`, userID, token)
	return err
}

func (r *PushTokenRepository) GetTokensForUser(ctx context.Context, userID string) ([]string, error) {
	var tokens []string
	err := r.db.SelectContext(ctx, &tokens, `SELECT token FROM push_tokens WHERE user_id = $1`, userID)
	if err != nil {
		return nil, err
	}
	return tokens, nil
}
