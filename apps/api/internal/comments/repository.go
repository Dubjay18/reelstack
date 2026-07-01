package comments

import (
	"context"
	"database/sql"

	"github.com/jmoiron/sqlx"
)

type ICommentRepository interface {
	GetByContent(ctx context.Context, tmdbID int, mediaType string) ([]*Comment, error)
	GetByID(ctx context.Context, id string) (*Comment, error)
	Create(ctx context.Context, c *Comment) error
	Delete(ctx context.Context, id, userID string) error
}

type CommentRepository struct {
	db *sqlx.DB
}

func NewCommentRepository(db *sqlx.DB) *CommentRepository {
	return &CommentRepository{db: db}
}

func (r *CommentRepository) GetByContent(ctx context.Context, tmdbID int, mediaType string) ([]*Comment, error) {
	var comments []*Comment
	query := `
		SELECT c.id, c.user_id, c.tmdb_id, c.media_type, c.body, c.parent_id, c.created_at, c.updated_at,
		       u.username, u.avatar_url
		FROM comments c
		JOIN users u ON c.user_id = u.id
		WHERE c.tmdb_id = $1 AND c.media_type = $2
		ORDER BY c.created_at DESC`
	err := r.db.SelectContext(ctx, &comments, query, tmdbID, mediaType)
	if err != nil {
		return nil, err
	}
	return comments, nil
}

func (r *CommentRepository) GetByID(ctx context.Context, id string) (*Comment, error) {
	var c Comment
	query := `
		SELECT c.id, c.user_id, c.tmdb_id, c.media_type, c.body, c.parent_id, c.created_at, c.updated_at,
		       u.username, u.avatar_url
		FROM comments c
		JOIN users u ON c.user_id = u.id
		WHERE c.id = $1`
	err := r.db.GetContext(ctx, &c, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &c, nil
}

func (r *CommentRepository) Create(ctx context.Context, c *Comment) error {
	query := `
		INSERT INTO comments (id, user_id, tmdb_id, media_type, body, parent_id, created_at, updated_at)
		VALUES (:id, :user_id, :tmdb_id, :media_type, :body, :parent_id, NOW(), NOW())`
	_, err := r.db.NamedExecContext(ctx, query, c)
	return err
}

func (r *CommentRepository) Delete(ctx context.Context, id, userID string) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM comments WHERE id = $1 AND user_id = $2", id, userID)
	return err
}
