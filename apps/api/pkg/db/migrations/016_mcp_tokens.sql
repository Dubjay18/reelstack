-- Personal Access Tokens for external MCP clients (Claude Desktop, Claude
-- Code, etc.) to authenticate as a specific Reelstack user against the
-- MCP server. Only the SHA-256 hash of the token is stored.
CREATE TABLE IF NOT EXISTS mcp_tokens (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name         VARCHAR(100) NOT NULL,
    token_hash   TEXT NOT NULL UNIQUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    revoked_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mcp_tokens_user_id ON mcp_tokens(user_id);
