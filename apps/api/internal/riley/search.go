package riley

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// SearchClient wraps the Tavily Search API — built for LLM agent tool use,
// with a genuine free tier (1,000 credits/month, no credit card required).
// https://docs.tavily.com/documentation/api-reference/endpoint/search
type SearchClient struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

func NewSearchClient(baseURL, apiKey string) *SearchClient {
	return &SearchClient{
		baseURL:    baseURL,
		apiKey:     apiKey,
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
}

// Enabled reports whether an API key is configured.
func (c *SearchClient) Enabled() bool {
	return c.apiKey != ""
}

type WebResult struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	URL         string `json:"url"`
}

const maxSearchResults = 5

type tavilySearchRequest struct {
	APIKey     string `json:"api_key"`
	Query      string `json:"query"`
	MaxResults int    `json:"max_results"`
}

// Search returns the top web results for a query. Used by Riley's chat as
// a tool call when the cached news digest doesn't cover what was asked.
func (c *SearchClient) Search(ctx context.Context, query string) ([]WebResult, error) {
	if !c.Enabled() {
		return nil, fmt.Errorf("riley: web search is not configured")
	}

	payload, err := json.Marshal(tavilySearchRequest{
		APIKey:     c.apiKey,
		Query:      query,
		MaxResults: maxSearchResults,
	})
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL, bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("tavily search API error: %s", resp.Status)
	}

	var parsed struct {
		Results []struct {
			Title   string `json:"title"`
			Content string `json:"content"`
			URL     string `json:"url"`
		} `json:"results"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return nil, fmt.Errorf("tavily search response parse error: %w", err)
	}

	results := make([]WebResult, 0, len(parsed.Results))
	for _, r := range parsed.Results {
		results = append(results, WebResult{Title: r.Title, Description: r.Content, URL: r.URL})
	}
	return results, nil
}
