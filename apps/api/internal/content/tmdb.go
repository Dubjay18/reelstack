package content

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/Dubjay18/reelstack/api/pkg/singleflight"
)

type TMDBClient struct {
	APIKey      string
	httpClient  *http.Client
	redisClient *redis.Client
	sfGroup     *singleflight.Group
}


func NewTMDBClient(apiKey string, redisClient *redis.Client) *TMDBClient {
	return &TMDBClient{
		APIKey:      apiKey,
		httpClient:  &http.Client{},
		redisClient: redisClient,
		sfGroup:     &singleflight.Group{},
	}
}

// Example method to fetch movie details from TMDB API
func (c *TMDBClient) GetMovieDetails(movieID int) (*MovieDetails, error) {
	// Check Redis cache first
	cacheKey := "tmdb:movie:" + strconv.Itoa(movieID)
	cachedData, err := c.redisClient.Get(context.Background(), cacheKey).Result()
	if err == nil {
		var details MovieDetails
		err = json.Unmarshal([]byte(cachedData), &details)
		if err == nil {
			return &details, nil
		}
	}

	// Wrap the Redis cache-miss API call with singleflight.Group.Do to prevent cache stampedes.
	// When multiple concurrent requests miss the Redis cache for the same movie ID,
	// only one upstream API request is sent to TMDB. The other requests will wait
	// and share the single result.
	val, err, _ := c.sfGroup.Do(cacheKey, func() (interface{}, error) {
		req, err := http.NewRequest("GET", "https://api.themoviedb.org/3/movie/"+strconv.Itoa(movieID), nil)
		if err != nil {
			return nil, err
		}
		q := req.URL.Query()
		q.Add("api_key", c.APIKey)
		req.URL.RawQuery = q.Encode()

		resp, err := c.httpClient.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("TMDB API error: %s", resp.Status)
		}

		var raw tmdbMovieDetails
		err = json.NewDecoder(resp.Body).Decode(&raw)
		if err != nil {
			return nil, err
		}

		genres := make([]string, len(raw.Genres))
		for i, g := range raw.Genres {
			genres[i] = g.Name
		}

		details := MovieDetails{
			ID:           raw.ID,
			Title:        raw.Title,
			Overview:     raw.Overview,
			ReleaseDate:  raw.ReleaseDate,
			Genres:       genres,
			PosterPath:   raw.PosterPath,
			BackdropPath: raw.BackdropPath,
			Runtime:      raw.Runtime,
			VoteAverage:  raw.VoteAverage,
		}

		// Cache the result in Redis
		cachedDataBytes, _ := json.Marshal(details)
		c.redisClient.Set(context.Background(), cacheKey, cachedDataBytes, time.Hour)

		return &details, nil
	})
	if err != nil {
		return nil, err
	}

	return val.(*MovieDetails), nil
}

type tmdbGenre struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type MovieDetails struct {
	ID           int      `json:"id"`
	Title        string   `json:"title"`
	Overview     string   `json:"overview"`
	ReleaseDate  string   `json:"release_date"`
	Genres       []string `json:"genres"`
	PosterPath   *string  `json:"poster_path"`
	BackdropPath *string  `json:"backdrop_path"`
	Runtime      *int     `json:"runtime"`
	VoteAverage  float64  `json:"vote_average"`
}

type tmdbMovieDetails struct {
	ID           int         `json:"id"`
	Title        string      `json:"title"`
	Overview     string      `json:"overview"`
	ReleaseDate  string      `json:"release_date"`
	Genres       []tmdbGenre `json:"genres"`
	PosterPath   *string     `json:"poster_path"`
	BackdropPath *string     `json:"backdrop_path"`
	Runtime      *int        `json:"runtime"`
	VoteAverage  float64     `json:"vote_average"`
}	

