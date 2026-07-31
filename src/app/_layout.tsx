import { FiraCode_400Regular } from '@expo-google-fonts/fira-code/400Regular';
import { FiraCode_500Medium } from '@expo-google-fonts/fira-code/500Medium';
import { FiraCode_600SemiBold } from '@expo-google-fonts/fira-code/600SemiBold';
import { isRunningInExpoGo } from 'expo';
import { useFonts } from 'expo-font';
import { router, Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth } from '@/features/account/auth-context';
import { createEmptySandboxWorkspace } from '@/core/network/sandbox';
import { ProgressMergeModal } from '@/features/account/components/progress-merge-modal';
import { PresentationBanner } from '@/features/demo/presentation-banner';
import { ResearchBanner } from '@/features/research/research-banner';
import { AppButton } from '@/shared/components/app-button';
import { BootstrapScreen } from '@/shared/components/bootstrap-screen';
import { Text } from '@/shared/components/console-text';
import { Screen } from '@/shared/components/screen';
import { useGameStore } from '@/store/use-game-store';
import { useExperienceStore } from '@/store/use-experience-store';
import { gameStorage } from '@/store/game-storage';
import { usePresentationStore } from '@/store/use-presentation-store';
import { useSandboxStore } from '@/store/use-sandbox-store';
import { useResearchStore } from '@/store/use-research-store';

SplashScreen.preventAutoHideAsync();
if (!isRunningInExpoGo()) SplashScreen.setOptions({ duration: 450, fade: true });

function ResolvedApplication() {
  const { status, continueAsGuest, error } = useAuth();
  if (status === 'loading') return <BootstrapScreen phase="auth" detail={error ?? 'Cloud account checks are bounded. Local learning remains available.'} onContinue={continueAsGuest} />;
  return (
    <View style={styles.application}>
      <StatusBar style="light" />
      <PresentationBanner />
      <ResearchBanner />
      <View style={styles.stack}><Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: '#151216' } }} /></View>
      <ProgressMergeModal />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    FiraCode_400Regular,
    FiraCode_500Medium,
    FiraCode_600SemiBold,
  });
  const [storageState, setStorageState] = useState<'loading' | 'ready' | 'degraded'>('loading');
  const [hydrateAttempt, setHydrateAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const timeout = setTimeout(() => { if (active) setStorageState('degraded'); }, 8_000);
    const hydrate = async () => {
      try {
        await Promise.all([useGameStore.persist.rehydrate(), useSandboxStore.persist.rehydrate(), usePresentationStore.persist.rehydrate(), useExperienceStore.persist.rehydrate(), useResearchStore.persist.rehydrate()]);
        if (useSandboxStore.getState().guideSeen) useExperienceStore.getState().markGuideSeen('sandbox-v1');
        if (active) setStorageState('ready');
      } catch {
        if (active) setStorageState('degraded');
      }
    };
    void hydrate();
    return () => { active = false; clearTimeout(timeout); };
  }, [hydrateAttempt]);

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  if (!fontsLoaded && !fontError) return <BootstrapScreen phase="fonts" detail="Loading the readable console typeface." />;
  if (storageState === 'loading') return <BootstrapScreen phase="storage" detail="Restoring lessons, settings, and the sandbox workspace from this device." />;
  if (storageState === 'degraded') return <BootstrapScreen phase="degraded" detail="Local storage did not finish loading. Retry, or preserve a recovery copy and continue with safe local defaults." onRetry={() => { setStorageState('loading'); setHydrateAttempt((value) => value + 1); }} onContinue={() => { void preserveRecoveryCopy().finally(() => setStorageState('ready')); }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ResolvedApplication />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

async function preserveRecoveryCopy() {
  const recovery = {
    createdAt: new Date().toISOString(),
    game: await gameStorage.getItem('netbite-game-state-v1'),
    sandbox: await gameStorage.getItem('netbite-sandbox-state-v1'),
    presentation: await gameStorage.getItem('netbite-presentation-state-v1'),
    research: await gameStorage.getItem('netbite-research-state-v1'),
  };
  await gameStorage.setItem(`netbite-recovery-${Date.now()}`, JSON.stringify(recovery));
  await Promise.all([useGameStore.persist.clearStorage(), useSandboxStore.persist.clearStorage(), usePresentationStore.persist.clearStorage(), useResearchStore.persist.clearStorage()]);
  useGameStore.getState().resetLearningProgress();
  useGameStore.getState().resetLab();
  useSandboxStore.setState({ workspace: createEmptySandboxWorkspace(), guideSeen: false, past: [], future: [] });
  usePresentationStore.setState({ active: false, snapshot: undefined });
  useResearchStore.getState().deleteSession();
}

export function ErrorBoundary({ retry, error }: ErrorBoundaryProps) {
  return (
    <Screen>
      <Text variant="screenTitle">SCREEN INTERRUPTED</Text>
      <Text variant="body">NetBite stopped this screen before it could affect local learning data.</Text>
      <Text variant="technical">DIAGNOSTIC / {error instanceof Error ? error.name : 'ROUTE ERROR'} / NO KEYS OR ACCOUNT DATA SHOWN</Text>
      <AppButton label="Try again" onPress={() => void retry()} />
      <AppButton label="Learning path" variant="secondary" onPress={() => router.replace('/learn')} />
      <AppButton label="Main menu" variant="secondary" onPress={() => router.replace('/')} />
    </Screen>
  );
}

const styles = StyleSheet.create({ application: { flex: 1, backgroundColor: '#151216' }, stack: { flex: 1 } });
