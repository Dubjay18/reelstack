import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Colors, Typography } from '@/constants/theme';

/**
 * Auth Callback Screen
 *
 * This screen is the deep-link target for Google OAuth:
 *   reelstack://auth/callback?token=<JWT>
 *
 * The backend (GoogleCallback handler) redirects here after a successful
 * Google sign-in, appending the signed JWT as a query parameter.
 * We store the token in SecureStore via AuthContext.login() and then
 * navigate the user into the main tabs.
 *
 * If the token is missing or login fails we fall back to the login screen
 * and show an error toast.
 */
export default function AuthCallbackScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { login } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    async function handleCallback() {
      if (!token) {
        showToast('Google sign-in failed — no token received.', 'error');
        router.replace('/(auth)/login');
        return;
      }

      try {
        await login(token as string);
        showToast('Successfully signed in with Google!', 'success');
        router.replace('/(tabs)');
      } catch (err: any) {
        console.error('[AuthCallback] login failed:', err);
        showToast(err?.message || 'Failed to complete Google sign-in.', 'error');
        router.replace('/(auth)/login');
      }
    }

    handleCallback();
  }, [token]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={[Typography.bodySm, styles.label]}>Completing sign-in…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  label: {
    color: Colors.onSurfaceVariant,
    opacity: 0.7,
  },
});
