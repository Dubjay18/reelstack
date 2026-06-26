import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { PosterCard } from './PosterCard';
import { Spacing } from '@/constants/theme';

interface PosterGridProps {
  data: any[];
  onItemPress?: (item: any) => void;
  onItemLongPress?: (item: any) => void;
  numColumns?: number;
  ListEmptyComponent?: React.ComponentType<any> | React.ReactElement | null;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export const PosterGrid: React.FC<PosterGridProps> = ({
  data,
  onItemPress,
  onItemLongPress,
  numColumns = 2,
  ListEmptyComponent,
  ListHeaderComponent,
  refreshing,
  onRefresh,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const AnyFlashList = FlashList as any;
  
  // Calculate dynamic card width
  const totalGutter = Spacing.gutter * 2;
  const totalSpacingBetweenCards = 16 * (numColumns - 1);
  const cardWidth = (windowWidth - totalGutter - totalSpacingBetweenCards) / numColumns;

  return (
    <AnyFlashList
      data={data}
      numColumns={numColumns}
      estimatedItemSize={cardWidth * 1.5 + 16}
      contentContainerStyle={styles.contentContainer}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      refreshing={refreshing}
      onRefresh={onRefresh}
      keyExtractor={(item: any, index: number) => item.id?.toString() || index.toString()}
      renderItem={({ item }: { item: any }) => {
        // Detect shape of list item vs search result
        const isListItem = 'tmdb_id' in item;
        const title = isListItem 
          ? (item.content?.title || item.content?.name || 'Untitled') 
          : (item.title || item.name || 'Untitled');
        const posterPath = isListItem ? item.content?.poster_path : item.poster_path;
        const watched = isListItem ? item.watched : false;

        return (
          <View style={[styles.cardWrapper, { width: cardWidth }]}>
            <PosterCard
              title={title}
              posterPath={posterPath}
              watched={watched}
              onPress={() => onItemPress?.(item)}
              onLongPress={() => onItemLongPress?.(item)}
              width={cardWidth}
            />
          </View>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: Spacing.gutter,
    paddingBottom: Spacing.xl,
  },
  cardWrapper: {
    paddingBottom: 16,
    alignItems: 'center',
  },
});
export default PosterGrid;
