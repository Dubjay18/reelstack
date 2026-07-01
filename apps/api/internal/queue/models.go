package queue

import (
	"context"
	"time"
)

type JobStatus string

const (
	StatusPending    JobStatus = "pending"
	StatusProcessing JobStatus = "processing"
	StatusDone       JobStatus = "done"
	StatusFailed     JobStatus = "failed"
)

const JobTypeSendNotification = "send_notification"

type Job struct {
	ID           string     `json:"id" db:"id"`
	Type         string     `json:"type" db:"type"`
	Payload      []byte     `json:"payload" db:"payload"`
	Status       JobStatus  `json:"status" db:"status"`
	Priority     int        `json:"priority" db:"priority"`
	MaxRetries   int        `json:"max_retries" db:"max_retries"`
	RetryCount   int        `json:"retry_count" db:"retry_count"`
	LastError    *string    `json:"last_error,omitempty" db:"last_error"`
	ScheduledFor time.Time  `json:"scheduled_for" db:"scheduled_for"`
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
	StartedAt    *time.Time `json:"started_at,omitempty" db:"started_at"`
	CompletedAt  *time.Time `json:"completed_at,omitempty" db:"completed_at"`
}

type SendNotificationPayload struct {
	UserID   string  `json:"user_id"`
	ActorID  string  `json:"actor_id"`
	Type     string  `json:"type"`
	EntityID *string `json:"entity_id,omitempty"`
}

type Enqueuer interface {
	Enqueue(ctx context.Context, jobType string, payload any) error
}
