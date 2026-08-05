package oauth

import (
	"errors"
	"fmt"
	"slices"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// codeAudience scopes authorization-code JWTs so they can never be
// replayed as an access token (or vice versa) even though both are signed
// with the same JWT_SECRET — mirrors the aud-scoping pattern already used
// by internal/mcp.MintInternalToken.
const codeAudience = "reelstack-oauth-code"

// codeTTL is deliberately short: the code only needs to survive the
// redirect round trip from the consent page back to the client's
// redirect_uri, which happens in well under a second in practice.
const codeTTL = 60 * time.Second

// authCodeClaims carries everything the token endpoint needs to validate
// and complete the exchange, without a database round trip. Authorization
// codes are intentionally NOT tracked for single-use in a datastore: at 60
// seconds of validity, the residual replay window is small, and adding
// that guarantee would mean introducing Redis/Postgres state purely for a
// sub-minute-lived value. This is a deliberate, narrow scope cut, called
// out here rather than left implicit.
type authCodeClaims struct {
	ClientID          string `json:"client_id"`
	RedirectURI       string `json:"redirect_uri"`
	CodeChallenge     string `json:"code_challenge"`
	CodeChallengeMeth string `json:"code_challenge_method"`
	jwt.RegisteredClaims
}

// MintAuthorizationCode issues a short-lived, single-purpose code binding
// userID to a specific client/redirect_uri/PKCE challenge, to be handed
// back to the client on its redirect_uri and redeemed once at /token.
func MintAuthorizationCode(userID, clientID, redirectURI, codeChallenge, codeChallengeMethod, secret string) (string, error) {
	claims := authCodeClaims{
		ClientID:          clientID,
		RedirectURI:       redirectURI,
		CodeChallenge:     codeChallenge,
		CodeChallengeMeth: codeChallengeMethod,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			Audience:  jwt.ClaimStrings{codeAudience},
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(codeTTL)),
		},
	}
	tk := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return tk.SignedString([]byte(secret))
}

// ResolveAuthorizationCode validates a code minted by MintAuthorizationCode
// and returns the claims needed to complete the token exchange.
func ResolveAuthorizationCode(codeString, secret string) (*authCodeClaims, error) {
	var claims authCodeClaims
	token, err := jwt.ParseWithClaims(codeString, &claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		return nil, errors.New("oauth: invalid or expired authorization code")
	}
	if !slices.Contains(claims.RegisteredClaims.Audience, codeAudience) {
		return nil, errors.New("oauth: code not scoped for authorization_code exchange")
	}
	if claims.Subject == "" {
		return nil, errors.New("oauth: code missing subject")
	}
	return &claims, nil
}
