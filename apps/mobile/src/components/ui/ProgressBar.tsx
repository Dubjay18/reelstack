import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Colors } from '@/constants/theme';

interface ProgressBarProps {
  progress: number; // value between 0 and 1
  height?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, height = 6 }) => {
  const animatedWidth = useSharedValue(0);

  useEffect(() => {
    // Ensure bounds are between 0 and 1
    const clampedProgress = Math.max(0, Math.min(1, isNaN(progress) ? 0 : progress));
    animatedWidth.value = withSpring(clampedProgress, {
      damping: 15,
      stiffness: 100,
    });
  }, [progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value * 100}%`,
  }));

  return (
    <View style={[styles.container, { height, borderRadius: height / 2 }]}>
      <Animated.View style={[styles.fill, fillStyle, { height, borderRadius: height / 2 }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceVariant,
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: Colors.secondary,
  },
});
