package comments

import "time"

type Comment struct {
	ID        string    `json:"id" db:"id"`
	UserID    string    `json:"user_id" db:"user_id"`
	TMDBID    int       `json:"tmdb_id" db:"tmdb_id"`
	MediaType string    `json:"media_type" db:"media_type"`
	Body      string    `json:"body" db:"body"`
	ParentID  *string   `json:"parent_id,omitempty" db:"parent_id"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`

	Username  *string `json:"username,omitempty" db:"username"`
	AvatarURL *string `json:"avatar_url,omitempty" db:"avatar_url"`
}

type CreateCommentInput struct {
	Body      string  `json:"body"`
	ParentID  *string `json:"parent_id,omitempty"`
}
