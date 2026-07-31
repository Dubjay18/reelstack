package content

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
)

func TestHandler_GetEmbedSources(t *testing.T) {
	mt := &embedMockTransport{
		byHost: map[string]func() (*http.Response, error){
			"www.vidking.net": aliveResponse,
			"vidfast.pro":     aliveResponse,
		},
		calls: map[string]int{},
	}
	rdb := redis.NewClient(&redis.Options{Addr: "localhost:0"})
	defer rdb.Close()

	embedClient := NewEmbedSourceClient(rdb)
	embedClient.httpClient.Transport = mt

	svc := NewService(nil, nil, embedClient)
	h := NewHandler(svc)

	app := fiber.New()
	h.RegisterRoutes(app)

	// Movie sources
	req := httptest.NewRequest("GET", "/api/v1/stream/embed?type=movie&tmdbId=27205", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	var body struct {
		Sources []EmbedSource `json:"sources"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if len(body.Sources) != 2 {
		t.Errorf("expected 2 sources, got %d", len(body.Sources))
	}
	if body.Sources[0].ID != "vidking" {
		t.Errorf("expected vidking first, got %s", body.Sources[0].ID)
	}

	// TV episode sources with season/episode defaults
	req2 := httptest.NewRequest("GET", "/api/v1/stream/embed?type=tv&tmdbId=1399", nil)
	resp2, err := app.Test(req2)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp2.Body.Close()
	if resp2.StatusCode != fiber.StatusOK {
		t.Fatalf("expected 200, got %d", resp2.StatusCode)
	}
	var body2 struct {
		Sources []EmbedSource `json:"sources"`
	}
	if err := json.NewDecoder(resp2.Body).Decode(&body2); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if len(body2.Sources) != 2 {
		t.Fatalf("expected 2 sources, got %d", len(body2.Sources))
	}
	if body2.Sources[0].URL != "https://www.vidking.net/embed/tv/1399/1/1" {
		t.Errorf("unexpected tv url: %s", body2.Sources[0].URL)
	}

	// Bad media type → 400
	req3 := httptest.NewRequest("GET", "/api/v1/stream/embed?type=anime&tmdbId=1", nil)
	resp3, err := app.Test(req3)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp3.Body.Close()
	if resp3.StatusCode != fiber.StatusBadRequest {
		t.Errorf("expected 400 for invalid type, got %d", resp3.StatusCode)
	}

	// Missing/invalid tmdbId → 400
	req4 := httptest.NewRequest("GET", "/api/v1/stream/embed?type=movie", nil)
	resp4, err := app.Test(req4)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp4.Body.Close()
	if resp4.StatusCode != fiber.StatusBadRequest {
		t.Errorf("expected 400 for missing tmdbId, got %d", resp4.StatusCode)
	}
}
