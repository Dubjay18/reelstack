package riley

import (
	"context"
	"errors"
	"testing"

	"github.com/Dubjay18/reelstack/api/internal/content"
)

// fakeLLM stands in for the gateway. This only became possible once
// Service.llm was widened from *LLMClient to the ILLM interface — before
// that, none of Riley's LLM-dependent logic could be unit tested.
type fakeLLM struct {
	enabled bool
	reply   string
	err     error
	calls   int
	gotJSON bool
	gotMsgs []ChatMessage
}

func (f *fakeLLM) Enabled() bool { return f.enabled }

func (f *fakeLLM) Complete(_ context.Context, msgs []ChatMessage, jsonMode bool) (string, error) {
	f.calls++
	f.gotJSON = jsonMode
	f.gotMsgs = msgs
	return f.reply, f.err
}

// Chat must refuse before doing any work when no provider is configured.
func TestChatGatedWhenLLMDisabled(t *testing.T) {
	llm := &fakeLLM{enabled: false}
	svc := &Service{llm: llm}

	_, err := svc.Chat(context.Background(), "user-1", []ChatMessage{{Role: "user", Content: "hi"}})
	if !errors.Is(err, ErrLLMDisabled) {
		t.Fatalf("err = %v, want ErrLLMDisabled", err)
	}
	if llm.calls != 0 {
		t.Errorf("LLM called %d times while disabled, want 0", llm.calls)
	}
}

func candidates() map[candidateKey]content.SearchResult {
	return map[candidateKey]content.SearchResult{
		{ID: 1, MediaType: "movie"}: {ID: 1, MediaType: "movie", Title: "Real Movie", Year: "2024", VoteAverage: 8.1},
		{ID: 2, MediaType: "tv"}:    {ID: 2, MediaType: "tv", Title: "Real Series", Year: "2023", VoteAverage: 7.7},
	}
}

func TestCurateTopTenParsesPicks(t *testing.T) {
	llm := &fakeLLM{
		enabled: true,
		reply:   `{"picks":[{"id":2,"media_type":"tv","blurb":"great"},{"id":1,"media_type":"movie","blurb":"also great"}]}`,
	}
	svc := &Service{llm: llm}

	picks, err := svc.curateTopTen(context.Background(), candidates())
	if err != nil {
		t.Fatalf("curateTopTen: %v", err)
	}
	if len(picks) != 2 {
		t.Fatalf("got %d picks, want 2", len(picks))
	}
	// Order comes from the model, and metadata is taken from the candidate
	// set rather than from anything the model said.
	if picks[0].TMDBID != 2 || picks[0].Title != "Real Series" {
		t.Errorf("first pick = %+v", picks[0])
	}
	if picks[0].Blurb != "great" {
		t.Errorf("blurb = %q", picks[0].Blurb)
	}
	if !llm.gotJSON {
		t.Error("curateTopTen should request JSON mode")
	}
}

// The model must never be able to invent a title that isn't in the candidate set.
func TestCurateTopTenDropsHallucinatedIDs(t *testing.T) {
	llm := &fakeLLM{
		enabled: true,
		reply:   `{"picks":[{"id":999,"media_type":"movie","blurb":"invented"},{"id":1,"media_type":"movie","blurb":"real"}]}`,
	}
	svc := &Service{llm: llm}

	picks, err := svc.curateTopTen(context.Background(), candidates())
	if err != nil {
		t.Fatalf("curateTopTen: %v", err)
	}
	if len(picks) != 1 {
		t.Fatalf("got %d picks, want 1 (hallucinated id dropped)", len(picks))
	}
	if picks[0].TMDBID != 1 {
		t.Errorf("surviving pick = %d, want 1", picks[0].TMDBID)
	}
}

func TestCurateTopTenDedupesRepeatedIDs(t *testing.T) {
	llm := &fakeLLM{
		enabled: true,
		reply:   `{"picks":[{"id":1,"media_type":"movie","blurb":"a"},{"id":1,"media_type":"movie","blurb":"b"}]}`,
	}
	svc := &Service{llm: llm}

	picks, err := svc.curateTopTen(context.Background(), candidates())
	if err != nil {
		t.Fatalf("curateTopTen: %v", err)
	}
	if len(picks) != 1 {
		t.Errorf("got %d picks, want 1 after dedupe", len(picks))
	}
}

// An LLM failure has to surface so refreshTopTen can swap in fallbackTopTen.
func TestCurateTopTenPropagatesLLMError(t *testing.T) {
	svc := &Service{llm: &fakeLLM{enabled: true, err: errors.New("all providers failed")}}

	if _, err := svc.curateTopTen(context.Background(), candidates()); err == nil {
		t.Fatal("expected the LLM error to propagate so the caller can fall back")
	}
}

func TestCurateTopTenRejectsMalformedJSON(t *testing.T) {
	svc := &Service{llm: &fakeLLM{enabled: true, reply: "not json at all"}}

	if _, err := svc.curateTopTen(context.Background(), candidates()); err == nil {
		t.Fatal("expected an error for malformed model output")
	}
}

// Valid JSON that matches nothing real is still a failure, not an empty list.
func TestCurateTopTenAllHallucinatedIsError(t *testing.T) {
	svc := &Service{llm: &fakeLLM{
		enabled: true,
		reply:   `{"picks":[{"id":777,"media_type":"movie","blurb":"fake"}]}`,
	}}

	if _, err := svc.curateTopTen(context.Background(), candidates()); err == nil {
		t.Fatal("expected an error when no pick survives validation")
	}
}
