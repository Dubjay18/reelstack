import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Sharing from 'expo-sharing';
import { Colors, Radius, Typography, Spacing } from '@/constants/theme';
import { useToast } from '@/contexts/ToastContext';
import { useMovieDetail } from '@/contexts/MovieDetailContext';
import { usePublicProfile } from '@/lib/hooks/api';
import { ListCard } from '@/components/ui/ListCard';
import { PosterCard } from '@/components/ui/PosterCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { MaterialIcons } from '@expo/vector-icons';

function ProfileFilmCard({ item }: { item: any }) {
  const router = useRouter();
  const { showMovieDetail } = useMovieDetail();
  const { useContentDetails } = require('@/lib/hooks/api');
  const { data: content, isLoading } = useContentDetails(item.media_type, item.tmdb_id);

  if (isLoading) {
    return (
      <View style={styles.rowCardWrapper}>
        <View style={{ width: 85, height: 85 * 1.5, backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      </View>
    );
  }

  const filmTitle = content?.title || (content as any)?.name || 'Untitled';
  const posterPath = content?.poster_path || null;
  const releaseDate = (content && 'release_date' in content) ? content.release_date : (content as any)?.first_air_date;
  const filmYear = releaseDate ? releaseDate.substring(0, 4) : undefined;

  return (
    <View style={styles.rowCardWrapper}>
      <PosterCard
        title={filmTitle}
        posterPath={posterPath}
        watched={item.watched}
        onPress={() => showMovieDetail({
          id: item.tmdb_id,
          media_type: item.media_type,
          title: filmTitle,
          poster_path: posterPath,
          year: filmYear,
          vote_average: content?.vote_average,
        })}
        width={85}
      />
    </View>
  );
}

// Horizontal rail of films for a specific list on the profile page
function ProfileListRow({ listId, listTitle }: { listId: string; listTitle: string }) {
  const { data: items, isLoading } = require('@/lib/hooks/api').useListItems(listId);
  const router = useRouter();

  if (isLoading) {
    return (
      <View style={styles.rowContainer}>
        <Text style={[Typography.caption, styles.rowTitle]}>{listTitle.toUpperCase()}</Text>
        <View style={styles.rowLoader}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      </View>
    );
  }

  if (!items || items.length === 0) return null;

  return (
    <View style={styles.rowContainer}>
      <View style={styles.rowHeader}>
        <Text numberOfLines={1} style={[Typography.caption, styles.rowTitle]}>
          {listTitle.toUpperCase()}
        </Text>
        <Text style={[Typography.caption, styles.rowCount]}>
          {items.length} films
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowScroll}>
        {items.map((item: any) => (
          <ProfileFilmCard key={item.id} item={item} />
        ))}
      </ScrollView>
    </View>
  );
}

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'films' | 'lists'>('films');

  const { data: profile, isLoading, isError } = usePublicProfile(username || '');

  const handleShare = async () => {
    try {
      const shareSupported = await Sharing.isAvailableAsync();
      if (shareSupported && username) {
        await Sharing.shareAsync(`https://reelstack.app/${username}`, {
          dialogTitle: `Share @${username}'s Profile`,
        });
      } else {
        showToast('Sharing is not available on this device', 'error');
      }
    } catch (err: any) {
      showToast('Error sharing profile', 'error');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (isError || !profile) {
    return (
      <View style={styles.centerContainer}>
        <Text style={[Typography.bodyLg, styles.errorText]}>User profile not found</Text>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // Calculate stats
  const lists = profile.public_links || [];
  const totalLists = lists.length;
  const totalFilms = lists.reduce((sum, list) => sum + list.item_count, 0);
  const totalWatched = lists.reduce((sum, list) => sum + list.watched_count, 0);
  const avatarUrl = profile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;

  return (
    <View style={styles.container}>
      {/* Header bar with back button */}
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
        </Pressable>
        <Text style={[Typography.heading, styles.headerTitle]}>Profile</Text>
        <Pressable onPress={handleShare} style={styles.iconButton}>
          <MaterialIcons name="ios-share" size={20} color={Colors.onSurface} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card Info */}
        <View style={styles.profileHeader}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatar}
              contentFit="cover"
            />
          </View>

          {/* Username */}
          <Text style={[Typography.displayMd, styles.username]}>{profile.username}</Text>
          <Text style={[Typography.mono, styles.handle]}>@{profile.username}</Text>

          {/* Bio */}
          {profile.bio ? (
            <Text style={[Typography.bodySm, styles.bioText]}>{profile.bio}</Text>
          ) : (
            <Text style={[Typography.bodySm, styles.bioPlaceholder]}>No bio description provided.</Text>
          )}

          {/* Stats count row */}
          <View style={styles.statsRow}>
            {[
              { value: totalLists, label: 'Lists' },
              { value: totalFilms, label: 'Films' },
              { value: totalWatched, label: 'Watched' },
              { value: 0, label: 'Followers' },
              { value: 0, label: 'Following' },
            ].map((stat) => (
              <View key={stat.label} style={styles.statCell}>
                <Text style={[Typography.heading, styles.statValue]}>{stat.value}</Text>
                <Text style={[Typography.caption, styles.statLabel]}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Tab switcher */}
        <View style={styles.tabSwitcher}>
          <Pressable
            onPress={() => setActiveTab('films')}
            style={[styles.tabButton, activeTab === 'films' && styles.tabButtonActive]}
          >
            <Text style={[Typography.bodySm, styles.tabText, activeTab === 'films' && styles.tabTextActive]}>
              Films
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('lists')}
            style={[styles.tabButton, activeTab === 'lists' && styles.tabButtonActive]}
          >
            <Text style={[Typography.bodySm, styles.tabText, activeTab === 'lists' && styles.tabTextActive]}>
              Lists
            </Text>
          </Pressable>
        </View>

        {/* Tab content */}
        <View style={styles.tabContent}>
          {activeTab === 'lists' ? (
            lists.length > 0 ? (
              <View style={styles.listsContainer}>
                {lists.map((list) => (
                  <ListCard
                    key={list.id}
                    list={list}
                    username={profile.username}
                    onPress={() => router.push({ pathname: '/(tabs)/lists/[id]', params: { id: list.id } })}
                  />
                ))}
              </View>
            ) : (
              <EmptyState
                icon="movie-filter"
                title="No public lists"
                description="This user hasn't curated any public lists yet."
              />
            )
          ) : (
            lists.length > 0 ? (
              <View style={styles.filmsContainer}>
                {lists.map((list) => (
                  <ProfileListRow
                    key={list.id}
                    listId={list.id}
                    listTitle={list.title}
                  />
                ))}
              </View>
            ) : (
              <EmptyState
                icon="video-library"
                title="No films logged"
                description="Films from public lists will appear here."
              />
            )
          )}
        </View>
      </ScrollView>
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
  errorText: {
    color: Colors.error,
  },
  backLink: {
    marginTop: Spacing.md,
  },
  backLinkText: {
    color: Colors.primary,
    fontWeight: '600',
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
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  profileHeader: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceVariant,
    paddingHorizontal: Spacing.gutter,
  },
  avatarContainer: {
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'rgba(79, 219, 200, 0.3)',
    backgroundColor: Colors.surfaceContainer,
  },
  username: {
    color: Colors.onSurface,
    fontWeight: '700',
    fontSize: 24,
    marginBottom: 2,
  },
  handle: {
    color: Colors.primary,
    fontSize: 13,
    marginBottom: Spacing.sm,
  },
  bioText: {
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  bioPlaceholder: {
    color: Colors.onSurfaceVariant,
    fontStyle: 'italic',
    textAlign: 'center',
    opacity: 0.5,
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: Spacing.md,
  },
  statCell: {
    alignItems: 'center',
  },
  statValue: {
    color: Colors.onSurface,
    fontWeight: '700',
  },
  statLabel: {
    color: Colors.onSurfaceVariant,
    fontSize: 10,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  tabSwitcher: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceVariant,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  tabTextActive: {
    color: Colors.primary,
  },
  tabContent: {
    paddingTop: Spacing.sm,
  },
  listsContainer: {
    paddingHorizontal: Spacing.gutter,
  },
  filmsContainer: {
    paddingHorizontal: Spacing.gutter,
  },
  // Sub-row styles
  rowContainer: {
    marginBottom: Spacing.md,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  rowTitle: {
    color: Colors.onSurfaceVariant,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  rowCount: {
    color: Colors.onSurfaceVariant,
    opacity: 0.6,
  },
  rowScroll: {
    paddingRight: 100,
  },
  rowCardWrapper: {
    marginRight: 10,
  },
  rowLoader: {
    height: 100,
    justifyContent: 'center',
  },
});
