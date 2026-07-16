import React from 'react';
import { StyleSheet, Text, View, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '@/constants/theme';
import { useSavedLists } from '@/lib/hooks/api';
import { ListCard } from '@/components/ui/ListCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import type { SavedList } from '@/types';

const AnyFlashList = FlashList as any;

export default function SavedListsScreen() {
  const { isAuthorized } = useAuthGuard();
  const router = useRouter();
  const { data: savedLists, isLoading, refetch, isRefetching } = useSavedLists();

  if (!isAuthorized) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
        </Pressable>
        <Text style={[Typography.heading, styles.headerTitle]}>Saved Lists</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <View style={styles.listWrapper}>
          <AnyFlashList
            data={savedLists ?? []}
            estimatedItemSize={140}
            contentContainerStyle={styles.listContent}
            refreshing={isRefetching}
            onRefresh={refetch}
            keyExtractor={(item: SavedList) => item.id}
            renderItem={({ item }: { item: SavedList }) => (
              <ListCard
                list={item}
                username={item.owner_username}
                onPress={() => router.push(`/(tabs)/lists/${item.id}`)}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyWrapper}>
                <EmptyState
                  icon="bookmark-border"
                  title="No saved lists"
                  description="Lists you save from other curators will show up here."
                />
              </View>
            }
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  listWrapper: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.gutter,
    paddingBottom: Spacing.xl,
  },
  emptyWrapper: {
    paddingTop: 60,
    paddingHorizontal: Spacing.gutter,
  },
});
