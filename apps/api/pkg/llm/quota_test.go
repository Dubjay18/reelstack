package llm

import (
	"context"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
)

// deadRedis points at a port nothing listens on, so every operation errors.
// Same trick as content/tmdb_test.go — it exercises the fail-open paths
// without needing a real Redis in CI.
func deadRedis() *redis.Client {
	return redis.NewClient(&redis.Options{Addr: "localhost:0"})
}

// Losing quota accounting must never block LLM traffic.
func TestRedisQuotaFailsOpen(t *testing.T) {
	q := NewRedisQuota(deadRedis())
	ctx := context.Background()
	limits := Limits{RPM: 1, RPD: 1, TPM: 1, TPD: 1}

	if !q.Eligible(ctx, "groq", limits, 999999) {
		t.Error("Eligible = false with Redis down, want fail-open true")
	}
	if q.InCooldown(ctx, "groq") {
		t.Error("InCooldown = true with Redis down, want fail-open false")
	}

	// Writes must not panic when the store is unreachable.
	q.RecordRequest(ctx, "groq")
	q.RecordTokens(ctx, "groq", 500)
	q.Cooldown(ctx, "groq", time.Minute, "test")
}

// The in-process cooldown is what keeps routing sane while Redis is down,
// so it must work independently of the store.
func TestInProcessCooldownWorksWithoutRedis(t *testing.T) {
	g := NewGateway([]ProviderConfig{{Name: "groq", APIKey: "k", BaseURL: "http://x", Model: "m"}},
		NewRedisQuota(deadRedis()))

	if g.inCooldown("groq") {
		t.Fatal("provider should start healthy")
	}
	g.setCooldown(context.Background(), "groq", time.Minute, "test")
	if !g.inCooldown("groq") {
		t.Error("in-process cooldown did not take effect with Redis down")
	}
}

func TestInProcessCooldownExpires(t *testing.T) {
	g := NewGateway([]ProviderConfig{{Name: "groq", APIKey: "k", BaseURL: "http://x", Model: "m"}}, nil)

	g.setCooldown(context.Background(), "groq", 20*time.Millisecond, "test")
	if !g.inCooldown("groq") {
		t.Fatal("cooldown should be active immediately")
	}
	time.Sleep(40 * time.Millisecond)
	if g.inCooldown("groq") {
		t.Error("cooldown should have expired")
	}
}

func TestQuotaKeyFormats(t *testing.T) {
	ts := time.Date(2026, 7, 26, 12, 34, 0, 0, time.UTC)
	bucket := ts.Unix() / 60

	tests := []struct{ got, want string }{
		{reqMinKey("groq", ts), "llm:req:min:groq:" + itoa(bucket)},
		{reqDayKey("groq", ts), "llm:req:day:groq:20260726"},
		{tokMinKey("gemini", ts), "llm:tok:min:gemini:" + itoa(bucket)},
		{tokDayKey("gemini", ts), "llm:tok:day:gemini:20260726"},
		{cooldownKey("openrouter"), "llm:cooldown:openrouter"},
	}
	for _, tt := range tests {
		if tt.got != tt.want {
			t.Errorf("key = %q, want %q", tt.got, tt.want)
		}
	}
}

func itoa(n int64) string {
	if n == 0 {
		return "0"
	}
	var b []byte
	for n > 0 {
		b = append([]byte{byte('0' + n%10)}, b...)
		n /= 10
	}
	return string(b)
}

func TestNoopQuotaAlwaysEligible(t *testing.T) {
	var q IQuotaStore = NoopQuota{}
	if !q.Eligible(context.Background(), "any", Limits{RPM: 1}, 10_000_000) {
		t.Error("NoopQuota must always report eligible")
	}
	if q.InCooldown(context.Background(), "any") {
		t.Error("NoopQuota must never report a cooldown")
	}
}

func TestToInt(t *testing.T) {
	tests := []struct {
		in   any
		want int
	}{
		{nil, 0},
		{int64(42), 42},
		{"17", 17},
		{"garbage", 0},
		{3.5, 0},
	}
	for _, tt := range tests {
		if got := toInt(tt.in); got != tt.want {
			t.Errorf("toInt(%v) = %d, want %d", tt.in, got, tt.want)
		}
	}
}
