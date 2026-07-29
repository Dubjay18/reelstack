package riley

import (
	"context"
	"encoding/json"
	"fmt"

	sdk "github.com/modelcontextprotocol/go-sdk/mcp"

	"github.com/Dubjay18/reelstack/api/internal/lists"
	appmcp "github.com/Dubjay18/reelstack/api/internal/mcp"
)

// mcpClient is Riley's own client for its MCP server (internal/mcp) — the
// same tool surface external MCP clients (Claude Desktop, Claude Code,
// etc.) use, so list-creation logic lives in exactly one place. Riley only
// ever calls this after a user has approved a proposed list in chat.
//
// It connects to a Server built directly in-process over an in-memory
// transport rather than looping back over HTTP: fasthttp/Fiber's
// adaptor.HTTPHandler (used to mount /mcp) buffers the whole net/http
// response and only flushes it once the handler returns, so a real HTTP
// round trip to our own streamable-HTTP MCP endpoint never completes and
// hangs forever — which is what caused the Approve button's infinite
// loading spinner.
type mcpClient struct {
	listsSvc lists.IListService
	appURL   string
}

func newMCPClient(listsSvc lists.IListService, appURL string) *mcpClient {
	return &mcpClient{listsSvc: listsSvc, appURL: appURL}
}

// CreateList calls the MCP server's create_list tool as userID.
func (c *mcpClient) CreateList(ctx context.Context, userID string, proposal ProposedList) (*ConfirmedList, error) {
	server := appmcp.NewToolServer(userID, c.listsSvc, c.appURL)

	clientTransport, serverTransport := sdk.NewInMemoryTransports()

	serverSession, err := server.Connect(ctx, serverTransport, nil)
	if err != nil {
		return nil, fmt.Errorf("connect mcp server: %w", err)
	}
	defer serverSession.Wait() //nolint:errcheck // best-effort cleanup

	client := sdk.NewClient(&sdk.Implementation{Name: "riley", Version: "1.0.0"}, nil)
	session, err := client.Connect(ctx, clientTransport, nil)
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
