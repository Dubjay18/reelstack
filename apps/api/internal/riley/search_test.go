package riley

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSearchClient_Disabled(t *testing.T) {
	c := NewSearchClient("https://example.com", "")
	if c.Enabled() {
		t.Fatal("expected Enabled() to be false with no API key")
	}
	if _, err := c.Search(context.Background(), "anything"); err == nil {
		t.Fatal("expected Search to error when disabled")
	}
}

func TestSearchClient_ParsesResults(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body tavilySearchRequest
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Fatalf("failed to decode request body: %v", err)
		}
		if body.APIKey != "test-key" {
			t.Errorf("expected api_key in body, got %q", body.APIKey)
		}
		if body.Query != "spider-man brand new day release date" {
			t.Errorf("unexpected query: %q", body.Query)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"results": [
				{"title": "Spider-Man: Brand New Day", "content": "Releases July 2026", "url": "https://example.com/spidey"}
			]
		}`))
	}))
	defer server.Close()

	c := NewSearchClient(server.URL, "test-key")
	results, err := c.Search(context.Background(), "spider-man brand new day release date")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}
	if results[0].Title != "Spider-Man: Brand New Day" || results[0].URL != "https://example.com/spidey" {
		t.Errorf("unexpected result: %+v", results[0])
	}
}

func TestSearchClient_NonOKStatus(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer server.Close()

	c := NewSearchClient(server.URL, "bad-key")
	if _, err := c.Search(context.Background(), "query"); err == nil {
		t.Fatal("expected error on non-200 response")
	}
}
