import NetInfo from '@react-native-community/netinfo';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Share, StyleSheet, View } from 'react-native';

import { useAuth } from '@/features/account/auth-context';
import { buildDiagnosticReport } from '@/core/reliability/diagnostics';
import { AppButton } from '@/shared/components/app-button';
import { PageHeader } from '@/shared/components/page-header';
import { FeedbackModal } from '@/shared/components/feedback-modal';
import { Text } from '@/shared/components/console-text';
import { Screen } from '@/shared/components/screen';
import { goBackOrReplace } from '@/shared/navigation';
import { Fonts, Space, type ThemeColors } from '@/shared/theme';
import { useThemeStyles } from '@/shared/theme-context';
import { getSyncStatusLabel } from '@/shared/learner-facing-copy';
import { useExperienceStore } from '@/store/use-experience-store';
import { useGameStore } from '@/store/use-game-store';
import { useResearchStore } from '@/store/use-research-store';
import { useSandboxStore } from '@/store/use-sandbox-store';

export default function DiagnosticsScreen() {
  const styles = useThemeStyles(createStyles);
  const { status, configured, syncStatus } = useAuth();
  const workspace = useSandboxStore((state) => state.workspace);
  const [report, setReport] = useState('');
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState('');
  const [deleteVisible, setDeleteVisible] = useState(false);
  const researchActive = useResearchStore((state) => state.active);
  const researchTasks = useResearchStore((state) => state.tasks);
  const deleteResearchSession = useResearchStore((state) => state.deleteSession);

  const runChecks = useCallback(async () => {
    setChecking(true);
    setNotice('');
    try {
      const network = await NetInfo.fetch();
      setReport(buildDiagnosticReport({
        appVersion: Constants.expoConfig?.version ?? 'unknown',
        platform: `${Platform.OS} ${String(Platform.Version)}`,
        storage: [
          `learning ${useGameStore.persist.hasHydrated() ? 'ready' : 'pending'}`,
          `sandbox ${useSandboxStore.persist.hasHydrated() ? 'ready' : 'pending'}`,
          `experience ${useExperienceStore.persist.hasHydrated() ? 'ready' : 'pending'}`,
          `research ${useResearchStore.persist.hasHydrated() ? 'ready' : 'pending'}`,
        ].join(', '),
        internet: network.isConnected && network.isInternetReachable !== false ? 'available' : network.isConnected ? 'local connection only' : 'offline',
        cloud: configured ? 'available; private connection details omitted' : 'unavailable',
        authentication: status === 'authenticated' ? 'signed in' : status === 'guest' ? 'guest mode' : 'checking account',
        synchronization: getSyncStatusLabel(syncStatus).toLowerCase(),
        sandbox: `${workspace.devices.length} devices / ${workspace.links.length} links`,
      }));
    } catch {
      setNotice('The network check failed. Local storage information is still safe; retry when ready.');
    } finally {
      setChecking(false);
    }
  }, [configured, status, syncStatus, workspace.devices.length, workspace.links.length]);

  useEffect(() => {
    const timer = setTimeout(() => void runChecks(), 0);
    return () => clearTimeout(timer);
  }, [runChecks]);

  const copy = async () => {
    try { await Clipboard.setStringAsync(report); setNotice('Redacted report copied.'); }
    catch { setNotice('Clipboard is unavailable. Use Share Report instead.'); }
  };

  return <Screen header={<PageHeader leading={{ accessibilityLabel: 'Back to Settings', icon: 'arrow-left', label: 'BACK / SETTINGS', onPress: () => goBackOrReplace('/settings') }} />}>
    <Text variant="label" style={styles.eyebrow}>SUPPORT / LOCAL CHECKS</Text>
    <Text variant="screenTitle" style={styles.title}>DIAGNOSTICS</Text>
    <Text variant="body" style={styles.body}>This privacy-safe report checks saved data, internet access, online backup, and the Sandbox without including personal content or credentials.</Text>
    <View style={styles.panel}>
      <Text selectable variant="technical" style={styles.report}>{report || (checking ? 'CHECKING APP STATUS...' : 'NO REPORT AVAILABLE')}</Text>
    </View>
    {notice ? <Text accessibilityLiveRegion="polite" variant="bodySmall" style={styles.notice}>{notice}</Text> : null}
    <View style={styles.actions}>
      <AppButton disabled={checking} loading={checking} label="Retry checks" variant="secondary" onPress={() => void runChecks()} />
      <AppButton disabled={!report} label="Copy report" variant="primary" onPress={() => void copy()} />
      <AppButton disabled={!report} label="Share report" variant="utility" onPress={() => void Share.share({ message: report, title: 'NetBite diagnostic report' })} />
      {!researchActive && researchTasks.some((task) => task.completedAt || task.abandonedAt) ? <AppButton label="Delete research session" variant="danger" onPress={() => setDeleteVisible(true)} /> : null}
    </View>
    <FeedbackModal visible={deleteVisible} eyebrow="LOCAL RESEARCH DATA" tone="warning" title="Delete the research session?" message="The consent record and aggregate task results will be removed from this device." onRequestClose={() => setDeleteVisible(false)} secondaryAction={{ label: 'Keep session', variant: 'secondary', onPress: () => setDeleteVisible(false) }} primaryAction={{ label: 'Delete session', variant: 'danger', onPress: () => { deleteResearchSession(); setDeleteVisible(false); } }} />
  </Screen>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  eyebrow: { color: colors.orange, marginTop: Space.xl },
  title: { color: colors.text, fontFamily: Fonts.semibold, marginTop: Space.sm },
  body: { color: colors.textMuted, marginVertical: Space.lg },
  panel: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: Space.lg },
  report: { color: colors.text, textTransform: 'none' },
  notice: { color: colors.orange, marginTop: Space.md },
  actions: { gap: Space.sm, marginTop: Space.lg },
});
