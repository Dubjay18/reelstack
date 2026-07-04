package queue

import (
	"context"
	"fmt"

	amqp "github.com/rabbitmq/amqp091-go"
)

type Client struct {
	conn     *amqp.Connection
	channel  *amqp.Channel
	exchange string
}

func NewClient(amqpURL string) (*Client, error) {
	conn, err := amqp.Dial(amqpURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to RabbitMQ: %w", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to open channel: %w", err)
	}

	exchange := "reelstack.direct"
	if err := ch.ExchangeDeclare(exchange, amqp.ExchangeDirect, true, false, false, false, nil); err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("failed to declare exchange: %w", err)
	}

	return &Client{conn: conn, channel: ch, exchange: exchange}, nil
}

func (c *Client) Close() error {
	if err := c.channel.Close(); err != nil {
		return err
	}
	return c.conn.Close()
}

func (c *Client) Conn() *amqp.Connection {
	return c.conn
}

func (c *Client) Exchange() string {
	return c.exchange
}

func (c *Client) Publish(ctx context.Context, jobType string, body []byte) error {
	return c.channel.PublishWithContext(ctx, c.exchange, jobType, true, false, amqp.Publishing{
		ContentType:  "application/json",
		DeliveryMode: amqp.Persistent,
		Body:         body,
	})
}
