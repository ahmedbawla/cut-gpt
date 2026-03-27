import { Stack } from 'expo-router';
import React from 'react';
import Colors from '@/constants/colors';

export default function SavedLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        headerTitleStyle: { fontWeight: '700' as const },
        contentStyle: { backgroundColor: Colors.background },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'My Looks',
        }}
      />
    </Stack>
  );
}
