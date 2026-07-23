package notifications

import "time"

// Notification represents a user activity alert (e.g., follow, list created).
type Notification struct {
	ID        string    `json:"id" db:"id"`
	UserID    string    `json:"user_id" db:"user_id"`
	ActorID   string    `json:"actor_id" db:"actor_id"`
	Type      string    `json:"type" db:"type"` // "new_follower", "list_created"
	EntityID  *string   `json:"entity_id,omitempty" db:"entity_id"`
	IsRead    bool      `json:"is_read" db:"is_read"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`

	// Rich UI fields resolved via SQL Joins
	ActorUsername  *string `json:"actor_username,omitempty" db:"actor_username"`
	ActorAvatarURL *string `json:"actor_avatar_url,omitempty" db:"actor_avatar_url"`
	EntityTitle    *string `json:"entity_title,omitempty" db:"entity_title"` // list title, or comment body for comment_reply

	// Populated only for type == "comment_reply", so the frontend can link
	// back to the movie/show the reply was posted on.
	CommentTMDBID    *int    `json:"comment_tmdb_id,omitempty" db:"comment_tmdb_id"`
	CommentMediaType *string `json:"comment_media_type,omitempty" db:"comment_media_type"`

	// Populated only for type == "list_comment", so the frontend can link
	// back to the list and distinguish a comment from a suggestion.
	CommentListID   *string `json:"comment_list_id,omitempty" db:"comment_list_id"`
	ListCommentType *string `json:"list_comment_type,omitempty" db:"list_comment_type"`
}
