import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import { useEmbedSources, EmbedSource } from '@/lib/hooks/api';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

const VIDKING_ORIGIN = 'https://www.vidking.net';

// Known playback events Vidking broadcasts over postMessage. Any PLAYER_EVENT
// (including timeupdate) confirms the embed actually started playing, which is
// the strongest "this source works" signal for failover.
const KNOWN_EVENTS = new Set(['timeupdate', 'play', 'pause', 'ended', 'seeked']);

// Reelstack's "Amber Reel" brand color, used as the Vidking player's default
// accent so playback controls match the app's theme.
export const REELSTACK_BRAND_COLOR = 'eb9c3e';

// How long to wait for a source to respond (WebView load / first playback
// event) before failing over to the next source in the chain.
const FAILOVER_TIMEOUT_MS = 15000;

export interface VidkingPlayerEvent {
  event: 'timeupdate' | 'play' | 'pause' | 'ended' | 'seeked';
  currentTime: number;
  duration: number;
  progress: number;
  id: string;
  mediaType: 'movie' | 'tv';
  season?: number;
  episode?: number;
  timestamp: number;
}

interface MultiSourcePlayerProps {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  season?: number;
  episode?: number;
  color?: string;
  autoPlay?: boolean;
  nextEpisode?: boolean;
  episodeSelector?: boolean;
  progress?: number;
  placeholder?: string | null;
  onEvent?: (event: VidkingPlayerEvent) => void;
}

function buildVidkingUrl(opts: {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  season?: number;
  episode?: number;
  color?: string;
  autoPlay?: boolean;
  nextEpisode?: boolean;
  episodeSelector?: boolean;
  progress?: number;
}): string {
  const { tmdbId, mediaType, season, episode, color, autoPlay, nextEpisode, episodeSelector, progress } = opts;
  const path = mediaType === 'tv'
    ? `/embed/tv/${tmdbId}/${season ?? 1}/${episode ?? 1}`
    : `/embed/movie/${tmdbId}`;

  const params = new URLSearchParams();
  if (color) params.set('color', color.replace('#', ''));
  if (autoPlay) params.set('autoPlay', 'true');
  if (mediaType === 'tv') {
    if (nextEpisode) params.set('nextEpisode', 'true');
    if (episodeSelector) params.set('episodeSelector', 'true');
  }
  if (progress && progress > 0) params.set('progress', String(Math.floor(progress)));

  const qs = params.toString();
  return `${VIDKING_ORIGIN}${path}${qs ? `?${qs}` : ''}`;
}

// Mirrors the web player's contract so the watch screen keeps working even
// if the embed-source API is unreachable or returns nothing.
function vidkingFallback(props: {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  season?: number;
  episode?: number;
  color?: string;
  autoPlay?: boolean;
  nextEpisode?: boolean;
  episodeSelector?: boolean;
  progress?: number;
}): EmbedSource {
  return { id: 'vidking', label: 'VidKing', url: buildVidkingUrl(props) };
}

// Vidking's page calls window.parent.postMessage(...), which works in a
// browser iframe but has no path to RN's WebView onMessage bridge unless
// patched. This override makes postMessage also forward to
// window.ReactNativeWebView.postMessage so onMessage actually fires.
const INJECTED_POSTMESSAGE_BRIDGE = `
(function() {
  var originalPostMessage = window.postMessage.bind(window);
  function bridge(message) {
    try {
      var payload = typeof message === 'string' ? message : JSON.stringify(message);
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(payload);
    } catch (e) {}
  }
  window.postMessage = function(message) {
    bridge(message);
    return originalPostMessage(message);
  };
  if (window.parent === window) {
    window.parent.postMessage = window.postMessage;
  }
})();
true;
`;

