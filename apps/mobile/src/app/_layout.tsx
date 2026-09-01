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
import { ContentProvider, useContentDelivery } from '@/features/content-delivery/content-context';
import { createEmptySandboxWorkspace } from '@/core/network/sandbox';
import { hydratePersistedStores } from '@/core/reliability/storage-hydration';
import { ProgressMergeModal } from '@/features/account/components/progress-merge-modal';
import { PresentationBanner } from '@/features/demo/presentation-banner';
import { ResearchBanner } from '@/features/research/research-banner';
import { AppButton } from '@/shared/components/app-button';
import { PageHeader } from '@/shared/components/page-header';
import { BootstrapScreen } from '@/shared/components/bootstrap-screen';
import { Text } from '@/shared/components/console-text';
import { Screen } from '@/shared/components/screen';
import { getRecoveryMessage } from '@/shared/learner-facing-copy';
import { ThemeProvider, useTheme } from '@/shared/theme-context';
import { useGameStore } from '@/store/use-game-store';
import { useExperienceStore } from '@/store/use-experience-store';
import { gameStorage } from '@/store/game-storage';
import { usePresentationStore } from '@/store/use-presentation-store';
import { useSandboxStore } from '@/store/use-sandbox-store';
import { useResearchStore } from '@/store/use-research-store';
import { useOperationsLabStore } from '@/store/use-operations-lab-store';
import { useProtocolLabStore } from '@/store/use-protocol-lab-store';
import { useStandardsStore } from '@/store/use-standards-store';
import { useWorkshopStore } from '@/store/use-workshop-store';
import { useThemeStore } from '@/store/use-theme-store';

SplashScreen.preventAutoHideAsync();
if (!isRunningInExpoGo()) SplashScreen.setOptions({ duration: 450, fade: true });

function ResolvedApplication() {
  const { colors, resolvedTheme } = useTheme();
  const { status, continueAsGuest, error } = useAuth();
  const { resolved: contentResolved, runtimeKey } = useContentDelivery();
  if (!contentResolved) return <BootstrapScreen phase="storage" detail="Loading the latest verified learning materials from this device." />;
  if (status === 'loading') return <BootstrapScreen phase="auth" detail={error ?? 'Checking whether your online backup is available. You can continue offline at any time.'} onContinue={continueAsGuest} />;
  return (
    <View style={[styles.application, { backgroundColor: colors.background }]}>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
      <PresentationBanner />
      <ResearchBanner />
      <View style={styles.stack}><Stack key={`${runtimeKey}-${resolvedTheme}`} screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.background } }} /></View>
      <ProgressMergeModal />
    </View>
  );
}

function RootLayoutContent() {
  const [fontsLoaded, fontError] = useFonts({
    FiraCode_400Regular,
    FiraCode_500Medium,
    FiraCode_600SemiBold,
  });
  const [storageState, setStorageState] = useState<'loading' | 'ready' | 'degraded'>('loading');
  const [hydrateAttempt, setHydrateAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const hydrate = async () => {
      const result = await hydratePersistedStores([
        { id: 'learning', hydrate: useGameStore.persist.rehydrate, hasHydrated: useGameStore.persist.hasHydrated },
        { id: 'sandbox', hydrate: useSandboxStore.persist.rehydrate, hasHydrated: useSandboxStore.persist.hasHydrated },
        { id: 'presentation', hydrate: usePresentationStore.persist.rehydrate, hasHydrated: usePresentationStore.persist.hasHydrated },
        { id: 'experience', hydrate: useExperienceStore.persist.rehydrate, hasHydrated: useExperienceStore.persist.hasHydrated },
        { id: 'research', hydrate: useResearchStore.persist.rehydrate, hasHydrated: useResearchStore.persist.hasHydrated },
        { id: 'operations-labs', hydrate: useOperationsLabStore.persist.rehydrate, hasHydrated: useOperationsLabStore.persist.hasHydrated },
        { id: 'protocol-labs', hydrate: useProtocolLabStore.persist.rehydrate, hasHydrated: useProtocolLabStore.persist.hasHydrated },
        { id: 'standards', hydrate: useStandardsStore.persist.rehydrate, hasHydrated: useStandardsStore.persist.hasHydrated },
        { id: 'workshops', hydrate: useWorkshopStore.persist.rehydrate, hasHydrated: useWorkshopStore.persist.hasHydrated },
        { id: 'theme', hydrate: useThemeStore.persist.rehydrate, hasHydrated: useThemeStore.persist.hasHydrated },
      ]);
      if (!active) return;
      if (result.status === 'failed') {
        console.warn(`[storage] Hydration failed after ${result.attempts} attempts: ${result.failedStoreIds.join(', ')}`);
        setStorageState('degraded');
        return;
      }
      if (useSandboxStore.getState().guideSeen) useExperienceStore.getState().markGuideSeen('sandbox-v1');
      setStorageState('ready');
    };
    void hydrate();
    return () => { active = false; };
  }, [hydrateAttempt]);

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  if (!fontsLoaded && !fontError) return <BootstrapScreen phase="fonts" detail="Loading the readable console typeface." />;
  if (storageState === 'loading') return <BootstrapScreen phase="storage" detail="Restoring lessons, settings, and the sandbox workspace from this device." />;
  if (storageState === 'degraded') return <BootstrapScreen phase="degraded" detail={getRecoveryMessage('app-data')} onRetry={() => { setStorageState('loading'); setHydrateAttempt((value) => value + 1); }} onContinue={() => { void preserveRecoveryCopy().finally(() => setStorageState('ready')); }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ContentProvider><AuthProvider><ResolvedApplication /></AuthProvider></ContentProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return <ThemeProvider><RootLayoutContent /></ThemeProvider>;
}

