package llm

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

// ── test doubles ────────────────────────────────────────────────────────────

// stubTransport answers per-provider based on the request host, counting
// calls so tests can assert exactly which providers were reached.
type stubTransport struct {
	mu       sync.Mutex
	handlers map[string]func() (*http.Response, error)
	calls    map[string]*int32
}

func newStubTransport() *stubTransport {
	return &stubTransport{
		handlers: map[string]func() (*http.Response, error){},
		calls:    map[string]*int32{},
	}
}

func (s *stubTransport) on(provider string, fn func() (*http.Response, error)) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.handlers[provider] = fn
	var n int32
	s.calls[provider] = &n
}

func (s *stubTransport) count(provider string) int32 {
	s.mu.Lock()
	defer s.mu.Unlock()
	if c, ok := s.calls[provider]; ok {
		return atomic.LoadInt32(c)
	}
	return 0
}

func (s *stubTransport) RoundTrip(r *http.Request) (*http.Response, error) {
	// Provider name is encoded as the host (see newTestGateway).
	name := strings.TrimSuffix(r.URL.Host, ".test")
	s.mu.Lock()
	fn, ok := s.handlers[name]
	counter := s.calls[name]
	s.mu.Unlock()
	if !ok {
		return nil, fmt.Errorf("no stub for provider %q", name)
	}
	atomic.AddInt32(counter, 1)
	return fn()
}

func respond(status int, body string, headers map[string]string) func() (*http.Response, error) {
	return func() (*http.Response, error) {
		h := http.Header{}
		for k, v := range headers {
			h.Set(k, v)
		}
		return &http.Response{
			StatusCode: status,
			Body:       io.NopCloser(strings.NewReader(body)),
			Header:     h,
		}, nil
	}
}

func transportError() func() (*http.Response, error) {
	return func() (*http.Response, error) { return nil, errors.New("dial tcp: connection refused") }
}

// fakeQuota lets a test mark providers ineligible or cooling down.
type fakeQuota struct {
	ineligible map[string]bool
	cooling    map[string]bool
	requests   map[string]int
	tokens     map[string]int
}

func newFakeQuota() *fakeQuota {
	return &fakeQuota{
		ineligible: map[string]bool{}, cooling: map[string]bool{},
		requests: map[string]int{}, tokens: map[string]int{},
	}
}

func (f *fakeQuota) Eligible(_ context.Context, p string, _ Limits, _ int) bool {
	return !f.ineligible[p]
}
func (f *fakeQuota) RecordRequest(_ context.Context, p string)       { f.requests[p]++ }
func (f *fakeQuota) RecordTokens(_ context.Context, p string, n int) { f.tokens[p] += n }
func (f *fakeQuota) Cooldown(_ context.Context, p string, _ time.Duration, _ string) {
	f.cooling[p] = true
}
func (f *fakeQuota) InCooldown(_ context.Context, p string) bool { return f.cooling[p] }

// newTestGateway builds a three-provider chain wired to the stub transport.
func newTestGateway(st *stubTransport, q IQuotaStore) *Gateway {
	providers := []ProviderConfig{
		{Name: "groq", BaseURL: "http://groq.test", APIKey: "k", Model: "m", JSONMode: JSONNative},
		{Name: "openrouter", BaseURL: "http://openrouter.test", APIKey: "k", Model: "m", JSONMode: JSONNative},
		{Name: "gemini", BaseURL: "http://gemini.test", APIKey: "k", Model: "m", JSONMode: JSONNative},
	}
	g := NewGateway(providers, q)
	for _, c := range g.clients {
		c.httpClient = &http.Client{Transport: st}
	}
	return g
}

func msgs() []ChatMessage { return []ChatMessage{{Role: "user", Content: "hello"}} }

// ── tests ───────────────────────────────────────────────────────────────────

func TestGatewayDisabledWithNoProviders(t *testing.T) {
	g := NewGateway(nil, nil)
	if g.Enabled() {
		t.Error("Enabled() = true with no providers")
	}
	if _, err := g.Complete(context.Background(), msgs(), false); !errors.Is(err, ErrDisabled) {
		t.Errorf("err = %v, want ErrDisabled", err)
	}
}

func TestGatewayDropsProvidersWithoutKeys(t *testing.T) {
	g := NewGateway([]ProviderConfig{
		{Name: "groq", APIKey: ""},
		{Name: "gemini", APIKey: "k"},
	}, nil)
	if got := g.Providers(); len(got) != 1 || got[0] != "gemini" {
		t.Errorf("Providers() = %v, want [gemini]", got)
	}
}

