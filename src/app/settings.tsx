import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { useAuth } from '@/features/account/auth-context';
import { AppButton } from '@/shared/components/app-button';
import { DisclosureSection } from '@/shared/components/disclosure-section';
import { FeedbackModal } from '@/shared/components/feedback-modal';
import { IconButton } from '@/shared/components/icon-button';
import { Text } from '@/shared/components/console-text';
import { Screen } from '@/shared/components/screen';
import { goBackOrReplace } from '@/shared/navigation';
import { Fonts, Palette, Space } from '@/shared/theme';
import { useGameStore } from '@/store/use-game-store';
import { useSandboxStore } from '@/store/use-sandbox-store';
import { isDemoCapabilityEnabled, usePresentationStore } from '@/store/use-presentation-store';

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.choice, selected && styles.choiceSelected]}><Text variant="label" style={[styles.choiceText, selected && styles.choiceTextSelected]}>{selected ? '[X] ' : '[ ] '}{label}</Text></Pressable>;
}

export default function SettingsScreen() {
  const { status, configured, syncStatus, error: syncError, syncNow } = useAuth();
  const hapticsEnabled = useGameStore((state) => state.hapticsEnabled);
  const motionPreference = useGameStore((state) => state.motionPreference);
  const setHapticsEnabled = useGameStore((state) => state.setHapticsEnabled);
  const setMotionPreference = useGameStore((state) => state.setMotionPreference);
  const resetLearningProgress = useGameStore((state) => state.resetLearningProgress);
  const newNetwork = useSandboxStore((state) => state.newNetwork);
  const presentationActive = usePresentationStore((state) => state.active);
  const startPresentation = usePresentationStore((state) => state.startPresentation);
  const restorePresentation = usePresentationStore((state) => state.restorePresentation);
  const [confirm, setConfirm] = useState<'learning' | 'sandbox' | 'presentation' | 'restore'>();
  const [manualSyncBusy, setManualSyncBusy] = useState(false);

  const runManualSync = async () => {
    if (manualSyncBusy || status !== 'authenticated' || presentationActive) return;
    setManualSyncBusy(true);
    try { await syncNow(); } finally { setManualSyncBusy(false); }
  };

  const cloudLabel = presentationActive
    ? 'PAUSED / PRESENTATION DATA STAYS LOCAL'
    : status !== 'authenticated'
      ? 'LOCAL / SIGN IN TO ENABLE CLOUD BACKUP'
      : syncStatus === 'syncing'
        ? 'SYNCING / SENDING LOCAL PROGRESS'
        : syncStatus === 'synced'
          ? 'SYNCED / CLOUD BACKUP CURRENT'
          : syncStatus === 'action-needed'
            ? 'ACTION NEEDED / LOCAL COPY IS SAFE'
            : 'LOCAL / WAITING TO SYNC';

  return (
    <Screen>
      <View style={styles.header}><IconButton accessibilityLabel="Back to main menu" icon="arrow-left" label="BACK / MENU" onPress={() => goBackOrReplace('/')} /></View>
      <Text variant="label" style={styles.eyebrow}>APP CONTROLS</Text>
      <Text variant="screenTitle" style={styles.title}>SETTINGS</Text>
      <View accessibilityLiveRegion="polite" style={styles.section}>
        <View style={styles.syncHeader}>
          <Text variant="sectionHeading" style={styles.heading}>CLOUD PROGRESS</Text>
          {syncStatus === 'syncing' || manualSyncBusy ? <ActivityIndicator accessibilityLabel="Cloud progress is syncing" color={Palette.orange} size="small" /> : <View accessibilityLabel={cloudLabel} style={[styles.syncDot, syncStatus === 'synced' && styles.syncDotReady, syncStatus === 'action-needed' && styles.syncDotWarning]} />}
        </View>
        <Text variant="label" style={syncStatus === 'action-needed' ? styles.syncWarning : styles.syncLabel}>{cloudLabel}</Text>
        <Text variant="bodySmall" style={styles.detail}>{status === 'authenticated' ? 'NetBite automatically retries when internet access returns and whenever the app becomes active.' : configured ? 'Guest learning is stored on this device. Sign in from the main menu when cloud backup is wanted.' : 'Supabase is not configured. All lessons and simulations remain available locally.'}</Text>
        {syncStatus === 'action-needed' && syncError ? <Text accessibilityRole="alert" variant="bodySmall" style={styles.syncWarning}>{syncError}</Text> : null}
        {status === 'authenticated' ? <AppButton disabled={manualSyncBusy || syncStatus === 'syncing' || presentationActive} label={manualSyncBusy || syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'action-needed' ? 'Retry cloud sync' : 'Sync now'} variant="secondary" onPress={() => void runManualSync()} /> : null}
      </View>
      <Text variant="label" style={styles.groupLabel}>PREFERENCES</Text>
      <View style={styles.section}>
        <View style={styles.preferenceGroup}>
          <Text variant="sectionHeading" style={styles.heading}>HAPTICS</Text>
          <Text variant="bodySmall" style={styles.detail}>Subtle feedback for selections and warnings.</Text>
          <View style={styles.choices}><Choice label="ON" selected={hapticsEnabled} onPress={() => setHapticsEnabled(true)} /><Choice label="OFF" selected={!hapticsEnabled} onPress={() => setHapticsEnabled(false)} /></View>
        </View>
        <View style={styles.preferenceDivider} />
        <View style={styles.preferenceGroup}>
          <Text variant="sectionHeading" style={styles.heading}>MOTION</Text>
          <Text variant="bodySmall" style={styles.detail}>Follow the system or always reduce transitions and packet movement.</Text>
          <View style={styles.choices}><Choice label="SYSTEM" selected={motionPreference === 'system'} onPress={() => setMotionPreference('system')} /><Choice label="REDUCED" selected={motionPreference === 'reduced'} onPress={() => setMotionPreference('reduced')} /></View>
        </View>
      </View>
      {isDemoCapabilityEnabled ? <View style={styles.section}>
        <Text variant="sectionHeading" style={styles.heading}>PRESENTATION MODE</Text>
        <Text variant="bodySmall" style={styles.detail}>Creates a reversible local demo snapshot, unlocks demo-only access, completes Chapter 1, and loads the routed sandbox preset. Cloud sync is paused.</Text>
        <AppButton label={presentationActive ? 'Restore my data' : 'Start presentation session'} variant={presentationActive ? 'secondary' : 'primary'} onPress={() => setConfirm(presentationActive ? 'restore' : 'presentation')} />
      </View> : null}
      <DisclosureSection danger summary="Reset progress or erase the sandbox workspace." title="DESTRUCTIVE LOCAL DATA">
        <Text variant="bodySmall" style={styles.detail}>These actions affect separate local stores and always require confirmation.</Text>
        <AppButton accessibilityHint="Opens a confirmation before deleting learning progress" label="Reset learning progress" variant="danger" onPress={() => setConfirm('learning')} />
        <AppButton accessibilityHint="Opens a confirmation before deleting the sandbox workspace" label="Erase sandbox workspace" variant="danger" onPress={() => setConfirm('sandbox')} />
      </DisclosureSection>
      <FeedbackModal visible={Boolean(confirm)} tone="warning" eyebrow={confirm === 'presentation' || confirm === 'restore' ? 'PRESENTATION SESSION' : 'CONFIRM LOCAL RESET'} title={confirm === 'learning' ? 'Reset learning progress?' : confirm === 'sandbox' ? 'Erase sandbox workspace?' : confirm === 'presentation' ? 'Start presentation session?' : 'Restore your saved data?'} message={confirm === 'learning' ? 'Completed lessons, labs, quiz scores, and flashcard reviews will be cleared.' : confirm === 'sandbox' ? 'Every sandbox device, cable, and configuration will be removed.' : confirm === 'presentation' ? 'NetBite will preserve the current game and sandbox stores before loading temporary demonstration data.' : 'The exact local game and sandbox snapshot from before the presentation will be restored.'} detail={confirm === 'presentation' || confirm === 'restore' ? 'Authentication tokens and cloud data are never included in the snapshot.' : 'This action cannot be undone after leaving this screen.'} icon="reset" onRequestClose={() => setConfirm(undefined)} secondaryAction={{ label: 'Cancel', variant: 'secondary', onPress: () => setConfirm(undefined) }} primaryAction={{ label: confirm === 'learning' ? 'Reset learning' : confirm === 'sandbox' ? 'Erase workspace' : confirm === 'presentation' ? 'Start presentation' : 'Restore my data', variant: confirm === 'learning' || confirm === 'sandbox' ? 'danger' : 'primary', onPress: () => { if (confirm === 'learning') resetLearningProgress(); else if (confirm === 'sandbox') newNetwork(); else if (confirm === 'presentation') startPresentation(); else restorePresentation(); setConfirm(undefined); } }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 44, marginBottom: Space.xl },
  eyebrow: { color: Palette.orange },
  title: { color: Palette.text, fontFamily: Fonts.semibold, marginTop: Space.sm, marginBottom: Space.xl },
  section: { borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface, padding: Space.lg, gap: Space.md, marginBottom: Space.lg },
  groupLabel: { color: Palette.textMuted, marginBottom: Space.sm },
  preferenceGroup: { gap: Space.md },
  preferenceDivider: { height: 1, backgroundColor: Palette.border, marginVertical: Space.xs },
  heading: { color: Palette.text, fontFamily: Fonts.semibold },
  detail: { color: Palette.textMuted },
  syncHeader: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space.md },
  syncDot: { width: 10, height: 10, borderWidth: 1, borderColor: Palette.textMuted, backgroundColor: Palette.surface },
  syncDotReady: { borderColor: Palette.green, backgroundColor: Palette.green },
  syncDotWarning: { borderColor: Palette.orange, backgroundColor: Palette.orange },
  syncLabel: { color: Palette.green },
  syncWarning: { color: Palette.orange },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  choice: { minWidth: 120, minHeight: 44, flexGrow: 1, borderWidth: 1, borderColor: Palette.border, alignItems: 'center', justifyContent: 'center', padding: Space.sm },
  choiceSelected: { borderColor: Palette.orange, backgroundColor: Palette.orangeSoft },
  choiceText: { color: Palette.textMuted },
  choiceTextSelected: { color: Palette.orange },
});
