package riley

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	sdk "github.com/modelcontextprotocol/go-sdk/mcp"

	appmcp "github.com/Dubjay18/reelstack/api/internal/mcp"
)

// mcpClient is Riley's own client for its MCP server (internal/mcp) — the
// same tool surface external MCP clients (Claude Desktop, Claude Code,
// etc.) use, so list-creation logic lives in exactly one place. Riley only
// ever calls this after a user has approved a proposed list in chat, and
// authenticates with a short-lived internal token rather than a
// long-lived Personal Access Token (see appmcp.MintInternalToken).
type mcpClient struct {
	baseURL   string
	jwtSecret string
}

func newMCPClient(baseURL, jwtSecret string) *mcpClient {
	return &mcpClient{baseURL: baseURL, jwtSecret: jwtSecret}
}

// bearerRoundTripper attaches a Bearer token to every outgoing request.
type bearerRoundTripper struct {
	token string
}

func (rt bearerRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	req = req.Clone(req.Context())
	req.Header.Set("Authorization", "Bearer "+rt.token)
	return http.DefaultTransport.RoundTrip(req)
}

// CreateList calls the MCP server's create_list tool as userID.
func (c *mcpClient) CreateList(ctx context.Context, userID string, proposal ProposedList) (*ConfirmedList, error) {
	token, err := appmcp.MintInternalToken(userID, c.jwtSecret)
	if err != nil {
		return nil, fmt.Errorf("mint internal mcp token: %w", err)
	}

	client := sdk.NewClient(&sdk.Implementation{Name: "riley", Version: "1.0.0"}, nil)
	transport := &sdk.StreamableClientTransport{
		Endpoint:   c.baseURL,
		HTTPClient: &http.Client{Transport: bearerRoundTripper{token: token}},
	}
	session, err := client.Connect(ctx, transport, nil)
	if err != nil {
		return nil, fmt.Errorf("connect to mcp server: %w", err)
	}
	defer session.Close()

	items := make([]map[string]any, 0, len(proposal.Items))
	for _, item := range proposal.Items {
		items = append(items, map[string]any{
			"tmdb_id":    item.TMDBID,
			"media_type": item.MediaType,
		})
	}

	result, err := session.CallTool(ctx, &sdk.CallToolParams{
		Name: "create_list",
		Arguments: map[string]any{
			"title":       proposal.Title,
			"description": proposal.Description,
			"is_public":   proposal.IsPublic,
			"items":       items,
		},
	})
	if err != nil {
		return nil, fmt.Errorf("call create_list: %w", err)
	}
	if result.IsError {
		return nil, fmt.Errorf("riley: create_list tool reported an error")
	}

	data, err := json.Marshal(result.StructuredContent)
	if err != nil {
		return nil, fmt.Errorf("marshal create_list result: %w", err)
	}
	var out ConfirmedList
	if err := json.Unmarshal(data, &out); err != nil {
		return nil, fmt.Errorf("parse create_list result: %w", err)
	}
	return &out, nil
}
