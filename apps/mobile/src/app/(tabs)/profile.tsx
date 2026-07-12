import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Sharing from 'expo-sharing';
import { Colors, Radius, Typography, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useMovieDetail } from '@/contexts/MovieDetailContext';
import { useUserLists, usePublicProfile, useUpdateProfile, useCheckUsernameAvailability } from '@/lib/hooks/api';
import { ListCard } from '@/components/ui/ListCard';
import { PosterCard } from '@/components/ui/PosterCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScoreBadge } from '@/components/ui/ScoreBadge';
import { MaterialIcons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';

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

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'films' | 'lists'>('films');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState('');
  const [usernameInput, setUsernameInput] = useState('');

  const username = user?.username || '';
  const { data: profile, isLoading: isProfileLoading } = usePublicProfile(username);
  const { data: lists, isLoading: isListsLoading } = useUserLists();
  const displayBio = profile?.bio || '';

  const startEditing = () => {
    setBioText(profile?.bio || '');
    setUsernameInput(profile?.username || username);
    setIsEditingBio(true);
  };

  const cancelEditing = () => {
    setIsEditingBio(false);
    setUsernameInput(profile?.username || username);
    setBioText(profile?.bio || '');
  };

  const handleShare = async () => {
    try {
      const shareSupported = await Sharing.isAvailableAsync();
      if (shareSupported && username) {
        // Since we are running locally, we can construct the share message
        await Sharing.shareAsync(`https://reelstack.app/${username}`, {
          dialogTitle: `Share @${username}'s Profile`,
        });
      } else {
        showToast('Sharing is not available on this device', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error sharing profile', 'error');
    }
  };

  const updateProfileMutation = useUpdateProfile();

  // Debounce username
  const [debouncedUsername, setDebouncedUsername] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUsername(usernameInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [usernameInput]);

  const isCheckingUsername = debouncedUsername !== '' && debouncedUsername !== username && debouncedUsername.trim().length >= 3;
  const { data: availabilityData, isLoading: isAvailabilityLoading } = useCheckUsernameAvailability(
    isCheckingUsername ? debouncedUsername : ''
  );

  const isUsernameFormatValid = /^[a-zA-Z0-9_]{3,50}$/.test(usernameInput);
  const isUsernameChanged = usernameInput !== username;

  const isSaveDisabled = updateProfileMutation.isPending ||
    (isUsernameChanged && (!isUsernameFormatValid || isAvailabilityLoading || availabilityData?.available === false));

  let statusText = '';
  let statusColor: string = Colors.onSurfaceVariant;
  if (isUsernameChanged) {
    if (!isUsernameFormatValid) {
      statusText = 'Format: 3-50 characters (letters, numbers, underscores)';
      statusColor = Colors.error;
    } else if (isAvailabilityLoading) {
      statusText = 'Checking availability...';
      statusColor = Colors.primary;
    } else if (availabilityData?.available === false) {
      statusText = 'Username is already taken';
      statusColor = Colors.error;
    } else if (availabilityData?.available === true) {
      statusText = 'Username is available';
      statusColor = Colors.secondary;
    }
  }

  const handleSaveBio = () => {
    updateProfileMutation.mutate(
      {
        bio: bioText,
        username: usernameInput !== username ? usernameInput : undefined
      },
      {
        onSuccess: () => {
          setIsEditingBio(false);
          showToast('Profile updated successfully!', 'success');
        },
        onError: (err: any) => {
          showToast(err.message || 'Failed to update profile', 'error');
        },
      }
    );
  };

  if (isProfileLoading || isListsLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Calculate stats
  const totalLists = lists ? lists.length : 0;
  const totalFilms = lists ? lists.reduce((sum, list) => sum + list.item_count, 0) : 0;
  const totalWatched = lists ? lists.reduce((sum, list) => sum + list.watched_count, 0) : 0;
  const avatarUrl = profile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card Background Gradient Header */}
        <View style={styles.profileHeader}>
          {/* Avatar and Badges */}
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatar}
              contentFit="cover"
            />
            <View style={styles.verifiedBadge}>
              <MaterialIcons name="check" size={12} color={Colors.onSecondary} />
            </View>
          </View>

          {/* Username */}
          <Text style={[Typography.displayMd, styles.username]}>{username}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <Text style={[Typography.mono, styles.handle]}>@{username}</Text>
            {profile?.score !== undefined && profile?.score !== null && (
              <ScoreBadge score={profile.score} rank={profile.rank} size="sm" />
            )}
          </View>

          {/* Bio text */}
          {/* Bio text / Profile Edit Form */}
          {isEditingBio ? (
            <View style={styles.editProfileForm}>
              {/* Username field */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>USERNAME</Text>
                <View style={styles.usernameInputContainer}>
                  <Text style={styles.atSymbol}>@</Text>
                  <TextInput
                    value={usernameInput}
                    onChangeText={setUsernameInput}
                    maxLength={50}
                    style={[Typography.bodySm, styles.usernameTextInput]}
                    selectionColor={Colors.primary}
                    keyboardAppearance="dark"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {statusText !== '' && (
                  <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
                )}
              </View>

              {/* Bio field */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>BIO</Text>
                <TextInput
                  value={bioText}
                  onChangeText={setBioText}
                  maxLength={160}
                  multiline
                  style={[Typography.bodySm, styles.editBioInput, { textAlign: 'left', borderColor: Colors.outlineVariant }]}
                  selectionColor={Colors.primary}
                  keyboardAppearance="dark"
                />
              </View>

              <View style={styles.editBioActions}>
                <Pressable 
                  onPress={handleSaveBio} 
                  disabled={isSaveDisabled} 
                  style={[styles.saveBioBtn, isSaveDisabled && { opacity: 0.5 }]}
                >
                  <Text style={styles.saveBioBtnText}>
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save'}
                  </Text>
                </Pressable>
                <Pressable 
                  onPress={cancelEditing}
                  style={styles.cancelBioBtn}
                >
                  <Text style={styles.cancelBioBtnText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable onPress={startEditing} style={styles.bioPress}>
              <Text style={[Typography.bodySm, styles.bioText]}>
                {displayBio || <Text style={styles.bioPlaceholder}>Add a bio...</Text>}
                <MaterialIcons name="edit" size={12} color={Colors.onSurfaceVariant} style={styles.bioEditIcon} />
              </Text>
            </Pressable>
          )}

          {/* Stats count row */}
          <View style={styles.statsRow}>
            {[
              { value: totalLists, label: 'Lists' },
              { value: totalFilms, label: 'Films' },
              { value: totalWatched, label: 'Watched' },
              { value: profile?.followers_count || 0, label: 'Followers' },
              { value: profile?.following_count || 0, label: 'Following' },
            ].map((stat) => (
              <View key={stat.label} style={styles.statCell}>
                <Text style={[Typography.heading, styles.statValue]}>{stat.value}</Text>
                <Text style={[Typography.caption, styles.statLabel]}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Action Row */}
          <View style={styles.actionRow}>
            <Pressable onPress={handleShare} style={styles.shareBtn}>
              <MaterialIcons name="ios-share" size={16} color={Colors.onSurfaceVariant} style={styles.shareIcon} />
              <Text style={[Typography.bodySm, styles.shareBtnText]}>Share Profile</Text>
            </Pressable>

            <Pressable onPress={logout} style={styles.logoutBtn}>
              <MaterialIcons name="logout" size={16} color={Colors.error} style={styles.shareIcon} />
              <Text style={[Typography.bodySm, styles.logoutBtnText]}>Sign Out</Text>
            </Pressable>
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
            lists && lists.length > 0 ? (
              <View style={styles.listsContainer}>
                {lists.map((list) => (
                  <ListCard
                    key={list.id}
                    list={list}
                    username={username}
                    onPress={() => router.push(`/(tabs)/lists/${list.id}`)}
                  />
                ))}
              </View>
            ) : (
              <EmptyState
                icon="movie-filter"
                title="No lists yet"
                description="Create a list to start tracking films."
                buttonText="Create list"
                onButtonPress={() => router.push('/(tabs)/lists/new')}
              />
            )
          ) : (
            // Films tab: renders list rows
            lists && lists.length > 0 ? (
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
                description="Films you add to your lists will appear here."
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
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  profileHeader: {
    paddingTop: 80,
    paddingBottom: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceVariant,
    paddingHorizontal: Spacing.gutter,
  },
  avatarContainer: {
    position: 'relative',
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
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
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
  bioPress: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  bioText: {
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
  bioPlaceholder: {
    fontStyle: 'italic',
    opacity: 0.5,
  },
  bioEditIcon: {
    marginLeft: 6,
  },
  editBioWrapper: {
    width: '100%',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  editBioInput: {
    color: Colors.onSurface,
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    padding: 8,
    minHeight: 50,
    textAlign: 'center',
  },
  editBioActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveBioBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    marginRight: 8,
  },
  saveBioBtnText: {
    color: Colors.onPrimary,
    fontWeight: '600',
    fontSize: 12,
  },
  cancelBioBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  cancelBioBtnText: {
    color: Colors.onSurfaceVariant,
    fontSize: 12,
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
  actionRow: {
    flexDirection: 'row',
    marginTop: Spacing.xs,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.md,
    marginRight: 10,
  },
  shareIcon: {
    marginRight: 6,
  },
  shareBtnText: {
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 171, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
  logoutBtnText: {
    color: Colors.error,
    fontWeight: '600',
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
  editProfileForm: {
    width: '100%',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  inputGroup: {
    marginBottom: Spacing.sm,
    width: '100%',
  },
  inputLabel: {
    color: Colors.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  usernameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    paddingHorizontal: 12,
  },
  atSymbol: {
    color: Colors.onSurfaceVariant,
    fontSize: 14,
    marginRight: 2,
    fontFamily: 'monospace',
  },
  usernameTextInput: {
    color: Colors.onSurface,
    flex: 1,
    paddingVertical: 8,
    fontFamily: 'monospace',
  },
  statusText: {
    fontSize: 10,
    marginTop: 4,
  },
});
