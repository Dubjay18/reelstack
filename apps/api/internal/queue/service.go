package queue

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

type Service struct {
	client   *Client
	handlers map[string]JobHandler
	mu       sync.RWMutex
	cfg      Config

	consumerChan *amqp.Channel
	cancel       context.CancelFunc
	done         chan struct{}
}

type Config struct {
	QueueName string
}

func DefaultConfig() Config {
	return Config{
		QueueName: "notifications",
	}
}

func NewService(client *Client, cfg Config) *Service {
	return &Service{
		client:   client,
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
	raw, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	return s.client.Publish(ctx, jobType, raw)
}

func (s *Service) Start(ctx context.Context) {
	ctx, cancel := context.WithCancel(ctx)
	s.cancel = cancel
	s.done = make(chan struct{})

	ch, err := s.client.Conn().Channel()
	if err != nil {
		slog.Error("failed to open consumer channel", "error", err)
		return
	}
	s.consumerChan = ch

	q, err := ch.QueueDeclare(s.cfg.QueueName, true, false, false, false, nil)
	if err != nil {
		slog.Error("queue declare failed", "error", err)
		return
	}

	s.mu.RLock()
	for jobType := range s.handlers {
		if err := ch.QueueBind(q.Name, jobType, s.client.Exchange(), false, nil); err != nil {
			slog.Error("queue bind failed", "queue", q.Name, "routing_key", jobType, "error", err)
		}
	}
	s.mu.RUnlock()

	deliveries, err := ch.Consume(q.Name, "", false, false, false, false, nil)
	if err != nil {
		slog.Error("consume failed", "error", err)
		return
	}

	go s.runLoop(ctx, deliveries)
	slog.Info("queue worker started", "queue", q.Name)
}

func (s *Service) Shutdown() {
	if s.cancel != nil {
		s.cancel()
	}
	if s.done != nil {
		<-s.done
	}
	if s.consumerChan != nil {
		s.consumerChan.Close()
	}
}

func (s *Service) runLoop(ctx context.Context, deliveries <-chan amqp.Delivery) {
	defer close(s.done)

	for {
		select {
		case <-ctx.Done():
			slog.Info("queue worker shutting down")
			return
		case d, ok := <-deliveries:
			if !ok {
				slog.Info("deliveries channel closed")
				return
			}
			s.processDelivery(ctx, d)
		}
	}
}

func (s *Service) processDelivery(ctx context.Context, d amqp.Delivery) {
	s.mu.RLock()
	handler, ok := s.handlers[d.RoutingKey]
	s.mu.RUnlock()

	if !ok {
		slog.Warn("no handler for routing key", "routing_key", d.RoutingKey)
		d.Nack(false, false)
		return
	}

	job := &Job{
		Type:    d.RoutingKey,
		Payload: d.Body,
	}

	jobCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	if err := handler(jobCtx, job); err != nil {
		slog.Error("job failed", "type", job.Type, "error", err)
		d.Nack(false, false)
		return
	}

	d.Ack(false)
}
