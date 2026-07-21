package riley

import (
	"testing"
	"time"

	"github.com/Dubjay18/reelstack/api/internal/content"
)

func strPtr(s string) *string { return &s }

func TestDedupeItems(t *testing.T) {
	now := time.Now()
	tests := []struct {
		name  string
		items []FeedItem
		want  int
	}{
		{
			name: "exact duplicates collapse",
			items: []FeedItem{
				{Title: "Dune 3 Gets Release Date", Published: now},
				{Title: "Dune 3 Gets Release Date", Published: now},
			},
			want: 1,
		},
		{
			name: "punctuation and case variants collapse",
			items: []FeedItem{
				{Title: "Dune 3 Gets Release Date!", Published: now},
				{Title: "dune 3 gets release date", Published: now},
				{Title: "DUNE 3: Gets Release Date", Published: now},
			},
			want: 1,
		},
		{
			name: "distinct titles survive",
			items: []FeedItem{
				{Title: "Dune 3 Gets Release Date", Published: now},
				{Title: "Nolan Casts Lead in Next Film", Published: now},
			},
			want: 2,
		},
		{
			name:  "empty titles dropped",
			items: []FeedItem{{Title: "!!!", Published: now}, {Title: "", Published: now}},
			want:  0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := dedupeItems(tt.items)
			if len(got) != tt.want {
				t.Errorf("dedupeItems() returned %d items, want %d", len(got), tt.want)
			}
		})
	}
}

func TestBuildCandidates(t *testing.T) {
	movies := []content.SearchResult{
		{ID: 1, MediaType: "movie", Title: "A"},
		{ID: 2, MediaType: "movie", Title: "B"},
	}
	series := []content.SearchResult{
		{ID: 1, MediaType: "tv", Title: "A Show"}, // same ID, different media type
		{ID: 2, MediaType: "movie", Title: "B duplicate"},
	}

	candidates := buildCandidates(movies, series)
	if len(candidates) != 3 {
		t.Fatalf("expected 3 unique candidates, got %d", len(candidates))
	}
	// first occurrence wins for duplicates
	if got := candidates[candidateKey{2, "movie"}].Title; got != "B" {
		t.Errorf("duplicate candidate overwrote original: got %q, want %q", got, "B")
	}
}

func TestFallbackTopTen(t *testing.T) {
	candidates := buildCandidates([]content.SearchResult{
		{ID: 1, MediaType: "movie", Title: "Low", VoteAverage: 5.0},
		{ID: 2, MediaType: "movie", Title: "High", VoteAverage: 9.0},
		{ID: 3, MediaType: "tv", Title: "Mid", VoteAverage: 7.0},
	})

	picks := fallbackTopTen(candidates)
	if len(picks) != 3 {
		t.Fatalf("expected 3 picks, got %d", len(picks))
	}
	if picks[0].Title != "High" || picks[1].Title != "Mid" || picks[2].Title != "Low" {
		t.Errorf("picks not ordered by rating: %v", picks)
	}
	for _, p := range picks {
		if p.Blurb != "" {
			t.Errorf("fallback picks should have empty blurbs, got %q", p.Blurb)
		}
	}
}

func TestFallbackTopTenCapsAtTen(t *testing.T) {
	var results []content.SearchResult
	for i := range 15 {
		results = append(results, content.SearchResult{
			ID: i + 1, MediaType: "movie", Title: "M", VoteAverage: float64(i),
			PosterPath: strPtr("/p.jpg"),
		})
	}
	picks := fallbackTopTen(buildCandidates(results))
	if len(picks) != 10 {
		t.Errorf("expected 10 picks, got %d", len(picks))
	}
}

func TestBestMatch(t *testing.T) {
	results := []content.SearchResult{
		{ID: 1, MediaType: "person", Title: "Dune Smith"},
		{ID: 2, MediaType: "movie", Title: "Dune", Year: "1984"},
		{ID: 3, MediaType: "movie", Title: "Dune", Year: "2021"},
		{ID: 4, MediaType: "tv", Title: "Dune: Prophecy", Year: "2024"},
	}

	tests := []struct {
		name, title, year, mediaType string
		wantID                       int
	}{
		{"year disambiguates remakes", "Dune", "2021", "movie", 3},
		{"media type wins over partial title", "Dune: Prophecy", "", "tv", 4},
		{"person results are never matched", "Dune Smith", "", "movie", 2},
		{"no year still finds title match", "Dune", "", "movie", 2},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := bestMatch(results, tt.title, tt.year, tt.mediaType)
			if got == nil {
				t.Fatal("bestMatch() returned nil")
			}
			if got.ID != tt.wantID {
				t.Errorf("bestMatch() = ID %d, want %d", got.ID, tt.wantID)
			}
		})
	}

	if got := bestMatch([]content.SearchResult{{ID: 9, MediaType: "person", Title: "X"}}, "X", "", "movie"); got != nil {
		t.Errorf("expected nil when only person results, got ID %d", got.ID)
	}
}

func TestNormalizeTitle(t *testing.T) {
	tests := []struct{ in, want string }{
		{"Dune: Part Three!", "dune part three"},
		{"  Spaced   Out  ", "spaced out"},
		{"UPPER lower", "upper lower"},
	}
	for _, tt := range tests {
		if got := normalizeTitle(tt.in); got != tt.want {
			t.Errorf("normalizeTitle(%q) = %q, want %q", tt.in, got, tt.want)
		}
	}
}
