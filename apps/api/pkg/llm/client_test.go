package llm

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// okResponse is a minimal successful chat-completions body.
func okResponse(content string, total int) string {
	b, _ := json.Marshal(map[string]any{
		"choices": []map[string]any{
			{"message": map[string]string{"role": "assistant", "content": content}},
		},
		"usage": map[string]int{"prompt_tokens": 10, "completion_tokens": total - 10, "total_tokens": total},
	})
	return string(b)
}

func TestClientCompleteRequestShape(t *testing.T) {
	tests := []struct {
		name           string
		jsonMode       bool
		mode           JSONMode
		wantFormat     bool
		wantInstrucion bool
	}{
		{name: "native json mode sends response_format", jsonMode: true, mode: JSONNative, wantFormat: true},
		{name: "prompt json mode appends instruction instead", jsonMode: true, mode: JSONPrompt, wantInstrucion: true},
		{name: "no json mode sends neither", jsonMode: false, mode: JSONNative},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var got struct {
				Model          string        `json:"model"`
				Messages       []ChatMessage `json:"messages"`
				ResponseFormat *struct {
					Type string `json:"type"`
				} `json:"response_format"`
			}
			var gotAuth, gotTitle, gotPath string

			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				gotAuth = r.Header.Get("Authorization")
				gotTitle = r.Header.Get("X-Title")
				gotPath = r.URL.Path
				if err := json.NewDecoder(r.Body).Decode(&got); err != nil {
					t.Errorf("decode request: %v", err)
				}
				w.Write([]byte(okResponse(`{"ok":true}`, 42)))
			}))
			defer srv.Close()

			c := NewClient(ProviderConfig{
				Name: "test", BaseURL: srv.URL, APIKey: "sekret", Model: "test-model",
				JSONMode: tt.mode, ExtraHeaders: map[string]string{"X-Title": "Reelstack"},
			})

			if _, _, err := c.Complete(context.Background(), []ChatMessage{{Role: "user", Content: "hi"}}, tt.jsonMode); err != nil {
				t.Fatalf("Complete: %v", err)
			}

			if gotPath != "/chat/completions" {
				t.Errorf("path = %q, want /chat/completions", gotPath)
			}
			if gotAuth != "Bearer sekret" {
				t.Errorf("auth = %q, want Bearer sekret", gotAuth)
			}
			if gotTitle != "Reelstack" {
				t.Errorf("extra header not applied, X-Title = %q", gotTitle)
			}
			if got.Model != "test-model" {
				t.Errorf("model = %q", got.Model)
			}
			if hasFormat := got.ResponseFormat != nil; hasFormat != tt.wantFormat {
				t.Errorf("response_format present = %v, want %v", hasFormat, tt.wantFormat)
			}
			hasInstruction := strings.Contains(got.Messages[len(got.Messages)-1].Content, "valid JSON object")
			if hasInstruction != tt.wantInstrucion {
				t.Errorf("json instruction present = %v, want %v", hasInstruction, tt.wantInstrucion)
			}
		})
	}
}

// Gemini's documented compat base URL ends in a slash; naive concatenation
// would produce //chat/completions.
func TestClientTrimsTrailingSlashInBaseURL(t *testing.T) {
	var gotPath string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		w.Write([]byte(okResponse("{}", 5)))
	}))
	defer srv.Close()

	c := NewClient(ProviderConfig{Name: "gemini", BaseURL: srv.URL + "/", APIKey: "k", Model: "m"})
	if _, _, err := c.Complete(context.Background(), []ChatMessage{{Role: "user", Content: "x"}}, false); err != nil {
		t.Fatalf("Complete: %v", err)
	}
	if gotPath != "/chat/completions" {
		t.Errorf("path = %q, want /chat/completions (no double slash)", gotPath)
	}
}

