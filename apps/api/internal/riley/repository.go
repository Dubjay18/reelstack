package riley

import (
	"context"
	"encoding/json"

	"github.com/jmoiron/sqlx"
)

type IRepository interface {
	SaveArtifact(ctx context.Context, kind string, payload any) error
	LatestArtifact(ctx context.Context, kind string, dest any) error
	WatchedTitles(ctx context.Context, userID string, limit int) ([]WatchedTitle, error)
	AllListedTitles(ctx context.Context, userID string) ([]WatchedTitle, error)
}

// WatchedTitle identifies a title a user has added to one of their lists.
type WatchedTitle struct {
	TMDBID    int    `db:"tmdb_id"`
	MediaType string `db:"media_type"`
}

type Repository struct {
	db *sqlx.DB
}

func NewRepository(db *sqlx.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) SaveArtifact(ctx context.Context, kind string, payload any) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = r.db.ExecContext(ctx,
		`INSERT INTO riley_artifacts (kind, payload) VALUES ($1, $2)`, kind, data)
	return err
}

// LatestArtifact unmarshals the newest payload of the given kind into dest.
// Returns sql.ErrNoRows if none exists.
func (r *Repository) LatestArtifact(ctx context.Context, kind string, dest any) error {
	var raw []byte
	err := r.db.GetContext(ctx, &raw,
		`SELECT payload FROM riley_artifacts WHERE kind = $1 ORDER BY created_at DESC LIMIT 1`, kind)
	if err != nil {
		return err
	}
	return json.Unmarshal(raw, dest)
}

// WatchedTitles returns the user's most recently watched titles across all
// their lists, newest first. Used to seed personalized recommendations.
func (r *Repository) WatchedTitles(ctx context.Context, userID string, limit int) ([]WatchedTitle, error) {
	var titles []WatchedTitle
	err := r.db.SelectContext(ctx, &titles, `
		SELECT li.tmdb_id, li.media_type
		FROM list_items li
		JOIN lists l ON l.id = li.list_id
		WHERE l.user_id = $1 AND li.watched = true
		ORDER BY li.watched_at DESC NULLS LAST
		LIMIT $2`, userID, limit)
	if err != nil {
		return nil, err
	}
	return titles, nil
}

// AllListedTitles returns every title the user has added to any of their
// lists (watched or not), used to exclude titles they already know about
// from personalized recommendations.
func (r *Repository) AllListedTitles(ctx context.Context, userID string) ([]WatchedTitle, error) {
	var titles []WatchedTitle
	err := r.db.SelectContext(ctx, &titles, `
		SELECT DISTINCT li.tmdb_id, li.media_type
		FROM list_items li
		JOIN lists l ON l.id = li.list_id
		WHERE l.user_id = $1`, userID)
	if err != nil {
		return nil, err
	}
	return titles, nil
}
