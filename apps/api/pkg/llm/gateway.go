package llm

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"sync"
	"time"
)

const (
	// overallTimeout bounds one Complete call across every failover hop, so
	// a slow chain of providers can't outlive the HTTP request that started
	// it. Must exceed attemptTimeout but stay under the server's write
	// deadline.
	overallTimeout = 75 * time.Second

	// retryBackoff matches the pre-gateway client's fixed pause. Only used
	// for a same-provider retry on the last provider in the chain.
	retryBackoff = 2 * time.Second

	// completionReserve is added to the prompt estimate to account for the
	// reply, which we can't measure until it arrives.
	completionReserve = 800

	defaultCooldown  = 60 * time.Second
	maxCooldown      = 5 * time.Minute
	serverCooldown   = 30 * time.Second
	authCooldown     = 15 * time.Minute
	serverFailBudget = 2
)

// Gateway routes chat completions across providers in strict priority
// order, failing over on rate limits and errors.
//
// Failover replaces same-provider retry for 429s: a provider's daily quota
// does not clear in two seconds, so retrying it is pure added latency on
// the dominant failure mode. Same-provider retry survives only on the last
// provider in the chain, where there is nothing left to fall through to.
type Gateway struct {
	clients []*Client
	quota   IQuotaStore

	mu        sync.Mutex
	cooldowns map[string]time.Time
	failures  map[string]int
}

// NewGateway builds a router over the given providers, in the order given.
// Providers without an API key are dropped. quota may be nil, in which case
// tracking is disabled but in-process cooldowns still apply.
func NewGateway(providers []ProviderConfig, quota IQuotaStore) *Gateway {
	if quota == nil {
		quota = NoopQuota{}
	}
	g := &Gateway{
		quota:     quota,
		cooldowns: make(map[string]time.Time),
		failures:  make(map[string]int),
	}
	for _, p := range providers {
		if p.APIKey == "" {
			continue
		}
		g.clients = append(g.clients, NewClient(p))
	}
	return g
}

// Enabled reports whether at least one provider is configured.
func (g *Gateway) Enabled() bool { return len(g.clients) > 0 }

// Providers returns the configured provider names in priority order.
func (g *Gateway) Providers() []string {
	names := make([]string, 0, len(g.clients))
	for _, c := range g.clients {
		names = append(names, c.Name())
	}
	return names
}

// Complete tries each eligible provider in priority order and returns the
// first successful reply.
//
// It returns ErrAllProvidersExhausted when every provider was skipped before
// dispatch (quota spent or cooling down) — a capacity signal distinct from
// the joined error returned when providers were actually tried and failed.
func (g *Gateway) Complete(ctx context.Context, msgs []ChatMessage, jsonMode bool) (string, error) {
	if !g.Enabled() {
		return "", ErrDisabled
	}

	ctx, cancel := context.WithTimeout(ctx, overallTimeout)
	defer cancel()

	est := estimateTokens(msgs) + completionReserve

	eligible := make([]*Client, 0, len(g.clients))
	for _, c := range g.clients {
		if g.inCooldown(c.Name()) || g.quota.InCooldown(ctx, c.Name()) {
			continue
		}
		if !g.quota.Eligible(ctx, c.Name(), c.Config().Limits, est) {
			continue
		}
		eligible = append(eligible, c)
	}
	if len(eligible) == 0 {
		slog.Warn("llm: every provider is exhausted or cooling down", "providers", g.Providers())
		return "", ErrAllProvidersExhausted
	}

	var errs []error
	for i, c := range eligible {
		// Only the last provider gets a second bite: before that, failing
		// over is strictly better than waiting.
		attempts := 1
		if i == len(eligible)-1 {
			attempts = 2
		}

		reply, usage, err := g.dispatch(ctx, c, msgs, jsonMode, attempts, est)
		if err == nil {
			slog.Info("llm: served",
				"provider", c.Name(), "model", c.Config().Model,
				"tokens", usage.TotalTokens, "estimated", usage.TotalTokens == 0, "position", i)
			return reply, nil
		}
		errs = append(errs, fmt.Errorf("%s: %w", c.Name(), err))

		if ctx.Err() != nil { // caller gave up or the overall deadline passed
			break
		}
	}

	return "", fmt.Errorf("llm: all providers failed: %w", errors.Join(errs...))
}

