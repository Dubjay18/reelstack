package llm

import (
	"context"
	"fmt"
	"log/slog"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

// Window TTLs deliberately exceed their window so a counter survives clock
// skew between instances, matching the convention in riley's rate limiter.
const (
	minuteTTL = 2 * time.Minute
	dayTTL    = 26 * time.Hour
)

// IQuotaStore tracks per-provider spend so the router can skip a provider
// that is already out of budget instead of burning a request to find out.
//
// Every method fails OPEN: on a backing-store error the provider is treated
// as eligible and the write is dropped. Losing quota accounting degrades
// routing quality; blocking all LLM traffic because Redis blipped would be
// far worse. The Gateway's in-process cooldown map is what keeps behaviour
// sane while the store is unavailable.
type IQuotaStore interface {
	Eligible(ctx context.Context, provider string, limits Limits, estTokens int) bool
	RecordRequest(ctx context.Context, provider string)
	RecordTokens(ctx context.Context, provider string, tokens int)
	Cooldown(ctx context.Context, provider string, d time.Duration, reason string)
	InCooldown(ctx context.Context, provider string) bool
}

// NoopQuota disables quota tracking entirely — every provider is always
// eligible. Used when no Redis is configured; the Gateway still enforces
// its in-process cooldowns, so failover keeps working.
type NoopQuota struct{}

func (NoopQuota) Eligible(context.Context, string, Limits, int) bool      { return true }
func (NoopQuota) RecordRequest(context.Context, string)                   {}
func (NoopQuota) RecordTokens(context.Context, string, int)               {}
func (NoopQuota) Cooldown(context.Context, string, time.Duration, string) {}
func (NoopQuota) InCooldown(context.Context, string) bool                 { return false }

// RedisQuota shares provider budgets and cooldowns across instances.
type RedisQuota struct {
	rdb *redis.Client
}

func NewRedisQuota(rdb *redis.Client) *RedisQuota { return &RedisQuota{rdb: rdb} }

// Key layout follows the repo convention <domain>:<purpose>:<granularity>:<subject>:<bucket>.
func reqMinKey(p string, t time.Time) string {
	return fmt.Sprintf("llm:req:min:%s:%d", p, t.Unix()/60)
}
func reqDayKey(p string, t time.Time) string {
	return fmt.Sprintf("llm:req:day:%s:%s", p, t.Format("20060102"))
}
func tokMinKey(p string, t time.Time) string {
	return fmt.Sprintf("llm:tok:min:%s:%d", p, t.Unix()/60)
}
func tokDayKey(p string, t time.Time) string {
	return fmt.Sprintf("llm:tok:day:%s:%s", p, t.Format("20060102"))
}
func cooldownKey(p string) string { return "llm:cooldown:" + p }

// Eligible does a single read-only MGET of the four counters — no increments,
// so checking costs nothing and can be repeated safely.
//
// Request counters are exact and compared directly. Token counters are
// compared against an *estimate* of this call's cost, because real usage is
// only known after the response arrives; see RecordTokens. One in-flight
// call can therefore push a token counter slightly past its limit, which is
// accepted: Riley's global request cap keeps concurrency low.
func (q *RedisQuota) Eligible(ctx context.Context, provider string, limits Limits, estTokens int) bool {
	now := time.Now().UTC()
	keys := []string{
		reqMinKey(provider, now),
		reqDayKey(provider, now),
		tokMinKey(provider, now),
		tokDayKey(provider, now),
	}

	vals, err := q.rdb.MGet(ctx, keys...).Result()
	if err != nil || len(vals) != len(keys) {
		return true // fail open
	}

	counts := make([]int, len(vals))
	for i, v := range vals {
		counts[i] = toInt(v)
	}

	checks := []struct {
		used, limit, cost int
	}{
		{counts[0], limits.RPM, 1},
		{counts[1], limits.RPD, 1},
		{counts[2], limits.TPM, estTokens},
		{counts[3], limits.TPD, estTokens},
	}
	for _, c := range checks {
		if c.limit > 0 && c.used+c.cost > c.limit {
			return false
		}
	}
	return true
}

// RecordRequest counts a dispatched request whether or not it succeeded — a
// rate-limited call still consumed a slot at the provider.
func (q *RedisQuota) RecordRequest(ctx context.Context, provider string) {
	now := time.Now().UTC()
	q.incrBy(ctx, reqMinKey(provider, now), 1, minuteTTL)
	q.incrBy(ctx, reqDayKey(provider, now), 1, dayTTL)
}

// RecordTokens adds real token spend once the provider has reported it. The
// caller substitutes its own estimate when a provider omits usage, so a
// silent provider can never accumulate unlimited free budget.
func (q *RedisQuota) RecordTokens(ctx context.Context, provider string, tokens int) {
	if tokens <= 0 {
		return
	}
	now := time.Now().UTC()
	q.incrBy(ctx, tokMinKey(provider, now), int64(tokens), minuteTTL)
	q.incrBy(ctx, tokDayKey(provider, now), int64(tokens), dayTTL)
}

func (q *RedisQuota) incrBy(ctx context.Context, key string, n int64, ttl time.Duration) {
	count, err := q.rdb.IncrBy(ctx, key, n).Result()
	if err != nil {
		return // fail open
	}
	if count == n { // first write into this window
		q.rdb.Expire(ctx, key, ttl)
	}
}

func (q *RedisQuota) Cooldown(ctx context.Context, provider string, d time.Duration, reason string) {
	if d <= 0 {
		return
	}
	if err := q.rdb.Set(ctx, cooldownKey(provider), reason, d).Err(); err != nil {
		slog.Debug("llm: failed to persist cooldown", "provider", provider, "error", err)
	}
}

func (q *RedisQuota) InCooldown(ctx context.Context, provider string) bool {
	n, err := q.rdb.Exists(ctx, cooldownKey(provider)).Result()
	if err != nil {
		return false // fail open
	}
	return n > 0
}

func toInt(v any) int {
	switch t := v.(type) {
	case nil:
		return 0
	case int64:
		return int(t)
	case string:
		n, err := strconv.Atoi(t)
		if err != nil {
			return 0
		}
		return n
	default:
		return 0
	}
}
