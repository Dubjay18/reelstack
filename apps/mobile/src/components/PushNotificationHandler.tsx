import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/lib/hooks/api';
import { getNotificationRoute } from '@/lib/notificationRouting';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Wires up push notification tap-to-navigate (foreground, backgrounded, and
 * killed-app cases) and keeps the app icon badge in sync with the unread
 * count already computed by the in-app inbox poll.
 */
export function PushNotificationHandler() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: notifications } = useNotifications(!!user);

  useEffect(() => {
    const handleResponse = (response: Notifications.NotificationResponse) => {
      const route = getNotificationRoute(response.notification.request.content.data as Record<string, string>);
      if (route) {
        router.push(route);
      }
    };

    // App was backgrounded/foreground when the notification was tapped.
    const sub = Notifications.addNotificationResponseReceivedListener(handleResponse);

    // App was killed and opened via a notification tap.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleResponse(response);
    });

    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0;
    Notifications.setBadgeCountAsync(unreadCount).catch(() => {});
  }, [user, notifications]);

  return null;
}