func (c *TMDBClient) GetTVShowDetails(showID int) (*TVShowDetails, error) {
	// Similar implementation to GetMovieDetails, but with TMDB TV show endpoint
	// Check Redis cache first
	cacheKey := "tmdb:tvshow:" + strconv.Itoa(showID)
	cachedData, err := c.redisClient.Get(context.Background(), cacheKey).Result()
	if err == nil {
		var details TVShowDetails
		err = json.Unmarshal([]byte(cachedData), &details)
		if err == nil {
			return &details, nil
		}
	}

	// Wrap the Redis cache-miss API call with singleflight.Group.Do to prevent cache stampedes.
	// When multiple concurrent requests miss the Redis cache for the same TV show ID,
	// only one upstream API request is sent to TMDB. The other requests will wait
	// and share the single result.
	val, err, _ := c.sfGroup.Do(cacheKey, func() (interface{}, error) {
		req, err := http.NewRequest("GET", "https://api.themoviedb.org/3/tv/"+strconv.Itoa(showID), nil)
		if err != nil {
			return nil, err
		}
		q := req.URL.Query()
		q.Add("api_key", c.APIKey)
		req.URL.RawQuery = q.Encode()

		resp, err := c.httpClient.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("TMDB API error: %s", resp.Status)
		}

		var raw tmdbTVShowDetails
		err = json.NewDecoder(resp.Body).Decode(&raw)
		if err != nil {
			return nil, err
		}

		genres := make([]string, len(raw.Genres))
		for i, g := range raw.Genres {
			genres[i] = g.Name
		}

		details := TVShowDetails{
			ID:              raw.ID,
			Name:            raw.Name,
			Overview:        raw.Overview,
			FirstAirDate:    raw.FirstAirDate,
			Genres:          genres,
			PosterPath:      raw.PosterPath,
			BackdropPath:    raw.BackdropPath,
			NumberOfSeasons: raw.NumberOfSeasons,
			VoteAverage:     raw.VoteAverage,
		}

		// Cache the result in Redis
		cachedDataBytes, _ := json.Marshal(details)
		c.redisClient.Set(context.Background(), cacheKey, cachedDataBytes, time.Hour)

		return &details, nil
	})
	if err != nil {
		return nil, err
	}

	return val.(*TVShowDetails), nil
}

type TVShowDetails struct {
	ID              int      `json:"id"`
	Name            string   `json:"name"`
	Overview        string   `json:"overview"`
	FirstAirDate    string   `json:"first_air_date"`
	Genres          []string `json:"genres"`
	PosterPath      *string  `json:"poster_path"`
	BackdropPath    *string  `json:"backdrop_path"`
	NumberOfSeasons int      `json:"number_of_seasons"`
	VoteAverage     float64  `json:"vote_average"`
}

type tmdbTVShowDetails struct {
	ID              int         `json:"id"`
	Name            string      `json:"name"`
	Overview        string      `json:"overview"`
	FirstAirDate    string      `json:"first_air_date"`
	Genres          []tmdbGenre `json:"genres"`
	PosterPath      *string     `json:"poster_path"`
	BackdropPath    *string     `json:"backdrop_path"`
	NumberOfSeasons int         `json:"number_of_seasons"`
	VoteAverage     float64     `json:"vote_average"`
}

func (c *TMDBClient) SearchPeople(ctx context.Context, query string) ([]PersonSearchResult, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", "https://api.themoviedb.org/3/search/person", nil)
	if err != nil {
		return nil, err
	}
	q := req.URL.Query()
	q.Add("api_key", c.APIKey)
	q.Add("query", query)
	req.URL.RawQuery = q.Encode()

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("TMDB person search API error: %s", resp.Status)
	}

	type tmdbKnownFor struct {
		ID           int     `json:"id"`
		Title        string  `json:"title"`
		Name         string  `json:"name"`
		MediaType    string  `json:"media_type"`
		PosterPath   *string `json:"poster_path"`
		ReleaseDate  string  `json:"release_date"`
		FirstAirDate string  `json:"first_air_date"`
	}
	type tmdbPersonResult struct {
		ID                 int            `json:"id"`
		Name               string         `json:"name"`
		ProfilePath        *string        `json:"profile_path"`
		KnownForDepartment string         `json:"known_for_department"`
		KnownFor           []tmdbKnownFor `json:"known_for"`
	}
	type tmdbPersonSearchResponse struct {
		Results []tmdbPersonResult `json:"results"`
	}

	var searchData tmdbPersonSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&searchData); err != nil {
		return nil, err
	}

	var items []PersonSearchResult
	for _, res := range searchData.Results {
		knownFor := make([]PersonKnownFor, len(res.KnownFor))
		for i, kf := range res.KnownFor {
			title := kf.Title
			if kf.MediaType == "tv" {
				title = kf.Name
			}
			date := kf.ReleaseDate
			if kf.MediaType == "tv" {
				date = kf.FirstAirDate
			}
			year := ""
			if len(date) >= 4 {
				year = date[:4]
			}
			knownFor[i] = PersonKnownFor{
				ID:         kf.ID,
				Title:      title,
				MediaType:  kf.MediaType,
				PosterPath: kf.PosterPath,
				Year:       year,
			}
		}
		items = append(items, PersonSearchResult{
			ID:                 res.ID,
			Name:               res.Name,
			ProfilePath:        res.ProfilePath,
			KnownForDepartment: res.KnownForDepartment,
			KnownFor:           knownFor,
		})
	}

	return items, nil
}

