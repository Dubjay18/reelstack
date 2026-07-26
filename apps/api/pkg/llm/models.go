// Package llm is a multi-provider gateway for OpenAI-compatible chat
// completions. It fronts several providers (Groq, OpenRouter, Gemini) in
// strict priority order, failing over when one is rate-limited or erroring,
// so a single provider's free tier stops being the hard ceiling on usage.
package llm

import (
	"errors"
	"fmt"
	"time"
)

// ErrDisabled is returned when no provider has an API key configured.
// Callers treat this as "the LLM feature is turned off", not as a failure.
var ErrDisabled = errors.New("llm: no provider is configured")

// ErrAllProvidersExhausted is returned when every configured provider was
// skipped before dispatch — quota spent or in cooldown — so nothing was
// even attempted. Distinct from "everything was tried and failed", because
// this one is a capacity signal the caller can retry later.
var ErrAllProvidersExhausted = errors.New("llm: all providers exhausted")

// ChatMessage is one turn in a chat completion request.
type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// Usage is the token accounting a provider reports for a call. Providers may
// omit it entirely, in which case every field is zero and the caller falls
// back to its own estimate.
type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// APIError is a non-2xx response from a provider. The message format is kept
// byte-compatible with the pre-gateway client so existing logs and any
// downstream string matching keep working.
type APIError struct {
	Provider   string
	Status     int
	Body       string
	RetryAfter time.Duration
}

func (e *APIError) Error() string {
	return fmt.Sprintf("LLM API error %d: %s", e.Status, e.Body)
}

// ── wire format (OpenAI chat-completions) ───────────────────────────────────

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
	Usage Usage `json:"usage"`
}