func TestClientParsesUsage(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(okResponse("hello", 1234)))
	}))
	defer srv.Close()

	c := NewClient(ProviderConfig{Name: "t", BaseURL: srv.URL, APIKey: "k", Model: "m"})
	_, usage, err := c.Complete(context.Background(), []ChatMessage{{Role: "user", Content: "x"}}, false)
	if err != nil {
		t.Fatalf("Complete: %v", err)
	}
	if usage.TotalTokens != 1234 {
		t.Errorf("TotalTokens = %d, want 1234", usage.TotalTokens)
	}
}

func TestClientMissingUsageIsZero(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":"hi"}}]}`))
	}))
	defer srv.Close()

	c := NewClient(ProviderConfig{Name: "t", BaseURL: srv.URL, APIKey: "k", Model: "m"})
	_, usage, err := c.Complete(context.Background(), []ChatMessage{{Role: "user", Content: "x"}}, false)
	if err != nil {
		t.Fatalf("Complete: %v", err)
	}
	if usage.TotalTokens != 0 {
		t.Errorf("TotalTokens = %d, want 0 when provider omits usage", usage.TotalTokens)
	}
}

func TestClientAPIErrorPreservesFormat(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Retry-After", "42")
		w.WriteHeader(http.StatusTooManyRequests)
		w.Write([]byte("slow down"))
	}))
	defer srv.Close()

	c := NewClient(ProviderConfig{Name: "t", BaseURL: srv.URL, APIKey: "k", Model: "m"})
	_, _, err := c.Complete(context.Background(), []ChatMessage{{Role: "user", Content: "x"}}, false)
	if err == nil {
		t.Fatal("expected an error")
	}

	apiErr, ok := err.(*APIError)
	if !ok {
		t.Fatalf("error type = %T, want *APIError", err)
	}
	if apiErr.Status != http.StatusTooManyRequests {
		t.Errorf("status = %d", apiErr.Status)
	}
	if apiErr.RetryAfter.Seconds() != 42 {
		t.Errorf("RetryAfter = %v, want 42s", apiErr.RetryAfter)
	}
	// Format kept byte-compatible with the pre-gateway client.
	if want := "LLM API error 429: slow down"; apiErr.Error() != want {
		t.Errorf("Error() = %q, want %q", apiErr.Error(), want)
	}
}

func TestClientNoChoicesIsError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{"choices":[]}`))
	}))
	defer srv.Close()

	c := NewClient(ProviderConfig{Name: "t", BaseURL: srv.URL, APIKey: "k", Model: "m"})
	if _, _, err := c.Complete(context.Background(), []ChatMessage{{Role: "user", Content: "x"}}, false); err == nil {
		t.Fatal("expected an error when no choices are returned")
	}
}

func TestStripJSONFence(t *testing.T) {
	tests := []struct {
		name, in, want string
	}{
		{"bare json untouched", `{"a":1}`, `{"a":1}`},
		{"json fence", "```json\n{\"a\":1}\n```", `{"a":1}`},
		{"plain fence", "```\n{\"a\":1}\n```", `{"a":1}`},
		{"fence with surrounding space", "  ```json\n{\"a\":1}\n```  ", `{"a":1}`},
		{"non-fenced prose untouched", "hello there", "hello there"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := stripJSONFence(tt.in); got != tt.want {
				t.Errorf("stripJSONFence(%q) = %q, want %q", tt.in, got, tt.want)
			}
		})
	}
}

// A fenced reply must be unwrapped when jsonMode is on, since callers
// json.Unmarshal the result directly.
func TestClientUnfencesInJSONMode(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(okResponse("```json\\n{\\\"a\\\":1}\\n```", 10)))
	}))
	defer srv.Close()

	c := NewClient(ProviderConfig{Name: "t", BaseURL: srv.URL, APIKey: "k", Model: "m"})
	got, _, err := c.Complete(context.Background(), []ChatMessage{{Role: "user", Content: "x"}}, true)
	if err != nil {
		t.Fatalf("Complete: %v", err)
	}
	if strings.Contains(got, "```") {
		t.Errorf("reply still fenced: %q", got)
	}
}
