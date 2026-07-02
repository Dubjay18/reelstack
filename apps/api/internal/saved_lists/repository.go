package saved_lists

import (
	"context"

	"github.com/jmoiron/sqlx"
)

type ISavedListRepository interface {
	Save(ctx context.Context, userID, listID string) error
	Unsave(ctx context.Context, userID, listID string) error
	IsSaved(ctx context.Context, userID, listID string) (bool, error)
	GetSavedLists(ctx context.Context, userID string) ([]*SavedListResponse, error)
	GetSaveCount(ctx context.Context, listID string) (int, error)
}

type SavedListRepository struct {
	db *sqlx.DB
}

func NewSavedListRepository(db *sqlx.DB) *SavedListRepository {
	return &SavedListRepository{db: db}
}

func (r *SavedListRepository) Save(ctx context.Context, userID, listID string) error {
	query := `
		INSERT INTO saved_lists (user_id, list_id, created_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (user_id, list_id) DO NOTHING`
	_, err := r.db.ExecContext(ctx, query, userID, listID)
	return err
}

func (r *SavedListRepository) Unsave(ctx context.Context, userID, listID string) error {
	query := `DELETE FROM saved_lists WHERE user_id = $1 AND list_id = $2`
	_, err := r.db.ExecContext(ctx, query, userID, listID)
	return err
}

func (r *SavedListRepository) IsSaved(ctx context.Context, userID, listID string) (bool, error) {
	var exists bool
	query := `SELECT EXISTS(SELECT 1 FROM saved_lists WHERE user_id = $1 AND list_id = $2)`
	err := r.db.GetContext(ctx, &exists, query, userID, listID)
	return exists, err
}

func (r *SavedListRepository) GetSavedLists(ctx context.Context, userID string) ([]*SavedListResponse, error) {
	var savedLists []*SavedListResponse
	query := `
		SELECT l.id, l.user_id, l.title, l.description, l.is_public, l.slug, l.is_watchlist,
		       l.created_at, l.updated_at,
		       COALESCE(count(li.id), 0) as item_count,
		       COALESCE(count(case when li.watched = true then 1 end), 0) as watched_count,
		       COALESCE(count(distinct sl2.user_id), 0) as save_count,
		       u.username as owner_username,
		       u.avatar_url as owner_avatar
		FROM saved_lists sl
		JOIN lists l ON l.id = sl.list_id
		JOIN users u ON l.user_id = u.id
		LEFT JOIN list_items li ON l.id = li.list_id
		LEFT JOIN saved_lists sl2 ON l.id = sl2.list_id
		WHERE sl.user_id = $1
		GROUP BY l.id, sl.created_at, u.username, u.avatar_url
		ORDER BY sl.created_at DESC`
	err := r.db.SelectContext(ctx, &savedLists, query, userID)
	if err != nil {
		return nil, err
	}
	return savedLists, nil
}

func (r *SavedListRepository) GetSaveCount(ctx context.Context, listID string) (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM saved_lists WHERE list_id = $1`
	err := r.db.GetContext(ctx, &count, query, listID)
	return count, err
}
