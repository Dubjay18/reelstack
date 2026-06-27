package notifications

import (
	"context"

	"github.com/google/uuid"
)

type INotificationService interface {
	CreateNotification(ctx context.Context, userID, actorID, notifType string, entityID *string) error
	GetNotifications(ctx context.Context, userID string) ([]*Notification, error)
	MarkAsRead(ctx context.Context, notificationID, userID string) error
	MarkAllAsRead(ctx context.Context, userID string) error
	DeleteFollowNotification(ctx context.Context, userID, actorID string) error
}

type NotificationService struct {
	repo INotificationRepository
}

func NewNotificationService(repo INotificationRepository) *NotificationService {
	return &NotificationService{repo: repo}
}

func (s *NotificationService) CreateNotification(ctx context.Context, userID, actorID, notifType string, entityID *string) error {
	// Never notify a user about their own actions
	if userID == actorID {
		return nil
	}

	notif := &Notification{
		ID:       uuid.NewString(),
		UserID:   userID,
		ActorID:  actorID,
		Type:     notifType,
		EntityID: entityID,
		IsRead:   false,
	}
	return s.repo.CreateNotification(ctx, notif)
}

func (s *NotificationService) GetNotifications(ctx context.Context, userID string) ([]*Notification, error) {
	return s.repo.GetNotifications(ctx, userID)
}

func (s *NotificationService) MarkAsRead(ctx context.Context, notificationID, userID string) error {
	return s.repo.MarkAsRead(ctx, notificationID, userID)
}

func (s *NotificationService) MarkAllAsRead(ctx context.Context, userID string) error {
	return s.repo.MarkAllAsRead(ctx, userID)
}

func (s *NotificationService) DeleteFollowNotification(ctx context.Context, userID, actorID string) error {
	return s.repo.DeleteFollowNotification(ctx, userID, actorID)
}
