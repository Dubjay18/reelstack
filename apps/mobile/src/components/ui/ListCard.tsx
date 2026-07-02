import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Colors, Radius, Typography, Shadow, Spacing } from '@/constants/theme';
import { PrivacyBadge } from './PrivacyBadge';
import { ProgressBar } from './ProgressBar';
import type { List } from '@/types';
import * as Haptics from 'expo-haptics';

interface ListCardProps {
  list: List;
  username: string;
  onPress?: () => void;
}

export const ListCard: React.FC<ListCardProps> = ({ list, username, onPress }) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  // Generate consistent premium gradients based on list ID / title
  const getGradientColors = (index: number) => {
    // Generate a hash index [0-4] based on list ID
    let charCodeSum = 0;
    if (list.id) {
      charCodeSum += list.id.charCodeAt(0);
    }
    if (list.title) {
      charCodeSum += list.title.charCodeAt(index % list.title.length);
    }
    const hash = charCodeSum % 5;
    
    const gradients: [string, string][] = [
      ['rgba(19, 78, 74, 0.6)', '#131315'], // Teal
      ['rgba(76, 5, 25, 0.6)', '#131315'],   // Rose
      ['rgba(69, 26, 3, 0.6)', '#131315'],   // Amber
      ['rgba(46, 16, 101, 0.6)', '#131315'], // Violet
      ['rgba(6, 78, 59, 0.6)', '#131315'],   // Emerald
    ];
    
    const borders = [
      'rgba(20, 184, 166, 0.2)',
      'rgba(244, 63, 94, 0.2)',
      'rgba(245, 158, 11, 0.2)',
      'rgba(139, 92, 246, 0.2)',
      'rgba(16, 185, 129, 0.2)',
    ];

    return {
      colors: (gradients[hash] || gradients[0]) as [string, string],
      borderColor: borders[hash] || borders[0],
    };
  };

  const g1 = getGradientColors(1);
  const g2 = getGradientColors(2);
  const g3 = getGradientColors(3);

  const progress = list.item_count > 0 ? list.watched_count / list.item_count : 0;
  const firstWord = list.title ? (list.title.split(' ')[0] || 'REEL') : 'REEL';

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const watchlistAccent = list.is_watchlist ? Colors.primary : undefined;

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={styles.pressable}
    >
      <Animated.View style={[
        styles.card,
        list.is_watchlist && { borderColor: Colors.primary, borderWidth: 1.5 },
        animatedStyle,
      ]}>
        <View style={styles.cardHeader}>
          {/* Stacked Thumbnails */}
          <View style={styles.stackContainer}>
            {/* Card 3 (Background) */}
            <LinearGradient
              colors={list.is_watchlist ? ['rgba(79, 219, 200, 0.3)', '#131315'] as [string, string] : g3.colors}
              style={[styles.stackCard, styles.cardBg3, { borderColor: list.is_watchlist ? 'rgba(79, 219, 200, 0.3)' : g3.borderColor }]}
            >
              <Text style={styles.stackTextMini}>★</Text>
            </LinearGradient>

            {/* Card 2 (Midground) */}
            <LinearGradient
              colors={list.is_watchlist ? ['rgba(79, 219, 200, 0.4)', '#131315'] as [string, string] : g2.colors}
              style={[styles.stackCard, styles.cardBg2, { borderColor: list.is_watchlist ? 'rgba(79, 219, 200, 0.4)' : g2.borderColor }]}
            >
              <Text style={styles.stackTextMini}>•••</Text>
            </LinearGradient>

            {/* Card 1 (Foreground) */}
            <LinearGradient
              colors={list.is_watchlist ? ['rgba(79, 219, 200, 0.5)', '#131315'] as [string, string] : g1.colors}
              style={[styles.stackCard, styles.cardBg1, { borderColor: list.is_watchlist ? 'rgba(79, 219, 200, 0.5)' : g1.borderColor }]}
            >
              <Text numberOfLines={2} style={[styles.stackTextMain, list.is_watchlist && { color: Colors.primary }]}>
                {list.is_watchlist ? 'WATCHLIST' : firstWord.toUpperCase()}
              </Text>
            </LinearGradient>
          </View>

          {list.is_watchlist ? (
            <Text style={[Typography.caption, { color: Colors.primary, fontWeight: '700', fontSize: 10 }]}>
              WATCHLIST
            </Text>
          ) : (
            <PrivacyBadge isPublic={list.is_public} />
          )}
        </View>

        <View style={styles.cardBody}>
          <Text numberOfLines={1} style={[Typography.heading, styles.title]}>
            {list.is_watchlist ? 'Watchlist' : list.title}
          </Text>

          {list.description && !list.is_watchlist ? (
            <Text numberOfLines={2} style={[Typography.bodySm, styles.description]}>
              {list.description}
            </Text>
          ) : null}
        </View>

        <View style={styles.cardFooter}>
          {list.item_count > 0 ? (
            <View style={styles.progressContainer}>
              <View style={styles.progressStats}>
                <Text style={[Typography.caption, styles.progressText]}>
                  {list.watched_count} / {list.item_count} watched
                </Text>
                <Text style={[Typography.caption, styles.progressText]}>
                  {Math.round(progress * 100)}%
                </Text>
              </View>
              <ProgressBar progress={progress} height={4} />
            </View>
          ) : (
            <Text style={[Typography.caption, styles.emptyText]}>
              Empty list · Tap to configure
            </Text>
          )}

          <Text style={[Typography.mono, styles.curator]}>
            @{username}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    marginVertical: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(60, 73, 71, 0.5)',
    padding: Spacing.md,
    ...Shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  stackContainer: {
    flexDirection: 'row',
    height: 80,
    width: 140,
    position: 'relative',
  },
  stackCard: {
    width: 55,
    height: 80,
    borderRadius: Radius.sm,
    borderWidth: 1,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    ...Shadow.card,
  },
  cardBg1: {
    left: 0,
    zIndex: 3,
  },
  cardBg2: {
    left: 30,
    zIndex: 2,
    opacity: 0.9,
  },
  cardBg3: {
    left: 60,
    zIndex: 1,
    opacity: 0.8,
  },
  stackTextMain: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 8,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  stackTextMini: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 9,
    color: 'rgba(229, 225, 228, 0.4)',
    textAlign: 'center',
  },
  cardBody: {
    marginBottom: Spacing.md,
  },
  title: {
    color: Colors.onSurface,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    color: Colors.onSurfaceVariant,
    opacity: 0.8,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceVariant,
    paddingTop: Spacing.xs,
  },
  progressContainer: {
    marginBottom: Spacing.xs,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressText: {
    color: Colors.onSurfaceVariant,
  },
  emptyText: {
    color: Colors.onSurfaceVariant,
    fontStyle: 'italic',
    marginBottom: Spacing.xs,
  },
  curator: {
    color: Colors.primary,
    fontSize: 11,
    alignSelf: 'flex-end',
  },
});
export default ListCard;
