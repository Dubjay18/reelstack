import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useRileyTop } from '@/lib/hooks/api';
import type { RileyTopPick } from '@/types';
import { Colors, Spacing, Typography } from '@/constants/theme';

const SLIDE_MS = 1800;
const COLLAGE_SIZE = 6;

// Hand-picked posters used only as a fallback — before Riley's trending
// data has loaded (or on a fresh install before its first cron run), so
// the auth screen never shows a broken or empty backdrop.
const fallbackPosters = [
  { title: 'Dune: Part Two', posterPath: '/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg' },
  { title: 'Oppenheimer', posterPath: '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg' },
  { title: 'The Bear', posterPath: '/eKfVzzEazSIjJMrw9ADa2x8ksLz.jpg' },
  { title: 'Severance', posterPath: '/pPHpeI2X1qEd1CS1SeyrdhZ4qnT.jpg' },
  { title: 'Everything Everywhere All at Once', posterPath: '/u68AjlvlutfEIcpmbYpKcdi09ut.jpg' },
  { title: 'Parasite', posterPath: '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg' },
];

// Fisher-Yates shuffle — doesn't mutate the input.
function shuffle<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let rand = seed;
  for (let i = out.length - 1; i > 0; i--) {
    rand = (rand * 9301 + 49297) % 233280;
    const j = Math.floor((rand / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Picks up to COLLAGE_SIZE posters from trending movies + series, shuffled
// fresh on every mount. Falls back to a curated static set when trending
// data isn't available yet (loading, error, or too few posters with images).
export function usePosters(): { title: string; posterPath: string }[] {
  const { data } = useRileyTop();
  const [seed] = useState(() => Math.random() * 233280);

  return useMemo(() => {
    const pool: RileyTopPick[] = [...(data?.top_movies?.picks ?? []), ...(data?.top_series?.picks ?? [])];
    const withPosters = pool.filter((p): p is RileyTopPick & { poster_path: string } => !!p.poster_path);

    if (withPosters.length < COLLAGE_SIZE) {
      return fallbackPosters;
    }
    return shuffle(withPosters, seed)
      .slice(0, COLLAGE_SIZE)
      .map((p) => ({ title: p.title, posterPath: p.poster_path }));
  }, [data, seed]);
}

function KenBurnsPoster({ posterPath, isFirst }: { posterPath: string; isFirst: boolean }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = 1;
    scale.value = withTiming(1.12, {
      duration: SLIDE_MS + 1000,
      easing: Easing.linear,
    });
  }, [posterPath, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
      <Image
        source={{ uri: `https://image.tmdb.org/t/p/original${posterPath}` }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        priority={isFirst ? 'high' : 'normal'}
      />
    </Animated.View>
  );
}

// Full-bleed poster carousel for the auth screens — crossfades with a slow
// Ken Burns zoom so the hero never looks static while the form is filled in.
export function AuthBackdropCarousel({ height }: { height: number }) {
  const posters = usePosters();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (posters.length < 2) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % posters.length);
    }, SLIDE_MS);
    return () => clearInterval(timer);
  }, [posters.length]);

  const current = posters[index % posters.length];
  if (!current) return null;

  return (
    <View style={[styles.container, { height }]}>
      <Animated.View
        key={`${index}-${current.posterPath}`}
        style={StyleSheet.absoluteFill}
        entering={FadeIn.duration(1000)}
        exiting={FadeOut.duration(1000)}
      >
        <KenBurnsPoster posterPath={current.posterPath} isFirst={index === 0} />
      </Animated.View>

      {/* Darken for text legibility */}
      <View style={styles.scrim} pointerEvents="none" />
      <LinearGradient
        colors={['transparent', 'transparent', Colors.background]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[Colors.background, 'transparent']}
        style={styles.topFade}
        pointerEvents="none"
      />

      {/* Pull quote */}
      <View style={styles.quoteWrap}>
        <Text style={[Typography.mono, styles.quoteLabel]}>Curator&apos;s log</Text>
        <Text style={[Typography.bodyLg, styles.quoteText]}>
          &ldquo;The best part isn&apos;t the rating. It&apos;s remembering why I gave it one.&rdquo;
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: Colors.background,
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  quoteWrap: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    bottom: Spacing.lg,
  },
  quoteLabel: {
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  quoteText: {
    color: Colors.onSurface,
    fontStyle: 'italic',
  },
});
