package riley

import (
	"context"
	"encoding/json"

	"github.com/jmoiron/sqlx"
)

type IRepository interface {
	SaveArtifact(ctx context.Context, kind string, payload any) error
	LatestArtifact(ctx context.Context, kind string, dest any) error
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
