// Package pushnotify sends push notifications through Expo's Push API
// (https://exp.host/--/api/v2/push/send). It's a plain net/http client —
// Expo doesn't require any vendored SDK — and degrades gracefully when no
// access token is configured, since Expo's access token is optional.
package pushnotify

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const expoPushURL = "https://exp.host/--/api/v2/push/send"

// expoBatchLimit is Expo's hard cap on messages per request.
const expoBatchLimit = 100

type ExpoClient struct {
	accessToken string
	httpClient  *http.Client
}

func NewExpoClient(accessToken string) *ExpoClient {
	return &ExpoClient{
		accessToken: accessToken,
		httpClient:  &http.Client{Timeout: 15 * time.Second},
	}
}

type Message struct {
	To        string            `json:"to"`
	Title     string            `json:"title,omitempty"`
	Body      string            `json:"body,omitempty"`
	Data      map[string]string `json:"data,omitempty"`
	Sound     string            `json:"sound,omitempty"`
	Priority  string            `json:"priority,omitempty"`
	ChannelID string            `json:"channelId,omitempty"`
}

type Ticket struct {
	Status  string `json:"status"` // "ok" | "error"
	ID      string `json:"id,omitempty"`
	Message string `json:"message,omitempty"`
	Details *struct {
		Error string `json:"error,omitempty"`
	} `json:"details,omitempty"`
}

// DeviceNotRegistered reports whether a ticket signals a dead token that
// should be removed from storage.
func (t Ticket) DeviceNotRegistered() bool {
	return t.Status == "error" && t.Details != nil && t.Details.Error == "DeviceNotRegistered"
}

type expoResponse struct {
	Data []Ticket `json:"data"`
}

// Send chunks messages into batches of at most expoBatchLimit (Expo's hard
// limit per request) and posts each batch sequentially, returning tickets
// in the same order as the input messages. Retries once per batch on
// 429/5xx.
func (c *ExpoClient) Send(ctx context.Context, messages []Message) ([]Ticket, error) {
	tickets := make([]Ticket, 0, len(messages))

	for start := 0; start < len(messages); start += expoBatchLimit {
		end := min(start+expoBatchLimit, len(messages))

		batchTickets, err := c.sendBatch(ctx, messages[start:end])
		if err != nil {
			return tickets, err
		}
		tickets = append(tickets, batchTickets...)
	}

	return tickets, nil
}

func (c *ExpoClient) sendBatch(ctx context.Context, messages []Message) ([]Ticket, error) {
	payload, err := json.Marshal(messages)
	if err != nil {
		return nil, err
	}

	var lastErr error
	for attempt := range 2 {
		if attempt > 0 {
			select {
			case <-time.After(2 * time.Second):
			case <-ctx.Done():
				return nil, ctx.Err()
			}
		}

		req, err := http.NewRequestWithContext(ctx, "POST", expoPushURL, bytes.NewReader(payload))
		if err != nil {
			return nil, err
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Accept", "application/json")
		if c.accessToken != "" {
			req.Header.Set("Authorization", "Bearer "+c.accessToken)
		}

		resp, err := c.httpClient.Do(req)
		if err != nil {
			lastErr = err
			continue
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			lastErr = err
			continue
		}

		if resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode >= 500 {
			lastErr = fmt.Errorf("expo push API error %d: %s", resp.StatusCode, truncate(string(body), 200))
			continue
		}
		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("expo push API error %d: %s", resp.StatusCode, truncate(string(body), 200))
		}

		var parsed expoResponse
		if err := json.Unmarshal(body, &parsed); err != nil {
			return nil, fmt.Errorf("expo push API response parse error: %w", err)
		}
		return parsed.Data, nil
	}

	return nil, lastErr
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}
