package list_comments

import (
	"context"
	"database/sql"

	"github.com/jmoiron/sqlx"
)

type IListCommentRepository interface {
	GetByListID(ctx context.Context, listID string) ([]*ListComment, error)
	GetByID(ctx context.Context, id string) (*ListComment, error)
	Create(ctx context.Context, c *ListComment) error
	Delete(ctx context.Context, id, userID string) error
}

type ListCommentRepository struct {
	db *sqlx.DB
}

func NewListCommentRepository(db *sqlx.DB) *ListCommentRepository {
	return &ListCommentRepository{db: db}
}

func (r *ListCommentRepository) GetByListID(ctx context.Context, listID string) ([]*ListComment, error) {
	var comments []*ListComment
	query := `
		SELECT c.id, c.list_id, c.user_id, c.type, c.body, c.parent_id, c.created_at, c.updated_at,
		       u.username, u.avatar_url
		FROM list_comments c
		JOIN users u ON c.user_id = u.id
		WHERE c.list_id = $1
		ORDER BY c.created_at DESC`
	err := r.db.SelectContext(ctx, &comments, query, listID)
	if err != nil {
		return nil, err
	}
	return comments, nil
}

func (r *ListCommentRepository) GetByID(ctx context.Context, id string) (*ListComment, error) {
	var c ListComment
	query := `
		SELECT c.id, c.list_id, c.user_id, c.type, c.body, c.parent_id, c.created_at, c.updated_at,
		       u.username, u.avatar_url
		FROM list_comments c
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

func (r *ListCommentRepository) Create(ctx context.Context, c *ListComment) error {
	query := `
		INSERT INTO list_comments (id, list_id, user_id, type, body, parent_id, created_at, updated_at)
		VALUES (:id, :list_id, :user_id, :type, :body, :parent_id, NOW(), NOW())`
	_, err := r.db.NamedExecContext(ctx, query, c)
	return err
}

func (r *ListCommentRepository) Delete(ctx context.Context, id, userID string) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM list_comments WHERE id = $1 AND user_id = $2", id, userID)
	return err
}
