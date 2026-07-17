import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, Animated } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius, Typography, Shadow } from '@/constants/theme';
import * as Haptics from 'expo-haptics';

interface PosterCardProps {
  title: string;
  posterPath: string | null;
  watched?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  width?: number;
}

const placeholderBlurhash = 'LKO2?@%gOtNG_3Rjxuof00ofaeWB';

export const PosterCard: React.FC<PosterCardProps> = ({
  title,
  posterPath,
  watched = false,
  onPress,
  onLongPress,
  width = 120,
}) => {
  const [scaleAnim] = useState(() => new Animated.Value(1));

  const imageUrl = posterPath
    ? posterPath.startsWith('http')
      ? posterPath
      : `https://image.tmdb.org/t/p/w500${posterPath}`
    : null;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      damping: 15,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      damping: 15,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const handleLongPress = () => {
    if (onLongPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      onLongPress();
    }
  };

  const height = width * 1.5; // 2:3 aspect ratio

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      onLongPress={onLongPress ? handleLongPress : undefined}
      style={{ width }}
    >
      <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }, { height, borderRadius: Radius.md }]}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            placeholder={{ blurhash: placeholderBlurhash }}
            contentFit="cover"
            transition={300}
            style={[StyleSheet.absoluteFill, { borderRadius: Radius.md }]}
          />
        ) : (
          <View style={[styles.fallbackBg, StyleSheet.absoluteFill, { borderRadius: Radius.md }]}>
            <Text style={[Typography.bodySm, styles.fallbackText]}>{title}</Text>
          </View>
        )}

        <LinearGradient
          colors={['transparent', 'rgba(19, 19, 21, 0.9)']}
          style={[styles.gradient, { borderRadius: Radius.md }]}
        />

        <View style={styles.content}>
          <Text numberOfLines={2} style={[Typography.caption, styles.title]}>
            {title}
          </Text>
        </View>

        {watched && (
          <View style={[styles.watchedIndicator, Shadow.elevated]}>
            <View style={styles.watchedDot} />
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerLow,
    overflow: 'hidden',
    position: 'relative',
    ...Shadow.card,
  },
  fallbackBg: {
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  fallbackText: {
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  content: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
  },
  title: {
    color: Colors.onSurface,
    fontWeight: '600',
  },
  watchedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(235, 156, 62, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.watched,
    shadowColor: Colors.watched,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
});
