import { FiraCode_400Regular } from '@expo-google-fonts/fira-code/400Regular';
import { FiraCode_500Medium } from '@expo-google-fonts/fira-code/500Medium';
import { FiraCode_600SemiBold } from '@expo-google-fonts/fira-code/600SemiBold';
import { isRunningInExpoGo } from 'expo';
import { useFonts } from 'expo-font';
import { router, Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { Screen } from '@/shared/components/screen';
import { useGameStore } from '@/store/use-game-store';
import { useSandboxStore } from '@/store/use-sandbox-store';

SplashScreen.preventAutoHideAsync();
if (!isRunningInExpoGo()) SplashScreen.setOptions({ duration: 450, fade: true });

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    FiraCode_400Regular,
    FiraCode_500Medium,
    FiraCode_600SemiBold,
  });
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    let active = true;
    const hydrate = async () => {
      try {
        await Promise.all([useGameStore.persist.rehydrate(), useSandboxStore.persist.rehydrate()]);
      } catch {
        // Continue with the initial local state if storage is temporarily unavailable.
      } finally {
        if (active) setStorageReady(true);
      }
    };
    void hydrate();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && storageReady) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError, storageReady]);

  if ((!fontsLoaded && !fontError) || !storageReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: '#151216' } }} />
    </GestureHandlerRootView>
  );
}

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <Screen>
      <Text variant="body">Something interrupted this screen.</Text>
      <AppButton label="Try again" onPress={() => void retry()} />
      <AppButton label="Back to main menu" variant="secondary" onPress={() => router.replace('/')} />
    </Screen>
  );
}
