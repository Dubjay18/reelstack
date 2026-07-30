// Package pushtokens stores per-device Expo push tokens so the server can
// deliver push notifications to a user's phone(s). A user may have several
// tokens (multiple devices, or a reinstall); a token itself is globally
// unique to one install and gets re-pointed to whichever user last
// registered it.
package pushtokens

import "time"

type PushToken struct {
	ID         string    `json:"id" db:"id"`
	UserID     string    `json:"user_id" db:"user_id"`
	Token      string    `json:"token" db:"token"`
	Platform   string    `json:"platform" db:"platform"` // "android" (ios later)
	LastUsedAt time.Time `json:"last_used_at" db:"last_used_at"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
}
