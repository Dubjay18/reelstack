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

const JobTypeSendNotification = "send_notification"

type SendNotificationPayload struct {
	UserID   string  `json:"user_id"`
	ActorID  string  `json:"actor_id"`
	Type     string  `json:"type"`
	EntityID *string `json:"entity_id,omitempty"`
}
