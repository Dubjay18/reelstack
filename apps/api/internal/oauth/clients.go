// Package oauth implements a minimal OAuth 2.1 authorization server (RFC
// 8414 metadata, RFC 7591 dynamic client registration, PKCE-only
// authorization code + refresh token grants) so spec-compliant remote MCP
// clients — Claude Desktop's "Add custom connector" flow in particular —
// can obtain a Bearer token for internal/mcp's /mcp endpoint without a
// human ever pasting a static Personal Access Token into client config.
// This is additive: the existing PAT (internal/mcp.TokenService) and
// internal-JWT (internal/mcp.MintInternalToken) auth paths are untouched.
package oauth

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/url"
	"slices"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
)

// ErrClientNotFound is returned when a client_id doesn't resolve to a
// registered client.
var ErrClientNotFound = errors.New("oauth: client not found")

// ErrInvalidRedirectURI is returned (wrapped, via errors.Is) when a
// registration request's redirect_uris fails validateRedirectURI.
var ErrInvalidRedirectURI = errors.New("oauth: invalid redirect_uri")

// Client is a dynamically-registered OAuth client (RFC 7591). Only public
// clients are supported — no secret is ever issued or stored, since MCP
// clients like Claude Desktop authenticate the token exchange with PKCE
// instead of a client secret.
type Client struct {
	ID           string         `json:"id" db:"id"`
	ClientID     string         `json:"client_id" db:"client_id"`
	ClientName   sql.NullString `json:"-" db:"client_name"`
	RedirectURIs pq.StringArray `json:"redirect_uris" db:"redirect_uris"`
	CreatedAt    string         `json:"created_at" db:"created_at"`
}

// Name returns the client's display name, or "" if none was supplied at
// registration time.
func (c *Client) Name() string {
	return c.ClientName.String
}

// HasRedirectURI reports whether uri was one of the URIs this client
// registered — authorize/token requests must match exactly (no prefix or
// wildcard matching) to prevent redirect_uri substitution attacks.
func (c *Client) HasRedirectURI(uri string) bool {
	return slices.Contains(c.RedirectURIs, uri)
}

type IClientRepository interface {
	Create(ctx context.Context, c *Client) error
	FindByClientID(ctx context.Context, clientID string) (*Client, error)
}

type ClientRepository struct {
	db *sqlx.DB
}

func NewClientRepository(db *sqlx.DB) *ClientRepository {
	return &ClientRepository{db: db}
}

func (r *ClientRepository) Create(ctx context.Context, c *Client) error {
	query := `
		INSERT INTO oauth_clients (id, client_id, client_name, redirect_uris)
		VALUES (:id, :client_id, :client_name, :redirect_uris)
		RETURNING created_at`
	rows, err := r.db.NamedQueryContext(ctx, query, c)
	if err != nil {
		return err
	}
	defer rows.Close()
	if rows.Next() {
		return rows.Scan(&c.CreatedAt)
	}
	return nil
}

func (r *ClientRepository) FindByClientID(ctx context.Context, clientID string) (*Client, error) {
	var c Client
	err := r.db.GetContext(ctx, &c, `
		SELECT id, client_id, client_name, redirect_uris, created_at
		FROM oauth_clients
		WHERE client_id = $1`, clientID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrClientNotFound
		}
		return nil, err
	}
	return &c, nil
}

// ClientService registers and resolves dynamically-registered OAuth
// clients.
type ClientService struct {
	repo IClientRepository
}

func NewClientService(repo IClientRepository) *ClientService {
	return &ClientService{repo: repo}
}

// Register creates a new public client (RFC 7591). name may be empty.
func (s *ClientService) Register(ctx context.Context, name string, redirectURIs []string) (*Client, error) {
	if len(redirectURIs) == 0 {
		return nil, errors.New("oauth: at least one redirect_uri is required")
	}
	for _, uri := range redirectURIs {
		if err := validateRedirectURI(uri); err != nil {
			return nil, err
		}
	}
	c := &Client{
		ID:           uuid.NewString(),
		ClientID:     "rlst_mcp_client_" + uuid.NewString(),
		RedirectURIs: redirectURIs,
	}
	if name != "" {
		c.ClientName = sql.NullString{String: name, Valid: true}
	}
	if err := s.repo.Create(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

func (s *ClientService) Get(ctx context.Context, clientID string) (*Client, error) {
	return s.repo.FindByClientID(ctx, clientID)
}

// validateRedirectURI restricts registered redirect URIs to https:// (a
// real, third-party-verifiable destination) or loopback http:// (RFC 8252,
// for native/CLI clients like Claude Desktop that redirect to a local
// port). Without this, dynamic client registration would let anyone
// register a redirect_uri of their choosing — including a javascript:
// URI, which the consent page would then navigate to directly, running
// attacker script in the logged-in user's session — or any https:// host
// they control, silently handed a valid authorization code once a user
// clicks Approve on a consent screen that (by design, since clients are
// unvetted) can't fully vouch for who's asking.
func validateRedirectURI(raw string) error {
	u, err := url.Parse(raw)
	if err != nil {
		return fmt.Errorf("%w: %q: %v", ErrInvalidRedirectURI, raw, err)
	}
	switch u.Scheme {
	case "https":
		return nil
	case "http":
		host := u.Hostname()
		if host == "127.0.0.1" || host == "::1" || host == "localhost" {
			return nil
		}
		return fmt.Errorf("%w: %q must use https, or http on loopback only", ErrInvalidRedirectURI, raw)
	default:
		return fmt.Errorf("%w: %q must use https (or loopback http)", ErrInvalidRedirectURI, raw)
	}
}
