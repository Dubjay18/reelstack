package cache

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

// TTL constants for all cache keys.
const (
	TMDBMovieTTL   = 7 * 24 * time.Hour
	StreamingTTL   = 24 * time.Hour
	SearchTTL      = 1 * time.Hour
	UserProfileTTL = 5 * time.Minute
)

// Client wraps redis.Client with helpers.
type Client struct {
	rdb *redis.Client
}

func NewClient(url string) (*Client, error) {
	opts, err := redis.ParseURL(url)
	if err != nil {
		return nil, err
	}
	rdb := redis.NewClient(opts)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, err
	}
	return &Client{rdb: rdb}, nil
}

func (c *Client) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	return c.rdb.Set(ctx, key, value, ttl).Err()
}

func (c *Client) Get(ctx context.Context, key string) (string, error) {
	return c.rdb.Get(ctx, key).Result()
}

func (c *Client) Delete(ctx context.Context, key string) error {
	return c.rdb.Del(ctx, key).Err()
}

func (c *Client) Close() error {
	return c.rdb.Close()
}

func (c *Client) Redis() *redis.Client {
	return c.rdb
}
