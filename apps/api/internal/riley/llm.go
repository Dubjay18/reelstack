package riley

import (
	"context"

	"github.com/Dubjay18/reelstack/api/pkg/llm"
)

// ChatMessage is a true type alias (not a definition) for llm.ChatMessage.
// It has to stay an alias: ChatMessage appears in this package's exported
// IService.Chat signature and in the handler's request body, so every call
// site, struct literal and JSON tag keeps working unchanged while the
// concrete type lives in pkg/llm.
type ChatMessage = llm.ChatMessage

// ILLM is the slice of the LLM gateway that Riley depends on. Declaring it
// here (rather than holding a concrete client) lets the service be tested
// with a fake and lets the gateway evolve independently.
type ILLM interface {
	Enabled() bool
	Complete(ctx context.Context, msgs []ChatMessage, jsonMode bool) (string, error)
}
