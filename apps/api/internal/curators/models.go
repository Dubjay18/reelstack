package curators

import (
	"time"

	"github.com/google/uuid"
)

type CuratorScore struct {
	UserID        uuid.UUID `json:"user_id"        db:"user_id"`
	Score         int       `json:"score"          db:"score"`
	FollowerScore int       `json:"follower_score" db:"follower_score"`
	SavesScore    int       `json:"saves_score"    db:"saves_score"`
	CreationScore int       `json:"creation_score" db:"creation_score"`
	ActivityScore int       `json:"activity_score" db:"activity_score"`
	ComputedAt    time.Time `json:"computed_at"    db:"computed_at"`
}

type LeaderboardEntry struct {
	UserID        uuid.UUID `json:"user_id"        db:"user_id"`
	Username      string    `json:"username"       db:"username"`
	AvatarURL     *string   `json:"avatar_url"     db:"avatar_url"`
	Bio           *string   `json:"bio"            db:"bio"`
	Score         int       `json:"score"          db:"score"`
	Rank          int       `json:"rank"           db:"rank"`
	FollowersCount int      `json:"followers_count" db:"followers_count"`
	ListCount     int       `json:"list_count"     db:"list_count"`
	ComputedAt    time.Time `json:"computed_at"    db:"computed_at"`
}
