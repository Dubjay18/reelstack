package pushnotify

import (
	"context"
	"log/slog"

	"github.com/Dubjay18/reelstack/api/internal/notifications"
)

// TokenStore is the subset of pushtokens' repository this package depends
// on: fetching a recipient's devices, and pruning a token Expo reports as
// dead. Declared here (not imported from pushtokens) so pushnotify only
// depends on the shape it actually uses.
type TokenStore interface {
	GetTokensForUser(ctx context.Context, userID string) ([]string, error)
	DeleteByToken(ctx context.Context, token string) error
}

type Service struct {
	client *ExpoClient
	tokens TokenStore
	notifs notifications.INotificationService
}

func NewService(client *ExpoClient, tokens TokenStore, notifs notifications.INotificationService) *Service {
	return &Service{client: client, tokens: tokens, notifs: notifs}
}

// NotifyFromNotification looks up an already-created notification row and
// pushes it to every device registered for its recipient. Never returns an
// error — push delivery is best-effort and must never affect whether the
// in-app notification write is treated as successful.
func (s *Service) NotifyFromNotification(ctx context.Context, notificationID, recipientID string) {
	// Check for registered devices before paying for the enriched (4-way
	// join) notification lookup below — most users have none.
	deviceTokens, err := s.tokens.GetTokensForUser(ctx, recipientID)
	if err != nil {
		slog.Error("pushnotify: failed to load tokens", "error", err, "user_id", recipientID)
		return
	}
	if len(deviceTokens) == 0 {
		return
	}

	notif, err := s.notifs.GetNotificationByID(ctx, notificationID)
	if err != nil {
		slog.Error("pushnotify: failed to load notification", "error", err, "notification_id", notificationID)
		return
	}

	title, body := titleAndBody(notif)
	if title == "" {
		return // unknown/unsupported type — nothing to push
	}

	data := dataPayload(notif)
	messages := make([]Message, len(deviceTokens))
	for i, token := range deviceTokens {
		messages[i] = Message{
			To:        token,
			Title:     title,
			Body:      body,
			Data:      data,
			Sound:     "default",
			Priority:  "high",
			ChannelID: "default",
		}
	}

	tickets, err := s.client.Send(ctx, messages)
	if err != nil {
		slog.Error("pushnotify: send failed", "error", err, "user_id", notif.UserID)
		return
	}

	for i, ticket := range tickets {
		if i >= len(deviceTokens) {
			break
		}
		if ticket.DeviceNotRegistered() {
			if err := s.tokens.DeleteByToken(ctx, deviceTokens[i]); err != nil {
				slog.Error("pushnotify: failed to delete dead token", "error", err)
			}
		}
	}
}
