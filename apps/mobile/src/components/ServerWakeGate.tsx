import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { Colors, Typography } from '@/constants/theme';
import { wakeGate } from '@/lib/wake-state';

const API_URL =
  Constants.expoConfig?.extra?.apiUrl ?? 'https://reelstack-bv9f.onrender.com';
const POLL_INTERVAL = 2500;
const MAX_RETRIES_BEFORE_HINT = 10;

const MESSAGES = [
  'Spinning up the projector\u2026',
  'Loading the reel\u2026',
  'Starting the feature\u2026',
  'Adjusting the lens\u2026',
  'Rolling the credits\u2026',
];

async function checkHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${API_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

export function ServerWakeGate({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const [rotateAnim] = useState(() => new Animated.Value(0));

  const startPolling = useCallback(() => {
    setVisible(true);
    setRetryCount(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    const poll = async () => {
      const ok = await checkHealth();
      if (ok) {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => setVisible(false));
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      } else {
        setRetryCount((c) => c + 1);
      }
    };

    poll();
    pollingRef.current = setInterval(poll, POLL_INTERVAL);
  }, [fadeAnim]);

  useEffect(() => {
    wakeGate.register(startPolling);
    return () => wakeGate.unregister();
  }, [startPolling]);

  useEffect(() => {
    if (!visible) return;
    const t = setInterval(
      () => setMsgIndex((i) => (i + 1) % MESSAGES.length),
      4000,
    );
    return () => clearInterval(t);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [visible, pulseAnim]);

  useEffect(() => {
    if (!visible) return;
    const spin = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    spin.start();
    return () => spin.stop();
  }, [visible, rotateAnim]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const rotateInterpolation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <>
      {children}

      {visible && (
        <Animated.View
          style={[styles.overlay, { opacity: fadeAnim }]}
          pointerEvents="box-none"
        >
          <LinearGradient
            colors={['#131315', '#0f0f11', '#131315']}
            style={StyleSheet.absoluteFill}
          />

          {/* Spotlight glow */}
          <View style={styles.spotlight} />

          {/* Clapperboard icon with pulse */}
          <Animated.View
            style={[
              styles.iconContainer,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <View style={styles.clapperTop} />
            <View style={styles.clapperBottom} />
            <View style={styles.clapperStripe1} />
            <View style={styles.clapperStripe2} />
          </Animated.View>

          {/* Radar ring animation */}
          <View style={styles.rings}>
            <Animated.View
              style={[
                styles.ring,
                styles.ring1,
                { transform: [{ rotate: rotateInterpolation }] },
              ]}
            />
            <Animated.View
              style={[
                styles.ring,
                styles.ring2,
                { transform: [{ rotate: rotateInterpolation }] },
              ]}
            />
            <View style={styles.ringDot} />
          </View>

          {/* Rotating message */}
          <Text key={msgIndex} style={styles.message}>
            {MESSAGES[msgIndex]}
          </Text>

          <Text style={styles.hint}>
            This may take 30\u201360 seconds on first visit
          </Text>

          {/* Retry count */}
          <View style={styles.retryRow}>
            <View style={styles.filmDot} />
            <Text style={styles.retryText}>
              {retryCount > 0
                ? `Attempt ${Math.min(retryCount, MAX_RETRIES_BEFORE_HINT)}`
                : 'Connecting\u2026'}
            </Text>
          </View>

          {/* Hint after many retries */}
          {retryCount >= MAX_RETRIES_BEFORE_HINT && (
            <View style={styles.hintContainer}>
              <Text style={styles.hintText}>
                Taking longer than expected? The server may be cold-starting.
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.retryButton,
                  pressed && styles.retryButtonPressed,
                ]}
                onPress={() => {
                  setRetryCount(0);
                  startPolling();
                }}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
            </View>
          )}
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  spotlight: {
    position: 'absolute',
    top: '30%',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(79, 219, 200, 0.04)',
  },
  iconContainer: {
    width: 80,
    height: 80,
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clapperTop: {
    position: 'absolute',
    top: 4,
    width: 60,
    height: 20,
    backgroundColor: Colors.primary,
    borderRadius: 4,
    transform: [{ rotate: '-5deg' }],
    opacity: 0.9,
  },
  clapperBottom: {
    position: 'absolute',
    top: 24,
    width: 60,
    height: 36,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  clapperStripe1: {
    position: 'absolute',
    top: 20,
    width: 60,
    height: 3,
    backgroundColor: Colors.primary,
    opacity: 0.6,
  },
  clapperStripe2: {
    position: 'absolute',
    top: 28,
    width: 60,
    height: 3,
    backgroundColor: Colors.primary,
    opacity: 0.6,
  },
  rings: {
    width: 96,
    height: 96,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1.5,
  },
  ring1: {
    width: 96,
    height: 96,
    borderColor: 'rgba(79, 219, 200, 0.15)',
  },
  ring2: {
    width: 64,
    height: 64,
    borderColor: 'rgba(79, 219, 200, 0.25)',
  },
  ringDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(79, 219, 200, 0.3)',
  },
  message: {
    ...Typography.bodyLg,
    color: Colors.onSurface,
    textAlign: 'center',
    marginBottom: 8,
  },
  hint: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    opacity: 0.6,
  },
  retryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 32,
  },
  filmDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: 'rgba(79, 219, 200, 0.4)',
  },
  retryText: {
    ...Typography.caption,
    color: '#3c3c3e',
  },
  hintContainer: {
    marginTop: 24,
    alignItems: 'center',
    gap: 12,
  },
  hintText: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    opacity: 0.7,
    maxWidth: 280,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(79, 219, 200, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(79, 219, 200, 0.2)',
  },
  retryButtonPressed: {
    opacity: 0.7,
  },
  retryButtonText: {
    ...Typography.bodySm,
    color: Colors.primary,
    fontWeight: '600',
  },
});
