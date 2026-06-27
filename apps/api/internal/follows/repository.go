package follows

import (
	"context"

	"github.com/Dubjay18/reelstack/api/internal/users"
	"github.com/jmoiron/sqlx"
)

type IFollowRepository interface {
	Follow(ctx context.Context, followerID, followingID string) error
	Unfollow(ctx context.Context, followerID, followingID string) error
	IsFollowing(ctx context.Context, followerID, followingID string) (bool, error)
	GetFollowers(ctx context.Context, userID string) ([]*users.User, error)
	GetFollowing(ctx context.Context, userID string) ([]*users.User, error)
	GetFollowCounts(ctx context.Context, userID string) (followers int, following int, err error)
}

type FollowRepository struct {
	db *sqlx.DB
}

func NewFollowRepository(db *sqlx.DB) *FollowRepository {
	return &FollowRepository{db: db}
}

func (r *FollowRepository) Follow(ctx context.Context, followerID, followingID string) error {
	query := `
		INSERT INTO follows (follower_id, following_id, created_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (follower_id, following_id) DO NOTHING`
	_, err := r.db.ExecContext(ctx, query, followerID, followingID)
	return err
}

func (r *FollowRepository) Unfollow(ctx context.Context, followerID, followingID string) error {
	query := `DELETE FROM follows WHERE follower_id = $1 AND following_id = $2`
	_, err := r.db.ExecContext(ctx, query, followerID, followingID)
	return err
}

func (r *FollowRepository) IsFollowing(ctx context.Context, followerID, followingID string) (bool, error) {
	var exists bool
	query := `SELECT EXISTS(SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2)`
	err := r.db.GetContext(ctx, &exists, query, followerID, followingID)
	return exists, err
}

func (r *FollowRepository) GetFollowers(ctx context.Context, userID string) ([]*users.User, error) {
	var followers []*users.User
	query := `
		SELECT u.id, u.username, u.email, u.password_hash, u.avatar_url, u.bio, u.google_id, u.created_at, u.updated_at
		FROM users u
		JOIN follows f ON u.id = f.follower_id
		WHERE f.following_id = $1
		ORDER BY f.created_at DESC`
	err := r.db.SelectContext(ctx, &followers, query, userID)
	if err != nil {
		return nil, err
	}
	return followers, nil
}

func (r *FollowRepository) GetFollowing(ctx context.Context, userID string) ([]*users.User, error) {
	var following []*users.User
	query := `
		SELECT u.id, u.username, u.email, u.password_hash, u.avatar_url, u.bio, u.google_id, u.created_at, u.updated_at
		FROM users u
		JOIN follows f ON u.id = f.following_id
		WHERE f.follower_id = $1
		ORDER BY f.created_at DESC`
	err := r.db.SelectContext(ctx, &following, query, userID)
	if err != nil {
		return nil, err
	}
	return following, nil
}

func (r *FollowRepository) GetFollowCounts(ctx context.Context, userID string) (followers int, following int, err error) {
	queryFollowers := `SELECT COUNT(*) FROM follows WHERE following_id = $1`
	err = r.db.GetContext(ctx, &followers, queryFollowers, userID)
	if err != nil {
		return 0, 0, err
	}

	queryFollowing := `SELECT COUNT(*) FROM follows WHERE follower_id = $1`
	err = r.db.GetContext(ctx, &following, queryFollowing, userID)
	if err != nil {
		return 0, 0, err
	}

	return followers, following, nil
}