// Strict priority: a healthy first provider means the rest are never touched.
func TestGatewayUsesFirstHealthyProvider(t *testing.T) {
	st := newStubTransport()
	st.on("groq", respond(200, okResponse("hi", 100), nil))
	st.on("openrouter", respond(200, okResponse("no", 100), nil))
	st.on("gemini", respond(200, okResponse("no", 100), nil))

	q := newFakeQuota()
	g := newTestGateway(st, q)

	reply, err := g.Complete(context.Background(), msgs(), false)
	if err != nil {
		t.Fatalf("Complete: %v", err)
	}
	if reply != "hi" {
		t.Errorf("reply = %q, want hi", reply)
	}
	if st.count("openrouter") != 0 || st.count("gemini") != 0 {
		t.Error("lower-priority providers should not have been called")
	}
	if q.tokens["groq"] != 100 {
		t.Errorf("recorded tokens = %d, want 100", q.tokens["groq"])
	}
}

func TestGatewayFailsOverOnErrors(t *testing.T) {
	tests := []struct {
		name        string
		groq        func() (*http.Response, error)
		wantCooling bool
	}{
		{"429 rate limited", respond(429, "slow down", map[string]string{"Retry-After": "30"}), true},
		{"401 bad key", respond(401, "nope", nil), true},
		{"500 server error", respond(500, "boom", nil), false},
		{"400 bad request", respond(400, "tool_use_failed", nil), false},
		{"transport error", transportError(), false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			st := newStubTransport()
			st.on("groq", tt.groq)
			st.on("openrouter", respond(200, okResponse("rescued", 50), nil))
			st.on("gemini", respond(200, okResponse("unused", 50), nil))

			q := newFakeQuota()
			g := newTestGateway(st, q)

			reply, err := g.Complete(context.Background(), msgs(), false)
			if err != nil {
				t.Fatalf("Complete: %v", err)
			}
			if reply != "rescued" {
				t.Errorf("reply = %q, want rescued", reply)
			}
			if st.count("gemini") != 0 {
				t.Error("gemini should not be reached once openrouter succeeded")
			}
			if got := q.cooling["groq"]; got != tt.wantCooling {
				t.Errorf("groq cooling = %v, want %v", got, tt.wantCooling)
			}
		})
	}
}

// A 400 is prompt-specific, not a sick provider — it must not be poisoned.
func TestGatewayDoesNotCooldownOn400(t *testing.T) {
	st := newStubTransport()
	st.on("groq", respond(400, "bad prompt", nil))
	st.on("openrouter", respond(200, okResponse("ok", 10), nil))
	st.on("gemini", respond(200, okResponse("ok", 10), nil))

	g := newTestGateway(st, newFakeQuota())
	if _, err := g.Complete(context.Background(), msgs(), false); err != nil {
		t.Fatalf("Complete: %v", err)
	}
	if g.inCooldown("groq") {
		t.Error("groq should not be in cooldown after a 400")
	}
}

// After a 429 the provider is skipped on the next call without an HTTP hit.
func TestGatewayCooldownPersistsAcrossCalls(t *testing.T) {
	st := newStubTransport()
	st.on("groq", respond(429, "slow", map[string]string{"Retry-After": "60"}))
	st.on("openrouter", respond(200, okResponse("ok", 10), nil))
	st.on("gemini", respond(200, okResponse("ok", 10), nil))

	g := newTestGateway(st, newFakeQuota())

	if _, err := g.Complete(context.Background(), msgs(), false); err != nil {
		t.Fatalf("first Complete: %v", err)
	}
	first := st.count("groq")

	if _, err := g.Complete(context.Background(), msgs(), false); err != nil {
		t.Fatalf("second Complete: %v", err)
	}
	if st.count("groq") != first {
		t.Errorf("groq called again while cooling down (%d then %d)", first, st.count("groq"))
	}
}

// The whole point of pre-flight quota: an ineligible provider costs zero requests.
func TestGatewaySkipsIneligibleProviderWithoutCalling(t *testing.T) {
	st := newStubTransport()
	st.on("groq", respond(200, okResponse("should not happen", 10), nil))
	st.on("openrouter", respond(200, okResponse("ok", 10), nil))
	st.on("gemini", respond(200, okResponse("ok", 10), nil))

	q := newFakeQuota()
	q.ineligible["groq"] = true
	g := newTestGateway(st, q)

	reply, err := g.Complete(context.Background(), msgs(), false)
	if err != nil {
		t.Fatalf("Complete: %v", err)
	}
	if reply != "ok" {
		t.Errorf("reply = %q", reply)
	}
	if st.count("groq") != 0 {
		t.Errorf("groq was called %d times despite being ineligible", st.count("groq"))
	}
}

func TestGatewayAllIneligibleReturnsExhausted(t *testing.T) {
	st := newStubTransport()
	st.on("groq", respond(200, okResponse("x", 10), nil))
	st.on("openrouter", respond(200, okResponse("x", 10), nil))
	st.on("gemini", respond(200, okResponse("x", 10), nil))

	q := newFakeQuota()
	for _, p := range []string{"groq", "openrouter", "gemini"} {
		q.ineligible[p] = true
	}
	g := newTestGateway(st, q)

	_, err := g.Complete(context.Background(), msgs(), false)
	if !errors.Is(err, ErrAllProvidersExhausted) {
		t.Fatalf("err = %v, want ErrAllProvidersExhausted", err)
	}
	for _, p := range []string{"groq", "openrouter", "gemini"} {
		if st.count(p) != 0 {
			t.Errorf("%s was dispatched despite being ineligible", p)
		}
	}
}

