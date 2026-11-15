import { Stack } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';

import { Colors } from '@/constants/theme';
import { FavoritesProvider } from '@/data/favorites';
import { LibraryProvider } from '@/data/library';
import { PlayerProvider } from '@/data/player';
import { ActionSheet } from '@/components/action-sheet';

export default function RootLayout() {
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
  }, []);

  return (
    <LibraryProvider>
      <FavoritesProvider>
        <PlayerProvider>
          <StatusBar style="light" />
          <ActionSheet />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="player" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="queue" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="playlist/[id]" />
            <Stack.Screen name="video" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          </Stack>
        </PlayerProvider>
      </FavoritesProvider>
    </LibraryProvider>
  );
}
