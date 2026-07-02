import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { Colors, Radius, Typography, Spacing, Shadow } from '@/constants/theme';
import { useUserLists } from '@/lib/hooks/api';
import { useAuth } from '@/contexts/AuthContext';
import { ListCard } from '@/components/ui/ListCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { MaterialIcons } from '@expo/vector-icons';

export default function ListsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filterIndex, setFilterIndex] = useState(0); // 0: All, 1: Public, 2: Private
  const AnyFlashList = FlashList as any;

  const { data: lists, isLoading, isRefetching, refetch } = useUserLists();

  const handleRefresh = async () => {
    queryClient.invalidateQueries({ queryKey: ['lists'] });
  };

  const getFilteredLists = () => {
    if (!lists) return [];
    const filtered = filterIndex === 1
      ? lists.filter((l) => l.is_public)
      : filterIndex === 2
        ? lists.filter((l) => !l.is_public)
        : lists;
    // Sort: watchlist first, then by created_at desc
    return [...filtered].sort((a, b) => {
      if (a.is_watchlist) return -1;
      if (b.is_watchlist) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  const filteredLists = getFilteredLists();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[Typography.displayMd, styles.title]}>My Lists</Text>
        <Pressable
          style={styles.addButton}
          onPress={() => router.push('/(tabs)/lists/new')}
        >
          <MaterialIcons name="add" size={24} color={Colors.onPrimary} />
        </Pressable>
      </View>

      {/* Segmented Control */}
      <View style={styles.filterWrapper}>
        <View style={styles.segmentedContainer}>
          {['All', 'Public', 'Private'].map((label, idx) => (
            <Pressable
              key={label}
              onPress={() => setFilterIndex(idx)}
              style={[
                styles.segmentedItem,
                filterIndex === idx && styles.segmentedItemActive,
              ]}
            >
              <Text
                style={[
                  Typography.caption,
                  styles.segmentedText,
                  filterIndex === idx && styles.segmentedTextActive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* List content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : filteredLists.length > 0 ? (
        <View style={styles.listWrapper}>
          <AnyFlashList
            data={filteredLists}
            estimatedItemSize={140}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={handleRefresh}
                tintColor={Colors.primary}
                colors={[Colors.primary]}
              />
            }
            keyExtractor={(item: any) => item.id}
            renderItem={({ item }: { item: any }) => (
              <ListCard
                list={item}
                username={user?.username || 'user'}
                onPress={() => {
                  if (item.is_watchlist) {
                    router.push('/(tabs)/lists/watchlist');
                  } else {
                    router.push(`/(tabs)/lists/${item.id}`);
                  }
                }}
              />
            )}
          />
        </View>
      ) : (
        <View style={styles.emptyWrapper}>
          <EmptyState
            icon="movie-filter"
            title={filterIndex === 0 ? "No lists created yet" : filterIndex === 1 ? "No public lists" : "No private lists"}
            description="Create custom lists to group your watched titles and track completions."
            buttonText={filterIndex === 0 ? "Create new list" : undefined}
            onButtonPress={() => router.push('/(tabs)/lists/new')}
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
  header: {
    paddingTop: 60,
    paddingHorizontal: Spacing.gutter,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    color: Colors.onSurface,
    fontWeight: '700',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.card,
  },
  filterWrapper: {
    paddingHorizontal: Spacing.gutter,
    marginBottom: Spacing.md,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.md,
    padding: 2,
    borderWidth: 1,
    borderColor: 'rgba(60, 73, 71, 0.3)',
  },
  segmentedItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    borderRadius: Radius.sm,
  },
  segmentedItemActive: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: 'rgba(79, 219, 200, 0.2)',
  },
  segmentedText: {
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  segmentedTextActive: {
    color: Colors.primary,
  },
  listWrapper: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.gutter,
    paddingBottom: Spacing.xl,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.gutter,
  },
});
