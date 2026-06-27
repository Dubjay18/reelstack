package notifications

import (
	"context"

	"github.com/jmoiron/sqlx"
)

type INotificationRepository interface {
	CreateNotification(ctx context.Context, notif *Notification) error
	GetNotifications(ctx context.Context, userID string) ([]*Notification, error)
	MarkAsRead(ctx context.Context, notificationID, userID string) error
	MarkAllAsRead(ctx context.Context, userID string) error
	DeleteFollowNotification(ctx context.Context, userID, actorID string) error
}

type NotificationRepository struct {
	db *sqlx.DB
}

func NewNotificationRepository(db *sqlx.DB) *NotificationRepository {
	return &NotificationRepository{db: db}
}

func (r *NotificationRepository) CreateNotification(ctx context.Context, notif *Notification) error {
	query := `
		INSERT INTO notifications (id, user_id, actor_id, type, entity_id, is_read, created_at)
		VALUES (:id, :user_id, :actor_id, :type, :entity_id, :is_read, NOW())`
	_, err := r.db.NamedExecContext(ctx, query, notif)
	return err
}

func (r *NotificationRepository) GetNotifications(ctx context.Context, userID string) ([]*Notification, error) {
	var notifs []*Notification
	query := `
		SELECT n.id, n.user_id, n.actor_id, n.type, n.entity_id, n.is_read, n.created_at,
		       u.username AS actor_username, u.avatar_url AS actor_avatar_url,
		       l.title AS entity_title
		FROM notifications n
		JOIN users u ON n.actor_id = u.id
		LEFT JOIN lists l ON n.entity_id = l.id AND n.type = 'list_created'
		WHERE n.user_id = $1
		ORDER BY n.created_at DESC`
	err := r.db.SelectContext(ctx, &notifs, query, userID)
	if err != nil {
		return nil, err
	}
	return notifs, nil
}

func (r *NotificationRepository) MarkAsRead(ctx context.Context, notificationID, userID string) error {
	query := `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`
	_, err := r.db.ExecContext(ctx, query, notificationID, userID)
	return err
}

func (r *NotificationRepository) MarkAllAsRead(ctx context.Context, userID string) error {
	query := `UPDATE notifications SET is_read = TRUE WHERE user_id = $1`
	_, err := r.db.ExecContext(ctx, query, userID)
	return err
}

func (r *NotificationRepository) DeleteFollowNotification(ctx context.Context, userID, actorID string) error {
	query := `DELETE FROM notifications WHERE user_id = $1 AND actor_id = $2 AND type = 'new_follower'`
	_, err := r.db.ExecContext(ctx, query, userID, actorID)
	return err
}
