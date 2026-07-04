package queue

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/Dubjay18/reelstack/api/internal/email"
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

func NewSendEmailHandler(emailClient *email.Client) JobHandler {
	return func(ctx context.Context, job *Job) error {
		var payload SendEmailPayload
		if err := json.Unmarshal(job.Payload, &payload); err != nil {
			return err
		}

		if err := emailClient.Send(ctx, payload.Subject, payload.HTML, payload.PlainText, payload.To); err != nil {
			return err
		}

		slog.Debug("email sent",
			"to", payload.To,
			"subject", payload.Subject,
			"type", payload.Type,
		)
		return nil
	}
}

func NewSendWelcomeEmailHandler(emailClient *email.Client) JobHandler {
	return func(ctx context.Context, job *Job) error {
		var payload SendWelcomeEmailPayload
		if err := json.Unmarshal(job.Payload, &payload); err != nil {
			return err
		}

		if err := emailClient.SendWelcome(ctx, payload.Email, payload.Username); err != nil {
			return err
		}

		slog.Debug("welcome email sent",
			"to", payload.Email,
			"username", payload.Username,
		)
		return nil
	}
}
