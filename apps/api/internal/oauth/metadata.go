package oauth

// protectedResourceMetadata is the RFC 9728 document served at
// /.well-known/oauth-protected-resource, telling a client which
// authorization server(s) protect the /mcp resource.
type protectedResourceMetadata struct {
	Resource             string   `json:"resource"`
	AuthorizationServers []string `json:"authorization_servers"`
}

// authorizationServerMetadata is the RFC 8414 document served at
// /.well-known/oauth-authorization-server.
type authorizationServerMetadata struct {
	Issuer                            string   `json:"issuer"`
	AuthorizationEndpoint             string   `json:"authorization_endpoint"`
	TokenEndpoint                     string   `json:"token_endpoint"`
	RegistrationEndpoint              string   `json:"registration_endpoint"`
	ResponseTypesSupported            []string `json:"response_types_supported"`
	GrantTypesSupported               []string `json:"grant_types_supported"`
	CodeChallengeMethodsSupported     []string `json:"code_challenge_methods_supported"`
	TokenEndpointAuthMethodsSupported []string `json:"token_endpoint_auth_methods_supported"`
}

// buildProtectedResourceMetadata describes the /mcp resource itself.
// apiBaseURL is this API's own externally-reachable origin (cfg.APIBaseURL).
func buildProtectedResourceMetadata(apiBaseURL string) protectedResourceMetadata {
	return protectedResourceMetadata{
		Resource:             apiBaseURL + "/mcp",
		AuthorizationServers: []string{apiBaseURL},
	}
}

// buildAuthorizationServerMetadata describes this authorization server.
// The authorization_endpoint intentionally points at the web app
// (webAppURL), not the API — that's where the OAuth consent screen lives,
// since it's the only origin with access to the user's login state (see
// package doc in clients.go and the plan this package implements).
func buildAuthorizationServerMetadata(apiBaseURL, webAppURL string) authorizationServerMetadata {
	return authorizationServerMetadata{
		Issuer:                            apiBaseURL,
		AuthorizationEndpoint:             webAppURL + "/oauth/authorize",
		TokenEndpoint:                     apiBaseURL + "/api/v1/oauth/token",
		RegistrationEndpoint:              apiBaseURL + "/api/v1/oauth/register",
		ResponseTypesSupported:            []string{"code"},
		GrantTypesSupported:               []string{"authorization_code", "refresh_token"},
		CodeChallengeMethodsSupported:     []string{"S256"},
		TokenEndpointAuthMethodsSupported: []string{"none"},
	}
}
