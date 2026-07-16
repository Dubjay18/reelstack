import React from 'react';
import { StyleSheet, Text, View, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing } from '@/constants/theme';
import { useLeaderboard } from '@/lib/hooks/api';
import { ScoreBadge } from '@/components/ui/ScoreBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import type { LeaderboardEntry } from '@/types';

const AnyFlashList = FlashList as any;

function getRankColors(rank: number) {
  if (rank === 1) return { bg: 'rgba(245, 158, 11, 0.3)', color: '#f59e0b' };
  if (rank === 2) return { bg: 'rgba(161, 161, 170, 0.2)', color: '#d4d4d8' };
  if (rank === 3) return { bg: 'rgba(249, 115, 22, 0.2)', color: '#fb923c' };
  return { bg: Colors.surfaceContainerLow, color: Colors.onSurfaceVariant };
}

function getRankIcon(rank: number): keyof typeof MaterialIcons.glyphMap | null {
  if (rank === 1) return 'military-tech';
  if (rank === 2) return 'emoji-events';
  if (rank === 3) return 'star';
  return null;
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useLeaderboard(50, 0);
  const curators = data?.curators ?? [];

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
        </Pressable>
        <Text style={[Typography.heading, styles.headerTitle]}>Leaderboard</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <View style={styles.listWrapper}>
          <AnyFlashList
            data={curators}
            estimatedItemSize={72}
            contentContainerStyle={styles.listContent}
            refreshing={isRefetching}
            onRefresh={refetch}
            keyExtractor={(item: LeaderboardEntry) => item.user_id}
            renderItem={({ item, index }: { item: LeaderboardEntry; index: number }) => {
              const rank = item.rank || index + 1;
              const rankColors = getRankColors(rank);
              const rankIcon = getRankIcon(rank);
              const avatarUrl = item.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${item.username}`;

              return (
                <Pressable
                  onPress={() => router.push({ pathname: '/[username]', params: { username: item.username } })}
                  style={styles.row}
                >
                  <View style={[styles.rankBadge, { backgroundColor: rankColors.bg }]}>
                    {rankIcon ? (
                      <MaterialIcons name={rankIcon} size={16} color={rankColors.color} />
                    ) : (
                      <Text style={[styles.rankText, { color: rankColors.color }]}>{rank}</Text>
                    )}
                  </View>

                  <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />

                  <View style={styles.info}>
                    <View style={styles.nameRow}>
                      <Text style={[Typography.bodyLg, styles.username]} numberOfLines={1}>
                        {item.username}
                      </Text>
                      {rank <= 3 && <ScoreBadge score={item.score} size="sm" />}
                    </View>
                    <Text style={[Typography.caption, styles.statsText]}>
                      {item.followers_count} followers · {item.list_count} lists
                    </Text>
                  </View>

                  <Text style={styles.scoreText}>{item.score}</Text>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyWrapper}>
                <EmptyState
                  icon="emoji-events"
                  title="No curators yet"
                  description="Create public lists and gain followers to earn a reputation score and climb the leaderboard."
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
    paddingBottom: Spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerLow,
    backgroundColor: 'rgba(28, 27, 29, 0.3)',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 12,
    fontWeight: '700',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(79, 219, 200, 0.1)',
    backgroundColor: Colors.surfaceContainerLow,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  username: {
    color: Colors.onSurface,
    fontWeight: '600',
    flexShrink: 1,
  },
  statsText: {
    color: Colors.onSurfaceVariant,
    opacity: 0.7,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  scoreText: {
    color: Colors.onSurface,
    fontFamily: 'JetBrainsMono_700Bold',
    fontWeight: '700',
    fontSize: 15,
  },
  emptyWrapper: {
    paddingTop: 60,
    paddingHorizontal: Spacing.gutter,
  },
});
