package content

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"testing"

	"github.com/Dubjay18/reelstack/api/pkg/db"
	"github.com/joho/godotenv"
)

type testWatchmodeSearchResult struct {
	ID int `json:"id"`
}
type testWatchmodeSearchResponse struct {
	TitleResults []testWatchmodeSearchResult `json:"title_results"`
}
type testWatchmodeSource struct {
	SourceID int    `json:"source_id"`
	Name     string `json:"name"`
	Type     string `json:"type"`
	Region   string `json:"region"`
	WebURL   string `json:"web_url"`
}

func TestWatchmodeClient_GetAvailability(t *testing.T) {
	// Load environment variables (to get DATABASE_URL)
	_ = godotenv.Load("../../.env")
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgresql://postgres:postgres@localhost:5432/reelstack?sslmode=disable"
	}

	database, err := db.Connect(dbURL)
	if err != nil {
		t.Fatalf("failed to connect to test database: %v", err)
	}
	defer database.Close()

	// Clean up previous test runs
	testTMDBID := 999999
	_, err = database.Exec("DELETE FROM streaming_cache WHERE tmdb_id = $1", testTMDBID)
	if err != nil {
		t.Fatalf("failed to cleanup test DB: %v", err)
	}
	defer func() {
		_, _ = database.Exec("DELETE FROM streaming_cache WHERE tmdb_id = $1", testTMDBID)
	}()

	var httpCallCount int
	mockServer := &mockTransport{
		roundTrip: func(req *http.Request) (*http.Response, error) {
			httpCallCount++

			// Handle search request
			if req.URL.Path == "/v1/search/" {
				res := testWatchmodeSearchResponse{
					TitleResults: []testWatchmodeSearchResult{
						{ID: 10101},
					},
				}
				data, _ := json.Marshal(res)
				return &http.Response{
					StatusCode: http.StatusOK,
					Body:       io.NopCloser(bytes.NewReader(data)),
				}, nil
			}

			// Handle sources request
			if req.URL.Path == "/v1/title/10101/sources/" {
				res := []testWatchmodeSource{
					{
						SourceID: 203,
						Name:     "Netflix",
						Type:     "sub",
						Region:   "US",
						WebURL:   "https://netflix.com",
					},
					{
						SourceID: 10,
						Name:     "Amazon Prime",
						Type:     "rent",
						Region:   "US",
						WebURL:   "https://amazon.com",
					},
					{
						// Different region, should be filtered out
						SourceID: 300,
						Name:     "Disney+",
						Type:     "sub",
						Region:   "GB",
						WebURL:   "https://disney.com",
					},
				}
				data, _ := json.Marshal(res)
				return &http.Response{
					StatusCode: http.StatusOK,
					Body:       io.NopCloser(bytes.NewReader(data)),
				}, nil
			}

			return &http.Response{
				StatusCode: http.StatusNotFound,
				Body:       io.NopCloser(bytes.NewReader([]byte("{}"))),
			}, nil
		},
	}

	client := NewWatchmodeClient("dummy_key", database)
	client.httpClient = &http.Client{
		Transport: mockServer,
	}

	// 1. First call: Cache miss, should fetch from API and save to DB
	providers, err := client.GetAvailability(testTMDBID, "movie", "US")
	if err != nil {
		t.Fatalf("first GetAvailability failed: %v", err)
	}

	if len(providers) != 2 {
		t.Errorf("expected 2 providers for US, got %d", len(providers))
	}
	if httpCallCount != 2 {
		t.Errorf("expected 2 HTTP calls (search + sources), got %d", httpCallCount)
	}

	// Verify values
	if providers[0].ProviderName != "Netflix" || providers[0].Type != "subscription" {
		t.Errorf("unexpected first provider: %+v", providers[0])
	}
	if providers[1].ProviderName != "Amazon Prime" || providers[1].Type != "rent" {
		t.Errorf("unexpected second provider: %+v", providers[1])
	}

	//  Second call: Cache hit, should read from DB (no API calls)
	providersCached, err := client.GetAvailability(testTMDBID, "movie", "US")
	if err != nil {
		t.Fatalf("second GetAvailability failed: %v", err)
	}

	if len(providersCached) != 2 {
		t.Errorf("expected 2 cached providers, got %d", len(providersCached))
	}
	if httpCallCount != 2 {
		t.Errorf("expected no additional HTTP calls (still 2), got %d", httpCallCount)
	}

	// 3. Test empty results (no watchmode title found)
	testTMDBIDNoResult := 888888
	_, _ = database.Exec("DELETE FROM streaming_cache WHERE tmdb_id = $1", testTMDBIDNoResult)
	defer func() {
		_, _ = database.Exec("DELETE FROM streaming_cache WHERE tmdb_id = $1", testTMDBIDNoResult)
	}()

	mockServerEmpty := &mockTransport{
		roundTrip: func(req *http.Request) (*http.Response, error) {
			httpCallCount++
			if req.URL.Path == "/v1/search/" {
				res := testWatchmodeSearchResponse{
					TitleResults: []testWatchmodeSearchResult{},
				}
				data, _ := json.Marshal(res)
				return &http.Response{
					StatusCode: http.StatusOK,
					Body:       io.NopCloser(bytes.NewReader(data)),
				}, nil
			}
			return &http.Response{StatusCode: 404, Body: io.NopCloser(bytes.NewReader([]byte("{}")))}, nil
		},
	}
	client.httpClient.Transport = mockServerEmpty

	providersEmpty, err := client.GetAvailability(testTMDBIDNoResult, "movie", "US")
	if err != nil {
		t.Fatalf("GetAvailability with empty search should not return error, got: %v", err)
	}
	if len(providersEmpty) != 0 {
		t.Errorf("expected empty providers slice, got: %v", providersEmpty)
	}
}
