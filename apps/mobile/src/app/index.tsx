import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { Colors, Radius, Typography, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { Image } from 'expo-image';

const POSTERS = [
  'https://image.tmdb.org/t/p/w500/vvUzj22FI7paPGH7jRKAehgcpae.jpg', // Dune: Part Two
  'https://image.tmdb.org/t/p/w500/gEU2QvHOm5fgwQmu0z5jJ7v44nF.jpg', // Interstellar
  'https://image.tmdb.org/t/p/w500/7IiTTwg5SMaClW7G8ECt0g9XFCl.jpg', // Parasite
];

export default function LandingScreen() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Floating animation shared values
  const float1 = useSharedValue(0);
  const float2 = useSharedValue(0);
  const float3 = useSharedValue(0);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading]);

  useEffect(() => {
    // Start subtle floating animations
    float1.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 2000 }),
        withTiming(0, { duration: 2000 })
      ),
      -1,
      true
    );
    float2.value = withRepeat(
      withSequence(
        withTiming(8, { duration: 2500 }),
        withTiming(0, { duration: 2500 })
      ),
      -1,
      true
    );
    float3.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 2200 }),
        withTiming(0, { duration: 2200 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle1 = useAnimatedStyle(() => ({
    transform: [{ translateY: float1.value }, { rotate: '-8deg' }],
  }));

  const animatedStyle2 = useAnimatedStyle(() => ({
    transform: [{ translateY: float2.value }, { rotate: '4deg' }],
  }));

  const animatedStyle3 = useAnimatedStyle(() => ({
    transform: [{ translateY: float3.value }, { rotate: '-2deg' }],
  }));

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Background glow blobbing */}
      <View style={styles.glowBlob} />

      {/* Hero Poster Collage */}
      <View style={styles.collageContainer}>
        <Animated.View style={[styles.collagePoster, styles.posterLeft, animatedStyle1]}>
          <Image source={{ uri: POSTERS[0] }} style={styles.posterImage} contentFit="cover" />
        </Animated.View>
        <Animated.View style={[styles.collagePoster, styles.posterRight, animatedStyle2]}>
          <Image source={{ uri: POSTERS[1] }} style={styles.posterImage} contentFit="cover" />
        </Animated.View>
        <Animated.View style={[styles.collagePoster, styles.posterCenter, animatedStyle3]}>
          <Image source={{ uri: POSTERS[2] }} style={styles.posterImage} contentFit="cover" />
        </Animated.View>
      </View>

      {/* Brand Text Section */}
      <View style={styles.brandContainer}>
        <Text style={[Typography.displayMd, styles.brandName]}>Reelstack</Text>
        <Text style={[Typography.bodyLg, styles.tagline]}>
          Your cinema stack. Track, curate, and share your film lists with friends.
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
          ]}
          onPress={() => router.push('/(auth)/register')}
        >
          <Text style={[Typography.bodyLg, styles.primaryButtonText]}>Get started free</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.secondaryButtonPressed,
          ]}
          onPress={() => router.push('/(tabs)/search')}
        >
          <Text style={[Typography.bodyLg, styles.secondaryButtonText]}>Browse lists</Text>
        </Pressable>

        <Pressable
          style={styles.signInLink}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={[Typography.bodySm, styles.signInText]}>
            Already have an account? <Text style={styles.signInSpan}>Sign In</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: Spacing.gutter,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowBlob: {
    position: 'absolute',
    top: '15%',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(79, 219, 200, 0.04)',
    filter: [{ blur: 50 }],
  },
  collageContainer: {
    height: 250,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  collagePoster: {
    width: 110,
    height: 165,
    borderRadius: Radius.md,
    overflow: 'hidden',
    position: 'absolute',
    ...Shadow.elevated,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  posterLeft: {
    left: '12%',
    zIndex: 1,
  },
  posterRight: {
    right: '12%',
    zIndex: 2,
  },
  posterCenter: {
    zIndex: 3,
    top: -10,
  },
  brandContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  brandName: {
    color: Colors.onSurface,
    fontFamily: 'HankenGrotesk_700Bold',
    fontSize: 36,
    letterSpacing: -1,
    marginBottom: Spacing.sm,
  },
  tagline: {
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
  },
  actionContainer: {
    width: '100%',
    paddingHorizontal: Spacing.md,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    ...Shadow.card,
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  primaryButtonText: {
    color: Colors.onPrimary,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(60, 73, 71, 0.6)',
    marginBottom: Spacing.lg,
  },
  secondaryButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  secondaryButtonText: {
    color: Colors.onSurface,
    fontWeight: '600',
  },
  signInLink: {
    alignSelf: 'center',
  },
  signInText: {
    color: Colors.onSurfaceVariant,
  },
  signInSpan: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
