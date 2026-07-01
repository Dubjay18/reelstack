package queue

import (
	"context"
	"log/slog"
	"sync"
	"time"
)

type JobHandler func(ctx context.Context, job *Job) error

type Service struct {
	repo     *Repository
	handlers map[string]JobHandler
	mu       sync.RWMutex
	cfg      Config

	workerCancel context.CancelFunc
	workerDone   chan struct{}
}

type Config struct {
	PollInterval time.Duration
	BatchSize    int
}

func DefaultConfig() Config {
	return Config{
		PollInterval: 2 * time.Second,
		BatchSize:    10,
	}
}

func NewService(repo *Repository, cfg Config) *Service {
	return &Service{
		repo:     repo,
		handlers: make(map[string]JobHandler),
		cfg:      cfg,
	}
}

func (s *Service) RegisterHandler(jobType string, handler JobHandler) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.handlers[jobType] = handler
}

func (s *Service) Enqueue(ctx context.Context, jobType string, payload any) error {
	return s.repo.Enqueue(ctx, jobType, payload)
}

func (s *Service) Start(ctx context.Context) {
	ctx, cancel := context.WithCancel(ctx)
	s.workerCancel = cancel
	s.workerDone = make(chan struct{})

	go s.runLoop(ctx)
	slog.Info("queue worker started", "poll_interval", s.cfg.PollInterval, "batch_size", s.cfg.BatchSize)
}

func (s *Service) Shutdown() {
	if s.workerCancel != nil {
		s.workerCancel()
	}
	if s.workerDone != nil {
		<-s.workerDone
	}
}

func (s *Service) runLoop(ctx context.Context) {
	defer close(s.workerDone)

	ticker := time.NewTicker(s.cfg.PollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			slog.Info("queue worker shutting down")
			return
		case <-ticker.C:
			s.processBatch(ctx)
		}
	}
}

func (s *Service) processBatch(ctx context.Context) {
	jobs, err := s.repo.Dequeue(ctx, s.cfg.BatchSize)
	if err != nil {
		slog.Error("queue dequeue failed", "error", err)
		return
	}

	for _, job := range jobs {
		s.processJob(ctx, job)
	}
}

func (s *Service) processJob(ctx context.Context, job *Job) {
	s.mu.RLock()
	handler, ok := s.handlers[job.Type]
	s.mu.RUnlock()

	if !ok {
		slog.Warn("no handler registered for job type", "type", job.Type, "job_id", job.ID)
		if err := s.repo.MarkFailed(ctx, job.ID, "no handler registered"); err != nil {
			slog.Error("failed to mark job as failed", "job_id", job.ID, "error", err)
		}
		return
	}

	jobCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	if err := handler(jobCtx, job); err != nil {
		slog.Error("job failed", "type", job.Type, "job_id", job.ID, "error", err)
		if err := s.repo.MarkFailed(ctx, job.ID, err.Error()); err != nil {
			slog.Error("failed to mark job as failed", "job_id", job.ID, "error", err)
		}
		return
	}

	if err := s.repo.MarkDone(ctx, job.ID); err != nil {
		slog.Error("failed to mark job as done", "job_id", job.ID, "error", err)
	}
}
