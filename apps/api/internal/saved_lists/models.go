package saved_lists

import "time"

type SavedList struct {
	UserID    string    `json:"user_id" db:"user_id"`
	ListID    string    `json:"list_id" db:"list_id"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type SavedListResponse struct {
	ID           string  `json:"id" db:"id"`
	UserID       string  `json:"user_id" db:"user_id"`
	Title        string  `json:"title" db:"title"`
	Description  *string `json:"description" db:"description"`
	IsPublic     bool    `json:"is_public" db:"is_public"`
	Slug         string  `json:"slug" db:"slug"`
	CreatedAt    string  `json:"created_at" db:"created_at"`
	UpdatedAt    string  `json:"updated_at" db:"updated_at"`
	ItemCount    int     `json:"item_count" db:"item_count"`
	WatchedCount int     `json:"watched_count" db:"watched_count"`
	SaveCount    int     `json:"save_count" db:"save_count"`
	OwnerUsername string `json:"owner_username" db:"owner_username"`
	OwnerAvatar  *string `json:"owner_avatar" db:"owner_avatar"`
}
