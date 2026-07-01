package follows

import (
	"context"
	"errors"

	"github.com/Dubjay18/reelstack/api/internal/notifications"
	"github.com/Dubjay18/reelstack/api/internal/queue"
	"github.com/Dubjay18/reelstack/api/internal/users"
)

var (
	ErrCannotFollowSelf = errors.New("cannot follow yourself")
)

type IFollowService interface {
	Follow(ctx context.Context, followerID, followingID string) error
	Unfollow(ctx context.Context, followerID, followingID string) error
	IsFollowing(ctx context.Context, followerID, followingID string) (bool, error)
	GetFollowers(ctx context.Context, userID string) ([]*users.User, error)
	GetFollowing(ctx context.Context, userID string) ([]*users.User, error)
	GetFollowCounts(ctx context.Context, userID string) (followers int, following int, err error)
}

type FollowService struct {
	repo      IFollowRepository
	notifSvc  notifications.INotificationService
	enqueuer  queue.Enqueuer
}

func NewFollowService(repo IFollowRepository, notifSvc notifications.INotificationService, enqueuer queue.Enqueuer) *FollowService {
	return &FollowService{
		repo:     repo,
		notifSvc: notifSvc,
		enqueuer: enqueuer,
	}
}

func (s *FollowService) Follow(ctx context.Context, followerID, followingID string) error {
	if followerID == followingID {
		return ErrCannotFollowSelf
	}

	err := s.repo.Follow(ctx, followerID, followingID)
	if err != nil {
		return err
	}

	_ = s.enqueuer.Enqueue(ctx, queue.JobTypeSendNotification, queue.SendNotificationPayload{
		UserID:   followingID,
		ActorID:  followerID,
		Type:     "new_follower",
		EntityID: nil,
	})

	return nil
}

func (s *FollowService) Unfollow(ctx context.Context, followerID, followingID string) error {
	err := s.repo.Unfollow(ctx, followerID, followingID)
	if err != nil {
		return err
	}

	_ = s.notifSvc.DeleteFollowNotification(ctx, followingID, followerID)

	return nil
}

func (s *FollowService) IsFollowing(ctx context.Context, followerID, followingID string) (bool, error) {
	return s.repo.IsFollowing(ctx, followerID, followingID)
}

func (s *FollowService) GetFollowers(ctx context.Context, userID string) ([]*users.User, error) {
	return s.repo.GetFollowers(ctx, userID)
}

func (s *FollowService) GetFollowing(ctx context.Context, userID string) ([]*users.User, error) {
	return s.repo.GetFollowing(ctx, userID)
}

func (s *FollowService) GetFollowCounts(ctx context.Context, userID string) (followers int, following int, err error) {
	return s.repo.GetFollowCounts(ctx, userID)
}
