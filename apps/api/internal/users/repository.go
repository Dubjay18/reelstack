package users

import (
	"context"
	"database/sql"

	apperrors "github.com/Dubjay18/reelstack/api/pkg/errors"
	"github.com/jmoiron/sqlx"
)

var (
	ErrDuplicateEmail    = apperrors.ErrConflict // returned when email already exists
	ErrDuplicateUsername = apperrors.ErrConflict // returned when username already exists
)

// IUserRepository is the persistence contract for user data.
type IUserRepository interface {
	CreateUser(user *User) error
	GetUserByEmail(email string) (*User, error)
	GetUserByID(id string) (*User, error)
	GetUserByUsername(username string) (*User, error)
	GetUserByGoogleID(googleID string) (*User, error)
	UpsertGoogleUser(user *User) error
	UpdateUser(user *User) error
	GetFollowCounts(userID string) (followers int, following int, err error)
	SearchUsers(ctx context.Context, query string, limit int) ([]UserSearchResult, error)
}

// UserRepository is the sqlx-backed implementation.
type UserRepository struct {
	db *sqlx.DB
}

// NewUserRepository wires the DB into the repository.
func NewUserRepository(db *sqlx.DB) *UserRepository {
	return &UserRepository{db: db}
}

// CreateUser inserts a new user row (password-based registration).
func (r *UserRepository) CreateUser(user *User) error {
	_, err := r.db.NamedExec(`
		INSERT INTO users (id, email, password_hash, username)
		VALUES (:id, :email, :password_hash, :username)`,
		user,
	)
	if err != nil {
		if apperrors.IsUniqueViolation(err) {
			return ErrDuplicateEmail
		}
		return err
	}
	return nil
}

// GetUserByEmail returns the user matching the given email, or an error.
func (r *UserRepository) GetUserByEmail(email string) (*User, error) {
	var user User
	err := r.db.Get(&user, "SELECT * FROM users WHERE email=$1", email)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

// GetUserByID returns the user matching the given UUID string, or an error.
func (r *UserRepository) GetUserByID(id string) (*User, error) {
	var user User
	err := r.db.Get(&user, "SELECT * FROM users WHERE id=$1", id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

// GetUserByUsername returns the user matching the given username, or an error.
func (r *UserRepository) GetUserByUsername(username string) (*User, error) {
	var user User
	err := r.db.Get(&user, "SELECT * FROM users WHERE username=$1", username)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

// GetUserByGoogleID returns the user matching the given Google sub/ID, or an error.
func (r *UserRepository) GetUserByGoogleID(googleID string) (*User, error) {
	var user User
	err := r.db.Get(&user, "SELECT * FROM users WHERE google_id=$1", googleID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

// UpsertGoogleUser inserts or updates a user record identified by google_id.
// On conflict it refreshes email, avatar_url, and updated_at.
func (r *UserRepository) UpsertGoogleUser(user *User) error {
	// Try updating the user first if they exist
	res, err := r.db.NamedExec(`
		UPDATE users
		SET email = :email,
		    avatar_url = :avatar_url,
		    google_id = :google_id,
		    updated_at = NOW()
		WHERE id = :id`,
		user,
	)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows > 0 {
		return nil
	}

	// If no rows were updated, it's a new user. Insert them.
	_, err = r.db.NamedExec(`
		INSERT INTO users (id, email, username, google_id, avatar_url, updated_at)
		VALUES (:id, :email, :username, :google_id, :avatar_url, NOW())
		ON CONFLICT (google_id)
		DO UPDATE SET
			email      = EXCLUDED.email,
			avatar_url = EXCLUDED.avatar_url,
			updated_at = NOW()`,
		user,
	)
	return err
}

// UpdateUser updates username, avatar_url, bio, and updated_at for an existing user record.
func (r *UserRepository) UpdateUser(user *User) error {
	_, err := r.db.NamedExec(`
		UPDATE users
		SET username = :username,
		    avatar_url = :avatar_url,
		    bio = :bio,
		    updated_at = NOW()
		WHERE id = :id`,
		user,
	)
	if err != nil {
		if apperrors.IsUniqueViolation(err) {
			return ErrDuplicateUsername
		}
		return err
	}
	return nil
}

// SearchUsers returns users whose username ILIKE matches the query, ordered by follower count.
func (r *UserRepository) SearchUsers(ctx context.Context, query string, limit int) ([]UserSearchResult, error) {
	var results []UserSearchResult
	err := r.db.SelectContext(ctx, &results, `
		SELECT
			id,
			username,
			avatar_url,
			bio,
			(SELECT COUNT(*) FROM follows WHERE following_id = users.id) AS followers_count
		FROM users
		WHERE username ILIKE '%' || $1 || '%'
		ORDER BY followers_count DESC
		LIMIT $2`, query, limit)
	if err != nil {
		return nil, err
	}
	if results == nil {
		return []UserSearchResult{}, nil
	}
	return results, nil
}

// GetFollowCounts returns the followers and following count for a user.
func (r *UserRepository) GetFollowCounts(userID string) (followers int, following int, err error) {
	queryFollowers := `SELECT COUNT(*) FROM follows WHERE following_id = $1`
	err = r.db.Get(&followers, queryFollowers, userID)
	if err != nil {
		return 0, 0, err
	}

	queryFollowing := `SELECT COUNT(*) FROM follows WHERE follower_id = $1`
	err = r.db.Get(&following, queryFollowing, userID)
	if err != nil {
		return 0, 0, err
	}

	return followers, following, nil
}
