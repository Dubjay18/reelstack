package mcp

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	sdk "github.com/modelcontextprotocol/go-sdk/mcp"

	"github.com/Dubjay18/reelstack/api/internal/lists"
)

// ListItemInput identifies a title to add to a list.
type ListItemInput struct {
	TMDBID    int    `json:"tmdb_id" jsonschema:"TMDB id of the movie or TV show"`
	MediaType string `json:"media_type" jsonschema:"'movie' or 'tv'"`
	Notes     string `json:"notes,omitempty" jsonschema:"optional note about why this title is on the list"`
}

type CreateListInput struct {
	Title       string          `json:"title" jsonschema:"list title"`
	Description string          `json:"description,omitempty" jsonschema:"optional list description"`
	IsPublic    bool            `json:"is_public,omitempty" jsonschema:"whether the list is publicly visible, defaults to false"`
	Items       []ListItemInput `json:"items,omitempty" jsonschema:"titles to add to the list on creation"`
}

type CreateListOutput struct {
	ID        string `json:"id"`
	Slug      string `json:"slug"`
	URL       string `json:"url"`
	ItemCount int    `json:"item_count"`
}

type AddItemsInput struct {
	ListID string          `json:"list_id" jsonschema:"id of an existing list you own"`
	Items  []ListItemInput `json:"items" jsonschema:"titles to add"`
}

type AddItemsOutput struct {
	Added int `json:"added"`
}

type ListSummary struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	Slug      string `json:"slug"`
	IsPublic  bool   `json:"is_public"`
	ItemCount int    `json:"item_count"`
}

type ListMyListsOutput struct {
	Lists []ListSummary `json:"lists"`
}

// NewToolServer builds a fresh MCP server scoped to userID — called once
// per incoming HTTP request (see NewHTTPHandler), so every tool call is
// bound to whichever user the request's Bearer token resolved to. Every
// tool wraps lists.IListService, the same service backing Reelstack's
// normal REST list endpoints, so ownership checks and business rules are
// never duplicated between the two entry points.
func NewToolServer(userID string, listsSvc lists.IListService, appURL string) *sdk.Server {
	server := sdk.NewServer(&sdk.Implementation{Name: "reelstack", Version: "1.0.0"}, nil)

	sdk.AddTool(server, &sdk.Tool{
		Name:        "create_list",
		Description: "Create a new movie/TV watchlist for the current Reelstack user, optionally seeded with titles.",
		Annotations: &sdk.ToolAnnotations{DestructiveHint: boolPtr(false)},
	}, func(ctx context.Context, req *sdk.CallToolRequest, in CreateListInput) (*sdk.CallToolResult, CreateListOutput, error) {
		list := &lists.List{
			UserID:   userID,
			Title:    in.Title,
			IsPublic: in.IsPublic,
		}
		if in.Description != "" {
			list.Description = &in.Description
		}
		if err := listsSvc.CreateList(ctx, list); err != nil {
			return nil, CreateListOutput{}, fmt.Errorf("create list: %w", err)
		}

		added := 0
		for _, item := range in.Items {
			li := &lists.ListItem{TMDBID: item.TMDBID, MediaType: item.MediaType}
			if item.Notes != "" {
				li.Notes = &item.Notes
			}
			if err := listsSvc.AddItemToList(ctx, list.ID, li, userID); err != nil {
				continue // best-effort: one bad item shouldn't fail the whole list
			}
			added++
		}

		out := CreateListOutput{ID: list.ID, Slug: list.Slug, URL: appURL + "/lists/" + list.ID, ItemCount: added}
		return nil, out, nil
	})

	sdk.AddTool(server, &sdk.Tool{
		Name:        "add_items_to_list",
		Description: "Add one or more titles to a list the current user already owns.",
		Annotations: &sdk.ToolAnnotations{DestructiveHint: boolPtr(false)},
	}, func(ctx context.Context, req *sdk.CallToolRequest, in AddItemsInput) (*sdk.CallToolResult, AddItemsOutput, error) {
		added := 0
		for _, item := range in.Items {
			li := &lists.ListItem{TMDBID: item.TMDBID, MediaType: item.MediaType}
			if item.Notes != "" {
				li.Notes = &item.Notes
			}
			if err := listsSvc.AddItemToList(ctx, in.ListID, li, userID); err != nil {
				if errors.Is(err, lists.ErrForbidden) || errors.Is(err, lists.ErrNotFound) {
					return nil, AddItemsOutput{}, err
				}
				continue
			}
			added++
		}
		return nil, AddItemsOutput{Added: added}, nil
	})

	sdk.AddTool(server, &sdk.Tool{
		Name:        "list_my_lists",
		Description: "List the current user's existing lists, so you don't create duplicates.",
		Annotations: &sdk.ToolAnnotations{ReadOnlyHint: true},
	}, func(ctx context.Context, req *sdk.CallToolRequest, in any) (*sdk.CallToolResult, ListMyListsOutput, error) {
		userLists, err := listsSvc.GetListsByUserID(ctx, userID)
		if err != nil {
			return nil, ListMyListsOutput{}, err
		}
		out := ListMyListsOutput{Lists: make([]ListSummary, 0, len(userLists))}
		for _, l := range userLists {
			out.Lists = append(out.Lists, ListSummary{ID: l.ID, Title: l.Title, Slug: l.Slug, IsPublic: l.IsPublic, ItemCount: l.ItemCount})
		}
		return nil, out, nil
	})

	return server
}

// NewHTTPHandler mounts the MCP server behind the Streamable HTTP
// transport, building a fresh per-request Server scoped to whichever user
// AuthMiddleware resolved the request's Bearer token to. Wrap the returned
// handler with AuthMiddleware before serving it.
func NewHTTPHandler(listsSvc lists.IListService, appURL string) http.Handler {
	return sdk.NewStreamableHTTPHandler(func(r *http.Request) *sdk.Server {
		userID, _ := UserIDFromContext(r.Context())
		return NewToolServer(userID, listsSvc, appURL)
	}, nil)
}

func boolPtr(b bool) *bool { return &b }