// dispatch runs one provider, applies the outcome to its cooldown state, and
// records quota spend.
func (g *Gateway) dispatch(ctx context.Context, c *Client, msgs []ChatMessage, jsonMode bool, attempts, est int) (string, Usage, error) {
	var lastErr error

	for attempt := 0; attempt < attempts; attempt++ {
		if attempt > 0 {
			select {
			case <-time.After(retryBackoff):
			case <-ctx.Done():
				return "", Usage{}, ctx.Err()
			}
		}

		g.quota.RecordRequest(ctx, c.Name())
		reply, usage, err := c.Complete(ctx, msgs, jsonMode)
		if err == nil {
			g.clearFailures(c.Name())
			// Fall back to the estimate when a provider omits usage, so the
			// token ledger never stalls at zero.
			spent := usage.TotalTokens
			if spent == 0 {
				spent = est
			}
			g.quota.RecordTokens(ctx, c.Name(), spent)
			return reply, usage, nil
		}

		lastErr = err
		if retryable := g.classify(ctx, c.Name(), err); !retryable {
			return "", Usage{}, err
		}
	}

	return "", Usage{}, lastErr
}

// classify applies cooldowns based on the failure and reports whether a
// same-provider retry could plausibly help.
func (g *Gateway) classify(ctx context.Context, provider string, err error) (retryable bool) {
	var apiErr *APIError
	if !errors.As(err, &apiErr) {
		// Transport error, parse failure, or empty choices. Transport
		// problems are worth one retry; only cool the provider down if they
		// keep happening.
		if g.bumpFailures(provider) >= serverFailBudget {
			g.setCooldown(ctx, provider, serverCooldown, "transport errors")
		}
		return true
	}

	switch {
	case apiErr.Status == http.StatusTooManyRequests:
		d := apiErr.RetryAfter
		if d <= 0 {
			d = defaultCooldown
		}
		if d > maxCooldown {
			d = maxCooldown
		}
		g.setCooldown(ctx, provider, d, "rate limited")
		return false

	case apiErr.Status == http.StatusUnauthorized || apiErr.Status == http.StatusForbidden:
		// A bad key won't fix itself; stop re-probing it on every call.
		slog.Error("llm: provider rejected credentials", "provider", provider, "status", apiErr.Status)
		g.setCooldown(ctx, provider, authCooldown, "auth failure")
		return false

	case apiErr.Status >= 500:
		if g.bumpFailures(provider) >= serverFailBudget {
			g.setCooldown(ctx, provider, serverCooldown, "server errors")
		}
		return true

	default:
		// 4xx other than the above is usually prompt- or capability-specific
		// (cf. Groq's tool_use_failed 400s), not a sign the provider is down.
		// Fail over without poisoning it.
		slog.Error("llm: provider rejected request", "provider", provider, "status", apiErr.Status, "body", apiErr.Body)
		return false
	}
}

func (g *Gateway) setCooldown(ctx context.Context, provider string, d time.Duration, reason string) {
	g.mu.Lock()
	g.cooldowns[provider] = time.Now().Add(d)
	g.failures[provider] = 0
	g.mu.Unlock()

	// Also share it across instances. The in-process copy above is what
	// keeps this correct when the store is unavailable.
	g.quota.Cooldown(ctx, provider, d, reason)
	slog.Warn("llm: provider cooling down", "provider", provider, "for", d.String(), "reason", reason)
}

func (g *Gateway) inCooldown(provider string) bool {
	g.mu.Lock()
	defer g.mu.Unlock()
	until, ok := g.cooldowns[provider]
	if !ok {
		return false
	}
	if time.Now().After(until) {
		delete(g.cooldowns, provider)
		return false
	}
	return true
}

func (g *Gateway) bumpFailures(provider string) int {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.failures[provider]++
	return g.failures[provider]
}

func (g *Gateway) clearFailures(provider string) {
	g.mu.Lock()
	delete(g.failures, provider)
	g.mu.Unlock()
}

// estimateTokens approximates prompt cost so quota can be checked before a
// call, when real usage is still unknown. Roughly four characters per token.
func estimateTokens(msgs []ChatMessage) int {
	chars := 0
	for _, m := range msgs {
		chars += len(m.Content) + len(m.Role)
	}
	return chars / 4
}
