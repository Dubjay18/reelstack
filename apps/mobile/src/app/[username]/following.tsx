import React from 'react';
import { StyleSheet, Text, View, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '@/constants/theme';
import { usePublicProfile, useFollowing } from '@/lib/hooks/api';
import { FollowButton } from '@/components/ui/FollowButton';
import { EmptyState } from '@/components/ui/EmptyState';
import type { UserProfile } from '@/types';

const AnyFlashList = FlashList as any;

export default function FollowingScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const { data: profile } = usePublicProfile(username || '');
  const { data: following, isLoading } = useFollowing(profile?.id || '');

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
        </Pressable>
        <Text style={[Typography.heading, styles.headerTitle]}>Following</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <View style={styles.listWrapper}>
          <AnyFlashList
            data={following ?? []}
            estimatedItemSize={72}
            contentContainerStyle={styles.listContent}
            keyExtractor={(item: UserProfile) => item.id}
            renderItem={({ item }: { item: UserProfile }) => {
              const avatarUrl = item.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${item.username}`;
              return (
                <Pressable
                  onPress={() => router.push({ pathname: '/[username]', params: { username: item.username } })}
                  style={styles.row}
                >
                  <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
                  <View style={styles.info}>
                    <Text style={[Typography.bodyLg, styles.username]} numberOfLines={1}>@{item.username}</Text>
                    {item.bio ? (
                      <Text style={[Typography.caption, styles.bio]} numberOfLines={1}>{item.bio}</Text>
                    ) : null}
                  </View>
                  <Pressable onPress={(e) => e.stopPropagation()}>
                    <FollowButton targetUserId={item.id} targetUsername={item.username} variant="compact" />
                  </Pressable>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyWrapper}>
                <EmptyState
                  icon="people-outline"
                  title="Not following anyone yet"
                  description="Curators this user follows will show up here."
                />
              </View>
            }
          />
        </View>
      )}
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
  listWrapper: {
    flex: 1,
  },
  listContent: {
    padding: Spacing.gutter,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(235, 156, 62, 0.1)',
    backgroundColor: Colors.surfaceContainerLow,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  username: {
    color: Colors.onSurface,
    fontWeight: '600',
  },
  bio: {
    color: Colors.onSurfaceVariant,
    opacity: 0.7,
    marginTop: 2,
  },
  emptyWrapper: {
    paddingTop: 60,
  },
});
