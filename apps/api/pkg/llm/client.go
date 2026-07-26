package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// attemptTimeout bounds a single provider call. Deliberately shorter than
// the pre-gateway 60s: the router may try several providers in series, so
// the per-attempt budget has to leave room for failover inside one HTTP
// request (see Gateway.overallTimeout).
const attemptTimeout = 30 * time.Second

// jsonPromptInstruction is appended for providers whose models ignore or
// reject response_format. Belt-and-braces with stripJSONFence.
const jsonPromptInstruction = "\n\nRespond with a single valid JSON object and nothing else. " +
	"Do not wrap it in markdown code fences."

// Client is a minimal OpenAI-compatible chat-completions client for exactly
// one provider. Every provider we use (Groq, OpenRouter, and Gemini via its
// OpenAI-compatibility layer) speaks this contract, so one client shape
// covers all three — only the base URL, key, model and quirks differ.
//
// Note: web search is deliberately NOT implemented via OpenAI-style
// function/tool calling here — Groq's llama-3.3-70b-versatile tool-use
// implementation conflicts with also enforcing a strict custom JSON reply
// contract in the same turn (observed: "tool_use_failed" 400s). Instead,
// the chat contract itself carries an optional "search_query" field the
// model can set; the service layer runs the search server-side and asks
// again. See riley/service.go's buildChatResult.
//
// Client performs a single attempt with no retry — retry and failover are
// the Gateway's job, because only it knows whether another provider is
// available to fall through to.
type Client struct {
	cfg        ProviderConfig
	httpClient *http.Client
}

func NewClient(cfg ProviderConfig) *Client {
	// Gemini's documented compat base URL carries a trailing slash
	// (.../v1beta/openai/), which would otherwise build //chat/completions.
	cfg.BaseURL = strings.TrimRight(cfg.BaseURL, "/")
	return &Client{cfg: cfg, httpClient: &http.Client{Timeout: attemptTimeout}}
}

func (c *Client) Name() string           { return c.cfg.Name }
func (c *Client) Config() ProviderConfig { return c.cfg }

// Complete sends one chat completion request. On a non-2xx response it
// returns an *APIError carrying the status and any Retry-After hint, so the
// Gateway can decide between cooling the provider down and simply moving on.
func (c *Client) Complete(ctx context.Context, msgs []ChatMessage, jsonMode bool) (string, Usage, error) {
	body := chatCompletionRequest{Model: c.cfg.Model, Messages: msgs}
	if jsonMode {
		switch c.cfg.JSONMode {
		case JSONPrompt:
			body.Messages = withJSONInstruction(msgs)
		default:
			body.ResponseFormat = &responseFormat{Type: "json_object"}
		}
	}

	payload, err := json.Marshal(body)
	if err != nil {
		return "", Usage{}, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.cfg.BaseURL+"/chat/completions", bytes.NewReader(payload))
	if err != nil {
		return "", Usage{}, err
	}
	req.Header.Set("Authorization", "Bearer "+c.cfg.APIKey)
	req.Header.Set("Content-Type", "application/json")
	for k, v := range c.cfg.ExtraHeaders {
		req.Header.Set(k, v)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", Usage{}, err
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", Usage{}, err
	}

	if resp.StatusCode != http.StatusOK {
		return "", Usage{}, &APIError{
			Provider:   c.cfg.Name,
			Status:     resp.StatusCode,
			Body:       truncate(string(raw), 200),
			RetryAfter: parseRetryAfter(resp.Header.Get("Retry-After")),
		}
	}

	var parsed chatCompletionResponse
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return "", Usage{}, fmt.Errorf("LLM response parse error: %w", err)
	}
	if len(parsed.Choices) == 0 {
		return "", Usage{}, fmt.Errorf("LLM returned no choices")
	}

	content := parsed.Choices[0].Message.Content
	if jsonMode {
		// Some free models return fenced markdown even when asked for a bare
		// JSON object. Callers json.Unmarshal this directly, so unwrap here
		// rather than making each call site tolerant.
		content = stripJSONFence(content)
	}
	return content, parsed.Usage, nil
}

// withJSONInstruction returns a copy of msgs with the JSON instruction
// appended to the final message, leaving the caller's slice untouched.
func withJSONInstruction(msgs []ChatMessage) []ChatMessage {
	if len(msgs) == 0 {
		return msgs
	}
	out := make([]ChatMessage, len(msgs))
	copy(out, msgs)
	out[len(out)-1].Content += jsonPromptInstruction
	return out
}

// stripJSONFence unwraps ```json ... ``` (or a bare ``` ... ```) fence.
// Returns the input unchanged when it isn't fenced.
func stripJSONFence(s string) string {
	t := strings.TrimSpace(s)
	if !strings.HasPrefix(t, "```") {
		return s
	}
	t = strings.TrimPrefix(t, "```")
	t = strings.TrimPrefix(t, "json")
	t = strings.TrimPrefix(t, "JSON")
	if i := strings.LastIndex(t, "```"); i >= 0 {
		t = t[:i]
	}
	return strings.TrimSpace(t)
}

// parseRetryAfter reads the delay-seconds form of the Retry-After header.
// The HTTP-date form is not handled: providers use seconds in practice, and
// a missing hint just falls back to the Gateway's default cooldown.
func parseRetryAfter(v string) time.Duration {
	if v == "" {
		return 0
	}
	secs, err := strconv.Atoi(strings.TrimSpace(v))
	if err != nil || secs < 0 {
		return 0
	}
	return time.Duration(secs) * time.Second
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}
