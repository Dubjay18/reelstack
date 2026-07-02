import React from 'react';
import { StyleSheet, Text, View, ActivityIndicator, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Radius, Typography, Spacing, Shadow } from '@/constants/theme';
import { useWatchlist, useListItems } from '@/lib/hooks/api';
import { EmptyState } from '@/components/ui/EmptyState';
import { MaterialIcons } from '@expo/vector-icons';
import { useMovieDetail } from '@/contexts/MovieDetailContext';

export default function WatchlistScreen() {
  const router = useRouter();
  const { showMovieDetail } = useMovieDetail();
  const { data: watchlistData, isLoading: watchlistLoading, refetch } = useWatchlist();
  const { data: items, isLoading: itemsLoading } = useListItems(watchlistData?.id ?? '');
  const isLoading = watchlistLoading || itemsLoading;
  const watchlistItems = items ?? [];

  const handleItemPress = (item: any) => {
    showMovieDetail({
      id: item.tmdb_id,
      media_type: item.media_type || 'movie',
      title: item.content?.title || '',
      poster_path: item.content?.poster_path || null,
      year: item.content?.release_date?.substring(0, 4) || '',
      vote_average: item.content?.vote_average || 0,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[Typography.displayMd, styles.title]}>Watchlist</Text>
          <Text style={[Typography.bodySm, styles.subtitle]}>
            {watchlistItems.length} {watchlistItems.length === 1 ? 'film' : 'films'} saved
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : watchlistItems.length === 0 ? (
        <EmptyState
          icon="bookmark"
          title="Your watchlist is empty"
          description="Add movies and shows to keep track of what you want to watch."
          buttonText="Browse films"
          onButtonPress={() => router.push('/(tabs)/search')}
        />
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.primary} colors={[Colors.primary]} />
          }
        >
          <View style={styles.grid}>
            {watchlistItems.map((item) => (
              <Pressable
                key={item.id}
                style={styles.gridItem}
                onPress={() => handleItemPress(item)}
              >
                <View style={styles.posterContainer}>
                  {item.content?.poster_path ? (
                    <View style={styles.posterPlaceholder}>
                      <Text style={styles.posterEmoji}>🎬</Text>
                    </View>
                  ) : (
                    <View style={styles.posterPlaceholder}>
                      <MaterialIcons name="movie" size={32} color={Colors.onSurfaceVariant} />
                    </View>
                  )}
                  {item.watched && (
                    <View style={styles.watchedBadge}>
                      <MaterialIcons name="check" size={12} color="#fff" />
                      <Text style={styles.watchedText}>Watched</Text>
                    </View>
                  )}
                </View>
                <Text style={[Typography.bodySm, styles.itemTitle]} numberOfLines={2}>
                  {item.content?.title || `TMDB #${item.tmdb_id}`}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
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
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  backButton: {
    marginRight: Spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: Colors.onSurface,
    fontWeight: '700',
  },
  subtitle: {
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.gutter,
    paddingBottom: 100,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  gridItem: {
    width: '48%',
    marginBottom: Spacing.sm,
  },
  posterContainer: {
    aspectRatio: 2 / 3,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceVariant,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    position: 'relative',
  },
  posterPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterEmoji: {
    fontSize: 32,
  },
  watchedBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(5, 150, 105, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    gap: 2,
  },
  watchedText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
  },
  itemTitle: {
    color: Colors.onSurface,
    marginTop: 4,
    fontWeight: '500',
  },
});
