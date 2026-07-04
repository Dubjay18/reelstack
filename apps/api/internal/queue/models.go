package queue

import "context"

type Job struct {
	Type    string
	Payload []byte
}

type Enqueuer interface {
	Enqueue(ctx context.Context, jobType string, payload any) error
}

type JobHandler func(ctx context.Context, job *Job) error

const (
	JobTypeSendNotification  = "send_notification"
	JobTypeSendEmail         = "send_email"
	JobTypeSendWelcomeEmail  = "send_welcome_email"
)

type SendNotificationPayload struct {
	UserID   string  `json:"user_id"`
	ActorID  string  `json:"actor_id"`
	Type     string  `json:"type"`
	EntityID *string `json:"entity_id,omitempty"`
}

type SendEmailPayload struct {
	To        string `json:"to"`
	Subject   string `json:"subject"`
	HTML      string `json:"html"`
	PlainText string `json:"plain_text"`
	Type      string `json:"type"`
}

type SendWelcomeEmailPayload struct {
	Email    string `json:"email"`
	Username string `json:"username"`
}
