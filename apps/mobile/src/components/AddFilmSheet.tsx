import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, ActivityIndicator, Keyboard } from 'react-native';
import { BottomSheet } from './ui/BottomSheet';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { SearchInput } from './ui/SearchInput';
import { Colors, Radius, Typography, Spacing } from '@/constants/theme';
import { useSearchContent, useAddListItem } from '@/lib/hooks/api';
import { useToast } from '@/contexts/ToastContext';
import { MaterialIcons } from '@expo/vector-icons';

interface AddFilmSheetProps {
  listId: string;
  isVisible: boolean;
  onClose: () => void;
}

export const AddFilmSheet: React.FC<AddFilmSheetProps> = ({
  listId,
  isVisible,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results, isLoading, isError } = useSearchContent(debouncedQuery);
  const addListItemMutation = useAddListItem(listId);

  // Clear query on close
  useEffect(() => {
    if (!isVisible) {
      setQuery('');
      setDebouncedQuery('');
    }
  }, [isVisible]);

  const handleAdd = async (item: any) => {
    Keyboard.dismiss();
    try {
      await addListItemMutation.mutateAsync({
        tmdb_id: item.id,
        media_type: item.media_type,
      });
      showToast(`Added "${item.title || item.name}" to list`, 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to add item', 'error');
    }
  };

  const AnyFlashList = FlashList as any;

  return (
    <BottomSheet isPresented={isVisible} onDismiss={onClose}>
      <View style={styles.container}>
        <Text style={[Typography.heading, styles.sheetTitle]}>Add Film or TV Show</Text>
        
        <View style={styles.searchWrapper}>
          <SearchInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search movie or TV show title..."
          />
        </View>

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : isError ? (
          <View style={styles.centerContainer}>
            <Text style={[Typography.bodySm, styles.errorText]}>Error fetching search results</Text>
          </View>
        ) : results && results.length > 0 ? (
          <View style={styles.listWrapper}>
            <AnyFlashList
              data={results}
              estimatedItemSize={76}
              keyboardShouldPersistTaps="handled"
              keyExtractor={(item: any) => item.id.toString() + item.media_type}
              renderItem={({ item }: { item: any }) => {
                const imageUrl = item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : null;
                const mediaLabel = item.media_type === 'movie' ? 'Movie' : 'TV Series';
                
                return (
                  <Pressable
                    style={({ pressed }) => [
                      styles.itemRow,
                      pressed && styles.itemRowPressed,
                    ]}
                    onPress={() => handleAdd(item)}
                  >
                    {imageUrl ? (
                      <Image
                        source={{ uri: imageUrl }}
                        contentFit="cover"
                        style={styles.thumbnail}
                      />
                    ) : (
                      <View style={styles.fallbackThumbnail}>
                        <MaterialIcons name="movie" size={16} color={Colors.onSurfaceVariant} />
                      </View>
                    )}

                    <View style={styles.itemInfo}>
                      <Text numberOfLines={1} style={[Typography.bodyLg, styles.itemTitle]}>
                        {item.title}
                      </Text>
                      <Text style={[Typography.caption, styles.itemSubtitle]}>
                        {mediaLabel} {item.year ? `· ${item.year}` : ''}
                      </Text>
                    </View>

                    <View style={styles.addButton}>
                      {addListItemMutation.isPending && addListItemMutation.variables?.tmdb_id === item.id ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                      ) : (
                        <MaterialIcons name="add-circle" size={24} color={Colors.primary} />
                      )}
                    </View>
                  </Pressable>
                );
              }}
            />
          </View>
        ) : debouncedQuery.length > 0 ? (
          <View style={styles.centerContainer}>
            <Text style={[Typography.bodySm, styles.infoText]}>No results found for "{debouncedQuery}"</Text>
          </View>
        ) : (
          <View style={styles.centerContainer}>
            <MaterialIcons name="local-movies" size={48} color={Colors.surfaceVariant} style={styles.watermarkIcon} />
            <Text style={[Typography.bodySm, styles.infoText]}>Type to search TMDB titles</Text>
          </View>
        )}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    backgroundColor: Colors.background,
    height: 500,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  sheetTitle: {
    color: Colors.onSurface,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  searchWrapper: {
    marginBottom: Spacing.md,
  },
  listWrapper: {
    flex: 1,
    width: '100%',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerLow,
  },
  itemRowPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  thumbnail: {
    width: 36,
    height: 54,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceVariant,
    marginRight: Spacing.md,
  },
  fallbackThumbnail: {
    width: 36,
    height: 54,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceVariant,
    marginRight: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    color: Colors.onSurface,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemSubtitle: {
    color: Colors.onSurfaceVariant,
  },
  addButton: {
    padding: 8,
  },
  errorText: {
    color: Colors.error,
  },
  infoText: {
    color: Colors.onSurfaceVariant,
    opacity: 0.7,
  },
  watermarkIcon: {
    marginBottom: Spacing.sm,
  },
});
export default AddFilmSheet;
