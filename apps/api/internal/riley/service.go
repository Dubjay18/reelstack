package riley

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/Dubjay18/reelstack/api/internal/content"
	"github.com/Dubjay18/reelstack/api/pkg/singleflight"
)

const (
	cacheTTL       = 6 * time.Hour
	maxChatHistory = 12
	topListSize    = 20
	maxChatRecs    = 5

	// Chat budget calibrated to Groq's free tier for llama-3.3-70b-versatile:
	// 30 req/min, 1K req/day, 12K tokens/min, 100K tokens/day. A chat turn
	// costs ~1.5-2K tokens (system prompt + history + reply), so tokens-per-day
	// is the binding constraint: ~50-60 chat calls/day total. The cron refresh
	// spends ~8 calls/day; the rest is the global chat budget below.
	userChatPerMin   = 3
	globalChatPerMin = 6 // ~12K TPM / ~2K tokens per call
	userChatPerDay   = 10
	globalChatPerDay = 50 // ~100K TPD minus cron headroom
)

type IService interface {
	Refresh(ctx context.Context) (map[string]string, error)
	GetDigest(ctx context.Context) (*Digest, error)
	GetTop(ctx context.Context) (*TopResponse, error)
	Chat(ctx context.Context, userID string, msgs []ChatMessage) (*ChatResult, error)
}

type Service struct {
	repo    IRepository
	llm     *LLMClient
	tmdb    *content.TMDBClient
	redis   *redis.Client
	sfGroup *singleflight.Group
}

func NewService(repo IRepository, llm *LLMClient, tmdb *content.TMDBClient, rdb *redis.Client) *Service {
	return &Service{repo: repo, llm: llm, tmdb: tmdb, redis: rdb, sfGroup: &singleflight.Group{}}
}

// ── Refresh (cron) ──────────────────────────────────────────────────────────

// Refresh regenerates all Riley artifacts. Sub-steps are independent:
// a failure in one logs and continues so a partial refresh still lands.
// The digest needs the LLM; the TMDB lists work without it (top ten falls
// back to ratings order). Returns a per-section status map.
func (s *Service) Refresh(ctx context.Context) (map[string]string, error) {
	status := map[string]string{}
	var errs []error

	if !s.llm.Enabled() {
		status[KindDigest] = "skipped: LLM not configured"
	} else if err := s.refreshDigest(ctx); err != nil {
		slog.Error("riley: digest refresh failed", "error", err)
		status[KindDigest] = "error: " + err.Error()
		errs = append(errs, fmt.Errorf("digest: %w", err))
	} else {
		status[KindDigest] = "ok"
	}

	movies, series, err := s.refreshTopLists(ctx)
	if err != nil {
		slog.Error("riley: top lists refresh failed", "error", err)
		status["top_lists"] = "error: " + err.Error()
		errs = append(errs, fmt.Errorf("top lists: %w", err))
	} else {
		status["top_lists"] = "ok"
	}

	if err := s.refreshTopTen(ctx, movies, series); err != nil {
		slog.Error("riley: top ten refresh failed", "error", err)
		status[KindTopTen] = "error: " + err.Error()
		errs = append(errs, fmt.Errorf("top ten: %w", err))
	} else {
		status[KindTopTen] = "ok"
	}

	return status, errors.Join(errs...)
}

func (s *Service) refreshDigest(ctx context.Context) error {
	items := FetchAllFeeds(ctx)
	if len(items) == 0 {
		return fmt.Errorf("no feed items fetched")
	}

	var input strings.Builder
	for _, item := range items {
		fmt.Fprintf(&input, "- title: %s\n  summary: %s\n  source: %s\n  url: %s\n",
			item.Title, item.Summary, item.Source, item.Link)
	}

	reply, err := s.llm.Complete(ctx, []ChatMessage{
		{Role: "system", Content: digestSystemPrompt},
		{Role: "user", Content: input.String()},
	}, true)
	if err != nil {
		return err
	}

	var parsed struct {
		Stories []Story `json:"stories"`
	}
	if err := json.Unmarshal([]byte(reply), &parsed); err != nil {
		return fmt.Errorf("digest JSON parse: %w", err)
	}
	if len(parsed.Stories) == 0 {
		return fmt.Errorf("digest contained no stories")
	}

	digest := Digest{GeneratedAt: time.Now().UTC(), Stories: parsed.Stories}
	if err := s.repo.SaveArtifact(ctx, KindDigest, digest); err != nil {
		return err
	}
	s.cacheSet(ctx, KindDigest, digest)
	return nil
}

