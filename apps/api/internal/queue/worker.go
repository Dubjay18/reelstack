package queue

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/Dubjay18/reelstack/api/internal/email"
	"github.com/Dubjay18/reelstack/api/internal/notifications"
	"github.com/Dubjay18/reelstack/api/internal/pushnotify"
)

// NewSendNotificationHandler writes the in-app notification row and, on
// success, fans out a push notification to the recipient's registered
// devices. Push delivery is best-effort (pushSvc never returns an error to
// this handler) so a transient Expo API hiccup never causes the queue to
// retry — and never undoes the already-written in-app notification.
func NewSendNotificationHandler(notifSvc *notifications.NotificationService, pushSvc *pushnotify.Service) JobHandler {
	return func(ctx context.Context, job *Job) error {
		var payload SendNotificationPayload
		if err := json.Unmarshal(job.Payload, &payload); err != nil {
			return err
		}

		if payload.UserID == payload.ActorID {
			return nil
		}

		id, err := notifSvc.CreateNotificationReturningID(ctx, payload.UserID, payload.ActorID, payload.Type, payload.EntityID)
		if err != nil {
			slog.Error("failed to create notification", "error", err, "user_id", payload.UserID, "type", payload.Type)
			return nil
		}

		slog.Debug("notification created",
			"user_id", payload.UserID,
			"actor_id", payload.ActorID,
			"type", payload.Type,
		)

		if id != "" {
			pushSvc.NotifyFromNotification(ctx, id, payload.UserID)
		}

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

func NewSendPasswordResetEmailHandler(emailClient *email.Client) JobHandler {
	return func(ctx context.Context, job *Job) error {
		var payload SendPasswordResetEmailPayload
		if err := json.Unmarshal(job.Payload, &payload); err != nil {
			return err
		}

		if err := emailClient.SendPasswordReset(ctx, payload.Email, payload.Username, payload.Token); err != nil {
			return err
		}

		slog.Debug("password reset email sent", "to", payload.Email)
		return nil
	}
}

func NewSendVerificationEmailHandler(emailClient *email.Client) JobHandler {
	return func(ctx context.Context, job *Job) error {
		var payload SendVerificationEmailPayload
		if err := json.Unmarshal(job.Payload, &payload); err != nil {
			return err
		}

		if err := emailClient.SendVerification(ctx, payload.Email, payload.Username, payload.Token); err != nil {
			return err
		}

		slog.Debug("verification email sent", "to", payload.Email)
		return nil
	}
}
