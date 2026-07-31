package content

import (
	"context"
	"io"
	"net/http"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
)

// embedMockTransport routes mock responses by host so each provider probe can
// be faked independently.
type embedMockTransport struct {
	byHost map[string]func() (*http.Response, error)
	delay  map[string]time.Duration
	calls  map[string]int
	mu     sync.Mutex
}

func (m *embedMockTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	host := req.URL.Host
	m.mu.Lock()
	m.calls[host]++
	m.mu.Unlock()
	if d := m.delay[host]; d > 0 {
		time.Sleep(d)
	}
	if fn := m.byHost[host]; fn != nil {
		return fn()
	}
	return &http.Response{StatusCode: 404, Body: io.NopCloser(strings.NewReader("not found"))}, nil
}

func aliveResponse() (*http.Response, error) {
	return &http.Response{
		StatusCode: 200,
		Body:       io.NopCloser(strings.NewReader(`<html><head></head><body><iframe src="https://cdn.example/hls"></iframe><script src="/hls.js"></script></body></html>`)),
	}, nil
}

func TestEmbedSourceClient_OrdersSources(t *testing.T) {
	mt := &embedMockTransport{
		byHost: map[string]func() (*http.Response, error){
			"vidfast.pro": aliveResponse,
			"vidlink.pro": aliveResponse,
			"vidsrc.to": func() (*http.Response, error) {
				return &http.Response{StatusCode: 403, Body: io.NopCloser(strings.NewReader("cloudflare")), Header: http.Header{}}, nil
			},
			"vidsrc.pm": func() (*http.Response, error) {
				return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader("Just a 200 with no video markup here")), Header: http.Header{}}, nil
			},
			"www.2embed.skin": func() (*http.Response, error) {
				return &http.Response{StatusCode: 404, Body: io.NopCloser(strings.NewReader("missing title")), Header: http.Header{}}, nil
			},
			"www.vidking.net": aliveResponse,
			"vidsrc.cc": func() (*http.Response, error) {
				return &http.Response{StatusCode: 503, Body: io.NopCloser(strings.NewReader("service unavailable")), Header: http.Header{}}, nil
			},
			"www.2embed.cc": func() (*http.Response, error) {
				return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader("bot wall body with checking your browser")), Header: http.Header{}}, nil
			},
		},
		delay: map[string]time.Duration{
			"vidfast.pro":     30 * time.Millisecond,
			"www.vidking.net": 60 * time.Millisecond,
			"vidlink.pro":     120 * time.Millisecond,
		},
		calls: map[string]int{},
	}

	rdb := redis.NewClient(&redis.Options{Addr: "localhost:0"})
	defer rdb.Close()

	client := NewEmbedSourceClient(rdb)
	client.httpClient.Transport = mt

	sources, err := client.GetSources(context.Background(), "movie", 27205, 0, 0)
	if err != nil {
		t.Fatalf("GetSources failed: %v", err)
	}

	// 8 providers probed, but dead ones (404 / no-markup / 503) are pruned.
	expectedAlive := []string{"vidfast", "vidking", "vidlink"}
	expectedGated := []string{"vidsrc-to", "vidsrc-cc", "2embed-cc"}
	if len(sources) != len(expectedAlive)+len(expectedGated) {
		t.Fatalf("expected %d sources, got %d: %+v", len(expectedAlive)+len(expectedGated), len(sources), sources)
	}

	for i, id := range expectedAlive {
		if sources[i].ID != id {
			t.Errorf("alive source #%d = %s, want %s", i, sources[i].ID, id)
		}
	}
	for i, id := range expectedGated {
		got := sources[len(expectedAlive)+i].ID
		if got != id {
			t.Errorf("gated source #%d = %s, want %s", i, got, id)
		}
	}

	// Fastest alive provider must come first.
	if sources[0].ID != "vidfast" {
		t.Errorf("expected fastest provider first, got %s", sources[0].ID)
	}
}

func TestEmbedSourceClient_FallsBackToRegistryOrder(t *testing.T) {
	mt := &embedMockTransport{
		byHost: map[string]func() (*http.Response, error){
			"vidfast.pro": func() (*http.Response, error) {
				return &http.Response{StatusCode: 404, Body: io.NopCloser(strings.NewReader("")), Header: http.Header{}}, nil
			},
			"vidking.net": func() (*http.Response, error) { return nil, io.ErrUnexpectedEOF },
		},
		calls: map[string]int{},
	}

	rdb := redis.NewClient(&redis.Options{Addr: "localhost:0"})
	defer rdb.Close()

	client := NewEmbedSourceClient(rdb)
	client.httpClient.Transport = mt

	sources, err := client.GetSources(context.Background(), "tv", 1399, 1, 3)
	if err != nil {
		t.Fatalf("GetSources failed: %v", err)
	}

	// All probes dead → full registry in static priority order.
	if len(sources) != len(embedProviders) {
		t.Fatalf("expected %d fallback sources, got %d", len(embedProviders), len(sources))
	}
	for i, p := range embedProviders {
		if sources[i].ID != p.id {
			t.Errorf("fallback source #%d = %s, want %s", i, sources[i].ID, p.id)
		}
	}

	// TV URLs must be properly parameterized.
	found := map[string]string{}
	for _, s := range sources {
		found[s.ID] = s.URL
	}
	if got := found["vidking"]; got != "https://www.vidking.net/embed/tv/1399/1/3" {
		t.Errorf("unexpected vidking tv url: %s", got)
	}
	if got := found["2embed-skin"]; got != "https://www.2embed.skin/embedtv/1399&s=1&e=3" {
		t.Errorf("unexpected 2embed tv url: %s", got)
	}
	if got := found["vidfast"]; got != "https://vidfast.pro/tv/1399/1/3?autoPlay=true" {
		t.Errorf("unexpected vidfast tv url: %s", got)
	}
}

func TestEmbedSourceClient_MovieURLs(t *testing.T) {
	mt := &embedMockTransport{byHost: map[string]func() (*http.Response, error){}, calls: map[string]int{}}
	rdb := redis.NewClient(&redis.Options{Addr: "localhost:0"})
	defer rdb.Close()

	client := NewEmbedSourceClient(rdb)
	client.httpClient.Transport = mt

	sources, err := client.GetSources(context.Background(), "movie", 27205, 0, 0)
	if err != nil {
		t.Fatalf("GetSources failed: %v", err)
	}

	found := map[string]string{}
	for _, s := range sources {
		found[s.ID] = s.URL
	}
	if got := found["vidking"]; got != "https://www.vidking.net/embed/movie/27205" {
		t.Errorf("unexpected vidking movie url: %s", got)
	}
	if got := found["vidsrc-pm"]; got != "https://vidsrc.pm/embed/movie/27205" {
		t.Errorf("unexpected vidsrc.pm movie url: %s", got)
	}
}

func TestEmbedSourceClient_InvalidMediaType(t *testing.T) {
	rdb := redis.NewClient(&redis.Options{Addr: "localhost:0"})
	defer rdb.Close()

	client := NewEmbedSourceClient(rdb)
	if _, err := client.GetSources(context.Background(), "anime", 1, 0, 0); err == nil {
		t.Error("expected error for invalid media type, got nil")
	}
}