func (s *Service) refreshTopLists(ctx context.Context) (movies, series []content.SearchResult, err error) {
	movies, err = s.tmdb.GetTrending(ctx)
	if err != nil {
		return nil, nil, err
	}
	series, err = s.tmdb.GetTrendingTV(ctx)
	if err != nil {
		return movies, nil, err
	}

	now := time.Now().UTC()
	moviesList := TopList{GeneratedAt: now, Picks: toPicks(movies, topListSize)}
	seriesList := TopList{GeneratedAt: now, Picks: toPicks(series, topListSize)}

	if err := s.repo.SaveArtifact(ctx, KindTopMovies, moviesList); err != nil {
		return movies, series, err
	}
	s.cacheSet(ctx, KindTopMovies, moviesList)
	if err := s.repo.SaveArtifact(ctx, KindTopSeries, seriesList); err != nil {
		return movies, series, err
	}
	s.cacheSet(ctx, KindTopSeries, seriesList)
	return movies, series, nil
}

func (s *Service) refreshTopTen(ctx context.Context, movies, series []content.SearchResult) error {
	topMovies, err := s.tmdb.GetTopRatedMovies(ctx)
	if err != nil {
		slog.Warn("riley: top rated movies fetch failed", "error", err)
	}
	topTV, err := s.tmdb.GetTopRatedTV(ctx)
	if err != nil {
		slog.Warn("riley: top rated tv fetch failed", "error", err)
	}

	candidates := buildCandidates(movies, series, topMovies, topTV)
	if len(candidates) == 0 {
		return fmt.Errorf("no candidates for top ten")
	}

	picks, err := s.curateTopTen(ctx, candidates)
	if err != nil {
		slog.Warn("riley: LLM top-ten curation failed, using fallback", "error", err)
		picks = fallbackTopTen(candidates)
	}

	topTen := TopList{GeneratedAt: time.Now().UTC(), Picks: picks}
	if err := s.repo.SaveArtifact(ctx, KindTopTen, topTen); err != nil {
		return err
	}
	s.cacheSet(ctx, KindTopTen, topTen)
	return nil
}

// candidateKey identifies a title across media types.
type candidateKey struct {
	ID        int
	MediaType string
}

func buildCandidates(lists ...[]content.SearchResult) map[candidateKey]content.SearchResult {
	candidates := make(map[candidateKey]content.SearchResult)
	for _, list := range lists {
		for _, item := range list {
			key := candidateKey{item.ID, item.MediaType}
			if _, ok := candidates[key]; !ok {
				candidates[key] = item
			}
		}
	}
	return candidates
}

// curateTopTen asks the LLM to pick 10 and validates every pick against the
// candidate set so hallucinated IDs never reach the page.
func (s *Service) curateTopTen(ctx context.Context, candidates map[candidateKey]content.SearchResult) ([]TopPick, error) {
	type candidateJSON struct {
		ID        int     `json:"id"`
		MediaType string  `json:"media_type"`
		Title     string  `json:"title"`
		Year      string  `json:"year"`
		Rating    float64 `json:"rating"`
	}
	var input []candidateJSON
	for _, c := range candidates {
		input = append(input, candidateJSON{c.ID, c.MediaType, c.Title, c.Year, c.VoteAverage})
	}
	inputData, err := json.Marshal(input)
	if err != nil {
		return nil, err
	}

	reply, err := s.llm.Complete(ctx, []ChatMessage{
		{Role: "system", Content: topTenSystemPrompt},
		{Role: "user", Content: string(inputData)},
	}, true)
	if err != nil {
		return nil, err
	}

	var parsed struct {
		Picks []struct {
			ID        int    `json:"id"`
			MediaType string `json:"media_type"`
			Blurb     string `json:"blurb"`
		} `json:"picks"`
	}
	if err := json.Unmarshal([]byte(reply), &parsed); err != nil {
		return nil, fmt.Errorf("top-ten JSON parse: %w", err)
	}

	var picks []TopPick
	seen := make(map[candidateKey]bool)
	for _, p := range parsed.Picks {
		key := candidateKey{p.ID, p.MediaType}
		c, ok := candidates[key]
		if !ok || seen[key] {
			continue
		}
		seen[key] = true
		picks = append(picks, TopPick{
			TMDBID:      c.ID,
			MediaType:   c.MediaType,
			Title:       c.Title,
			PosterPath:  c.PosterPath,
			Year:        c.Year,
			VoteAverage: c.VoteAverage,
			Blurb:       p.Blurb,
		})
		if len(picks) == 10 {
			break
		}
	}
	if len(picks) == 0 {
		return nil, fmt.Errorf("no valid picks returned")
	}
	return picks, nil
}

