import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ErrorBoundary } from 'react-error-boundary';
import { Colors, Typography, Radius, Spacing } from '@/constants/theme';

function DefaultFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>!</Text>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>
        {error.message || 'An unexpected error occurred. Please try again.'}
      </Text>
      <Pressable onPress={resetErrorBoundary} style={styles.button}>
        <Text style={styles.buttonText}>Try again</Text>
      </Pressable>
    </View>
  );
}

interface AppErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AppErrorBoundary({ children, fallback }: AppErrorBoundaryProps) {
  return (
    <ErrorBoundary
      FallbackComponent={fallback ? () => <>{fallback}</> : DefaultFallback}
      onError={(error) => {
        console.error('Unhandled error:', error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.gutter,
    gap: Spacing.md,
  },
  icon: {
    fontSize: 48,
    color: Colors.error,
    fontWeight: '700',
  },
  title: {
    ...Typography.heading,
    color: Colors.onBackground,
    textAlign: 'center',
  },
  message: {
    ...Typography.bodySm,
    color: Colors.outline,
    textAlign: 'center',
    maxWidth: 300,
  },
  button: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.surfaceContainerHigh,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  buttonText: {
    ...Typography.bodySm,
    color: Colors.onSurface,
    fontWeight: '600',
  },
});