// Everything tried and failed is a DIFFERENT condition from nothing tried.
func TestGatewayAllFailedIsNotExhausted(t *testing.T) {
	st := newStubTransport()
	for _, p := range []string{"groq", "openrouter", "gemini"} {
		st.on(p, respond(400, "nope", nil))
	}
	g := newTestGateway(st, newFakeQuota())

	_, err := g.Complete(context.Background(), msgs(), false)
	if err == nil {
		t.Fatal("expected an error")
	}
	if errors.Is(err, ErrAllProvidersExhausted) {
		t.Error("dispatched-and-failed must not report as exhausted")
	}
	if !strings.Contains(err.Error(), "all providers failed") {
		t.Errorf("err = %v", err)
	}
}

// Only the last provider is worth retrying — before that, failing over wins.
func TestGatewayRetriesOnlyLastProvider(t *testing.T) {
	st := newStubTransport()
	st.on("groq", respond(500, "boom", nil))
	st.on("openrouter", respond(500, "boom", nil))
	st.on("gemini", respond(500, "boom", nil))

	g := newTestGateway(st, newFakeQuota())
	// Keep the test fast: the retry pause is real time.
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if _, err := g.Complete(ctx, msgs(), false); err == nil {
		t.Fatal("expected an error")
	}

	if got := st.count("groq"); got != 1 {
		t.Errorf("groq attempts = %d, want 1", got)
	}
	if got := st.count("openrouter"); got != 1 {
		t.Errorf("openrouter attempts = %d, want 1", got)
	}
	if got := st.count("gemini"); got != 2 {
		t.Errorf("gemini attempts = %d, want 2 (last provider retries)", got)
	}
}

// A rate-limited request still consumed a slot at the provider.
func TestGatewayRecordsRequestEvenOnFailure(t *testing.T) {
	st := newStubTransport()
	st.on("groq", respond(429, "slow", nil))
	st.on("openrouter", respond(200, okResponse("ok", 10), nil))
	st.on("gemini", respond(200, okResponse("ok", 10), nil))

	q := newFakeQuota()
	g := newTestGateway(st, q)

	if _, err := g.Complete(context.Background(), msgs(), false); err != nil {
		t.Fatalf("Complete: %v", err)
	}
	if q.requests["groq"] != 1 {
		t.Errorf("groq requests recorded = %d, want 1", q.requests["groq"])
	}
}

// A provider that omits usage must still burn budget, or it gets infinite free calls.
func TestGatewayFallsBackToEstimatedTokens(t *testing.T) {
	st := newStubTransport()
	st.on("groq", respond(200, `{"choices":[{"message":{"role":"assistant","content":"hi"}}]}`, nil))
	st.on("openrouter", respond(200, okResponse("x", 10), nil))
	st.on("gemini", respond(200, okResponse("x", 10), nil))

	q := newFakeQuota()
	g := newTestGateway(st, q)

	if _, err := g.Complete(context.Background(), msgs(), false); err != nil {
		t.Fatalf("Complete: %v", err)
	}
	if q.tokens["groq"] <= 0 {
		t.Errorf("recorded tokens = %d, want the estimate when usage is absent", q.tokens["groq"])
	}
}

func TestGatewayRespectsQuotaCooldown(t *testing.T) {
	st := newStubTransport()
	st.on("groq", respond(200, okResponse("should not happen", 10), nil))
	st.on("openrouter", respond(200, okResponse("ok", 10), nil))
	st.on("gemini", respond(200, okResponse("ok", 10), nil))

	q := newFakeQuota()
	q.cooling["groq"] = true // e.g. another instance cooled it down
	g := newTestGateway(st, q)

	if _, err := g.Complete(context.Background(), msgs(), false); err != nil {
		t.Fatalf("Complete: %v", err)
	}
	if st.count("groq") != 0 {
		t.Error("groq called despite a shared cooldown")
	}
}

func TestGatewayCancelledContextReturnsPromptly(t *testing.T) {
	st := newStubTransport()
	for _, p := range []string{"groq", "openrouter", "gemini"} {
		st.on(p, respond(500, "boom", nil))
	}
	g := newTestGateway(st, newFakeQuota())

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	done := make(chan struct{})
	go func() {
		_, _ = g.Complete(ctx, msgs(), false)
		close(done)
	}()

	select {
	case <-done:
	case <-time.After(3 * time.Second):
		t.Fatal("Complete did not return promptly on a cancelled context")
	}
}

func TestEstimateTokens(t *testing.T) {
	got := estimateTokens([]ChatMessage{{Role: "user", Content: strings.Repeat("a", 400)}})
	// 400 content + 4 role = 404 chars / 4 ≈ 101
	if got < 90 || got > 110 {
		t.Errorf("estimateTokens = %d, want roughly 101", got)
	}
}