// fallbackTopTen returns the 10 highest-rated candidates with empty blurbs.
func fallbackTopTen(candidates map[candidateKey]content.SearchResult) []TopPick {
	var all []content.SearchResult
	for _, c := range candidates {
		all = append(all, c)
	}
	// simple selection sort of top 10 by rating
	var picks []TopPick
	for len(picks) < 10 && len(all) > 0 {
		best := 0
		for i, c := range all {
			if c.VoteAverage > all[best].VoteAverage {
				best = i
			}
		}
		c := all[best]
		all = append(all[:best], all[best+1:]...)
		picks = append(picks, TopPick{
			TMDBID: c.ID, MediaType: c.MediaType, Title: c.Title,
			PosterPath: c.PosterPath, Year: c.Year, VoteAverage: c.VoteAverage,
		})
	}
	return picks
}

func toPicks(results []content.SearchResult, limit int) []TopPick {
	if len(results) > limit {
		results = results[:limit]
	}
	picks := make([]TopPick, 0, len(results))
	for _, r := range results {
		picks = append(picks, TopPick{
			TMDBID: r.ID, MediaType: r.MediaType, Title: r.Title,
			PosterPath: r.PosterPath, Year: r.Year, VoteAverage: r.VoteAverage,
		})
	}
	return picks
}

// ── Reads (cache-aside: Redis → Postgres) ───────────────────────────────────

func (s *Service) GetDigest(ctx context.Context) (*Digest, error) {
	var digest Digest
	if err := s.getArtifact(ctx, KindDigest, &digest); err != nil {
		return nil, err
	}
	return &digest, nil
}

func (s *Service) GetTop(ctx context.Context) (*TopResponse, error) {
	resp := &TopResponse{}
	for kind, dest := range map[string]**TopList{
		KindTopMovies: &resp.TopMovies,
		KindTopSeries: &resp.TopSeries,
		KindTopTen:    &resp.TopTen,
	} {
		var list TopList
		err := s.getArtifact(ctx, kind, &list)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				continue // section not generated yet — leave nil
			}
			return nil, err
		}
		*dest = &list
	}
	return resp, nil
}

func cacheKeyFor(kind string) string { return "riley:latest:" + kind }

func (s *Service) getArtifact(ctx context.Context, kind string, dest any) error {
	key := cacheKeyFor(kind)
	if cached, err := s.redis.Get(ctx, key).Result(); err == nil {
		if json.Unmarshal([]byte(cached), dest) == nil {
			return nil
		}
	}

	val, err, _ := s.sfGroup.Do(key, func() (interface{}, error) {
		raw := json.RawMessage{}
		if err := s.repo.LatestArtifact(ctx, kind, &raw); err != nil {
			return nil, err
		}
		s.redis.Set(context.Background(), key, []byte(raw), cacheTTL)
		return raw, nil
	})
	if err != nil {
		return err
	}
	return json.Unmarshal(val.(json.RawMessage), dest)
}

func (s *Service) cacheSet(ctx context.Context, kind string, payload any) {
	if data, err := json.Marshal(payload); err == nil {
		s.redis.Set(ctx, cacheKeyFor(kind), data, cacheTTL)
	}
}

// ── Chat ────────────────────────────────────────────────────────────────────

func (s *Service) Chat(ctx context.Context, userID string, msgs []ChatMessage) (*ChatResult, error) {
	if !s.llm.Enabled() {
		return nil, ErrLLMDisabled
	}
	if err := s.checkRateLimit(ctx, userID); err != nil {
		return nil, err
	}

	if len(msgs) > maxChatHistory {
		msgs = msgs[len(msgs)-maxChatHistory:]
	}

	full := make([]ChatMessage, 0, len(msgs)+1)
	full = append(full, ChatMessage{Role: "system", Content: fmt.Sprintf(chatSystemPrompt, s.chatContext(ctx))})
	for _, m := range msgs {
		if m.Role != "user" && m.Role != "assistant" {
			continue // never let clients inject system messages
		}
		full = append(full, m)
	}

	raw, err := s.llm.Complete(ctx, full, true)
	if err != nil {
		return nil, err
	}

	var parsed struct {
		Reply           string `json:"reply"`
		Recommendations []struct {
			Title     string `json:"title"`
			Year      string `json:"year"`
			MediaType string `json:"media_type"`
			Reason    string `json:"reason"`
		} `json:"recommendations"`
	}
	if err := json.Unmarshal([]byte(raw), &parsed); err != nil || parsed.Reply == "" {
		// Model drifted from the contract — degrade to plain text.
		return &ChatResult{Reply: raw, Recommendations: []TopPick{}}, nil
	}

	// Resolve recommended titles to real TMDB entries so the UI gets posters.
	// Unresolvable titles are dropped rather than shown as broken cards.
	recs := make([]TopPick, 0, maxChatRecs)
	for _, rec := range parsed.Recommendations {
		if len(recs) == maxChatRecs {
			break
		}
		results, err := s.tmdb.Search(ctx, rec.Title)
		if err != nil {
			slog.Warn("riley: rec search failed", "title", rec.Title, "error", err)
			continue
		}
		if match := bestMatch(results, rec.Title, rec.Year, rec.MediaType); match != nil {
			recs = append(recs, TopPick{
				TMDBID:      match.ID,
				MediaType:   match.MediaType,
				Title:       match.Title,
				PosterPath:  match.PosterPath,
				Year:        match.Year,
				VoteAverage: match.VoteAverage,
				Blurb:       rec.Reason,
			})
		}
	}

	return &ChatResult{Reply: parsed.Reply, Recommendations: recs}, nil
}

