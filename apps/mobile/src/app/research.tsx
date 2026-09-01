import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { AppButton } from '@/shared/components/app-button';
import { FeedbackModal } from '@/shared/components/feedback-modal';
import { PageHeader } from '@/shared/components/page-header';
import { Text } from '@/shared/components/console-text';
import { Screen } from '@/shared/components/screen';
import { goBackOrReplace, navigateOnce } from '@/shared/navigation';
import { Fonts, Space, type ThemeColors } from '@/shared/theme';
import { useThemeStyles } from '@/shared/theme-context';
import { formatResearchSummary, isResearchCapabilityEnabled, researchTasks, useResearchStore } from '@/store/use-research-store';
import { usePresentationStore } from '@/store/use-presentation-store';

export default function ResearchScreen() {
  const styles = useThemeStyles(createStyles);
  const active = useResearchStore((state) => state.active);
  const tasks = useResearchStore((state) => state.tasks);
  const startSession = useResearchStore((state) => state.startSession);
  const recordHelp = useResearchStore((state) => state.recordHelp);
  const abandonCurrentTask = useResearchStore((state) => state.abandonCurrentTask);
  const restoreSession = useResearchStore((state) => state.restoreSession);
  const deleteSession = useResearchStore((state) => state.deleteSession);
  const [confirm, setConfirm] = useState<'consent' | 'restore' | 'delete'>();
  const [notice, setNotice] = useState('');
  const presentationActive = usePresentationStore((state) => state.active);
  const current = tasks.find((task) => !task.completedAt && !task.abandonedAt);
  const definition = researchTasks.find((task) => task.id === current?.id);
  const summary = formatResearchSummary(tasks);

  if (!isResearchCapabilityEnabled) return <Screen header={<PageHeader leading={{ accessibilityLabel: 'Back to Settings', icon: 'arrow-left', label: 'BACK / SETTINGS', onPress: () => goBackOrReplace('/settings') }} />}><Text variant="screenTitle">RESEARCH MODE DISABLED</Text><Text variant="body">Set the development-only research environment flag to enable this local toolkit.</Text></Screen>;

  const openTask = () => {
    if (!current) return;
    if (current.id === 'continue-learning') navigateOnce('/');
    else if (current.id === 'find-subnetting') navigateOnce('/learn');
    else navigateOnce('/sandbox');
  };

  const copy = async () => { try { await Clipboard.setStringAsync(summary); setNotice('Research summary copied.'); } catch { setNotice('Clipboard is unavailable. Use Share instead.'); } };

  return <Screen header={<PageHeader leading={{ accessibilityLabel: 'Back to Settings', icon: 'arrow-left', label: 'BACK / SETTINGS', onPress: () => goBackOrReplace('/settings') }} />}>
    <Text variant="label" style={styles.eyebrow}>DEVELOPMENT / LOCAL ONLY</Text>
    <Text variant="screenTitle" style={styles.title}>USABILITY SESSION</Text>
    {!active && !tasks.some((task) => task.completedAt || task.abandonedAt) ? <View style={styles.panel}>
      <Text variant="sectionHeading">CONSENT REQUIRED</Text>
      <Text variant="body" style={styles.body}>NetBite records only task timing, completion or abandonment, help use, and error counts. It never records notes, commands, addresses, email, taps, account identifiers, or screen contents.</Text>
      {presentationActive ? <Text variant="bodySmall" style={styles.notice}>Restore the active presentation session before starting research.</Text> : <AppButton label="Review and consent" onPress={() => setConfirm('consent')} />}
    </View> : null}
    {active && current && definition ? <>
      <View style={styles.progress}><Text variant="label" style={styles.green}>TASK {tasks.indexOf(current) + 1} OF {tasks.length}</Text><Text variant="sectionHeading">{definition.title.toUpperCase()}</Text><Text variant="body" style={styles.body}>{definition.instruction}</Text></View>
      <AppButton label="Open task" onPress={openTask} />
      <AppButton label="I need help" variant="secondary" onPress={() => { recordHelp(); setNotice('Help use recorded without penalty.'); }} />
      <AppButton label="Abandon this task" variant="utility" onPress={abandonCurrentTask} />
    </> : null}
    {(active && !current) || (!active && tasks.some((task) => task.completedAt || task.abandonedAt)) ? <View style={styles.panel}>
      <Text variant="sectionHeading">SESSION SUMMARY</Text>
      <Text selectable variant="technical" style={styles.summary}>{summary}</Text>
      <AppButton label="Copy summary" onPress={() => void copy()} />
      <AppButton label="Share summary" variant="secondary" onPress={() => void Share.share({ message: summary, title: 'NetBite usability session' })} />
    </View> : null}
    {active ? <AppButton label="End session and restore data" variant="danger" onPress={() => setConfirm('restore')} /> : tasks.some((task) => task.completedAt || task.abandonedAt) ? <AppButton label="Delete research session" variant="danger" onPress={() => setConfirm('delete')} /> : null}
    {notice ? <Text accessibilityLiveRegion="polite" variant="bodySmall" style={styles.notice}>{notice}</Text> : null}
    <FeedbackModal visible={Boolean(confirm)} eyebrow="LOCAL RESEARCH" tone="warning" title={confirm === 'consent' ? 'Start the usability session?' : confirm === 'restore' ? 'End and restore your data?' : 'Delete this summary?'} message={confirm === 'consent' ? 'NetBite will temporarily save your current learning and Sandbox work. Online backup pauses until the session ends.' : confirm === 'restore' ? 'Your learning and Sandbox work from before this session will be restored.' : 'The task results and consent record will be removed from this device.'} onRequestClose={() => setConfirm(undefined)} secondaryAction={{ label: 'Cancel', variant: 'secondary', onPress: () => setConfirm(undefined) }} primaryAction={{ label: confirm === 'consent' ? 'I consent / Start' : confirm === 'restore' ? 'Restore my data' : 'Delete session', variant: confirm === 'delete' ? 'danger' : 'primary', onPress: () => { if (confirm === 'consent') startSession(); else if (confirm === 'restore') restoreSession(); else deleteSession(); setConfirm(undefined); } }} />
  </Screen>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  eyebrow: { color: colors.orange, marginTop: Space.xl }, title: { color: colors.text, fontFamily: Fonts.semibold, marginTop: Space.sm, marginBottom: Space.xl },
  panel: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: Space.lg, gap: Space.md },
  progress: { borderLeftWidth: 4, borderLeftColor: colors.green, backgroundColor: colors.surface, padding: Space.lg, gap: Space.md },
  body: { color: colors.textMuted }, green: { color: colors.green }, summary: { color: colors.text, textTransform: 'none' }, notice: { color: colors.orange },
});
