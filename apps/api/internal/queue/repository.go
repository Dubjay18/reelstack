package queue

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type Repository struct {
	db *sqlx.DB
}

func NewRepository(db *sqlx.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Enqueue(ctx context.Context, jobType string, payload any, opts ...EnqueueOption) error {
	raw, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	cfg := defaultEnqueueConfig()
	for _, o := range opts {
		o(cfg)
	}

	query := `
		INSERT INTO queue_jobs (id, type, payload, status, priority, max_retries, scheduled_for)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`

	_, err = r.db.ExecContext(ctx, query,
		uuid.NewString(),
		jobType,
		raw,
		StatusPending,
		cfg.priority,
		cfg.maxRetries,
		cfg.scheduledFor,
	)
	return err
}

type enqueueConfig struct {
	priority     int
	maxRetries   int
	scheduledFor time.Time
}

type EnqueueOption func(*enqueueConfig)

func defaultEnqueueConfig() *enqueueConfig {
	return &enqueueConfig{
		priority:     0,
		maxRetries:   3,
		scheduledFor: time.Now(),
	}
}

func WithPriority(p int) EnqueueOption {
	return func(c *enqueueConfig) { c.priority = p }
}

func WithMaxRetries(n int) EnqueueOption {
	return func(c *enqueueConfig) { c.maxRetries = n }
}

func WithScheduledAt(t time.Time) EnqueueOption {
	return func(c *enqueueConfig) { c.scheduledFor = t }
}

func (r *Repository) Dequeue(ctx context.Context, batchSize int) ([]*Job, error) {
	query := `
		UPDATE queue_jobs
		SET status = $1, started_at = NOW()
		WHERE id IN (
			SELECT id FROM queue_jobs
			WHERE status = $2 AND scheduled_for <= NOW()
			ORDER BY priority DESC, created_at ASC
			LIMIT $3
			FOR UPDATE SKIP LOCKED
		)
		RETURNING id, type, payload, status, priority, max_retries, retry_count, last_error,
		          scheduled_for, created_at, started_at, completed_at`

	var jobs []*Job
	err := r.db.SelectContext(ctx, &jobs, query, StatusProcessing, StatusPending, batchSize)
	if err != nil {
		return nil, err
	}
	return jobs, nil
}

func (r *Repository) MarkDone(ctx context.Context, jobID string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE queue_jobs SET status = $1, completed_at = NOW() WHERE id = $2`,
		StatusDone, jobID,
	)
	return err
}

func (r *Repository) MarkFailed(ctx context.Context, jobID string, errMsg string) error {
	query := `
		UPDATE queue_jobs
		SET status = CASE
				WHEN retry_count + 1 >= max_retries THEN $1
				ELSE $2
			END,
		    retry_count = retry_count + 1,
		    last_error = $3,
		    started_at = NULL
		WHERE id = $4`

	_, err := r.db.ExecContext(ctx, query, StatusFailed, StatusPending, errMsg, jobID)
	return err
}

func (r *Repository) RequeueDead(ctx context.Context, olderThan time.Duration) (int, error) {
	cutoff := time.Now().Add(-olderThan)
	res, err := r.db.ExecContext(ctx,
		`UPDATE queue_jobs
		 SET status = $1, retry_count = 0, last_error = NULL, started_at = NULL
		 WHERE status = $2 AND completed_at < $3`,
		StatusPending, StatusFailed, cutoff,
	)
	if err != nil {
		return 0, err
	}
	n, _ := res.RowsAffected()
	return int(n), nil
}
