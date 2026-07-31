package content

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/Dubjay18/reelstack/api/pkg/singleflight"
)

// embedSourceCacheTTL bounds how long an ordered, probed source list stays
// cached per title before we re-probe (providers' domains churn frequently).
const embedSourceCacheTTL = 5 * time.Minute

// probeTimeout bounds a single provider probe so a slow embed never blocks
// the API request for long. Probing runs on cache miss only; the client's
// own failover timer covers the rest.
const probeTimeout = 4 * time.Second

// EmbedSource is a single playable embed candidate for a title, in the order
// the client should try them (fastest-alive first).
type EmbedSource struct {
	ID     string `json:"id"`
	Label  string `json:"label"`
	URL    string `json:"url"`
	TTFBMs int    `json:"ttfbs_ms,omitempty"`
}

type embedProvider struct {
	id         string
	label      string
	cfGated    bool // returns 403/503 to server-side fetches but works in a real browser iframe
	buildMovie func(tmdbID int) string
	buildTv    func(tmdbID, season, episode int) string
}

// embedProviders is the registry of TMDB-id-keyed embed sources, in priority
// order. These are third-party, unofficial providers whose domains churn
// frequently; GetSources probes and reorders them per title at runtime, so
// treat this list as a starting point rather than ground truth.
var embedProviders = []embedProvider{
	{
		id:    "vidking",
		label: "VidKing",
		buildMovie: func(id int) string {
			return fmt.Sprintf("https://www.vidking.net/embed/movie/%d", id)
		},
		buildTv: func(id, s, e int) string {
			return fmt.Sprintf("https://www.vidking.net/embed/tv/%d/%d/%d", id, s, e)
		},
	},
	{
		id:    "vidfast",
		label: "VidFast",
		buildMovie: func(id int) string {
			return fmt.Sprintf("https://vidfast.pro/movie/%d?autoPlay=true", id)
		},
		buildTv: func(id, s, e int) string {
			return fmt.Sprintf("https://vidfast.pro/tv/%d/%d/%d?autoPlay=true", id, s, e)
		},
	},
	{
		id:    "vidlink",
		label: "VidLink",
		buildMovie: func(id int) string {
			return fmt.Sprintf("https://vidlink.pro/movie/%d", id)
		},
		buildTv: func(id, s, e int) string {
			return fmt.Sprintf("https://vidlink.pro/tv/%d/%d/%d", id, s, e)
		},
	},
	{
		id:    "vidsrc-pm",
		label: "vidsrc.pm",
		buildMovie: func(id int) string {
			return fmt.Sprintf("https://vidsrc.pm/embed/movie/%d", id)
		},
		buildTv: func(id, s, e int) string {
			return fmt.Sprintf("https://vidsrc.pm/embed/tv/%d/%d/%d", id, s, e)
		},
	},
	{
		id:    "2embed-skin",
		label: "2Embed",
		buildMovie: func(id int) string {
			return fmt.Sprintf("https://www.2embed.skin/embed/%d", id)
		},
		buildTv: func(id, s, e int) string {
			return fmt.Sprintf("https://www.2embed.skin/embedtv/%d&s=%d&e=%d", id, s, e)
		},
	},
	{
		id:      "vidsrc-to",
		label:   "vidsrc.to",
		cfGated: true,
		buildMovie: func(id int) string {
			return fmt.Sprintf("https://vidsrc.to/embed/movie/%d", id)
		},
		buildTv: func(id, s, e int) string {
			return fmt.Sprintf("https://vidsrc.to/embed/tv/%d/%d/%d", id, s, e)
		},
	},
	{
		id:      "vidsrc-cc",
		label:   "vidsrc.cc",
		cfGated: true,
		buildMovie: func(id int) string {
			return fmt.Sprintf("https://vidsrc.cc/v2/embed/movie/%d", id)
		},
		buildTv: func(id, s, e int) string {
			return fmt.Sprintf("https://vidsrc.cc/v2/embed/tv/%d/%d/%d", id, s, e)
		},
	},
	{
		id:      "2embed-cc",
		label:   "2Embed.cc",
		cfGated: true,
		buildMovie: func(id int) string {
			return fmt.Sprintf("https://www.2embed.cc/embed/%d", id)
		},
		buildTv: func(id, s, e int) string {
			return fmt.Sprintf("https://www.2embed.cc/embedtv/%d&s=%d&e=%d", id, s, e)
		},
	},
}

// EmbedSourceClient resolves the ordered list of embed sources for a title,
// probing providers concurrently and caching the result in Redis.
type EmbedSourceClient struct {
	httpClient  *http.Client
	redisClient *redis.Client
	sfGroup     *singleflight.Group
}

func NewEmbedSourceClient(redisClient *redis.Client) *EmbedSourceClient {
	return &EmbedSourceClient{
		httpClient: &http.Client{
			Timeout: probeTimeout,
		},
		redisClient: redisClient,
		sfGroup:     &singleflight.Group{},
	}
}

