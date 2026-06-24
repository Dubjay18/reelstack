package content

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
)

type mockTransport struct {
	roundTrip func(*http.Request) (*http.Response, error)
}

func (m *mockTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	return m.roundTrip(req)
}

func TestTMDBClient_GetMovieDetails_SingleFlight(t *testing.T) {
	var httpCallCount int32
	mockServer := &mockTransport{
		roundTrip: func(req *http.Request) (*http.Response, error) {
			atomic.AddInt32(&httpCallCount, 1)
			// Introduce a small sleep to ensure concurrent requests overlap
			time.Sleep(50 * time.Millisecond)

			// Create movie details response
			details := MovieDetails{
				ID:    42,
				Title: "Test Movie",
			}
			data, _ := json.Marshal(details)
			
			resp := &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(bytes.NewReader(data)),
			}
			return resp, nil
		},
	}

	// Create a dummy redis client that always fails/misses cache
	// pointing to an invalid port so it always fails connection.
	rdb := redis.NewClient(&redis.Options{
		Addr: "localhost:0",
	})
	defer rdb.Close()

	client := NewTMDBClient("dummy_key", rdb)
	client.httpClient = &http.Client{
		Transport: mockServer,
	}

	// Fire 10 concurrent requests
	const numRequests = 10
	var wg sync.WaitGroup
	wg.Add(numRequests)

	results := make([]*MovieDetails, numRequests)
	errors := make([]error, numRequests)

	for i := 0; i < numRequests; i++ {
		go func(idx int) {
			defer wg.Done()
			movie, err := client.GetMovieDetails(42)
			results[idx] = movie
			errors[idx] = err
		}(i)
	}

	wg.Wait()

	// Verify all returned same title and no errors
	for i := 0; i < numRequests; i++ {
		if errors[i] != nil {
			t.Errorf("request %d failed: %v", i, errors[i])
		}
		if results[i] == nil || results[i].Title != "Test Movie" {
			t.Errorf("request %d returned wrong result: %v", i, results[i])
		}
	}

	// Verify that exactly 1 HTTP request was made
	calls := atomic.LoadInt32(&httpCallCount)
	if calls != 1 {
		t.Errorf("expected exactly 1 HTTP API call, but got %d", calls)
	}
}

func TestTMDBClient_GetTVShowDetails_SingleFlight(t *testing.T) {
	var httpCallCount int32
	mockServer := &mockTransport{
		roundTrip: func(req *http.Request) (*http.Response, error) {
			atomic.AddInt32(&httpCallCount, 1)
			// Introduce a small sleep to ensure concurrent requests overlap
			time.Sleep(50 * time.Millisecond)

			// Create TV show details response
			details := TVShowDetails{
				ID:   99,
				Name: "Test Show",
			}
			data, _ := json.Marshal(details)
			
			resp := &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(bytes.NewReader(data)),
			}
			return resp, nil
		},
	}

	// Create a dummy redis client that always fails/misses cache
	// pointing to an invalid port so it always fails connection.
	rdb := redis.NewClient(&redis.Options{
		Addr: "localhost:0",
	})
	defer rdb.Close()

	client := NewTMDBClient("dummy_key", rdb)
	client.httpClient = &http.Client{
		Transport: mockServer,
	}

	// Fire 10 concurrent requests
	const numRequests = 10
	var wg sync.WaitGroup
	wg.Add(numRequests)

	results := make([]*TVShowDetails, numRequests)
	errors := make([]error, numRequests)

	for i := 0; i < numRequests; i++ {
		go func(idx int) {
			defer wg.Done()
			show, err := client.GetTVShowDetails(99)
			results[idx] = show
			errors[idx] = err
		}(i)
	}

	wg.Wait()

	// Verify all returned same name and no errors
	for i := 0; i < numRequests; i++ {
		if errors[i] != nil {
			t.Errorf("request %d failed: %v", i, errors[i])
		}
		if results[i] == nil || results[i].Name != "Test Show" {
			t.Errorf("request %d returned wrong result: %v", i, results[i])
		}
	}

	// Verify that exactly 1 HTTP request was made
	calls := atomic.LoadInt32(&httpCallCount)
	if calls != 1 {
		t.Errorf("expected exactly 1 HTTP API call, but got %d", calls)
	}
}
