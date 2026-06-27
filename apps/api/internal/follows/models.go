package follows

import "time"

// Follow represents a user-to-user social follow relationship.
type Follow struct {
	FollowerID  string    `json:"follower_id" db:"follower_id"`
	FollowingID string    `json:"following_id" db:"following_id"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}
