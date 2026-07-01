package queue

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/Dubjay18/reelstack/api/internal/notifications"
)

func NewSendNotificationHandler(notifSvc *notifications.NotificationService) JobHandler {
	return func(ctx context.Context, job *Job) error {
		var payload SendNotificationPayload
		if err := json.Unmarshal(job.Payload, &payload); err != nil {
			return err
		}

		if payload.UserID == payload.ActorID {
			return nil
		}

		notifSvc.CreateNotification(ctx, payload.UserID, payload.ActorID, payload.Type, payload.EntityID)

		slog.Debug("notification created",
			"user_id", payload.UserID,
			"actor_id", payload.ActorID,
			"type", payload.Type,
		)
		return nil
	}
}
