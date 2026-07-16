import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, ActivityIndicator, ScrollView, TextInput, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Colors, Radius, Typography, Spacing, Shadow } from '@/constants/theme';
import { 
  useListDetail, 
  useListItems, 
  useUpdateList, 
  useDeleteList, 
  useUpdateListItem, 
  useDeleteListItem,
  useContentDetails
} from '@/lib/hooks/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useMovieDetail } from '@/contexts/MovieDetailContext';
import { PrivacyBadge } from '@/components/ui/PrivacyBadge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { PosterCard } from '@/components/ui/PosterCard';
import { AddFilmSheet } from '@/components/AddFilmSheet';
import { SaveButton } from '@/components/ui/SaveButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { MaterialIcons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { useAuthGuard } from '@/hooks/useAuthGuard';

function FilmItemCard({
  item,
  cardWidth,
  onLongPress,
}: {
  item: any;
  cardWidth: number;
  onLongPress: (content: any) => void;
}) {
  const router = useRouter();
  const { showMovieDetail } = useMovieDetail();
  const { data: content, isLoading } = useContentDetails(item.media_type, item.tmdb_id);

  if (isLoading) {
    return (
      <View style={[styles.cardWrapper, { width: cardWidth }]}>
        <View style={{ width: cardWidth, height: cardWidth * 1.5, backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      </View>
    );
  }

  const filmTitle = (content && 'title' in content) ? content.title : (content as any)?.name || 'Untitled';
  const posterPath = content?.poster_path || null;
  const releaseDate = (content && 'release_date' in content) ? content.release_date : (content as any)?.first_air_date;
  const filmYear = releaseDate ? releaseDate.substring(0, 4) : undefined;

  return (
    <View style={[styles.cardWrapper, { width: cardWidth }]}>
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
        onLongPress={() => onLongPress(content)}
        width={cardWidth}
      />
    </View>
  );
}

export default function ListDetailScreen() {
  const { isAuthorized } = useAuthGuard();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { width: windowWidth } = useWindowDimensions();

  // Screen states
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [showAddSheet, setShowAddSheet] = useState(false);
  
  // Selected film context state
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);

  // Queries
  const { data: list, isLoading: isListLoading } = useListDetail(id);
  const { data: items, isLoading: isItemsLoading } = useListItems(id);

  // Mutations
  const updateListMutation = useUpdateList(id);
  const deleteListMutation = useDeleteList();
  const updateItemMutation = useUpdateListItem(id);
  const deleteItemMutation = useDeleteListItem(id);

  const isOwner = list && user && list.user_id === user.id;

  const handleStartEdit = () => {
    if (!list) return;
    setEditTitle(list.title);
    setEditDesc(list.description || '');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      showToast('List title cannot be empty', 'error');
      return;
    }
    try {
      await updateListMutation.mutateAsync({
        title: editTitle.trim(),
        description: editDesc.trim() || null,
      });
      setIsEditing(false);
      showToast('List updated successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update list', 'error');
    }
  };

  const handleTogglePrivacy = async () => {
    if (!list || !isOwner) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await updateListMutation.mutateAsync({
        is_public: !list.is_public,
      });
      showToast(`List is now ${!list.is_public ? 'Public' : 'Private'}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle privacy', 'error');
    }
  };

  const handleDeleteList = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      await deleteListMutation.mutateAsync(id);
      showToast('List deleted', 'info');
      router.replace('/(tabs)/lists');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete list', 'error');
    }
  };

  const handleLongPressItem = (item: any, content: any) => {
    if (!isOwner) return; // Only owner gets action sheets
    setSelectedItem({ ...item, content });
    setShowActionSheet(true);
  };

  const handleToggleWatched = async () => {
    if (!selectedItem) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await updateItemMutation.mutateAsync({
        itemId: selectedItem.id,
        body: { watched: !selectedItem.watched },
      });
      showToast(selectedItem.watched ? 'Marked unwatched' : 'Marked watched', 'success');
      setShowActionSheet(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to update watched status', 'error');
    }
  };

  const handleRemoveItem = async () => {
    if (!selectedItem) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      await deleteItemMutation.mutateAsync(selectedItem.id);
      showToast('Removed from list', 'info');
      setShowActionSheet(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to remove film', 'error');
    }
  };

  if (!isAuthorized || isListLoading || isItemsLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!list) {
    return (
      <View style={styles.centerContainer}>
        <Text style={[Typography.bodyLg, styles.errorText]}>List not found</Text>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // Calculate dynamic card sizes for a 3-column film grid
  const numColumns = 3;
  const cardWidth = (windowWidth - Spacing.gutter * 2 - 24) / numColumns;
  const progress = list.item_count > 0 ? list.watched_count / list.item_count : 0;

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
        </Pressable>
        
        {isOwner && (
          <View style={styles.headerRightActions}>
            {isEditing ? (
              <Pressable onPress={handleSaveEdit} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
            ) : (
              <>
                <Pressable onPress={handleStartEdit} style={styles.iconButton}>
                  <MaterialIcons name="edit" size={20} color={Colors.onSurface} />
                </Pressable>
                <Pressable onPress={handleDeleteList} style={[styles.iconButton, styles.deleteBtn]}>
                  <MaterialIcons name="delete" size={20} color={Colors.error} />
                </Pressable>
              </>
            )}
          </View>
        )}
      </View>

      {/* Detail Head Details Info */}
      <ScrollView 
        style={styles.scrollWrapper} 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {isEditing ? (
          <View style={styles.editForm}>
            <TextInput
              value={editTitle}
              onChangeText={setEditTitle}
              style={[Typography.heading, styles.editTitleInput]}
              placeholder="List title"
              placeholderTextColor={Colors.onSurfaceVariant}
              selectionColor={Colors.primary}
              keyboardAppearance="dark"
            />
            <TextInput
              value={editDesc}
              onChangeText={setEditDesc}
              style={[Typography.bodySm, styles.editDescInput]}
              placeholder="Description (optional)"
              placeholderTextColor={Colors.onSurfaceVariant}
              multiline
              selectionColor={Colors.primary}
              keyboardAppearance="dark"
            />
            <Pressable onPress={() => setIsEditing(false)} style={styles.cancelEditBtn}>
              <Text style={styles.cancelEditBtnText}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.metaContainer}>
            <View style={styles.titleRow}>
              <Text style={[Typography.displayMd, styles.title]}>{list.title}</Text>
              <PrivacyBadge 
                isPublic={list.is_public} 
                onPress={isOwner ? handleTogglePrivacy : undefined} 
              />
            </View>

            {list.description ? (
              <Text style={[Typography.bodySm, styles.description]}>{list.description}</Text>
            ) : null}

            {/* Stats and Progress */}
            <View style={styles.statsContainer}>
              <View style={styles.statsRow}>
                <Text style={[Typography.bodySm, styles.statsLabel]}>
                  {list.watched_count} / {list.item_count} watched
                </Text>
                <Text style={[Typography.bodySm, styles.statsPercent]}>
                  {Math.round(progress * 100)}% Complete
                </Text>
              </View>
              <ProgressBar progress={progress} height={6} />
            </View>

            {/* Owner add action button */}
            {isOwner && (
              <Pressable
                onPress={() => setShowAddSheet(true)}
                style={({ pressed }) => [
                  styles.addFilmBtn,
                  pressed && styles.addFilmBtnPressed
                ]}
              >
                <MaterialIcons name="add" size={20} color={Colors.onPrimary} />
                <Text style={[Typography.bodyLg, styles.addFilmBtnText]}>Add Film</Text>
              </Pressable>
            )}

            {/* Non-owner save action button */}
            <SaveButton listId={id} listOwnerId={list.user_id} />
          </View>
        )}

        {/* Film Items Grid */}
        <View style={styles.gridContainer}>
          {items && items.length > 0 ? (
            <View style={styles.gridContent}>
              {items.map((item) => (
                <FilmItemCard
                  key={item.id}
                  item={item}
                  cardWidth={cardWidth}
                  onLongPress={(content) => handleLongPressItem(item, content)}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="video-library"
              title="This list is empty"
              description={isOwner ? "Tap the Add Film button to start curating your titles." : "The owner hasn't added any films yet."}
              buttonText={isOwner ? "Add my first film" : undefined}
              onButtonPress={isOwner ? () => setShowAddSheet(true) : undefined}
            />
          )}
        </View>
      </ScrollView>

      {/* Add Film Bottom Sheet */}
      {showAddSheet && (
        <AddFilmSheet
          listId={id}
          isVisible={showAddSheet}
          onClose={() => setShowAddSheet(false)}
        />
      )}

      {/* Context Actions Bottom Sheet */}
      {selectedItem && (
        <BottomSheet
          isPresented={showActionSheet}
          onDismiss={() => setShowActionSheet(false)}
        >
          <View style={styles.actionSheetContainer}>
            <Text style={[Typography.heading, styles.actionSheetTitle]}>
              {selectedItem.content?.title || selectedItem.content?.name || 'Film Options'}
            </Text>
            
            <Pressable
              style={styles.actionSheetRow}
              onPress={handleToggleWatched}
            >
              <MaterialIcons 
                name={selectedItem.watched ? 'unpublished' : 'check-circle'} 
                size={22} 
                color={Colors.primary} 
              />
              <Text style={[Typography.bodyLg, styles.actionSheetText]}>
                {selectedItem.watched ? 'Mark Unwatched' : 'Mark Watched'}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.actionSheetRow, styles.deleteRow]}
              onPress={handleRemoveItem}
            >
              <MaterialIcons name="remove-circle" size={22} color={Colors.error} />
              <Text style={[Typography.bodyLg, styles.actionSheetText, styles.deleteText]}>
                Remove from List
              </Text>
            </Pressable>
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
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    marginLeft: 8,
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primary,
  },
  saveBtnText: {
    color: Colors.onPrimary,
    fontWeight: '600',
  },
  scrollWrapper: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  metaContainer: {
    padding: Spacing.gutter,
    backgroundColor: Colors.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceVariant,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    marginBottom: Spacing.xs,
  },
  title: {
    color: Colors.onSurface,
    fontWeight: '700',
    fontSize: 26,
    flex: 1,
    marginRight: Spacing.sm,
  },
  description: {
    color: Colors.onSurfaceVariant,
    opacity: 0.8,
    marginBottom: Spacing.md,
  },
  statsContainer: {
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statsLabel: {
    color: Colors.onSurfaceVariant,
  },
  statsPercent: {
    color: Colors.primary,
    fontWeight: '600',
  },
  addFilmBtn: {
    flexDirection: 'row',
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.card,
  },
  addFilmBtnPressed: {
    opacity: 0.9,
  },
  addFilmBtnText: {
    color: Colors.onPrimary,
    fontWeight: '600',
    marginLeft: 6,
  },
  editForm: {
    padding: Spacing.gutter,
    backgroundColor: Colors.surfaceContainerLow,
  },
  editTitleInput: {
    color: Colors.onSurface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary,
    paddingVertical: 8,
    marginBottom: Spacing.md,
  },
  editDescInput: {
    color: Colors.onSurface,
    borderColor: 'rgba(60, 73, 71, 0.4)',
    borderWidth: 1,
    borderRadius: Radius.md,
    height: 80,
    padding: 8,
    textAlignVertical: 'top',
    marginBottom: Spacing.md,
  },
  cancelEditBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelEditBtnText: {
    color: Colors.onSurfaceVariant,
  },
  gridContainer: {
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.gutter,
  },
  gridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  cardWrapper: {
    padding: 6,
    marginBottom: Spacing.xs,
  },
  actionSheetContainer: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
  },
  actionSheetTitle: {
    color: Colors.onSurface,
    fontWeight: '700',
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerLow,
    paddingBottom: Spacing.xs,
  },
  actionSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerLow,
  },
  actionSheetText: {
    color: Colors.onSurface,
    marginLeft: Spacing.md,
    fontWeight: '600',
  },
  deleteRow: {
    borderBottomWidth: 0,
  },
  deleteText: {
    color: Colors.error,
  },
});