// bestMatch scores TMDB multi-search results against what the LLM asked for:
// title equality matters most, then media type, then release year.
func bestMatch(results []content.SearchResult, title, year, mediaType string) *content.SearchResult {
	wantTitle := normalizeTitle(title)
	var best *content.SearchResult
	bestScore := -1
	for i := range results {
		r := &results[i]
		if r.MediaType != "movie" && r.MediaType != "tv" {
			continue
		}
		score := 0
		if normalizeTitle(r.Title) == wantTitle {
			score += 4
		}
		if mediaType != "" && r.MediaType == mediaType {
			score += 2
		}
		if year != "" && r.Year == year {
			score++
		}
		if score > bestScore {
			best, bestScore = r, score
		}
	}
	return best
}

// chatContext summarizes the latest digest + top lists for the system prompt.
func (s *Service) chatContext(ctx context.Context) string {
	var b strings.Builder

	if digest, err := s.GetDigest(ctx); err == nil {
		b.WriteString("Latest news digest:\n")
		for _, story := range digest.Stories {
			fmt.Fprintf(&b, "- %s (%s)\n", story.Headline, story.Source)
		}
	}
	if top, err := s.GetTop(ctx); err == nil {
		writeList := func(name string, list *TopList) {
			if list == nil {
				return
			}
			fmt.Fprintf(&b, "%s: ", name)
			for i, p := range list.Picks {
				if i >= 10 {
					break
				}
				if i > 0 {
					b.WriteString(", ")
				}
				b.WriteString(p.Title)
			}
			b.WriteString("\n")
		}
		writeList("Top movies right now", top.TopMovies)
		writeList("Top series right now", top.TopSeries)
		writeList("Riley's top 10", top.TopTen)
	}

	if b.Len() == 0 {
		return "(no report generated yet)"
	}
	return b.String()
}

// rateWindow is one counting window of the chat rate limiter.
type rateWindow struct {
	key    string
	limit  int
	expiry time.Duration
	errOut error
}

func (s *Service) checkRateLimit(ctx context.Context, userID string) error {
	now := time.Now().UTC()
	minute := now.Unix() / 60
	day := now.Format("20060102")

	windows := []rateWindow{
		{fmt.Sprintf("riley:rl:min:%s:%d", userID, minute), userChatPerMin, 2 * time.Minute, ErrRateLimited},
		{fmt.Sprintf("riley:rl:min:global:%d", minute), globalChatPerMin, 2 * time.Minute, ErrRateLimited},
		{fmt.Sprintf("riley:rl:day:%s:%s", userID, day), userChatPerDay, 26 * time.Hour, ErrDailyLimited},
		{fmt.Sprintf("riley:rl:day:global:%s", day), globalChatPerDay, 26 * time.Hour, ErrDailyLimited},
	}
	for _, w := range windows {
		count, err := s.redis.Incr(ctx, w.key).Result()
		if err != nil {
			return nil // Redis down — fail open rather than block chat
		}
		if count == 1 {
			s.redis.Expire(ctx, w.key, w.expiry)
		}
		if count > int64(w.limit) {
			return w.errOut
		}
	}
	return nil
}

// secondsUntilUTCMidnight is the retry_after hint for daily-limit 429s.
func secondsUntilUTCMidnight() int {
	now := time.Now().UTC()
	midnight := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC).Add(24 * time.Hour)
	return int(time.Until(midnight).Seconds())
}
