import { UserPlus, ListPlus, Bookmark, MessageCircle, Bell, type LucideIcon } from 'lucide-react'
import type { Notification } from '@/types'

interface NotificationCopy {
  text: string
  href: string
  Icon: LucideIcon
}

// Single source of truth for how each notification type renders, shared by
// the sidebar bell dropdown and the full notifications page so they can
// never drift out of sync (list_saved and comment_reply used to render a
// blank — or, after tightening this into a switch, crash the page — because
// page.tsx and notification-bell.tsx each separately handled only two of
// the four real backend types and forgot the others).
//
// Always returns a value (never undefined): the backend's notification
// `type` is a plain DB string, not something TypeScript can guarantee
// matches this union, so an unrecognized value falls through to a generic
// fallback instead of crashing the page again.
export function getNotificationCopy(n: Notification): NotificationCopy {
  switch (n.type) {
    case 'new_follower':
      return { text: `@${n.actor_username} started following you`, href: `/${n.actor_username}`, Icon: UserPlus }
    case 'list_created':
      return {
        text: `@${n.actor_username} created a list: ${n.entity_title}`,
        href: `/lists/${n.entity_id}`,
        Icon: ListPlus,
      }
    case 'list_saved':
      return {
        text: `@${n.actor_username} saved your list: ${n.entity_title}`,
        href: `/lists/${n.entity_id}`,
        Icon: Bookmark,
      }
    case 'comment_reply': {
      const preview = n.entity_title ? `: "${n.entity_title}"` : ''
      const href =
        n.comment_tmdb_id != null ? `/movie/${n.comment_tmdb_id}?type=${n.comment_media_type ?? 'movie'}` : '/'
      return { text: `@${n.actor_username} replied to your comment${preview}`, href, Icon: MessageCircle }
    }
    default:
      return { text: `@${n.actor_username} did something`, href: '/', Icon: Bell }
  }
}

// Relative time ("2h ago", "3d ago") — no date library is installed in
// apps/web, and this is the only place that needs it.
export function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

// Buckets notifications (already sorted newest-first by the API) into
// Today / This week / Earlier sections for date-grouped rendering.
export function groupByRecency(notifications: Notification[]) {
  const now = Date.now()
  const startOfToday = new Date().setHours(0, 0, 0, 0)
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000

  const groups: { label: string; items: Notification[] }[] = [
    { label: 'Today', items: [] },
    { label: 'This week', items: [] },
    { label: 'Earlier', items: [] },
  ]

  for (const n of notifications) {
    const t = new Date(n.created_at).getTime()
    if (t >= startOfToday) groups[0].items.push(n)
    else if (t >= weekAgo) groups[1].items.push(n)
    else groups[2].items.push(n)
  }

  return groups.filter((g) => g.items.length > 0)
}
