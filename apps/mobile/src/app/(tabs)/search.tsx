import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Radius, Typography, Spacing, Shadow } from '@/constants/theme';
import { SearchInput } from '@/components/ui/SearchInput';
import { GenrePills } from '@/components/ui/GenrePills';
import { PosterGrid } from '@/components/ui/PosterGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSearchContent, useTrendingContent } from '@/lib/hooks/api';
import { MaterialIcons } from '@expo/vector-icons';
import { useMovieDetail } from '@/contexts/MovieDetailContext';

const GENRES = ['Action', 'Comedy', 'Drama', 'Thriller', 'Sci-Fi', 'Horror', 'Romance', 'Documentary'];

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const router = useRouter();
  const [query, setQuery] = useState(params.q || '');
  const [debouncedQuery, setDebouncedQuery] = useState(params.q || '');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  
  const { showMovieDetail } = useMovieDetail();

  // Debounce search query
  useEffect(() => {
    if (params.q && query === params.q) return; // skip initial prefill sync
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch queries
  const { data: searchResults, isLoading: isSearchLoading, isError: isSearchError } = useSearchContent(debouncedQuery);
  const { data: trending, isLoading: isTrendingLoading, isError: isTrendingError } = useTrendingContent();

  const isLoading = isSearchLoading || (debouncedQuery.length === 0 && isTrendingLoading);
  const isError = isSearchError || (debouncedQuery.length === 0 && isTrendingError);

  // Filter logic
  const getFilteredData = () => {
    const rawData = debouncedQuery.length > 0 ? searchResults : trending;
    if (!rawData) return [];
    
    if (selectedGenre) {
      return rawData; // pass through
    }
    return rawData;
  };

  const handleCardPress = (item: any) => {
    showMovieDetail({
      id: item.id,
      media_type: item.media_type || 'movie',
      title: item.title,
      name: item.name,
      poster_path: item.poster_path,
      year: item.year,
      vote_average: item.vote_average,
    });
  };

  const filteredData = getFilteredData();

  return (
    <View style={styles.container}>
      {/* Header Search Field */}
      <View style={styles.searchHeader}>
        <SearchInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search movies, TV shows..."
        />
      </View>

      {/* Genre Pills */}
      <View style={styles.pillsContainer}>
        <GenrePills
          genres={GENRES}
          selectedGenre={selectedGenre}
          onSelectGenre={setSelectedGenre}
        />
      </View>

      {/* Grid Results */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.centerContainer}>
          <Text style={[Typography.bodySm, styles.errorText]}>Failed to load content</Text>
        </View>
      ) : filteredData && filteredData.length > 0 ? (
        <View style={styles.gridWrapper}>
          <PosterGrid
            data={filteredData}
            onItemPress={handleCardPress}
            onItemLongPress={handleCardPress}
            ListHeaderComponent={
              <Text style={[Typography.caption, styles.gridTitle]}>
                {debouncedQuery.length > 0 ? `Search Results for "${debouncedQuery}"` : 'Trending Releases'}
              </Text>
            }
          />
        </View>
      ) : (
        <EmptyState
          icon="search-off"
          title="No movies found"
          description="We couldn't find any media matching your request. Try another title."
        />
      )}


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchHeader: {
    paddingTop: 60,
    paddingHorizontal: Spacing.gutter,
    backgroundColor: Colors.background,
  },
  pillsContainer: {
    height: 48,
    backgroundColor: Colors.background,
  },
  gridWrapper: {
    flex: 1,
  },
  gridTitle: {
    color: Colors.onSurfaceVariant,
    paddingHorizontal: 8,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: Colors.error,
  },
  detailContainer: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    height: 580,
  },
  detailsLoaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  loadingText: {
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.sm,
  },
  backdropWrapper: {
    position: 'relative',
    width: '100%',
    height: 150,
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  backdropImage: {
    width: '100%',
    height: '100%',
  },
  backdropGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
  },
  detailHeaderWithBackdrop: {
    marginTop: -80,
    zIndex: 10,
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.md,
    gap: 6,
  },
  genreBadge: {
    backgroundColor: 'rgba(79, 219, 200, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(79, 219, 200, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  genreBadgeText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  streamingContainer: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    color: Colors.onSurfaceVariant,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  streamingScroll: {
    paddingVertical: 4,
    gap: 8,
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceVariant,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  providerName: {
    color: Colors.onSurface,
    fontSize: 12,
    fontWeight: '600',
  },
  providerType: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: Colors.onSurfaceVariant,
    fontSize: 8,
    fontWeight: '700',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: Radius.sm,
    marginLeft: 6,
  },
  noStreamingText: {
    color: Colors.onSurfaceVariant,
    opacity: 0.6,
  },
  overviewContainer: {
    marginBottom: Spacing.md,
  },
  overviewText: {
    color: Colors.onSurface,
    lineHeight: 20,
    opacity: 0.9,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: 4,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceVariant,
    borderRadius: Radius.md,
    padding: 10,
    alignItems: 'center',
  },
  statLabel: {
    color: Colors.onSurfaceVariant,
    fontSize: 10,
    textTransform: 'uppercase',
    marginBottom: 4,
    fontWeight: '600',
  },
  statValue: {
    color: Colors.onSurface,
    fontSize: 13,
    fontWeight: '700',
  },
  detailScroll: {
    flexGrow: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  detailPoster: {
    width: 90,
    height: 135,
    borderRadius: Radius.md,
    marginRight: Spacing.md,
    backgroundColor: Colors.surfaceVariant,
  },
  detailHeaderText: {
    flex: 1,
    justifyContent: 'center',
  },
  detailTitle: {
    color: Colors.onSurface,
    fontWeight: '700',
    marginBottom: 6,
  },
  detailRelease: {
    color: Colors.onSurfaceVariant,
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    color: Colors.onSurface,
    marginLeft: 4,
    fontWeight: '600',
  },
  typeBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    alignSelf: 'flex-start',
  },
  typeBadgeText: {
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
    fontSize: 10,
  },
  actionsRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerLow,
    paddingTop: Spacing.md,
  },
  addButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.card,
  },
  addButtonText: {
    color: Colors.onPrimary,
    fontWeight: '600',
    marginLeft: 6,
  },
  listSelectorContainer: {
    flex: 1,
  },
  listSelectorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  listSelectorTitle: {
    color: Colors.onSurface,
    marginLeft: Spacing.md,
    fontWeight: '600',
  },
  listSelectorScroll: {
    flex: 1,
  },
  listSelectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerLow,
  },
  listSelectorItemPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  folderIcon: {
    marginRight: Spacing.md,
  },
  listSelectorItemText: {
    flex: 1,
  },
  listSelectorItemTitle: {
    color: Colors.onSurface,
    fontWeight: '600',
  },
  listSelectorItemCount: {
    color: Colors.onSurfaceVariant,
  },
  noListsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noListsText: {
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.md,
  },
  createListButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radius.full,
  },
  createListButtonText: {
    color: Colors.onPrimary,
    fontWeight: '600',
  },
});
