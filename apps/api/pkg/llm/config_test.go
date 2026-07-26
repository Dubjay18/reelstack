package llm

import (
	"testing"
)

// envFunc builds an injected getenv from a map, so tests never touch
// process-wide environment state and can run in parallel.
func envFunc(m map[string]string) func(string) string {
	return func(k string) string { return m[k] }
}

func names(providers []ProviderConfig) []string {
	out := make([]string, 0, len(providers))
	for _, p := range providers {
		out = append(out, p.Name)
	}
	return out
}

func equal(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

func TestParseProvidersSelectionAndOrder(t *testing.T) {
	tests := []struct {
		name string
		env  map[string]string
		want []string
	}{
		{
			name: "no config at all yields nothing",
			env:  map[string]string{},
			want: []string{},
		},
		{
			name: "only providers with keys are included",
			env:  map[string]string{"GROQ_API_KEY": "a", "GEMINI_API_KEY": "c"},
			want: []string{"groq", "gemini"},
		},
		{
			name: "all three in default priority order",
			env: map[string]string{
				"GROQ_API_KEY": "a", "OPENROUTER_API_KEY": "b", "GEMINI_API_KEY": "c",
			},
			want: []string{"groq", "openrouter", "gemini"},
		},
		{
			name: "custom order is honoured",
			env: map[string]string{
				"LLM_PROVIDER_ORDER": "gemini,groq",
				"GROQ_API_KEY":       "a", "GEMINI_API_KEY": "c",
			},
			want: []string{"gemini", "groq"},
		},
		{
			name: "unknown provider in order is ignored",
			env: map[string]string{
				"LLM_PROVIDER_ORDER": "groq,notreal",
				"GROQ_API_KEY":       "a",
			},
			want: []string{"groq"},
		},
		{
			name: "whitespace and casing in order are tolerated",
			env: map[string]string{
				"LLM_PROVIDER_ORDER": " GROQ , Gemini ",
				"GROQ_API_KEY":       "a", "GEMINI_API_KEY": "c",
			},
			want: []string{"groq", "gemini"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := names(ParseProviders(envFunc(tt.env)))
			if !equal(got, tt.want) {
				t.Errorf("providers = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestParseProvidersAppliesOverrides(t *testing.T) {
	got := ParseProviders(envFunc(map[string]string{
		"GROQ_API_KEY":  "key",
		"GROQ_MODEL":    "custom-model",
		"GROQ_BASE_URL": "https://example.test/v1",
		"GROQ_RPD":      "5000",
		"GROQ_TPD":      "0",
	}))
	if len(got) != 1 {
		t.Fatalf("got %d providers, want 1", len(got))
	}
	p := got[0]
	if p.Model != "custom-model" {
		t.Errorf("Model = %q", p.Model)
	}
	if p.BaseURL != "https://example.test/v1" {
		t.Errorf("BaseURL = %q", p.BaseURL)
	}
	if p.Limits.RPD != 5000 {
		t.Errorf("RPD = %d, want 5000", p.Limits.RPD)
	}
	if p.Limits.TPD != 0 {
		t.Errorf("TPD = %d, want 0 (explicitly unlimited)", p.Limits.TPD)
	}
	// Untouched defaults survive.
	if p.Limits.RPM != Defaults()["groq"].Limits.RPM {
		t.Errorf("RPM = %d, want the default", p.Limits.RPM)
	}
}

func TestParseProvidersInvalidLimitFallsBackToDefault(t *testing.T) {
	got := ParseProviders(envFunc(map[string]string{
		"GROQ_API_KEY": "key",
		"GROQ_RPM":     "not-a-number",
	}))
	if got[0].Limits.RPM != Defaults()["groq"].Limits.RPM {
		t.Errorf("RPM = %d, want the default when the env value is garbage", got[0].Limits.RPM)
	}
}

// Pre-gateway deployments set only LLM_* — they must keep working untouched.
func TestParseProvidersLegacyShim(t *testing.T) {
	tests := []struct {
		name      string
		env       map[string]string
		wantName  string
		wantModel string
	}{
		{
			name:      "bare LLM_API_KEY defaults to groq",
			env:       map[string]string{"LLM_API_KEY": "legacy"},
			wantName:  "groq",
			wantModel: Defaults()["groq"].Model,
		},
		{
			name: "provider inferred from base URL",
			env: map[string]string{
				"LLM_API_KEY":  "legacy",
				"LLM_BASE_URL": "https://openrouter.ai/api/v1",
			},
			wantName:  "openrouter",
			wantModel: Defaults()["openrouter"].Model,
		},
		{
			name: "gemini inferred and model overridden",
			env: map[string]string{
				"LLM_API_KEY":  "legacy",
				"LLM_BASE_URL": "https://generativelanguage.googleapis.com/v1beta/openai/",
				"LLM_MODEL":    "gemini-1.5-flash",
			},
			wantName:  "gemini",
			wantModel: "gemini-1.5-flash",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ParseProviders(envFunc(tt.env))
			if len(got) != 1 {
				t.Fatalf("got %d providers, want 1", len(got))
			}
			if got[0].Name != tt.wantName {
				t.Errorf("Name = %q, want %q", got[0].Name, tt.wantName)
			}
			if got[0].Model != tt.wantModel {
				t.Errorf("Model = %q, want %q", got[0].Model, tt.wantModel)
			}
			if got[0].APIKey != "legacy" {
				t.Errorf("APIKey = %q", got[0].APIKey)
			}
		})
	}
}

// Once any per-provider key exists the legacy shim must stay out of the way.
func TestParseProvidersLegacyShimSuppressedByRealProviders(t *testing.T) {
	got := ParseProviders(envFunc(map[string]string{
		"LLM_API_KEY":  "legacy",
		"GROQ_API_KEY": "real",
	}))
	if len(got) != 1 {
		t.Fatalf("got %d providers, want 1", len(got))
	}
	if got[0].APIKey != "real" {
		t.Errorf("APIKey = %q, want the per-provider key to win", got[0].APIKey)
	}
}
