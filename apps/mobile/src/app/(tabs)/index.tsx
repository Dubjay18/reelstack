import React from 'react';
import { StyleSheet, Text, View, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { useTrendingContent, useUserLists } from '@/lib/hooks/api';
import { useAuth } from '@/contexts/AuthContext';
import { HorizontalFilmRail } from '@/components/ui/HorizontalFilmRail';
import { ListCard } from '@/components/ui/ListCard';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { MaterialIcons } from '@expo/vector-icons';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { 
    data: trending, 
    isLoading: isTrendingLoading, 
    isRefetching: isTrendingRefetching 
  } = useTrendingContent();

  const { 
    data: lists, 
    isLoading: isListsLoading, 
    isRefetching: isListsRefetching,
    refetch: refetchLists 
  } = useUserLists();

  const isRefreshing = isTrendingRefetching || isListsRefetching;

  const handleRefresh = async () => {
    queryClient.invalidateQueries({ queryKey: ['trending'] });
    queryClient.invalidateQueries({ queryKey: ['lists'] });
  };

  const previewLists = lists ? lists.slice(0, 4) : [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={Colors.primary}
          colors={[Colors.primary]}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[Typography.caption, styles.welcome]}>Welcome back,</Text>
          <Text style={[Typography.displayMd, styles.username]}>@{user?.username || 'user'}</Text>
        </View>
        <Pressable 
          onPress={() => router.push('/(tabs)/profile')} 
          style={styles.avatarButton}
        >
          <MaterialIcons name="account-circle" size={32} color={Colors.primary} />
        </Pressable>
      </View>

      {/* Search trigger box */}
      <Pressable 
        onPress={() => router.push('/(tabs)/search')}
        style={styles.searchShell}
      >
        <MaterialIcons name="search" size={20} color={Colors.onSurfaceVariant} style={styles.searchIcon} />
        <Text style={[Typography.bodyLg, styles.searchText]}>Search movies & TV shows...</Text>
      </Pressable>

      {/* Trending Rail */}
      {isTrendingLoading ? (
        <View style={styles.railSkeletonContainer}>
          <Text style={[Typography.heading, styles.sectionTitle]}>Trending Now</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalSkeleton}>
            <View style={styles.skeletonWrapper}><SkeletonCard variant="poster" width={120} /></View>
            <View style={styles.skeletonWrapper}><SkeletonCard variant="poster" width={120} /></View>
            <View style={styles.skeletonWrapper}><SkeletonCard variant="poster" width={120} /></View>
          </ScrollView>
        </View>
      ) : trending && trending.length > 0 ? (
        <HorizontalFilmRail
          title="Trending Now"
          data={trending}
          onItemPress={(item) => router.push(`/(tabs)/search?q=${encodeURIComponent(item.title || item.name)}`)}
        />
      ) : null}

      {/* Lists Section */}
      <View style={styles.listsSection}>
        <View style={styles.sectionHeader}>
          <Text style={[Typography.heading, styles.sectionTitle]}>Your Active Lists</Text>
          {lists && lists.length > 4 && (
            <Pressable onPress={() => router.push('/(tabs)/lists')}>
              <Text style={[Typography.caption, styles.viewAll]}>View All</Text>
            </Pressable>
          )}
        </View>

        {isListsLoading ? (
          <View>
            <SkeletonCard variant="list" />
            <SkeletonCard variant="list" />
          </View>
        ) : previewLists.length > 0 ? (
          <View>
            {previewLists.map((list) => (
              <ListCard
                key={list.id}
                list={list}
                username={user?.username || 'user'}
                onPress={() => router.push(`/(tabs)/lists/${list.id}`)}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            icon="movie-filter"
            title="No lists created yet"
            description="Create custom lists to group your watched titles and track completions."
            buttonText="Create my first list"
            onButtonPress={() => router.push('/(tabs)/lists/new')}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    paddingTop: 60,
    paddingBottom: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.gutter,
    marginBottom: Spacing.md,
  },
  welcome: {
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  username: {
    color: Colors.onSurface,
    fontFamily: 'HankenGrotesk_700Bold',
    fontSize: 26,
  },
  avatarButton: {
    padding: 4,
  },
  searchShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(60, 73, 71, 0.3)',
    borderRadius: Radius.md,
    height: 48,
    marginHorizontal: Spacing.gutter,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.md,
  },
  searchIcon: {
    marginRight: Spacing.xs,
  },
  searchText: {
    color: Colors.onSurfaceVariant,
    opacity: 0.6,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.gutter,
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    color: Colors.onSurface,
    fontWeight: '600',
  },
  viewAll: {
    color: Colors.primary,
    fontWeight: '600',
  },
  listsSection: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.gutter,
  },
  railSkeletonContainer: {
    marginVertical: Spacing.md,
  },
  horizontalSkeleton: {
    paddingHorizontal: Spacing.gutter - 8,
  },
  skeletonWrapper: {
    paddingHorizontal: 8,
  },
});
