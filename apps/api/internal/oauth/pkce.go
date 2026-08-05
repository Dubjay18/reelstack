package oauth

import (
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
)

// VerifyPKCE reports whether verifier, presented at the token endpoint,
// matches the code_challenge supplied at the start of the authorization
// request (RFC 7636). Only S256 is supported — Claude Desktop and every
// current MCP client always offer S256, and rejecting "plain" narrows the
// attack surface for no real compatibility cost.
func VerifyPKCE(verifier, challenge, method string) bool {
	if method != "S256" || verifier == "" || challenge == "" {
		return false
	}
	sum := sha256.Sum256([]byte(verifier))
	computed := base64.RawURLEncoding.EncodeToString(sum[:])
	return subtle.ConstantTimeCompare([]byte(computed), []byte(challenge)) == 1
}
