-- OAuth 2.1 dynamically-registered clients (RFC 7591). Public clients only
-- (no client_secret): Claude Desktop and similar MCP clients register
-- themselves at connector-setup time and authenticate with PKCE instead.
CREATE TABLE IF NOT EXISTS oauth_clients (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id     TEXT NOT NULL UNIQUE,
    client_name   VARCHAR(200),
    redirect_uris TEXT[] NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Long-lived, revocable OAuth refresh tokens. Only the SHA-256 hash is
-- stored, mirroring mcp_tokens. Access tokens themselves are stateless
-- JWTs (see internal/oauth/tokens.go) and never persisted.
CREATE TABLE IF NOT EXISTS oauth_refresh_tokens (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id    TEXT NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
    token_hash   TEXT NOT NULL UNIQUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at   TIMESTAMPTZ NOT NULL,
    revoked_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_oauth_refresh_tokens_user_id ON oauth_refresh_tokens(user_id);
