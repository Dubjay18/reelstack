package llm

// JSONMode describes how a provider is asked for strict JSON output.
type JSONMode string

const (
	// JSONNative sends response_format:{"type":"json_object"}.
	JSONNative JSONMode = "native"
	// JSONPrompt appends a hard instruction instead, for providers/models
	// that ignore or reject response_format.
	JSONPrompt JSONMode = "prompt"
)

// Limits are a provider's free-tier ceilings. Zero means "no limit known",
// and that window is simply not enforced.
type Limits struct {
	RPM int // requests per minute
	RPD int // requests per day
	TPM int // tokens per minute
	TPD int // tokens per day
}

// ProviderConfig is everything needed to talk to one provider.
type ProviderConfig struct {
	Name         string
	BaseURL      string
	APIKey       string
	Model        string
	JSONMode     JSONMode
	ExtraHeaders map[string]string
	Limits       Limits
}

// DefaultOrder is the priority order providers are tried in. Groq is first
// for latency, Gemini last because its OpenAI-compatibility shim is the
// least mature of the three.
var DefaultOrder = []string{"groq", "openrouter", "gemini"}

// Defaults holds the stable, per-provider facts that don't belong in env
// vars: base URL, a sensible free-tier model, JSON capability, and quota
// ceilings. Only the API key has to be supplied by the environment.
//
// The limits below are the published free-tier numbers at time of writing
// and are deliberately conservative; every one of them can be overridden
// per-provider via env (see config.go) when a plan changes.
func Defaults() map[string]ProviderConfig {
	return map[string]ProviderConfig{
		"groq": {
			Name:     "groq",
			BaseURL:  "https://api.groq.com/openai/v1",
			Model:    "llama-3.3-70b-versatile",
			JSONMode: JSONNative,
			// 30 RPM / 1K RPD / 12K TPM / 100K TPD — tokens-per-day binds first.
			Limits: Limits{RPM: 30, RPD: 1000, TPM: 12000, TPD: 100000},
		},
		"openrouter": {
			Name:     "openrouter",
			BaseURL:  "https://openrouter.ai/api/v1",
			Model:    "meta-llama/llama-3.3-70b-instruct:free",
			JSONMode: JSONNative,
			// OpenRouter asks free-tier traffic to identify itself; without
			// these the account can be throttled harder.
			ExtraHeaders: map[string]string{
				"HTTP-Referer": "https://reelstack.app",
				"X-Title":      "Reelstack",
			},
			// Request-capped rather than token-capped, and the daily cap is
			// shared account-wide across every ":free" model.
			Limits: Limits{RPM: 20, RPD: 50},
		},
		"gemini": {
			Name:     "gemini",
			BaseURL:  "https://generativelanguage.googleapis.com/v1beta/openai",
			Model:    "gemini-2.0-flash",
			JSONMode: JSONNative,
			Limits:   Limits{RPM: 15, RPD: 1500, TPM: 1000000},
		},
	}
}
