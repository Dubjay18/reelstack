package auth

import (
	"encoding/json"
	"fmt"
	"net/http"
)

// GoogleProfile holds the fields we care about from Google's userinfo endpoint.
type GoogleProfile struct {
	ID      string `json:"id"`
	Email   string `json:"email"`
	Name    string `json:"name"`
	Picture string `json:"picture"`
}

// googleProfileFetcher is a function variable so tests can swap it out without
// making a real HTTP call.
var googleProfileFetcher = fetchGoogleProfile

// SetGoogleProfileFetcher replaces the profile-fetching function. Only for tests.
func SetGoogleProfileFetcher(fn func(accessToken string) (*GoogleProfile, error)) {
	googleProfileFetcher = fn
}

// ResetGoogleProfileFetcher restores the default HTTP-based fetcher. Only for tests.
func ResetGoogleProfileFetcher() {
	googleProfileFetcher = fetchGoogleProfile
}

// fetchGoogleProfile calls the Google userinfo v2 endpoint using the supplied
// OAuth access token and returns the parsed profile.
func fetchGoogleProfile(accessToken string) (*GoogleProfile, error) {
	req, err := http.NewRequest(http.MethodGet,
		"https://www.googleapis.com/oauth2/v2/userinfo", nil)
	if err != nil {
		return nil, fmt.Errorf("build userinfo request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("userinfo request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("userinfo returned HTTP %d", resp.StatusCode)
	}

	var profile GoogleProfile
	if err := json.NewDecoder(resp.Body).Decode(&profile); err != nil {
		return nil, fmt.Errorf("decode userinfo: %w", err)
	}
	if profile.ID == "" {
		return nil, fmt.Errorf("userinfo response missing 'id' field")
	}
	return &profile, nil
}
