import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { MovieDetailProvider } from '@/contexts/MovieDetailContext';
import { ServerWakeGate } from '@/components/ServerWakeGate';
import { Colors } from '@/constants/theme';
import { StatusBar } from 'expo-status-bar';
import { AppErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary';
import { getToastErrorHandler } from '@/lib/toast-bridge';



import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
} from '@expo-google-fonts/hanken-grotesk';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';

// Keep splash screen visible until fonts are loaded
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min
      gcTime: 1000 * 60 * 30,  // 30 min
      retry: 1,
    },
    mutations: {
      onError: (error: unknown) => {
        const message = error instanceof Error ? error.message : 'Something went wrong';
        getToastErrorHandler()?.(message);
      },
    },
  },
});

function RootNavigation({ fontsLoaded, fontError }: { fontsLoaded: boolean; fontError: any }) {
  const { isLoading } = useAuth();

  useEffect(() => {
    if ((fontsLoaded || fontError) && !isLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError, isLoading]);

  if (isLoading || (!fontsLoaded && !fontError)) {
    return null;
  }

  return (
    <ServerWakeGate>
      <AppErrorBoundary>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" options={{ gestureEnabled: false }} />
          <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
          <Stack.Screen name="[username]" />
          <Stack.Screen name="auth/callback" options={{ gestureEnabled: false }} />
          <Stack.Screen name="notifications" />
        </Stack>
      </AppErrorBoundary>
    </ServerWakeGate>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <AuthProvider>
            <ToastProvider>
              <MovieDetailProvider>
                <StatusBar style="light" />
                <RootNavigation fontsLoaded={fontsLoaded} fontError={fontError} />
              </MovieDetailProvider>
            </ToastProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
