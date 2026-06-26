import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { Colors, Radius, Spacing } from '@/constants/theme';

interface SkeletonCardProps {
  variant?: 'poster' | 'list';
  width?: number;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ variant = 'poster', width = 120 }) => {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 800 }),
        withTiming(0.4, { duration: 800 })
      ),
      -1, // infinite loop
      true // auto-reverse
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const height = variant === 'poster' ? width * 1.5 : 120;

  if (variant === 'list') {
    return (
      <Animated.View style={[styles.listContainer, animatedStyle]}>
        <View style={styles.listLeft} />
        <View style={styles.listRight}>
          <View style={styles.lineLong} />
          <View style={styles.lineShort} />
          <View style={styles.lineProgress} />
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.posterContainer,
        animatedStyle,
        { width, height, borderRadius: Radius.md },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  posterContainer: {
    backgroundColor: Colors.surfaceVariant,
  },
  listContainer: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    height: 120,
    marginVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(60, 73, 71, 0.2)',
  },
  listLeft: {
    width: 80,
    height: '100%',
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceVariant,
    marginRight: Spacing.md,
  },
  listRight: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  lineLong: {
    width: '80%',
    height: 16,
    borderRadius: 4,
    backgroundColor: Colors.surfaceVariant,
  },
  lineShort: {
    width: '40%',
    height: 12,
    borderRadius: 4,
    backgroundColor: Colors.surfaceVariant,
  },
  lineProgress: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceVariant,
  },
});
export default SkeletonCard;
