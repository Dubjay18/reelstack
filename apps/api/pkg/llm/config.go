package llm

import (
	"log/slog"
	"strconv"
	"strings"
)

// ParseProviders resolves the provider chain from the environment.
//
// getenv is injected rather than calling os.Getenv directly so tests never
// mutate process-wide state and can run in parallel.
//
// Stable per-provider facts (base URL, default model, quota ceilings, JSON
// capability) live in Defaults(); the environment only has to supply an API
// key. Every default is still overridable:
//
//	LLM_PROVIDER_ORDER=groq,openrouter,gemini
//	GROQ_API_KEY=...   GROQ_MODEL=...  GROQ_BASE_URL=...
//	GROQ_RPM=  GROQ_RPD=  GROQ_TPM=  GROQ_TPD=
//
// A provider with no API key is skipped entirely.
func ParseProviders(getenv func(string) string) []ProviderConfig {
	defaults := Defaults()

	order := DefaultOrder
	if raw := strings.TrimSpace(getenv("LLM_PROVIDER_ORDER")); raw != "" {
		order = splitAndTrim(raw)
	}

	var out []ProviderConfig
	for _, name := range order {
		base, known := defaults[name]
		if !known {
			slog.Warn("llm: ignoring unknown provider in LLM_PROVIDER_ORDER", "provider", name)
			continue
		}
		if cfg, ok := providerFromEnv(getenv, name, base); ok {
			out = append(out, cfg)
		}
	}

	if len(out) == 0 {
		if legacy, ok := legacyProvider(getenv, defaults); ok {
			return []ProviderConfig{legacy}
		}
	}
	return out
}

// providerFromEnv layers <PREFIX>_* overrides onto a provider's defaults.
func providerFromEnv(getenv func(string) string, name string, cfg ProviderConfig) (ProviderConfig, bool) {
	prefix := strings.ToUpper(name)

	cfg.APIKey = strings.TrimSpace(getenv(prefix + "_API_KEY"))
	if cfg.APIKey == "" {
		return ProviderConfig{}, false
	}
	if v := strings.TrimSpace(getenv(prefix + "_MODEL")); v != "" {
		cfg.Model = v
	}
	if v := strings.TrimSpace(getenv(prefix + "_BASE_URL")); v != "" {
		cfg.BaseURL = v
	}
	cfg.Limits.RPM = intOr(getenv(prefix+"_RPM"), cfg.Limits.RPM)
	cfg.Limits.RPD = intOr(getenv(prefix+"_RPD"), cfg.Limits.RPD)
	cfg.Limits.TPM = intOr(getenv(prefix+"_TPM"), cfg.Limits.TPM)
	cfg.Limits.TPD = intOr(getenv(prefix+"_TPD"), cfg.Limits.TPD)
	return cfg, true
}

// legacyProvider keeps pre-gateway deployments working: when no per-provider
// keys are set but the original LLM_API_KEY is, synthesise a single provider
// from LLM_API_KEY / LLM_BASE_URL / LLM_MODEL. The provider name is inferred
// from the base URL so it still inherits the right quota table and quirks.
func legacyProvider(getenv func(string) string, defaults map[string]ProviderConfig) (ProviderConfig, bool) {
	key := strings.TrimSpace(getenv("LLM_API_KEY"))
	if key == "" {
		return ProviderConfig{}, false
	}

	baseURL := strings.TrimSpace(getenv("LLM_BASE_URL"))
	cfg := defaults[inferProvider(baseURL)]
	cfg.APIKey = key
	if baseURL != "" {
		cfg.BaseURL = baseURL
	}
	if model := strings.TrimSpace(getenv("LLM_MODEL")); model != "" {
		cfg.Model = model
	}

	slog.Info("llm: using legacy single-provider config from LLM_API_KEY",
		"provider", cfg.Name, "model", cfg.Model)
	return cfg, true
}

// inferProvider maps a base URL back to a known provider, defaulting to groq
// (what LLM_BASE_URL defaulted to before the gateway existed).
func inferProvider(baseURL string) string {
	switch {
	case strings.Contains(baseURL, "openrouter.ai"):
		return "openrouter"
	case strings.Contains(baseURL, "generativelanguage.googleapis.com"):
		return "gemini"
	default:
		return "groq"
	}
}

func splitAndTrim(s string) []string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, strings.ToLower(p))
		}
	}
	return out
}

func intOr(raw string, fallback int) int {
	n, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil || n < 0 {
		return fallback
	}
	return n
}
