package pushnotify

import (
	"fmt"
	"strconv"

	"github.com/Dubjay18/reelstack/api/internal/notifications"
)

// titleAndBody builds the push banner copy for a notification. Mirrors the
// in-app copy in the mobile inbox (apps/mobile/src/lib/notificationRouting.ts)
// — the two necessarily duplicate each other since they render on different
// surfaces (push banner vs. in-app list).
func titleAndBody(n *notifications.Notification) (title, body string) {
	username := strVal(n.ActorUsername)
	entityTitle := strVal(n.EntityTitle)

	switch n.Type {
	case "new_follower":
		return "New follower", fmt.Sprintf("@%s started following you", username)
	case "comment_reply":
		return "New reply", fmt.Sprintf("@%s replied to your comment", username)
	case "list_comment":
		title := "New comment"
		if strVal(n.ListCommentType) == "suggestion" {
			title = "New suggestion"
		}
		return title, fmt.Sprintf("@%s commented on \"%s\"", username, entityTitle)
	case "list_saved":
		return "List saved", fmt.Sprintf("@%s saved your list \"%s\"", username, entityTitle)
	default:
		return "", ""
	}
}

// dataPayload builds the tap-through payload. Field names match Notification's
// JSON tags so the mobile client can feed a tapped push's data straight into
// the same route-mapping function used for in-app taps.
func dataPayload(n *notifications.Notification) map[string]string {
	data := map[string]string{"type": n.Type}

	if n.ActorUsername != nil {
		data["actor_username"] = *n.ActorUsername
	}
	if n.EntityID != nil {
		data["entity_id"] = *n.EntityID
	}
	if n.CommentTMDBID != nil {
		data["comment_tmdb_id"] = strconv.Itoa(*n.CommentTMDBID)
	}
	if n.CommentMediaType != nil {
		data["comment_media_type"] = *n.CommentMediaType
	}
	if n.CommentListID != nil {
		data["comment_list_id"] = *n.CommentListID
	}

	return data
}

func strVal(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
