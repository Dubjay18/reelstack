import React from 'react';
import { StyleSheet, Text, ScrollView, Pressable } from 'react-native';
import { Colors, Radius, Typography, Spacing } from '@/constants/theme';
import * as Haptics from 'expo-haptics';

interface GenrePillsProps {
  genres: string[];
  selectedGenre: string | null;
  onSelectGenre: (genre: string | null) => void;
}

export const GenrePills: React.FC<GenrePillsProps> = ({
  genres,
  selectedGenre,
  onSelectGenre,
}) => {
  const handlePress = (genre: string | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectGenre(genre === selectedGenre ? null : genre);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <Pressable
        onPress={() => handlePress(null)}
        style={[
          styles.pill,
          selectedGenre === null ? styles.activePill : styles.inactivePill,
        ]}
      >
        <Text
          style={[
            Typography.caption,
            styles.text,
            selectedGenre === null ? styles.activeText : styles.inactiveText,
          ]}
        >
          All
        </Text>
      </Pressable>

      {genres.map((genre) => (
        <Pressable
          key={genre}
          onPress={() => handlePress(genre)}
          style={[
            styles.pill,
            selectedGenre === genre ? styles.activePill : styles.inactivePill,
          ]}
        >
          <Text
            style={[
              Typography.caption,
              styles.text,
              selectedGenre === genre ? styles.activeText : styles.inactiveText,
            ]}
          >
            {genre}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.gutter,
    alignItems: 'center',
    height: 48,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: Radius.full,
    marginRight: Spacing.xs,
    borderWidth: 1,
  },
  activePill: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  inactivePill: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(60, 73, 71, 0.5)',
  },
  text: {
    fontWeight: '600',
  },
  activeText: {
    color: Colors.onPrimary,
  },
  inactiveText: {
    color: Colors.onSurfaceVariant,
  },
});
export default GenrePills;
