import React from 'react';
import { StyleSheet, View, Text, Pressable, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useContentDetails } from '@/lib/hooks/api';
import { MultiSourcePlayer } from '@/components/MultiSourcePlayer';

export default function WatchScreen() {
  const { type, tmdbId, season, episode } = useLocalSearchParams<{
    type: string;
    tmdbId: string;
    season?: string;
    episode?: string;
  }>();
  const router = useRouter();

  const mediaType = type === 'tv' ? 'tv' : 'movie';
  const id = Number(tmdbId);
  const seasonNum = season ? Number(season) : 1;
  const episodeNum = episode ? Number(episode) : 1;

  // Decoupled from the player mount — the player only needs the URL params,
  // so it renders immediately while this header fetch resolves in the background.
  const { data: details } = useContentDetails(mediaType, id);
  const title = details ? ('title' in details ? details.title : (details as any).name) : null;
  const backdropUrl = details?.backdrop_path
    ? `https://image.tmdb.org/t/p/w780${details.backdrop_path}`
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
        </Pressable>
        {title ? (
          <Text numberOfLines={1} style={[Typography.heading, styles.title]}>
            {title}
          </Text>
        ) : (
          <View style={styles.titleSkeleton} />
        )}
      </View>

      <View style={styles.playerWrap}>
        <MultiSourcePlayer
          tmdbId={id}
          mediaType={mediaType}
          season={mediaType === 'tv' ? seasonNum : undefined}
          episode={mediaType === 'tv' ? episodeNum : undefined}
          placeholder={backdropUrl}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
  },
  title: {
    flex: 1,
    color: Colors.onSurface,
  },
  titleSkeleton: {
    flex: 1,
    height: 20,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceVariant,
  },
  playerWrap: {
    paddingHorizontal: Spacing.gutter,
    marginTop: Spacing.sm,
  },
});
