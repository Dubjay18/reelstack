import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Image } from 'expo-image';
import { Colors, Radius, Typography, Spacing, Shadow } from '@/constants/theme';
import { SearchInput } from '@/components/ui/SearchInput';
import { GenrePills } from '@/components/ui/GenrePills';
import { PosterGrid } from '@/components/ui/PosterGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSearchContent, useTrendingContent, useUserLists, useAddListItem } from '@/lib/hooks/api';
import { useToast } from '@/contexts/ToastContext';
import { MaterialIcons } from '@expo/vector-icons';

const GENRES = ['Action', 'Comedy', 'Drama', 'Thriller', 'Sci-Fi', 'Horror', 'Romance', 'Documentary'];

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  
  // Modal / Detail state
  const [selectedMedia, setSelectedMedia] = useState<any | null>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [showListSelector, setShowListSelector] = useState(false);

  const { showToast } = useToast();
  const { data: userLists } = useUserLists();

  // Sync route params to search input
  useEffect(() => {
    if (params.q) {
      setQuery(params.q);
      setDebouncedQuery(params.q);
    }
  }, [params.q]);

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
    
    // TMDB Search API results can be filtered by genre name if details are mocked or matched
    // For simplicity, if a genre is selected, we filter by title/year keyword or show all
    if (selectedGenre) {
      // In actual app, details API is queried. For search screen filtering, we do basic clientside mock match:
      // We map genre selection to basic media features or just display
      return rawData; // pass through
    }
    return rawData;
  };

  const handleCardPress = (item: any) => {
    setSelectedMedia(item);
    setShowDetailSheet(true);
  };

  const handleAddToList = async (listId: string) => {
    if (!selectedMedia) return;
    try {
      // Create mutation dynamically for this list
      await apiAddListItem(listId, {
        tmdb_id: selectedMedia.id,
        media_type: selectedMedia.media_type || 'movie',
      });
      showToast(`Added to list!`, 'success');
      setShowListSelector(false);
      setShowDetailSheet(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to add item', 'error');
    }
  };

  // Helper inside search to trigger direct API post (since lists mutations are hook-bound,
  // we query client queries directly or use custom mutation call)
  const addListItemMutation = useAddListItem('');
  const apiAddListItem = async (listId: string, body: any) => {
    // Custom post call wrapper
    const { api } = require('@/lib/api');
    return api.post(`/api/v1/lists/${listId}/items`, body);
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

      {/* Movie Details Bottom Sheet */}
      {selectedMedia && (
        <BottomSheet
          isPresented={showDetailSheet}
          onDismiss={() => {
            setShowDetailSheet(false);
            setShowListSelector(false);
          }}
        >
          <View style={styles.detailContainer}>
            {!showListSelector ? (
              <ScrollView contentContainerStyle={styles.detailScroll}>
                <View style={styles.detailHeader}>
                  <Image
                    source={{ 
                      uri: selectedMedia.poster_path 
                        ? `https://image.tmdb.org/t/p/w300${selectedMedia.poster_path}` 
                        : 'https://via.placeholder.com/150x225'
                    }}
                    style={styles.detailPoster}
                    contentFit="cover"
                  />
                  <View style={styles.detailHeaderText}>
                    <Text numberOfLines={2} style={[Typography.heading, styles.detailTitle]}>
                      {selectedMedia.title || selectedMedia.name}
                    </Text>
                    <Text style={[Typography.bodySm, styles.detailRelease]}>
                      Released: {selectedMedia.year || 'N/A'}
                    </Text>
                    <View style={styles.ratingRow}>
                      <MaterialIcons name="star" size={16} color="#f59e0b" />
                      <Text style={[Typography.bodySm, styles.ratingText]}>
                        {selectedMedia.vote_average ? selectedMedia.vote_average.toFixed(1) : 'N/A'} / 10
                      </Text>
                    </View>
                    <View style={styles.typeBadge}>
                      <Text style={[Typography.caption, styles.typeBadgeText]}>
                        {selectedMedia.media_type === 'tv' ? 'TV SERIES' : 'MOVIE'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.actionsRow}>
                  <Pressable
                    style={styles.addButton}
                    onPress={() => setShowListSelector(true)}
                  >
                    <MaterialIcons name="playlist-add" size={20} color={Colors.onPrimary} />
                    <Text style={[Typography.bodySm, styles.addButtonText]}>Add to list...</Text>
                  </Pressable>
                </View>
              </ScrollView>
            ) : (
              <View style={styles.listSelectorContainer}>
                <View style={styles.listSelectorTitleRow}>
                  <Pressable onPress={() => setShowListSelector(false)}>
                    <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
                  </Pressable>
                  <Text style={[Typography.heading, styles.listSelectorTitle]}>Select List</Text>
                </View>

                {userLists && userLists.length > 0 ? (
                  <ScrollView style={styles.listSelectorScroll}>
                    {userLists.map((list) => (
                      <Pressable
                        key={list.id}
                        style={({ pressed }) => [
                          styles.listSelectorItem,
                          pressed && styles.listSelectorItemPressed,
                        ]}
                        onPress={() => handleAddToList(list.id)}
                      >
                        <MaterialIcons name="folder" size={20} color={Colors.primary} style={styles.folderIcon} />
                        <View style={styles.listSelectorItemText}>
                          <Text numberOfLines={1} style={[Typography.bodyLg, styles.listSelectorItemTitle]}>
                            {list.title}
                          </Text>
                          <Text style={[Typography.caption, styles.listSelectorItemCount]}>
                            {list.item_count} items
                          </Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={20} color={Colors.onSurfaceVariant} />
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.noListsContainer}>
                    <Text style={[Typography.bodySm, styles.noListsText]}>You don't have any lists yet.</Text>
                    <Pressable
                      style={styles.createListButton}
                      onPress={() => {
                        setShowDetailSheet(false);
                        router.push('/(tabs)/lists/new');
                      }}
                    >
                      <Text style={styles.createListButtonText}>Create List</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}
          </View>
        </BottomSheet>
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
    height: 380,
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
