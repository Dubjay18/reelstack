package list_comments

import "time"

type ListComment struct {
	ID        string    `json:"id" db:"id"`
	ListID    string    `json:"list_id" db:"list_id"`
	UserID    string    `json:"user_id" db:"user_id"`
	Type      string    `json:"type" db:"type"`
	Body      string    `json:"body" db:"body"`
	ParentID  *string   `json:"parent_id,omitempty" db:"parent_id"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`

	Username  *string `json:"username,omitempty" db:"username"`
	AvatarURL *string `json:"avatar_url,omitempty" db:"avatar_url"`
}

type CreateListCommentInput struct {
	Body     string  `json:"body"`
	Type     string  `json:"type,omitempty"`
	ParentID *string `json:"parent_id,omitempty"`
}
