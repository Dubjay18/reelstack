package content

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
)

type dbStreamingCache struct {
	TMDBID    int       `db:"tmdb_id"`
	MediaType string    `db:"media_type"`
	Country   string    `db:"country"`
	Providers []byte    `db:"providers"`
	CachedAt  time.Time `db:"cached_at"`
}

type StreamingProvider struct {
	ProviderID      int     `json:"provider_id"`
	ProviderName    string  `json:"provider_name"`
	LogoPath        *string `json:"logo_path"`
	DisplayPriority int     `json:"display_priority"`
	Link            string  `json:"link"`
	Type            string  `json:"type"` // "subscription", "free", "rent", "buy"
}

type WatchmodeClient struct {
	APIKey     string
	httpClient *http.Client
	db         *sqlx.DB
}

func NewWatchmodeClient(apiKey string, db *sqlx.DB) *WatchmodeClient {
	return &WatchmodeClient{
		APIKey:     apiKey,
		httpClient: &http.Client{},
		db:         db,
	}
}

func (c *WatchmodeClient) GetAvailability(tmdbID int, mediaType string, countryCode string) ([]StreamingProvider, error) {
	countryCode = strings.ToUpper(countryCode)

	// 1. Check SQL Cache first
	var cached dbStreamingCache
	err := c.db.Get(&cached, "SELECT tmdb_id, media_type, country, providers, cached_at FROM streaming_cache WHERE tmdb_id = $1 AND media_type = $2 AND country = $3", tmdbID, mediaType, countryCode)
	if err == nil {
		// Found in cache. Check TTL (24 hours)
		if time.Since(cached.CachedAt) < 24*time.Hour {
			var providers []StreamingProvider
			if err := json.Unmarshal(cached.Providers, &providers); err == nil {
				return providers, nil
			}
		}
	}

	// Cache Miss: Fetch from Watchmode
	// Resolve TMDB ID to Watchmode title ID
	searchField := "tmdb_movie_id"
	if mediaType == "tv" {
		searchField = "tmdb_tv_id"
	}

	searchReq, err := http.NewRequest("GET", "https://api.watchmode.com/v1/search/", nil)
	if err != nil {
		return nil, err
	}
	q := searchReq.URL.Query()
	q.Add("apiKey", c.APIKey)
	q.Add("search_field", searchField)
	q.Add("search_value", strconv.Itoa(tmdbID))
	searchReq.URL.RawQuery = q.Encode()

	searchResp, err := c.httpClient.Do(searchReq)
	if err != nil {
		return nil, err
	}
	defer searchResp.Body.Close()

	if searchResp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Watchmode search API error: status %d", searchResp.StatusCode)
	}

	type watchmodeSearchResult struct {
		ID int `json:"id"`
	}
	type watchmodeSearchResponse struct {
		TitleResults []watchmodeSearchResult `json:"title_results"`
	}

	var searchData watchmodeSearchResponse
	if err := json.NewDecoder(searchResp.Body).Decode(&searchData); err != nil {
		return nil, err
	}

	// If no Watchmode title found, cache empty slice and return empty slice
	if len(searchData.TitleResults) == 0 {
		return c.cacheAndReturnEmpty(tmdbID, mediaType, countryCode)
	}

	watchmodeID := searchData.TitleResults[0].ID

	// Fetch sources for the Watchmode ID filtered by country
	sourcesReq, err := http.NewRequest("GET", fmt.Sprintf("https://api.watchmode.com/v1/title/%d/sources/", watchmodeID), nil)
	if err != nil {
		return nil, err
	}
	sq := sourcesReq.URL.Query()
	sq.Add("apiKey", c.APIKey)
	sq.Add("regions", countryCode)
	sourcesReq.URL.RawQuery = sq.Encode()

	sourcesResp, err := c.httpClient.Do(sourcesReq)
	if err != nil {
		return nil, err
	}
	defer sourcesResp.Body.Close()

	if sourcesResp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Watchmode sources API error: status %d", sourcesResp.StatusCode)
	}

	type watchmodeSource struct {
		SourceID int    `json:"source_id"`
		Name     string `json:"name"`
		Type     string `json:"type"`
		Region   string `json:"region"`
		WebURL   string `json:"web_url"`
	}

	var sources []watchmodeSource
	if err := json.NewDecoder(sourcesResp.Body).Decode(&sources); err != nil {
		return nil, err
	}

	// Map and filter Watchmode sources to StreamingProvider
	var providers []StreamingProvider
	for _, src := range sources {
		if strings.ToUpper(src.Region) != countryCode {
			continue
		}

		provType := "subscription"
		switch src.Type {
		case "sub":
			provType = "subscription"
		case "free":
			provType = "free"
		case "rent":
			provType = "rent"
		case "buy":
			provType = "buy"
		default:
			provType = src.Type
		}

		providers = append(providers, StreamingProvider{
			ProviderID:      src.SourceID,
			ProviderName:    src.Name,
			LogoPath:        nil,
			DisplayPriority: 100,
			Link:            src.WebURL,
			Type:            provType,
		})
	}

	// If providers is empty, guarantee it's not nil (returns empty slice)
	if providers == nil {
		providers = []StreamingProvider{}
	}

	// Cache the results
	providersJSON, err := json.Marshal(providers)
	if err != nil {
		return nil, err
	}

	_, err = c.db.Exec(`
		INSERT INTO streaming_cache (tmdb_id, media_type, country, providers, cached_at)
		VALUES ($1, $2, $3, $4, NOW())
		ON CONFLICT (tmdb_id, media_type, country)
		DO UPDATE SET providers = EXCLUDED.providers, cached_at = EXCLUDED.cached_at`,
		tmdbID, mediaType, countryCode, providersJSON,
	)
	if err != nil {
		// Log error but don't fail the request since we fetched valid data
		fmt.Printf("failed to write to streaming cache: %v\n", err)
	}

	return providers, nil
}

func (c *WatchmodeClient) cacheAndReturnEmpty(tmdbID int, mediaType string, countryCode string) ([]StreamingProvider, error) {
	emptyProviders := []StreamingProvider{}
	providersJSON, _ := json.Marshal(emptyProviders)
	_, _ = c.db.Exec(`
		INSERT INTO streaming_cache (tmdb_id, media_type, country, providers, cached_at)
		VALUES ($1, $2, $3, $4, NOW())
		ON CONFLICT (tmdb_id, media_type, country)
		DO UPDATE SET providers = EXCLUDED.providers, cached_at = EXCLUDED.cached_at`,
		tmdbID, mediaType, countryCode, providersJSON,
	)
	return emptyProviders, nil
}
