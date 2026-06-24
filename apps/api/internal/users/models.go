package users

import (
	"time"

	"github.com/Dubjay18/reelstack/api/internal/lists"
	"github.com/google/uuid"
)

// User mirrors the `users` table in 001_init.sql.
// PasswordHash is nil for OAuth-only accounts.
// GoogleID is nil for password-only accounts.
type User struct {
	ID           uuid.UUID  `json:"id"         db:"id"`
	Username     string     `json:"username"   db:"username"`
	Email        string     `json:"email"      db:"email"`
	PasswordHash *string    `json:"-"          db:"password_hash"`
	AvatarURL    *string    `json:"avatar_url" db:"avatar_url"`
	Bio          *string    `json:"bio"        db:"bio"`
	GoogleID     *string    `json:"-"          db:"google_id"`
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at" db:"updated_at"`
}


type PublicProfile struct {
	ID        uuid.UUID `json:"id"`
	Username  string    `json:"username"`
	AvatarURL *string   `json:"avatar_url,omitempty"`
	Bio       *string   `json:"bio,omitempty"`
	PublicLinks []*lists.List `json:"public_links,omitempty"`
	ItemCount   int       `json:"item_count,omitempty"`
}

func (u *User) ToPublicProfile() PublicProfile {
	return PublicProfile{
		ID:        u.ID,
		Username:  u.Username,
		AvatarURL: u.AvatarURL,
		Bio:       u.Bio,
	}
}