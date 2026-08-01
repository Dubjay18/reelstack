package email

import (
	"fmt"
	"strings"
)

// Shared "comic panel" visual language for all Reelstack transactional emails.
// Colors are pulled directly from the web app's "Amber Reel" theme
// (apps/web/tailwind.config.ts) so the comic treatment stays on-brand.
const (
	colorBg     = "#17120e" // page background
	colorPanel  = "#1e1712" // panel/card surface
	colorInk    = "#1c1207" // near-black outline/shadow ink
	colorAmber  = "#eb9c3e" // brand accent
	colorAmber2 = "#f0b168" // lighter amber
	colorRust   = "#d9552b" // terracotta accent2
	colorCream  = "#f7ecdf" // light text on dark
	colorMuted  = "#b9a58e" // muted body text
)

// emailShell wraps inner content in the shared comic-panel chrome: dark
// halftone-dotted background, thick ink-bordered panel with a hard offset
// "drop shadow" (classic comic-panel edge), and a footer note.
func emailShell(badge, headline, inner, footerNote string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:%s;">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background-color:%s;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:%s;background-image:radial-gradient(circle, rgba(235,156,62,0.16) 1px, transparent 1.6px);background-size:10px 10px;border:4px solid %s;border-radius:18px;box-shadow:7px 7px 0 %s;">
<tr><td style="padding:36px 32px;">
<div style="display:inline-block;padding:4px 12px;margin:0 0 14px;background-color:%s;color:%s;font-family:Georgia,'Arial Black',sans-serif;font-weight:900;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;border-radius:6px;border:2px solid %s;">%s</div>
<h1 style="margin:0 0 16px;font-family:Georgia,'Arial Black',sans-serif;font-weight:900;font-size:32px;line-height:1.15;letter-spacing:-0.5px;text-transform:uppercase;color:%s;text-shadow:2px 2px 0 %s;">%s</h1>
%s
</td></tr>
</table>
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:520px;">
<tr><td style="padding:20px 12px 0;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;color:%s;">%s</td></tr>
</table>
</td></tr>
</table>
</body></html>`,
		colorBg, colorBg, colorPanel, colorInk, colorAmber,
		colorAmber, colorInk, colorInk, badge,
		colorCream, colorRust, headline,
		inner,
		colorMuted, footerNote,
	)
}

// speechBubbleCTA renders a comic-style speech-bubble button with a small
// pointer "tail", used as the primary call-to-action across templates.
func speechBubbleCTA(url, label string) string {
	return fmt.Sprintf(`<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 4px;">
<tr><td style="background-color:%s;border:3px solid %s;border-radius:14px 14px 14px 2px;padding:14px 26px;">
<a href="%s" style="display:block;font-family:Georgia,'Arial Black',sans-serif;font-weight:900;font-size:17px;letter-spacing:0.5px;text-transform:uppercase;color:%s;text-decoration:none;">%s &rarr;</a>
</td></tr>
</table>`, colorAmber, colorInk, url, colorInk, label)
}

func welcomeHTML(username, appURL string) string {
	inner := fmt.Sprintf(`<p style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:16px;line-height:1.6;color:%s;">Hey <strong style="color:%s;">%s</strong> &mdash; you're officially part of the crew.</p>
<p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:16px;line-height:1.6;color:%s;">Start curating your personal film and TV watchlists, follow other curators, and discover what to watch next.</p>
%s`, colorCream, colorAmber2, username, colorMuted, speechBubbleCTA(appURL, "Let's Roll!"))

	return emailShell("💥 New Account", "Welcome to Reelstack!", inner,
		"If you didn't create this account, you can safely ignore this email.")
}

func welcomePlainText(username, appURL string) string {
	return fmt.Sprintf(`Welcome to Reelstack, %s!

You're all set to start curating your personal film and TV watchlists. Follow other curators, save their lists, and discover what to watch next.

Get started: %s

If you didn't create this account, you can safely ignore this email.`, username, appURL)
}

func digestHTML(username string, notifs []DigestItem, appURL string) string {
	var items strings.Builder
	for i, n := range notifs {
		border := fmt.Sprintf("border-bottom:2px dashed %s;", colorInk)
		if i == len(notifs)-1 {
			border = ""
		}
		fmt.Fprintf(&items, `<tr><td style="padding:12px 4px;%s font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;color:%s;">★ %s</td></tr>`, border, colorCream, digestLine(n))
	}
	inner := fmt.Sprintf(`<p style="margin:0 0 4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:16px;line-height:1.6;color:%s;">Hey <strong style="color:%s;">%s</strong> &mdash; here's what you missed this week:</p>
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="margin-top:14px;">%s</table>
%s`, colorCream, colorAmber2, username, items.String(), speechBubbleCTA(appURL+"/notifications", "See It All!"))

	return emailShell("📰 Weekly Digest", "Your Weekly Digest", inner,
		"You received this because you have unread notifications on Reelstack.")
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
	case "comment_reply":
		return fmt.Sprintf("%s replied to your comment", n.ActorName)
	case "list_comment":
		if n.SubType == "suggestion" {
			return fmt.Sprintf("%s suggested an addition to your list", n.ActorName)
		}
		return fmt.Sprintf("%s commented on your list", n.ActorName)
	default:
		return fmt.Sprintf("New activity from %s", n.ActorName)
	}
}

func passwordResetHTML(username, resetURL string) string {
	inner := fmt.Sprintf(`<p style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:16px;line-height:1.6;color:%s;">Hey <strong style="color:%s;">%s</strong> &mdash; we heard you need a fresh password.</p>
<p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:16px;line-height:1.6;color:%s;">Tap the button below to choose a new one. This link expires in 1 hour.</p>
%s`, colorCream, colorAmber2, username, colorMuted, speechBubbleCTA(resetURL, "Reset It!"))

	return emailShell("🔑 Password Reset", "Reset Your Password", inner,
		"If you didn't request this, you can safely ignore this email &mdash; your password won't change.")
}

func passwordResetPlainText(username, resetURL string) string {
	return fmt.Sprintf(`Reset your Reelstack password, %s

We heard you need a fresh password. Use the link below to choose a new one. This link expires in 1 hour.

Reset your password: %s

If you didn't request this, you can safely ignore this email — your password won't change.`, username, resetURL)
}

func verificationHTML(username, verifyURL string) string {
	inner := fmt.Sprintf(`<p style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:16px;line-height:1.6;color:%s;">Hey <strong style="color:%s;">%s</strong> &mdash; one last step before you're fully in.</p>
<p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:16px;line-height:1.6;color:%s;">Confirm this is really your email address to unlock the full Reelstack experience.</p>
%s`, colorCream, colorAmber2, username, colorMuted, speechBubbleCTA(verifyURL, "Verify Me!"))

	return emailShell("✅ Verify Email", "Verify Your Email", inner,
		"If you didn't create a Reelstack account, you can safely ignore this email.")
}

func verificationPlainText(username, verifyURL string) string {
	return fmt.Sprintf(`Verify your Reelstack email, %s

One last step before you're fully in. Confirm this is really your email address to unlock the full Reelstack experience.

Verify your email: %s

If you didn't create a Reelstack account, you can safely ignore this email.`, username, verifyURL)
}
