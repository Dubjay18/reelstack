import React from 'react';
import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function ListsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="new" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
