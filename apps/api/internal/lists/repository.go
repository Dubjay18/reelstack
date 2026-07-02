package lists

import (
	"context"
	"database/sql"
	"time"

	apperrors "github.com/Dubjay18/reelstack/api/pkg/errors"
	"github.com/jmoiron/sqlx"
)

type List struct {
	ID           string    `json:"id" db:"id"`
	UserID       string    `json:"user_id" db:"user_id"`
	Title        string    `json:"title" db:"title"`
	Description  *string   `json:"description" db:"description"`
	IsPublic     bool      `json:"is_public" db:"is_public"`
	Slug         string    `json:"slug" db:"slug"`
	IsWatchlist  bool      `json:"is_watchlist" db:"is_watchlist"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
	ItemCount    int       `json:"item_count" db:"item_count"`
	WatchedCount int       `json:"watched_count" db:"watched_count"`
	SaveCount    int       `json:"save_count" db:"save_count"`
}

type ListItem struct {
	ID        string     `json:"id" db:"id"`
	ListID    string     `json:"list_id" db:"list_id"`
	TMDBID    int        `json:"tmdb_id" db:"tmdb_id"`
	MediaType string     `json:"media_type" db:"media_type"` // "movie" or "tv"
	Watched   bool       `json:"watched" db:"watched"`
	WatchedAt *time.Time `json:"watched_at" db:"watched_at"`
	Notes     *string    `json:"notes" db:"notes"`
	Position  int        `json:"position" db:"position"`
	AddedAt   time.Time  `json:"added_at" db:"added_at"`
}

type IListRepository interface {
	// List operations
	CreateList(ctx context.Context, list *List) error
	GetListByID(ctx context.Context, id string) (*List, error)
	UpdateList(ctx context.Context, list *List) error
	DeleteList(ctx context.Context, id string) error
	GetPublicListsByUserID(ctx context.Context, userID string) ([]*List, error)
	GetListsByUserID(ctx context.Context, userID string) ([]*List, error)
	GetListBySlug(ctx context.Context, userID string, slug string) (*List, error)
	GetWatchlistByUserID(ctx context.Context, userID string) (*List, error)
	
	// List item operations
	AddItemToList(ctx context.Context, listID string, item *ListItem) error
	GetItemsByListID(ctx context.Context, listID string) ([]*ListItem, error)
	UpdateListItem(ctx context.Context, item *ListItem) error
	DeleteListItem(ctx context.Context, id string) error
	GetListItemByID(ctx context.Context, id string) (*ListItem, error)
}

type ListRepository struct {
	db *sqlx.DB
}

func NewListRepository(db *sqlx.DB) *ListRepository {
	return &ListRepository{db: db}
}

func (r *ListRepository) CreateList(ctx context.Context, list *List) error {
	query := `
		INSERT INTO lists (id, user_id, title, description, is_public, slug, is_watchlist, created_at, updated_at)
		VALUES (:id, :user_id, :title, :description, :is_public, :slug, :is_watchlist, NOW(), NOW())`
	_, err := r.db.NamedExecContext(ctx, query, list)
	if err != nil {
		if apperrors.IsUniqueViolation(err) {
			return ErrDuplicateSlug
		}
		return err
	}
	return nil
}

func (r *ListRepository) GetListByID(ctx context.Context, id string) (*List, error) {
	var list List
	query := `
		SELECT l.id, l.user_id, l.title, l.description, l.is_public, l.slug, l.is_watchlist, l.created_at, l.updated_at,
		       COALESCE(count(li.id), 0) as item_count,
		       COALESCE(count(case when li.watched = true then 1 end), 0) as watched_count,
		       COALESCE(count(distinct sl.user_id), 0) as save_count
		FROM lists l
		LEFT JOIN list_items li ON l.id = li.list_id
		LEFT JOIN saved_lists sl ON l.id = sl.list_id
		WHERE l.id = $1
		GROUP BY l.id`
	err := r.db.GetContext(ctx, &list, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &list, nil
}

func (r *ListRepository) UpdateList(ctx context.Context, list *List) error {
	query := `
		UPDATE lists
		SET title = :title, description = :description, is_public = :is_public, slug = :slug, updated_at = NOW()
		WHERE id = :id`
	_, err := r.db.NamedExecContext(ctx, query, list)
	return err
}

func (r *ListRepository) DeleteList(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM lists WHERE id = $1", id)
	return err
}

func (r *ListRepository) GetPublicListsByUserID(ctx context.Context, userID string) ([]*List, error) {
	var lists []*List
	query := `
		SELECT l.id, l.user_id, l.title, l.description, l.is_public, l.slug, l.is_watchlist, l.created_at, l.updated_at,
		       COALESCE(count(li.id), 0) as item_count,
		       COALESCE(count(case when li.watched = true then 1 end), 0) as watched_count,
		       COALESCE(count(distinct sl.user_id), 0) as save_count
		FROM lists l
		LEFT JOIN list_items li ON l.id = li.list_id
		LEFT JOIN saved_lists sl ON l.id = sl.list_id
		WHERE l.user_id = $1 AND l.is_public = true
		GROUP BY l.id
		ORDER BY l.created_at DESC`
	err := r.db.SelectContext(ctx, &lists, query, userID)
	if err != nil {
		return nil, err
	}
	return lists, nil
}

func (r *ListRepository) GetListsByUserID(ctx context.Context, userID string) ([]*List, error) {
	var lists []*List
	query := `
		SELECT l.id, l.user_id, l.title, l.description, l.is_public, l.slug, l.is_watchlist, l.created_at, l.updated_at,
		       COALESCE(count(li.id), 0) as item_count,
		       COALESCE(count(case when li.watched = true then 1 end), 0) as watched_count,
		       COALESCE(count(distinct sl.user_id), 0) as save_count
		FROM lists l
		LEFT JOIN list_items li ON l.id = li.list_id
		LEFT JOIN saved_lists sl ON l.id = sl.list_id
		WHERE l.user_id = $1
		GROUP BY l.id
		ORDER BY l.created_at DESC`
	err := r.db.SelectContext(ctx, &lists, query, userID)
	if err != nil {
		return nil, err
	}
	return lists, nil
}

func (r *ListRepository) GetWatchlistByUserID(ctx context.Context, userID string) (*List, error) {
	var list List
	query := `
		SELECT l.id, l.user_id, l.title, l.description, l.is_public, l.slug, l.is_watchlist, l.created_at, l.updated_at,
		       COALESCE(count(li.id), 0) as item_count,
		       COALESCE(count(case when li.watched = true then 1 end), 0) as watched_count,
		       COALESCE(count(distinct sl.user_id), 0) as save_count
		FROM lists l
		LEFT JOIN list_items li ON l.id = li.list_id
		LEFT JOIN saved_lists sl ON l.id = sl.list_id
		WHERE l.user_id = $1 AND l.is_watchlist = TRUE
		GROUP BY l.id`
	err := r.db.GetContext(ctx, &list, query, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &list, nil
}

func (r *ListRepository) GetListBySlug(ctx context.Context, userID string, slug string) (*List, error) {
	var list List
	query := `
		SELECT l.id, l.user_id, l.title, l.description, l.is_public, l.slug, l.is_watchlist, l.created_at, l.updated_at,
		       COALESCE(count(li.id), 0) as item_count,
		       COALESCE(count(case when li.watched = true then 1 end), 0) as watched_count,
		       COALESCE(count(distinct sl.user_id), 0) as save_count
		FROM lists l
		LEFT JOIN list_items li ON l.id = li.list_id
		LEFT JOIN saved_lists sl ON l.id = sl.list_id
		WHERE l.user_id = $1 AND l.slug = $2
		GROUP BY l.id`
	err := r.db.GetContext(ctx, &list, query, userID, slug)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &list, nil
}

func (r *ListRepository) AddItemToList(ctx context.Context, listID string, item *ListItem) error {
	item.ListID = listID
	query := `
		INSERT INTO list_items (id, list_id, tmdb_id, media_type, watched, watched_at, notes, position, added_at)
		VALUES (:id, :list_id, :tmdb_id, :media_type, :watched, :watched_at, :notes, :position, NOW())`
	_, err := r.db.NamedExecContext(ctx, query, item)
	if err != nil {
		if apperrors.IsUniqueViolation(err) {
			return ErrDuplicateItem
		}
		return err
	}
	return nil
}

func (r *ListRepository) GetItemsByListID(ctx context.Context, listID string) ([]*ListItem, error) {
	var items []*ListItem
	err := r.db.SelectContext(ctx, &items, "SELECT id, list_id, tmdb_id, media_type, watched, watched_at, notes, position, added_at FROM list_items WHERE list_id = $1 ORDER BY position ASC, added_at ASC", listID)
	if err != nil {
		return nil, err
	}
	return items, nil
}

func (r *ListRepository) UpdateListItem(ctx context.Context, item *ListItem) error {
	query := `
		UPDATE list_items
		SET watched = :watched, watched_at = :watched_at, notes = :notes, position = :position
		WHERE id = :id`
	_, err := r.db.NamedExecContext(ctx, query, item)
	return err
}

func (r *ListRepository) DeleteListItem(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM list_items WHERE id = $1", id)
	return err
}

func (r *ListRepository) GetListItemByID(ctx context.Context, id string) (*ListItem, error) {
	var item ListItem
	err := r.db.GetContext(ctx, &item, "SELECT id, list_id, tmdb_id, media_type, watched, watched_at, notes, position, added_at FROM list_items WHERE id = $1", id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &item, nil
}