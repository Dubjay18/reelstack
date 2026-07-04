package email

import (
	"fmt"
	"strings"
)

func welcomeHTML(username, appURL string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:32px;background:#f5f5f5">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px">
<h1 style="font-size:24px;margin:0 0 8px">Welcome to Reelstack, %s!</h1>
<p style="color:#555;line-height:1.6">You're all set to start curating your personal film and TV watchlists. Follow other curators, save their lists, and discover what to watch next.</p>
<a href="%s" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#000;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Explore Reelstack</a>
<p style="color:#999;font-size:12px;margin-top:24px">If you didn't create this account, you can safely ignore this email.</p>
</div></body></html>`, username, appURL)
}

func welcomePlainText(username, appURL string) string {
	return fmt.Sprintf(`Welcome to Reelstack, %s!

You're all set to start curating your personal film and TV watchlists. Follow other curators, save their lists, and discover what to watch next.

Get started: %s

If you didn't create this account, you can safely ignore this email.`, username, appURL)
}

func digestHTML(username string, notifs []DigestItem, appURL string) string {
	var items strings.Builder
	for _, n := range notifs {
		line := digestLine(n)
		items.WriteString(fmt.Sprintf(`<tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#333">%s</td></tr>`, line))
	}
	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:32px;background:#f5f5f5">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px">
<h1 style="font-size:20px;margin:0 0 8px">Your Weekly Digest, %s</h1>
<p style="color:#555;margin:0 0 16px">Here's what you missed this week:</p>
<table style="width:100%%;border-collapse:collapse">%s</table>
<a href="%s/notifications" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#000;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">View All Notifications</a>
<p style="color:#999;font-size:12px;margin-top:24px">You received this because you have unread notifications on Reelstack.</p>
</div></body></html>`, username, items.String(), appURL)
}

func digestPlainText(username string, notifs []DigestItem, appURL string) string {
	var lines []string
	for _, n := range notifs {
		lines = append(lines, fmt.Sprintf("  - %s", digestLine(n)))
	}
	return fmt.Sprintf(`Your Weekly Digest, %s

Here's what you missed this week:

%s

View all: %s/notifications

You received this because you have unread notifications on Reelstack.`, username, strings.Join(lines, "\n"), appURL)
}

func digestLine(n DigestItem) string {
	switch n.Type {
	case "new_follower":
		return fmt.Sprintf("%s followed you", n.ActorName)
	case "list_created":
		return fmt.Sprintf("%s created a new list", n.ActorName)
	case "list_saved":
		title := n.EntityTitle
		if title == "" {
			title = "a list"
		}
		return fmt.Sprintf("%s saved %s", n.ActorName, title)
	default:
		return fmt.Sprintf("New activity from %s", n.ActorName)
	}
}
