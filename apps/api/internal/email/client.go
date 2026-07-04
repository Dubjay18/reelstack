package email

import (
	"context"
	"fmt"

	"github.com/resend/resend-go/v2"
)

type Client struct {
	client *resend.Client
	from   string
	appURL string
}

func NewClient(apiKey, from, appURL string) *Client {
	if apiKey == "" {
		return nil
	}
	return &Client{
		client: resend.NewClient(apiKey),
		from:   from,
		appURL: appURL,
	}
}

func (c *Client) Send(ctx context.Context, subject, html, text string, to ...string) error {
	if c == nil {
		return nil
	}
	params := &resend.SendEmailRequest{
		From:    c.from,
		To:      to,
		Subject: subject,
		Html:    html,
		Text:    text,
	}
	_, err := c.client.Emails.SendWithContext(ctx, params)
	if err != nil {
		return fmt.Errorf("resend: %w", err)
	}
	return nil
}

func (c *Client) SendWelcome(ctx context.Context, email, username string) error {
	subject := "Welcome to Reelstack!"
	html := welcomeHTML(username, c.appURL)
	text := welcomePlainText(username, c.appURL)
	return c.Send(ctx, subject, html, text, email)
}

func (c *Client) SendDigest(ctx context.Context, email, username string, notifs []DigestItem) error {
	subject := fmt.Sprintf("Your Reelstack Weekly Digest (%d unread)", len(notifs))
	html := digestHTML(username, notifs, c.appURL)
	text := digestPlainText(username, notifs, c.appURL)
	return c.Send(ctx, subject, html, text, email)
}

type DigestItem struct {
	Type         string
	ActorName    string
	EntityTitle  string
	CreatedAt    string
}

func (c *Client) FromAddress() string {
	return c.from
}
