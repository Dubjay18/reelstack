import type { Href } from 'expo-router';
import type { Notification } from '@/types';

// A notification straight from the API has typed fields (e.g. is_read is a
// boolean); a notification tapped from a push banner arrives as string-only
// key/value pairs (Expo's `data` payload). This union covers both so one
// function can route either.
export type NotificationLike = Partial<Notification> | Record<string, string>;

/**
 * Maps a notification (in-app or a tapped push's data payload) to the route
 * it should open. Shared by the in-app inbox tap handler and the push
 * notification tap handler so the two surfaces never drift apart.
 */
export function getNotificationRoute(item: NotificationLike): Href | null {
  switch (item.type) {
    case 'new_follower':
      if (!item.actor_username) return null;
      return { pathname: '/[username]', params: { username: String(item.actor_username) } } as Href;
    case 'comment_reply':
      if (!item.comment_media_type || item.comment_tmdb_id == null) return null;
      return {
        pathname: '/comments/[type]/[tmdbId]',
        params: { type: String(item.comment_media_type), tmdbId: String(item.comment_tmdb_id) },
      } as Href;
    case 'list_comment':
      if (!item.comment_list_id) return null;
      return { pathname: '/(tabs)/lists/[id]', params: { id: String(item.comment_list_id) } } as Href;
    case 'list_saved':
      if (!item.entity_id) return null;
      return { pathname: '/(tabs)/lists/[id]', params: { id: String(item.entity_id) } } as Href;
    default:
      return null;
  }
}

/** Builds the in-app inbox row text for a notification. */
export function getNotificationText(item: NotificationLike): string {
  const username = item.actor_username ? `@${item.actor_username}` : 'Someone';
  const entityTitle = item.entity_title ? String(item.entity_title) : 'Untitled';

  switch (item.type) {
    case 'new_follower':
      return `${username} started following you`;
    case 'comment_reply':
      return `${username} replied to your comment`;
    case 'list_comment':
      return item.list_comment_type === 'suggestion'
        ? `${username} suggested an addition to "${entityTitle}"`
        : `${username} commented on "${entityTitle}"`;
    case 'list_saved':
      return `${username} saved your list: ${entityTitle}`;
    default:
      return '';
  }
}
