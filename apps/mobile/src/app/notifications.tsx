import React from 'react';
import { StyleSheet, Text, View, Pressable, ActivityIndicator, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Colors, Radius, Typography, Spacing } from '@/constants/theme';
import { useToast } from '@/contexts/ToastContext';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/lib/hooks/api';
import { MaterialIcons } from '@expo/vector-icons';

export default function NotificationsScreen() {
  const { isAuthorized } = useAuthGuard();
  const router = useRouter();
  const { showToast } = useToast();

  if (!isAuthorized) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }
  const { data: notifications, isLoading, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  const handleMarkAllRead = () => {
    markAllRead.mutate(undefined, {
      onSuccess: () => showToast('All notifications marked as read', 'success'),
      onError: () => showToast('Failed to mark notifications read', 'error')
    });
  };

  const handleNotificationPress = (item: any) => {
    // Mark as read
    if (!item.is_read) {
      markRead.mutate(item.id);
    }

    // Navigate based on type
    if (item.type === 'new_follower') {
      router.push({
        pathname: '/[username]',
        params: { username: item.actor_username }
      });
    } else if (item.type === 'list_created') {
      router.push({
        pathname: '/(tabs)/lists/[id]',
        params: { id: item.entity_id }
      });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
        </Pressable>
        <Text style={[Typography.heading, styles.headerTitle]}>Notifications</Text>
        {unreadCount > 0 ? (
          <Pressable onPress={handleMarkAllRead} style={styles.textButton}>
            <Text style={styles.textButtonText}>Clear All</Text>
          </Pressable>
        ) : (
          <View style={{ width: 48 }} />
        )}
      </View>

      {/* Notifications list */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={isLoading}
        onRefresh={refetch}
        renderItem={({ item }) => {
          const avatarUrl = item.actor_avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${item.actor_username}`;
          const isUnread = !item.is_read;

          let notifText = '';
          if (item.type === 'new_follower') {
            notifText = `@${item.actor_username} started following you`;
          } else if (item.type === 'list_created') {
            notifText = `@${item.actor_username} created a list: ${item.entity_title || 'Untitled'}`;
          }

          return (
            <Pressable
              onPress={() => handleNotificationPress(item)}
              style={[
                styles.notifRow,
                isUnread && styles.unreadRow
              ]}
            >
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatar}
                contentFit="cover"
              />
              <View style={styles.textContainer}>
                <Text style={[
                  Typography.bodySm,
                  styles.notifText,
                  isUnread && styles.unreadText
                ]}>
                  {notifText}
                </Text>
                <Text style={[Typography.caption, styles.timeText]}>
                  {new Date(item.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              {isUnread && (
                <View style={styles.unreadDot} />
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="notifications-none" size={48} color={Colors.onSurfaceVariant} style={{ opacity: 0.3, marginBottom: Spacing.sm }} />
            <Text style={[Typography.bodyLg, styles.emptyTitle]}>All caught up!</Text>
            <Text style={[Typography.bodySm, styles.emptyText]}>
              No new alerts right now. When followers follow you or creators post public lists, they'll show up here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  headerBar: {
    paddingTop: 50,
    height: 94,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.gutter,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerLow,
    backgroundColor: Colors.background,
  },
  headerTitle: {
    color: Colors.onSurface,
    fontWeight: '600',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textButton: {
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  textButtonText: {
    color: Colors.primary,
    fontFamily: 'monospace',
    fontWeight: '700',
    fontSize: 12,
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerLow,
    backgroundColor: Colors.background,
  },
  unreadRow: {
    backgroundColor: 'rgba(79, 219, 200, 0.04)',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(79, 219, 200, 0.1)',
    backgroundColor: Colors.surfaceContainerLow,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  notifText: {
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
  },
  unreadText: {
    color: Colors.onSurface,
    fontWeight: '600',
  },
  timeText: {
    color: Colors.onSurfaceVariant,
    opacity: 0.5,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: Spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: Colors.onSurface,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyText: {
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 20,
  },
});
