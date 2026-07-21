package riley

import (
	"errors"
	"time"
)

// ErrLLMDisabled is returned when no LLM API key is configured.
var ErrLLMDisabled = errors.New("riley: LLM is not configured")

// ErrRateLimited is returned when a per-minute chat budget is exhausted.
var ErrRateLimited = errors.New("riley: rate limited")

// ErrDailyLimited is returned when a per-day chat budget is exhausted.
var ErrDailyLimited = errors.New("riley: daily limit reached")

// Artifact kinds stored in riley_artifacts.
const (
	KindDigest    = "digest"
	KindTopMovies = "top_movies"
	KindTopSeries = "top_series"
	KindTopTen    = "top_ten"
)

type Story struct {
	Headline string `json:"headline"`
	Summary  string `json:"summary"`
	Source   string `json:"source"`
	URL      string `json:"url"`
}

type Digest struct {
	GeneratedAt time.Time `json:"generated_at"`
	Stories     []Story   `json:"stories"`
}

type TopPick struct {
	TMDBID      int     `json:"tmdb_id"`
	MediaType   string  `json:"media_type"`
	Title       string  `json:"title"`
	PosterPath  *string `json:"poster_path"`
	Year        string  `json:"year"`
	VoteAverage float64 `json:"vote_average"`
	Blurb       string  `json:"blurb"`
}

type TopList struct {
	GeneratedAt time.Time `json:"generated_at"`
	Picks       []TopPick `json:"picks"`
}

// ChatResult is the payload for POST /api/v1/riley/chat: the conversational
// reply plus any recommended titles resolved against TMDB for poster cards.
type ChatResult struct {
	Reply           string    `json:"reply"`
	Recommendations []TopPick `json:"recommendations"`
}

// TopResponse is the payload for GET /api/v1/riley/top.
type TopResponse struct {
	TopMovies *TopList `json:"top_movies"`
	TopSeries *TopList `json:"top_series"`
	TopTen    *TopList `json:"top_ten"`
}