type probeResult struct {
	source EmbedSource
	alive  bool
	gated  bool
}

// GetSources returns embed candidates for a title ordered fastest-alive first,
// using a Redis-backed cache with singleflight dedupe on miss.
func (c *EmbedSourceClient) GetSources(ctx context.Context, mediaType string, tmdbID, season, episode int) ([]EmbedSource, error) {
	if mediaType != "movie" && mediaType != "tv" {
		return nil, fmt.Errorf("invalid media type: %s", mediaType)
	}

	cacheKey := fmt.Sprintf("stream_sources:%s:%d:%d:%d", mediaType, tmdbID, season, episode)

	if raw, err := c.redisClient.Get(ctx, cacheKey).Result(); err == nil {
		var sources []EmbedSource
		if json.Unmarshal([]byte(raw), &sources) == nil && sources != nil {
			return sources, nil
		}
	}

	v, err, _ := c.sfGroup.Do(cacheKey, func() (interface{}, error) {
		return c.probeAll(ctx, mediaType, tmdbID, season, episode)
	})
	if err != nil {
		return nil, err
	}
	sources := v.([]EmbedSource)

	if data, err := json.Marshal(sources); err == nil {
		// Best effort; probing is the source of truth.
		c.redisClient.Set(context.Background(), cacheKey, data, embedSourceCacheTTL)
	}

	return sources, nil
}

// probeAll probes every registered provider concurrently and returns the
// survivors ordered by response time: live players first, bot-gated sources
// second, dead sources dropped. If nothing survives (e.g. every provider is
// behind a bot wall or unreachable from the server), it falls back to the
// static registry order so the client still has candidates to try directly.
func (c *EmbedSourceClient) probeAll(ctx context.Context, mediaType string, tmdbID, season, episode int) ([]EmbedSource, error) {
	type candidate struct {
		provider embedProvider
		url      string
	}

	candidates := make([]candidate, 0, len(embedProviders))
	for _, p := range embedProviders {
		var url string
		if mediaType == "tv" {
			url = p.buildTv(tmdbID, season, episode)
		} else {
			url = p.buildMovie(tmdbID)
		}
		candidates = append(candidates, candidate{provider: p, url: url})
	}

	results := make([]probeResult, len(candidates))
	var wg sync.WaitGroup
	for i, cand := range candidates {
		wg.Add(1)
		go func(idx int, cand candidate) {
			defer wg.Done()
			results[idx] = c.probe(ctx, cand.provider, cand.url)
		}(i, cand)
	}
	wg.Wait()

	var alive, gated []EmbedSource
	for _, r := range results {
		switch {
		case r.alive:
			alive = append(alive, r.source)
		case r.gated:
			gated = append(gated, r.source)
		}
	}
	sort.Slice(alive, func(i, j int) bool { return alive[i].TTFBMs < alive[j].TTFBMs })
	sort.Slice(gated, func(i, j int) bool { return gated[i].TTFBMs < gated[j].TTFBMs })

	ordered := append(alive, gated...)
	if len(ordered) == 0 {
		for _, cand := range candidates {
			ordered = append(ordered, EmbedSource{ID: cand.provider.id, Label: cand.provider.label, URL: cand.url})
		}
	}
	return ordered, nil
}

func (c *EmbedSourceClient) probe(ctx context.Context, p embedProvider, url string) probeResult {
	src := EmbedSource{ID: p.id, Label: p.label, URL: url}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return probeResult{source: src}
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")

	start := time.Now()
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return probeResult{source: src}
	}
	defer resp.Body.Close()
	src.TTFBMs = int(time.Since(start) / time.Millisecond)

	body, _ := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
	lower := strings.ToLower(string(body))

	switch {
	case resp.StatusCode >= 200 && resp.StatusCode < 300 && hasPlayerMarkup(lower):
		return probeResult{source: src, alive: true}
	case isBotGate(resp.StatusCode, lower):
		return probeResult{source: src, gated: true}
	default:
		return probeResult{source: src}
	}
}

// hasPlayerMarkup reports whether the probe response looks like a playable
// embed page rather than an error stub or redirect shell.
func hasPlayerMarkup(body string) bool {
	for _, marker := range []string{"<iframe", "<video", ".m3u8", "hls.js", "player"} {
		if strings.Contains(body, marker) {
			return true
		}
	}
	return false
}

// isBotGate reports whether a response is a bot/Cloudflare wall: it blocks
// server-side fetches but a real browser iframe passes it, so the source is
// kept but deprioritized.
func isBotGate(status int, body string) bool {
	switch status {
	case http.StatusForbidden, http.StatusTooManyRequests, http.StatusServiceUnavailable:
		return true
	}
	for _, marker := range []string{"cloudflare", "attention required", "ddos-guard", "checking your browser"} {
		if strings.Contains(body, marker) {
			return true
		}
	}
	return false
}