async function preserveRecoveryCopy() {
  const recovery = {
    createdAt: new Date().toISOString(),
    game: await gameStorage.getItem('netbite-game-state-v1'),
    sandbox: await gameStorage.getItem('netbite-sandbox-state-v1'),
    presentation: await gameStorage.getItem('netbite-presentation-state-v1'),
    research: await gameStorage.getItem('netbite-research-state-v1'),
    operationsLabs: await gameStorage.getItem('netbite-operations-labs-v1'),
    protocolLabs: await gameStorage.getItem('netbite-protocol-labs-v1'),
    standards: await gameStorage.getItem('netbite-standards-cache-v1'),
    workshops: await gameStorage.getItem('netbite-workshops-v1'),
    theme: await gameStorage.getItem('netbite-theme-v1'),
  };
  await gameStorage.setItem(`netbite-recovery-${Date.now()}`, JSON.stringify(recovery));
  await Promise.all([useGameStore.persist.clearStorage(), useSandboxStore.persist.clearStorage(), usePresentationStore.persist.clearStorage(), useResearchStore.persist.clearStorage(), useOperationsLabStore.persist.clearStorage(), useProtocolLabStore.persist.clearStorage(), useStandardsStore.persist.clearStorage(), useWorkshopStore.persist.clearStorage(), useThemeStore.persist.clearStorage()]);
  useGameStore.getState().resetLearningProgress();
  useGameStore.getState().resetLab();
  useSandboxStore.setState({ workspace: createEmptySandboxWorkspace(), guideSeen: false, past: [], future: [] });
  usePresentationStore.setState({ active: false, snapshot: undefined });
  useResearchStore.getState().deleteSession();
  useOperationsLabStore.setState({ sessions: {}, history: {} });
  useProtocolLabStore.setState({ sessions: {}, history: {} });
  useStandardsStore.setState({ cache: {} });
  useWorkshopStore.getState().clearWorkshops();
}

export function ErrorBoundary({ retry, error }: ErrorBoundaryProps) {
  return (
    <Screen header={<PageHeader leading={{ accessibilityLabel: 'Return to main menu', icon: 'arrow-left', label: 'MAIN MENU', onPress: () => router.replace('/') }} />}>
      <Text variant="screenTitle">SCREEN INTERRUPTED</Text>
      <Text variant="body">NetBite stopped this screen before it could affect local learning data.</Text>
      <Text variant="bodySmall">No learning progress was changed. Open Diagnostics from Settings if the problem continues.</Text>
      <AppButton label="Try again" onPress={() => void retry()} />
      <AppButton label="Learning path" variant="secondary" onPress={() => router.replace('/learn')} />
      <AppButton label="Main menu" variant="secondary" onPress={() => router.replace('/')} />
    </Screen>
  );
}

const styles = StyleSheet.create({ application: { flex: 1, backgroundColor: '#151216' }, stack: { flex: 1 } });
