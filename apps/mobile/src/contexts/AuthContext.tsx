import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import {
  getCurrentUser,
  storeToken,
  clearToken,
  getStoredToken,
  isTokenExpired,
  getStoredPushToken,
  storePushToken,
  clearPushToken,
} from '@/lib/auth';
import { registerForPushNotificationsAsync, getDevicePlatform } from '@/lib/push';
import { useRegisterPushToken, useUnregisterPushToken } from '@/lib/hooks/api';
import type { User } from '@/types';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

interface AuthContextType {
  user: Pick<User, 'id' | 'username'> | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Pick<User, 'id' | 'username'> | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const registerPushToken = useRegisterPushToken();
  const unregisterPushToken = useUnregisterPushToken();

  useEffect(() => {
    async function loadStoredAuth() {
      try {
        const storedToken = await getStoredToken();
        if (storedToken) {
          const currentUser = await getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
            setToken(storedToken);
          } else {
            // Token expired or invalid
            await clearToken();
          }
        }
      } catch (e) {
        console.error('Failed to load auth token', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadStoredAuth();
  }, []);

  const login = async (newToken: string) => {
    await storeToken(newToken);
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    setToken(newToken);
  };

  const logout = useCallback(async () => {
    // Unregister before clearing the auth token — the DELETE call needs a
    // valid JWT, and a device left registered after logout would keep
    // receiving another account's pushes on a shared device.
    const pushToken = await getStoredPushToken();
    if (pushToken) {
      try {
        await unregisterPushToken.mutateAsync(pushToken);
      } catch (e) {
        // best-effort — logout must never hang on a network error
      }
      await clearPushToken();
    }
    await Notifications.setBadgeCountAsync(0).catch(() => {});

    await clearToken();
    setUser(null);
    setToken(null);
    queryClient.clear();
    router.replace('/');
  }, [queryClient, unregisterPushToken]);

  // Token-expiry sweep runs the same cleanup as an explicit logout (push
  // token unregistration, badge reset) so an expired session never leaves
  // stale push registration state behind.
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(async () => {
      if (isTokenExpired(token)) {
        await logout();
        router.replace('/(auth)/login');
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [token, logout]);

  // Registers this device for push whenever a user session becomes active —
  // covers both a fresh login and a relaunch that restores a stored session
  // (login() alone doesn't fire again in that case). Also re-registers if
  // the OS rotates the underlying device push token.
  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const register = async () => {
      const pushToken = await registerForPushNotificationsAsync();
      if (!pushToken || cancelled) return;
      await storePushToken(pushToken);
      registerPushToken.mutate({ token: pushToken, platform: getDevicePlatform() });
    };
    register();

    const sub = Notifications.addPushTokenListener(register);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [user?.id]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
