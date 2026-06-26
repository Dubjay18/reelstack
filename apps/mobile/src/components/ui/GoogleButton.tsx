import React, { useState } from 'react';
import { StyleSheet, Text, Pressable, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { Colors, Radius, Spacing, Shadow } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { AntDesign } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Make sure web browser handles redirects properly in custom sessions
WebBrowser.maybeCompleteAuthSession();

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'https://reelstack-bv9f.onrender.com';

export const GoogleButton: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const redirectUri = Linking.createURL('/auth/callback');
      const authUrl = `${API_URL}/api/v1/auth/google?redirect_uri=${encodeURIComponent(redirectUri)}`;
      
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      
      if (result.type === 'success' && result.url) {
        const parsed = Linking.parse(result.url);
        const token = parsed.queryParams?.token as string;
        
        if (token) {
          await login(token);
          showToast('Successfully authenticated with Google!', 'success');
          router.replace('/(tabs)');
        } else {
          showToast('Failed to obtain login token from Google', 'error');
        }
      } else if (result.type === 'cancel') {
        showToast('Google sign-in cancelled', 'info');
      } else {
        showToast('Google sign-in failed', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'An unexpected error occurred during Google sign-in', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.googleButton,
        pressed && styles.googleButtonPressed,
        loading && styles.googleButtonDisabled,
      ]}
      onPress={handleGoogleLogin}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={Colors.onSurface} size="small" />
      ) : (
        <>
          <AntDesign name="google" size={18} color={Colors.onSurface} style={styles.googleIcon} />
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(60, 73, 71, 0.4)',
    height: 52,
    borderRadius: Radius.md,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    ...Shadow.card,
  },
  googleButtonPressed: {
    opacity: 0.8,
    backgroundColor: Colors.surfaceContainer,
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleIcon: {
    marginRight: Spacing.sm,
  },
  googleButtonText: {
    color: Colors.onSurface,
    fontWeight: '600',
    fontSize: 16,
  },
});

export default GoogleButton;
