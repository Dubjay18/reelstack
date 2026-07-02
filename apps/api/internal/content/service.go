package content

import (
	"context"
	"fmt"
	"sync"

	"golang.org/x/sync/errgroup"
)

type IContentService interface {
	GetListAvailability(ctx context.Context, items []ContentItem, countryCode string) (map[int][]StreamingProvider, error)
	Search(ctx context.Context, query string) ([]SearchResult, error)
	SearchPeople(ctx context.Context, query string) ([]PersonSearchResult, error)
	GetTrending(ctx context.Context) ([]SearchResult, error)
	GetDetails(ctx context.Context, mediaType string, tmdbID int) (interface{}, error)
}
type PersonKnownFor struct {
	ID         int     `json:"id"`
	Title      string  `json:"title"`
	MediaType  string  `json:"media_type"`
	PosterPath *string `json:"poster_path"`
	Year       string  `json:"year"`
}

type PersonSearchResult struct {
	ID                int              `json:"id"`
	Name              string           `json:"name"`
	ProfilePath       *string          `json:"profile_path"`
	KnownForDepartment string           `json:"known_for_department"`
	KnownFor          []PersonKnownFor `json:"known_for"`
}

type ContentItem struct {
	TMDBID    int    `json:"tmdb_id"`
	MediaType string `json:"media_type"`
}

type SearchResult struct {
	ID          int     `json:"id"`
	MediaType   string  `json:"media_type"`
	Title       string  `json:"title"`
	PosterPath  *string `json:"poster_path"`
	Year        string  `json:"year"`
	VoteAverage float64 `json:"vote_average"`
}

type ContentService struct {
	tmdbClient      *TMDBClient
	watchmodeClient *WatchmodeClient
}

func NewService(tmdb *TMDBClient, wm *WatchmodeClient) *ContentService {
	return &ContentService{
		tmdbClient:      tmdb,
		watchmodeClient: wm,
	}
}

// GetListAvailability fetches streaming availability concurrently for a list of items.
// It limits concurrency to a maximum of 10 goroutines using a semaphore channel
// and aggregates errors using an errgroup.
func (s *ContentService) GetListAvailability(ctx context.Context, items []ContentItem, countryCode string) (map[int][]StreamingProvider, error) {
	if len(items) == 0 {
		return map[int][]StreamingProvider{}, nil
	}

	g, ctx := errgroup.WithContext(ctx)
	sem := make(chan struct{}, 10) // bounded goroutine pool (semaphore size 10)

	var mu sync.Mutex
	results := make(map[int][]StreamingProvider)

	for _, item := range items {
		item := item // capture loop variable
		g.Go(func() error {
			select {
			case sem <- struct{}{}:
			case <-ctx.Done():
				return ctx.Err()
			}
			defer func() { <-sem }()

			providers, err := s.watchmodeClient.GetAvailability(item.TMDBID, item.MediaType, countryCode)
			if err != nil {
				return err
			}

			mu.Lock()
			results[item.TMDBID] = providers
			mu.Unlock()

			return nil
		})
	}

	if err := g.Wait(); err != nil {
		return nil, err
	}

	return results, nil
}

func (s *ContentService) Search(ctx context.Context, query string) ([]SearchResult, error) {
	return s.tmdbClient.Search(ctx, query)
}

func (s *ContentService) SearchPeople(ctx context.Context, query string) ([]PersonSearchResult, error) {
	return s.tmdbClient.SearchPeople(ctx, query)
}

func (s *ContentService) GetTrending(ctx context.Context) ([]SearchResult, error) {
	return s.tmdbClient.GetTrending(ctx)
}

func (s *ContentService) GetDetails(ctx context.Context, mediaType string, tmdbID int) (interface{}, error) {
	if mediaType == "movie" {
		return s.tmdbClient.GetMovieDetails(tmdbID)
	} else if mediaType == "tv" {
		return s.tmdbClient.GetTVShowDetails(tmdbID)
	}
	return nil, fmt.Errorf("invalid media type")
}
