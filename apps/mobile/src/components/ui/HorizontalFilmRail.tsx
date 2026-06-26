import React from 'react';
import { StyleSheet, View, Text, FlatList } from 'react-native';
import { PosterCard } from './PosterCard';
import { Colors, Spacing, Typography } from '@/constants/theme';

interface HorizontalFilmRailProps {
  title: string;
  data: any[];
  onItemPress?: (item: any) => void;
  onItemLongPress?: (item: any) => void;
}

export const HorizontalFilmRail: React.FC<HorizontalFilmRailProps> = ({
  title,
  data,
  onItemPress,
  onItemLongPress,
}) => {
  return (
    <View style={styles.container}>
      <Text style={[Typography.heading, styles.title]}>{title}</Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={data}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        renderItem={({ item }) => {
          const isListItem = 'tmdb_id' in item;
          const filmTitle = isListItem ? (item.content?.title || item.content?.name || 'Untitled') : item.title;
          const posterPath = isListItem ? item.content?.poster_path : item.poster_path;
          const watched = isListItem ? item.watched : false;

          return (
            <View style={styles.cardContainer}>
              <PosterCard
                title={filmTitle}
                posterPath={posterPath}
                watched={watched}
                onPress={() => onItemPress?.(item)}
                onLongPress={() => onItemLongPress?.(item)}
                width={120}
              />
            </View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.md,
  },
  title: {
    color: Colors.onSurface,
    paddingHorizontal: Spacing.gutter,
    marginBottom: Spacing.sm,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: Spacing.gutter - 8,
  },
  cardContainer: {
    paddingHorizontal: 8,
  },
});
export default HorizontalFilmRail;
