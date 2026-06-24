package content

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Dubjay18/reelstack/api/pkg/db"
	"github.com/joho/godotenv"
)

func TestContentService_GetListAvailability(t *testing.T) {
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
	_, _ = database.Exec("DELETE FROM streaming_cache WHERE tmdb_id >= 100000 AND tmdb_id <= 100025")
	defer func() {
		_, _ = database.Exec("DELETE FROM streaming_cache WHERE tmdb_id >= 100000 AND tmdb_id <= 100025")
	}()

	var activeRequests int32
	var maxActiveRequests int32
	var totalHTTPRequests int32

	mockServer := &mockTransport{
		roundTrip: func(req *http.Request) (*http.Response, error) {
			atomic.AddInt32(&totalHTTPRequests, 1)

			// Increment active request count and track maximum
			currActive := atomic.AddInt32(&activeRequests, 1)
			defer atomic.AddInt32(&activeRequests, -1)

			for {
				max := atomic.LoadInt32(&maxActiveRequests)
				if currActive <= max {
					break
				}
				if atomic.CompareAndSwapInt32(&maxActiveRequests, max, currActive) {
					break
				}
			}

			// Introduce synthetic delay to allow concurrency overlap
			time.Sleep(30 * time.Millisecond)

			// Simple mock response
			if req.URL.Path == "/v1/search/" {
				res := testWatchmodeSearchResponse{
					TitleResults: []testWatchmodeSearchResult{
						{ID: 12345},
					},
				}
				data, _ := json.Marshal(res)
				return &http.Response{
					StatusCode: http.StatusOK,
					Body:       io.NopCloser(bytes.NewReader(data)),
				}, nil
			}

			res := []testWatchmodeSource{
				{
					SourceID: 203,
					Name:     "Netflix",
					Type:     "sub",
					Region:   "US",
					WebURL:   "https://netflix.com",
				},
			}
			data, _ := json.Marshal(res)
			return &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(bytes.NewReader(data)),
			}, nil
		},
	}

	wmClient := NewWatchmodeClient("dummy_key", database)
	wmClient.httpClient = &http.Client{
		Transport: mockServer,
	}

	tmdbClient := NewTMDBClient("dummy_key", nil)

	svc := NewService(tmdbClient, wmClient)

	// Create 15 items
	items := make([]ContentItem, 15)
	for i := 0; i < 15; i++ {
		items[i] = ContentItem{
			TMDBID:    100000 + i,
			MediaType: "movie",
		}
	}

	// Fetch availability
	res, err := svc.GetListAvailability(context.Background(), items, "US")
	if err != nil {
		t.Fatalf("GetListAvailability failed: %v", err)
	}

	// Verify all items were fetched
	if len(res) != 15 {
		t.Errorf("expected 15 results, got %d", len(res))
	}

	for i := 0; i < 15; i++ {
		providers, ok := res[100000+i]
		if !ok {
			t.Errorf("missing results for TMDB ID %d", 100000+i)
		}
		if len(providers) != 1 || providers[0].ProviderName != "Netflix" {
			t.Errorf("unexpected providers for TMDB ID %d: %+v", 100000+i, providers)
		}
	}

	// Verify concurrency limits (semaphore size 10)
	maxActive := atomic.LoadInt32(&maxActiveRequests)
	if maxActive > 10 {
		t.Errorf("expected at most 10 active requests concurrently, but reached %d", maxActive)
	}
	t.Logf("Max concurrent active HTTP requests reached: %d", maxActive)
}