func (c *TMDBClient) Search(ctx context.Context, query string) ([]SearchResult, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", "https://api.themoviedb.org/3/search/multi", nil)
	if err != nil {
		return nil, err
	}
	q := req.URL.Query()
	q.Add("api_key", c.APIKey)
	q.Add("query", query)
	req.URL.RawQuery = q.Encode()

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("TMDB search API error: %s", resp.Status)
	}

	type tmdbSearchResult struct {
		ID           int     `json:"id"`
		MediaType    string  `json:"media_type"` // "movie" or "tv"
		Title        string  `json:"title"`
		Name         string  `json:"name"`
		PosterPath   *string `json:"poster_path"`
		ReleaseDate  string  `json:"release_date"`
		FirstAirDate string  `json:"first_air_date"`
		VoteAverage  float64 `json:"vote_average"`
	}
	type tmdbSearchResponse struct {
		Results []tmdbSearchResult `json:"results"`
	}

	var searchData tmdbSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&searchData); err != nil {
		return nil, err
	}

	var items []SearchResult
	for _, res := range searchData.Results {
		if res.MediaType == "movie" || res.MediaType == "tv" {
			title := res.Title
			if res.MediaType == "tv" {
				title = res.Name
			}
			
			date := res.ReleaseDate
			if res.MediaType == "tv" {
				date = res.FirstAirDate
			}
			
			year := ""
			if len(date) >= 4 {
				year = date[:4]
			}

			items = append(items, SearchResult{
				ID:          res.ID,
				MediaType:   res.MediaType,
				Title:       title,
				PosterPath:  res.PosterPath,
				Year:        year,
				VoteAverage: res.VoteAverage,
			})
		}
	}

	return items, nil
}

func (c *TMDBClient) GetTrending(ctx context.Context) ([]SearchResult, error) {
	const cacheKey = "tmdb:trending:week"

	// Check Redis cache first
	cachedData, err := c.redisClient.Get(ctx, cacheKey).Result()
	if err == nil {
		var results []SearchResult
		if err = json.Unmarshal([]byte(cachedData), &results); err == nil {
			return results, nil
		}
	}

	val, err, _ := c.sfGroup.Do(cacheKey, func() (interface{}, error) {
		req, err := http.NewRequestWithContext(ctx, "GET", "https://api.themoviedb.org/3/trending/movie/week", nil)
		if err != nil {
			return nil, err
		}
		q := req.URL.Query()
		q.Add("api_key", c.APIKey)
		req.URL.RawQuery = q.Encode()

		resp, err := c.httpClient.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("TMDB trending API error: %s", resp.Status)
		}

		type tmdbTrendingItem struct {
			ID          int     `json:"id"`
			Title       string  `json:"title"`
			PosterPath  *string `json:"poster_path"`
			ReleaseDate string  `json:"release_date"`
			VoteAverage float64 `json:"vote_average"`
		}
		type tmdbTrendingResponse struct {
			Results []tmdbTrendingItem `json:"results"`
		}

		var trendingData tmdbTrendingResponse
		if err := json.NewDecoder(resp.Body).Decode(&trendingData); err != nil {
			return nil, err
		}

		var items []SearchResult
		for _, res := range trendingData.Results {
			year := ""
			if len(res.ReleaseDate) >= 4 {
				year = res.ReleaseDate[:4]
			}
			items = append(items, SearchResult{
				ID:          res.ID,
				MediaType:   "movie",
				Title:       res.Title,
				PosterPath:  res.PosterPath,
				Year:        year,
				VoteAverage: res.VoteAverage,
			})
		}

		// Cache in Redis for 1 hour
		if data, err := json.Marshal(items); err == nil {
			c.redisClient.Set(context.Background(), cacheKey, data, time.Hour)
		}

		return items, nil
	})
	if err != nil {
		return nil, err
	}

	return val.([]SearchResult), nil
}	