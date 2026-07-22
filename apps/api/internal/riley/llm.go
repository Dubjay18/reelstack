package riley

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// LLMClient is a minimal OpenAI-compatible chat-completions client.
// Works against any provider exposing the /chat/completions contract
// (Groq, Gemini AI Studio compat endpoint, OpenRouter).
type LLMClient struct {
	baseURL    string
	apiKey     string
	model      string
	httpClient *http.Client
}

func NewLLMClient(baseURL, apiKey, model string) *LLMClient {
	return &LLMClient{
		baseURL:    baseURL,
		apiKey:     apiKey,
		model:      model,
		httpClient: &http.Client{Timeout: 60 * time.Second},
	}
}

// Enabled reports whether an API key is configured.
func (c *LLMClient) Enabled() bool {
	return c.apiKey != ""
}

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatCompletionRequest struct {
	Model          string          `json:"model"`
	Messages       []ChatMessage   `json:"messages"`
	ResponseFormat *responseFormat `json:"response_format,omitempty"`
}

type responseFormat struct {
	Type string `json:"type"`
}

type chatCompletionResponse struct {
	Choices []struct {
		Message ChatMessage `json:"message"`
	} `json:"choices"`
}

// Complete sends the messages and returns the assistant's reply text.
// jsonMode asks the provider to return a valid JSON object.
// Retries once on 429/5xx.
//
// Note: web search is deliberately NOT implemented via OpenAI-style
// function/tool calling here — Groq's llama-3.3-70b-versatile tool-use
// implementation conflicts with also enforcing a strict custom JSON reply
// contract in the same turn (observed: "tool_use_failed" 400s). Instead,
// the chat contract itself carries an optional "search_query" field the
// model can set; the service layer runs the search server-side and asks
// again. See service.go's buildChatResult.
func (c *LLMClient) Complete(ctx context.Context, msgs []ChatMessage, jsonMode bool) (string, error) {
	if !c.Enabled() {
		return "", ErrLLMDisabled
	}

	reqBody := chatCompletionRequest{Model: c.model, Messages: msgs}
	if jsonMode {
		reqBody.ResponseFormat = &responseFormat{Type: "json_object"}
	}
	payload, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	var lastErr error
	for attempt := range 2 {
		if attempt > 0 {
			select {
			case <-time.After(2 * time.Second):
			case <-ctx.Done():
				return "", ctx.Err()
			}
		}

		req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/chat/completions", bytes.NewReader(payload))
		if err != nil {
			return "", err
		}
		req.Header.Set("Authorization", "Bearer "+c.apiKey)
		req.Header.Set("Content-Type", "application/json")

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
			lastErr = fmt.Errorf("LLM API error %d: %s", resp.StatusCode, truncate(string(body), 200))
			continue
		}
		if resp.StatusCode != http.StatusOK {
			return "", fmt.Errorf("LLM API error %d: %s", resp.StatusCode, truncate(string(body), 200))
		}

		var parsed chatCompletionResponse
		if err := json.Unmarshal(body, &parsed); err != nil {
			return "", fmt.Errorf("LLM response parse error: %w", err)
		}
		if len(parsed.Choices) == 0 {
			return "", fmt.Errorf("LLM returned no choices")
		}
		return parsed.Choices[0].Message.Content, nil
	}

	return "", lastErr
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}
