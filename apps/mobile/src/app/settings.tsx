import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/features/account/auth-context';
import { useContentDelivery } from '@/features/content-delivery/content-context';
import { SettingsGroup, SettingsRow } from '@/features/settings/settings-list';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { FeedbackModal } from '@/shared/components/feedback-modal';
import { PageHeader } from '@/shared/components/page-header';
import { Screen } from '@/shared/components/screen';
import { SegmentedControl } from '@/shared/components/segmented-control';
import { getContentStatusLabel, getSyncStatusLabel } from '@/shared/learner-facing-copy';
import { goBackOrReplace, navigateOnce } from '@/shared/navigation';
import { AppRoutes } from '@/shared/routes';
import { Fonts, Space, type ThemeColors } from '@/shared/theme';
import { useTheme, useThemeStyles } from '@/shared/theme-context';
import { useGameStore } from '@/store/use-game-store';
import { useSandboxStore } from '@/store/use-sandbox-store';
import { isDemoCapabilityEnabled, usePresentationStore } from '@/store/use-presentation-store';
import { isResearchCapabilityEnabled, useResearchStore } from '@/store/use-research-store';

type Confirmation = 'learning' | 'sandbox' | 'presentation' | 'restore';

export default function SettingsScreen() {
  const { colors, preference: themePreference, setPreference: setThemePreference } = useTheme();
  const styles = useThemeStyles(createStyles);
  const { status, configured, syncStatus, error: syncError, syncNow, testProAvailable, testProEnabled, setTestProEnabled } = useAuth();
  const hapticsEnabled = useGameStore((state) => state.hapticsEnabled);
  const motionPreference = useGameStore((state) => state.motionPreference);
  const setHapticsEnabled = useGameStore((state) => state.setHapticsEnabled);
  const setMotionPreference = useGameStore((state) => state.setMotionPreference);
  const resetLearningProgress = useGameStore((state) => state.resetLearningProgress);
  const newNetwork = useSandboxStore((state) => state.newNetwork);
  const presentationActive = usePresentationStore((state) => state.active);
  const startPresentation = usePresentationStore((state) => state.startPresentation);
  const restorePresentation = usePresentationStore((state) => state.restorePresentation);
  const researchActive = useResearchStore((state) => state.active);
  const [confirm, setConfirm] = useState<Confirmation>();
  const [manualSyncBusy, setManualSyncBusy] = useState(false);
  const [contentBusy, setContentBusy] = useState(false);
  const { status: contentStatus, manifest: contentManifest, message: contentMessage, checkNow: checkContentNow, restorePrevious: restorePreviousContent } = useContentDelivery();

  const runManualSync = async () => {
    if (manualSyncBusy || status !== 'authenticated' || presentationActive || researchActive) return;
    setManualSyncBusy(true);
    try { await syncNow(); } finally { setManualSyncBusy(false); }
  };
  const runContentAction = async (action: 'check' | 'restore') => {
    if (contentBusy) return;
    setContentBusy(true);
    try { await (action === 'check' ? checkContentNow() : restorePreviousContent()); } finally { setContentBusy(false); }
  };
  const cloudLabel = presentationActive || researchActive
    ? `ONLINE BACKUP PAUSED / ${researchActive ? 'USABILITY SESSION' : 'PRESENTATION'} IN PROGRESS`
    : status !== 'authenticated'
      ? 'SAVED ON THIS DEVICE / SIGN IN FOR ONLINE BACKUP'
      : getSyncStatusLabel(syncStatus);
  const statusDot = (label: string, ready: boolean, warning: boolean) => <View accessibilityLabel={label} style={[styles.statusDot, ready && styles.statusDotReady, warning && styles.statusDotWarning]} />;

  return <Screen header={<PageHeader leading={{ accessibilityLabel: 'Back to main menu', icon: 'arrow-left', label: 'BACK / MENU', onPress: () => goBackOrReplace('/') }} />}>
    <Text variant="label" style={styles.eyebrow}>APP CONTROLS</Text>
    <Text variant="screenTitle" style={styles.title}>SETTINGS</Text>

    <SettingsGroup label="STATUS & CONTENT">
      <SettingsRow defaultExpanded={syncStatus === 'action-needed'} detail={cloudLabel} icon="backup" title="Online backup" trailing={syncStatus === 'syncing' || manualSyncBusy ? <ActivityIndicator accessibilityLabel="Learning progress is being backed up" color={colors.orange} size="small" /> : statusDot(cloudLabel, syncStatus === 'synced', syncStatus === 'action-needed')}>
        <Text variant="bodySmall" style={styles.detail}>{status === 'authenticated' ? 'NetBite automatically tries again when internet access returns. Your progress stays safe on this device until then.' : configured ? 'Guest progress stays on this device. Sign in when you want to back it up online.' : 'Online backup is unavailable. Lessons, labs, and saved progress continue to work on this device.'}</Text>
        {syncStatus === 'action-needed' && syncError ? <Text accessibilityRole="alert" variant="bodySmall" style={styles.warning}>{syncError}</Text> : null}
        {status === 'authenticated' ? <AppButton disabled={manualSyncBusy || syncStatus === 'syncing' || presentationActive || researchActive} label={manualSyncBusy || syncStatus === 'syncing' ? 'Backing up...' : syncStatus === 'action-needed' ? 'Try backup again' : 'Back up now'} variant="secondary" onPress={() => void runManualSync()} /> : null}
      </SettingsRow>
      <SettingsRow detail={getContentStatusLabel(contentStatus)} icon="learn" title="Learning materials" trailing={contentBusy || contentStatus === 'checking' || contentStatus === 'updating' ? <ActivityIndicator accessibilityLabel="Learning materials are updating" color={colors.orange} size="small" /> : statusDot(contentStatus, contentStatus === 'current' || contentStatus === 'updated', contentStatus === 'offline' || contentStatus === 'error')}>
        <Text variant="bodySmall" style={styles.detail}>{contentMessage}</Text>
        {contentManifest ? <Text variant="bodySmall" style={styles.detail}>Materials version {contentManifest.releaseVersion} · Published {new Date(contentManifest.publishedAt).toLocaleDateString()}</Text> : <Text variant="bodySmall" style={styles.detail}>Built-in learning materials</Text>}
        <AppButton disabled={contentBusy} label={contentBusy ? 'Checking...' : 'Check for content updates'} variant="secondary" onPress={() => void runContentAction('check')} />
        <AppButton disabled={contentBusy} label="Restore previous materials" variant="utility" onPress={() => void runContentAction('restore')} />
      </SettingsRow>
      {testProAvailable ? <SettingsRow detail={testProEnabled ? 'Enabled for this device' : 'Development only'} icon="test" title="Development test access" value={testProEnabled ? 'ENABLED' : 'DISABLED'}>
        <Text variant="bodySmall" style={styles.detail}>Unlocks all Foundation chapters, every Network Operations module, the Integrated Network Operations Lab, and Network Sandbox for testing on this device. It does not create a purchase or permanent Pro access.</Text>
        <AppButton label={testProEnabled ? 'Disable test access' : 'Enable test access'} variant={testProEnabled ? 'secondary' : 'primary'} onPress={() => setTestProEnabled(!testProEnabled)} />
      </SettingsRow> : null}
    </SettingsGroup>

    <SettingsGroup label="PREFERENCES">
      <SettingsRow detail="Theme and display colors" icon="appearance" title="Appearance" value={themePreference.toUpperCase()}>
        <Text variant="bodySmall" style={styles.detail}>Follow the device appearance or keep NetBite in light or dark mode.</Text>
        <SegmentedControl label="Appearance preference" options={[{ id: 'system', label: 'SYSTEM' }, { id: 'light', label: 'LIGHT' }, { id: 'dark', label: 'DARK' }]} value={themePreference} onChange={setThemePreference} />
      </SettingsRow>
      <SettingsRow detail="Touch feedback for actions" icon="haptics" title="Haptics" value={hapticsEnabled ? 'ON' : 'OFF'}>
        <SegmentedControl label="Haptics preference" options={[{ id: 'on', label: 'ON' }, { id: 'off', label: 'OFF' }]} value={hapticsEnabled ? 'on' : 'off'} onChange={(value) => setHapticsEnabled(value === 'on')} />
      </SettingsRow>
      <SettingsRow detail="Animation and packet movement" icon="motion" title="Motion" value={motionPreference.toUpperCase()}>
        <SegmentedControl label="Motion preference" options={[{ id: 'system', label: 'SYSTEM' }, { id: 'reduced', label: 'REDUCED' }]} value={motionPreference} onChange={setMotionPreference} />
      </SettingsRow>
    </SettingsGroup>

    <SettingsGroup label="TOOLS & SUPPORT">
      <SettingsRow detail="Learn how NetBite works" icon="help" onPress={() => navigateOnce(AppRoutes.guide)} title="App guide" />
      <SettingsRow detail="Review connection and storage health" icon="diagnostics" onPress={() => navigateOnce('/diagnostics')} title="Diagnostics" />
      {isResearchCapabilityEnabled ? <SettingsRow detail="Privacy-safe product feedback" icon="test" onPress={() => navigateOnce('/research')} title={researchActive ? 'Continue usability session' : 'Usability toolkit'} /> : null}
      {isDemoCapabilityEnabled ? <SettingsRow detail={presentationActive ? 'Temporary presentation data is active' : 'Load a prepared demonstration'} icon="presentation" title="Presentation mode" value={presentationActive ? 'ACTIVE' : undefined}>
        <Text variant="bodySmall" style={styles.detail}>Temporarily saves your current work and loads prepared learning and Sandbox data. Online backup pauses until your work is restored.</Text>
        <AppButton disabled={researchActive} label={presentationActive ? 'Restore my data' : researchActive ? 'Unavailable during research' : 'Start presentation session'} variant={presentationActive ? 'secondary' : 'primary'} onPress={() => setConfirm(presentationActive ? 'restore' : 'presentation')} />
      </SettingsRow> : null}
    </SettingsGroup>

    <SettingsGroup label="DEVICE DATA">
      <SettingsRow danger detail="Reset progress or erase the Sandbox" icon="reset" title="Reset or erase data">
        <Text variant="bodySmall" style={styles.detail}>NetBite asks for confirmation before removing anything.</Text>
        <AppButton accessibilityHint="Opens a confirmation before deleting learning progress" label="Reset learning progress" variant="danger" onPress={() => setConfirm('learning')} />
        <AppButton accessibilityHint="Opens a confirmation before deleting the sandbox workspace" label="Erase sandbox workspace" variant="danger" onPress={() => setConfirm('sandbox')} />
      </SettingsRow>
    </SettingsGroup>

    <FeedbackModal visible={Boolean(confirm)} tone="warning" eyebrow={confirm === 'presentation' || confirm === 'restore' ? 'PRESENTATION SESSION' : 'CONFIRM LOCAL RESET'} title={confirm === 'learning' ? 'Reset learning progress?' : confirm === 'sandbox' ? 'Erase sandbox workspace?' : confirm === 'presentation' ? 'Start presentation session?' : 'Restore your saved data?'} message={confirm === 'learning' ? 'Completed lessons, labs, quiz scores, and flashcard reviews will be cleared.' : confirm === 'sandbox' ? 'Every sandbox device, cable, and configuration will be removed.' : confirm === 'presentation' ? 'NetBite will save your current learning and Sandbox work before loading temporary presentation data.' : 'Your learning and Sandbox work from before the presentation will be restored.'} detail={confirm === 'presentation' || confirm === 'restore' ? 'Account sign-in information and online data are not changed.' : 'This action cannot be undone after leaving this screen.'} icon="reset" onRequestClose={() => setConfirm(undefined)} secondaryAction={{ label: 'Cancel', variant: 'secondary', onPress: () => setConfirm(undefined) }} primaryAction={{
      label: confirm === 'learning' ? 'Reset learning' : confirm === 'sandbox' ? 'Erase workspace' : confirm === 'presentation' ? 'Start presentation' : 'Restore my data',
      variant: confirm === 'learning' || confirm === 'sandbox' ? 'danger' : 'primary',
      onPress: () => {
        if (confirm === 'learning') resetLearningProgress();
        else if (confirm === 'sandbox') newNetwork();
        else if (confirm === 'presentation') startPresentation();
        else restorePresentation();
        setConfirm(undefined);
      },
    }} />
  </Screen>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  eyebrow: { color: colors.orange },
  title: { color: colors.text, fontFamily: Fonts.semibold, marginTop: Space.sm, marginBottom: Space.xl },
  detail: { color: colors.textMuted },
  warning: { color: colors.orange },
  statusDot: { width: 10, height: 10, flexShrink: 0, borderWidth: 1, borderColor: colors.textMuted, backgroundColor: colors.surface },
  statusDotReady: { borderColor: colors.green, backgroundColor: colors.green },
  statusDotWarning: { borderColor: colors.orange, backgroundColor: colors.orange },
});
