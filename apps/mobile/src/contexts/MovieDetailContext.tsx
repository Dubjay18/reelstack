import React, { createContext, useContext, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Pressable, ScrollView, Linking } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadow } from '@/constants/theme';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useContentDetails, useStreamingAvailability, useUserLists } from '@/lib/hooks/api';
import { useToast } from '@/contexts/ToastContext';

interface MovieDetailMedia {
  id: number;
  media_type: 'movie' | 'tv';
  title?: string;
  name?: string;
  poster_path?: string | null;
  year?: string;
  vote_average?: number;
}

interface MovieDetailContextType {
  showMovieDetail: (media: MovieDetailMedia) => void;
}

const MovieDetailContext = createContext<MovieDetailContextType | undefined>(undefined);

export const MovieDetailProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedMedia, setSelectedMedia] = useState<MovieDetailMedia | null>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [showListSelector, setShowListSelector] = useState(false);

  const { showToast } = useToast();
  const { data: userLists } = useUserLists();

  // Fetch detailed info & streaming availability when an item is selected
  const { data: movieDetails, isLoading: isDetailsLoading } = useContentDetails(
    selectedMedia?.media_type || 'movie',
    selectedMedia?.id || 0
  );

  const { data: streamingAvailability, isLoading: isStreamingLoading } = useStreamingAvailability(
    selectedMedia?.media_type || 'movie',
    selectedMedia?.id || 0
  );

  const showMovieDetail = (media: MovieDetailMedia) => {
    setSelectedMedia(media);
    setShowDetailSheet(true);
    setShowListSelector(false);
  };

  const handleAddToList = async (listId: string) => {
    if (!selectedMedia) return;
    try {
      const { api } = require('@/lib/api');
      await api.post(`/api/v1/lists/${listId}/items`, {
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

  return (
    <MovieDetailContext.Provider value={{ showMovieDetail }}>
      {children}

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
              isDetailsLoading ? (
                <View style={styles.detailsLoaderContainer}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={[Typography.bodySm, styles.loadingText]}>Loading details...</Text>
                </View>
              ) : (
                <ScrollView contentContainerStyle={styles.detailScroll} showsVerticalScrollIndicator={false}>
                  {/* Backdrop banner if available */}
                  {movieDetails?.backdrop_path && (
                    <View style={styles.backdropWrapper}>
                      <Image
                        source={{ uri: `https://image.tmdb.org/t/p/w500${movieDetails.backdrop_path}` }}
                        style={styles.backdropImage}
                        contentFit="cover"
                      />
                      <LinearGradient
                        colors={['transparent', 'rgba(19, 19, 21, 0.95)']}
                        style={styles.backdropGradient}
                      />
                    </View>
                  )}

                  {/* Header info */}
                  <View style={[styles.detailHeader, movieDetails?.backdrop_path ? styles.detailHeaderWithBackdrop : null]}>
                    <Image
                      source={{ 
                        uri: movieDetails?.poster_path 
                          ? `https://image.tmdb.org/t/p/w300${movieDetails.poster_path}` 
                          : selectedMedia.poster_path
                            ? `https://image.tmdb.org/t/p/w300${selectedMedia.poster_path}`
                            : 'https://via.placeholder.com/150x225'
                      }}
                      style={styles.detailPoster}
                      contentFit="cover"
                    />
                    <View style={styles.detailHeaderText}>
                      <Text numberOfLines={2} style={[Typography.heading, styles.detailTitle]}>
                        {(movieDetails && 'title' in movieDetails) ? movieDetails.title : (movieDetails as any)?.name || selectedMedia.title || selectedMedia.name}
                      </Text>
                      
                      {/* Release year and runtime */}
                      <Text style={[Typography.bodySm, styles.detailRelease]}>
                        Released: {selectedMedia.year || 'N/A'}
                        {(movieDetails as any)?.runtime ? `  •  ${Math.floor((movieDetails as any).runtime / 60)}h ${(movieDetails as any).runtime % 60}m` : ''}
                      </Text>

                      <View style={styles.ratingRow}>
                        <MaterialIcons name="star" size={16} color="#f59e0b" />
                        <Text style={[Typography.bodySm, styles.ratingText]}>
                          {movieDetails?.vote_average ? movieDetails.vote_average.toFixed(1) : selectedMedia.vote_average ? selectedMedia.vote_average.toFixed(1) : 'N/A'} / 10
                        </Text>
                      </View>

                      <View style={styles.typeBadge}>
                        <Text style={[Typography.caption, styles.typeBadgeText]}>
                          {selectedMedia.media_type === 'tv' ? 'TV SERIES' : 'MOVIE'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Genres list */}
                  {movieDetails?.genres && movieDetails.genres.length > 0 && (
                    <View style={styles.genresContainer}>
                      {movieDetails.genres.map(genre => (
                        <View key={genre} style={styles.genreBadge}>
                          <Text style={[Typography.caption, styles.genreBadgeText]}>{genre}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Where to Watch */}
                  <View style={styles.streamingContainer}>
                    <Text style={[Typography.caption, styles.sectionTitle]}>Where to Watch</Text>
                    {isStreamingLoading ? (
                      <ActivityIndicator size="small" color={Colors.primary} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
                    ) : streamingAvailability && streamingAvailability.length > 0 ? (
                      (() => {
                        const seen = new Set<string>();
                        const uniqueProviders = streamingAvailability.filter(provider => {
                          const key = `${provider.provider_id}-${provider.type}`;
                          if (seen.has(key)) return false;
                          seen.add(key);
                          return true;
                        });

                        return (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.streamingScroll}>
                            {uniqueProviders.map((provider, index) => (
                              <View key={`${provider.provider_id}-${provider.type}-${index}`} style={styles.providerBadge}>
                                <Text style={styles.providerName}>{provider.provider_name}</Text>
                                <Text style={styles.providerType}>{provider.type.toUpperCase()}</Text>
                              </View>
                            ))}
                          </ScrollView>
                        );
                      })()
                    ) : (
                      <Text style={[Typography.bodySm, styles.noStreamingText]}>No streaming options available right now.</Text>
                    )}
                  </View>

                  {/* Overview */}
                  <View style={styles.overviewContainer}>
                    <Text style={[Typography.caption, styles.sectionTitle]}>Overview</Text>
                    <Text style={[Typography.bodySm, styles.overviewText]}>
                      {movieDetails?.overview || 'No description available.'}
                    </Text>
                  </View>

                  {/* Vital Stats grid */}
                  <View style={styles.overviewContainer}>
                    <Text style={[Typography.caption, styles.sectionTitle]}>Vital Statistics</Text>
                    <View style={styles.statsGrid}>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Release Date</Text>
                        <Text style={styles.statValue}>
                          {(movieDetails as any)?.release_date || (movieDetails as any)?.first_air_date || 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Popularity</Text>
                        <Text style={styles.statValue}>
                          {movieDetails ? Math.round((movieDetails as any).popularity || 0) : 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Status</Text>
                        <Text style={styles.statValue}>
                          {(movieDetails as any)?.status || 'Released'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Actions (Trailer + Add to List) */}
                  <View style={styles.actionsRow}>
                    {movieDetails && (movieDetails as any).trailer_key && (
                      <Pressable
                        style={styles.trailerButton}
                        onPress={() => {
                          const key = (movieDetails as any).trailer_key as string;
                          Linking.openURL(`https://www.youtube.com/watch?v=${key}`);
                        }}
                      >
                        <MaterialIcons name="play-circle-filled" size={20} color={Colors.primary} />
                        <Text style={[Typography.bodySm, styles.trailerButtonText]}>Watch Trailer</Text>
                      </Pressable>
                    )}
                    <Pressable
                      style={styles.addButton}
                      onPress={() => setShowListSelector(true)}
                    >
                      <MaterialIcons name="playlist-add" size={20} color={Colors.onPrimary} />
                      <Text style={[Typography.bodySm, styles.addButtonText]}>Add to list...</Text>
                    </Pressable>
                  </View>
                </ScrollView>
              )
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
                    <Text style={[Typography.bodySm, styles.noListsText]}>You don&apos;t have any lists yet.</Text>
                    <Pressable
                      style={styles.createListButton}
                      onPress={() => {
                        setShowDetailSheet(false);
                        const { router } = require('expo-router');
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
    </MovieDetailContext.Provider>
  );
};

export const useMovieDetail = () => {
  const context = useContext(MovieDetailContext);
  if (context === undefined) {
    throw new Error('useMovieDetail must be used within a MovieDetailProvider');
  }
  return context;
};

const styles = StyleSheet.create({
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
  trailerButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
    flexDirection: 'row',
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  trailerButtonText: {
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: 6,
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
});