export function MultiSourcePlayer({
  tmdbId,
  mediaType,
  season,
  episode,
  color = REELSTACK_BRAND_COLOR,
  autoPlay = false,
  nextEpisode = true,
  episodeSelector = false,
  progress,
  placeholder,
  onEvent,
}: MultiSourcePlayerProps) {
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const { data, isError } = useEmbedSources(mediaType, tmdbId, season, episode);

  // Resolve the ordered source chain (fastest-alive first) from the API,
  // falling back to a built-in Vidking URL if it's unreachable. Derived
  // directly from query state rather than copied into an effect, since it's
  // a pure function of `data`/`isError`.
  const sources = useMemo<EmbedSource[] | null>(() => {
    if (data && Array.isArray(data.sources) && data.sources.length > 0) {
      return data.sources;
    }
    if (data || isError) {
      return [vidkingFallback({ tmdbId, mediaType, season, episode, color, autoPlay, nextEpisode, episodeSelector, progress })];
    }
    return null;
  }, [data, isError, tmdbId, mediaType, season, episode, color, autoPlay, nextEpisode, episodeSelector, progress]);

  const [activeIdx, setActiveIdx] = useState(0);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState(false);

  const activeSource = sources && sources.length > 0 ? sources[Math.min(activeIdx, sources.length - 1)] : null;
  const isLoaded = activeSource ? loadedId === activeSource.id : false;
  const isSwitching = activeIdx > 0;

  const activeSourceRef = useRef(activeSource);
  useEffect(() => {
    activeSourceRef.current = activeSource;
  }, [activeSource]);

  // Failover: if the active source hasn't responded (loaded or played) within
  // the timeout, advance to the next candidate.
  useEffect(() => {
    if (!activeSource || isLoaded || exhausted) return;
    const timer = setTimeout(() => {
      setActiveIdx((prev) => {
        if (sources && prev + 1 < sources.length) return prev + 1;
        setExhausted(true);
        return prev;
      });
    }, FAILOVER_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [activeSource, isLoaded, exhausted, sources]);

  const handleMessage = useCallback((e: WebViewMessageEvent) => {
    let payload: any;
    try {
      payload = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }

    if (!payload || payload.type !== 'PLAYER_EVENT' || !payload.data) return;
    const data = payload.data;
    if (!KNOWN_EVENTS.has(data.event)) return;
    if (String(data.id) !== String(tmdbId)) return;

    if (activeSourceRef.current?.id === 'vidking') {
      setLoadedId(activeSourceRef.current.id);
    }
    onEventRef.current?.(data as VidkingPlayerEvent);
  }, [tmdbId]);

  const handleLoadEnd = useCallback(() => {
    if (activeSourceRef.current) setLoadedId(activeSourceRef.current.id);
  }, []);

  const handleRetry = useCallback(() => {
    setExhausted(false);
    setLoadedId(null);
    setActiveIdx(0);
  }, []);

  const iframeSrc = useMemo(() => {
    if (!activeSource) return '';
    if (activeSource.id === 'vidking') {
      return buildVidkingUrl({ tmdbId, mediaType, season, episode, color, autoPlay, nextEpisode, episodeSelector, progress });
    }
    return activeSource.url;
  }, [activeSource, tmdbId, mediaType, season, episode, color, autoPlay, nextEpisode, episodeSelector, progress]);

  return (
    <View style={styles.container}>
      {activeSource && (
        <WebView
          key={activeSource.url}
          source={{ uri: iframeSrc }}
          style={StyleSheet.absoluteFill}
          allowsFullscreenVideo
          mediaPlaybackRequiresUserAction={false}
          injectedJavaScriptBeforeContentLoaded={INJECTED_POSTMESSAGE_BRIDGE}
          onMessage={handleMessage}
          onLoadEnd={handleLoadEnd}
        />
      )}

      {/* Placeholder sits above the WebView so playback paints over it as
          soon as the embed loads — no black box while the source responds. */}
      {!exhausted && !isLoaded && (
        <View style={styles.overlay}>
          {placeholder && (
            <Image source={{ uri: placeholder }} style={StyleSheet.absoluteFill} contentFit="cover" />
          )}
          <View style={styles.overlayScrim} />
          <View style={styles.overlayContent}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={[Typography.mono, styles.overlayText]}>
              {isSwitching ? 'SWITCHING SOURCE…' : 'LOADING PLAYER…'}
            </Text>
          </View>
        </View>
      )}

      {exhausted && (
        <View style={styles.overlay}>
          <View style={styles.overlayScrim} />
          <View style={styles.errorContent}>
            <MaterialIcons name="warning" size={24} color={Colors.onSurfaceVariant} />
            <Text style={[Typography.bodySm, styles.errorText]}>
              The player couldn&apos;t reach any available source. This title may not currently be available.
            </Text>
            <Pressable style={styles.retryButton} onPress={handleRetry}>
              <MaterialIcons name="refresh" size={14} color={Colors.onPrimary} />
              <Text style={[Typography.bodySm, styles.retryButtonText]}>Try again</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceContainer,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.surfaceContainer,
  },
  overlayContent: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  overlayText: {
    color: Colors.onSurfaceVariant,
    letterSpacing: 1,
  },
  errorContent: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  errorText: {
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  retryButtonText: {
    color: Colors.onPrimary,
    fontWeight: '600',
  },
});
