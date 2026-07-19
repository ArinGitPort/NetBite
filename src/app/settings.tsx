import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { FeedbackModal } from '@/shared/components/feedback-modal';
import { IconButton } from '@/shared/components/icon-button';
import { Text } from '@/shared/components/console-text';
import { Screen } from '@/shared/components/screen';
import { Fonts, Palette, Space } from '@/shared/theme';
import { useGameStore } from '@/store/use-game-store';
import { useSandboxStore } from '@/store/use-sandbox-store';

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.choice, selected && styles.choiceSelected]}><Text variant="label" style={[styles.choiceText, selected && styles.choiceTextSelected]}>{selected ? '[X] ' : '[ ] '}{label}</Text></Pressable>;
}

export default function SettingsScreen() {
  const hapticsEnabled = useGameStore((state) => state.hapticsEnabled);
  const motionPreference = useGameStore((state) => state.motionPreference);
  const setHapticsEnabled = useGameStore((state) => state.setHapticsEnabled);
  const setMotionPreference = useGameStore((state) => state.setMotionPreference);
  const resetLearningProgress = useGameStore((state) => state.resetLearningProgress);
  const newNetwork = useSandboxStore((state) => state.newNetwork);
  const [confirm, setConfirm] = useState<'learning' | 'sandbox'>();

  return (
    <Screen>
      <View style={styles.header}><IconButton accessibilityLabel="Back to main menu" icon="arrow-left" label="BACK / MENU" onPress={() => router.back()} /></View>
      <Text variant="label" style={styles.eyebrow}>APP CONTROLS</Text>
      <Text variant="screenTitle" style={styles.title}>SETTINGS</Text>
      <View style={styles.section}>
        <Text variant="sectionHeading" style={styles.heading}>HAPTICS</Text>
        <Text variant="bodySmall" style={styles.detail}>Subtle feedback for selections, warnings, and success. Information never depends on vibration.</Text>
        <View style={styles.choices}><Choice label="ON" selected={hapticsEnabled} onPress={() => setHapticsEnabled(true)} /><Choice label="OFF" selected={!hapticsEnabled} onPress={() => setHapticsEnabled(false)} /></View>
      </View>
      <View style={styles.section}>
        <Text variant="sectionHeading" style={styles.heading}>MOTION</Text>
        <Text variant="bodySmall" style={styles.detail}>Follow the operating system or always use reduced transitions and packet movement.</Text>
        <View style={styles.choices}><Choice label="SYSTEM" selected={motionPreference === 'system'} onPress={() => setMotionPreference('system')} /><Choice label="REDUCED" selected={motionPreference === 'reduced'} onPress={() => setMotionPreference('reduced')} /></View>
      </View>
      <View style={styles.section}>
        <Text variant="sectionHeading" style={styles.heading}>LOCAL DATA</Text>
        <Text variant="bodySmall" style={styles.detail}>Learning progress and the sandbox workspace are stored separately.</Text>
        <Pressable accessibilityRole="button" onPress={() => setConfirm('learning')} style={styles.dangerButton}><Text variant="label" style={styles.dangerText}>RESET LEARNING PROGRESS</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => setConfirm('sandbox')} style={styles.dangerButton}><Text variant="label" style={styles.dangerText}>ERASE SANDBOX WORKSPACE</Text></Pressable>
      </View>
      <FeedbackModal visible={Boolean(confirm)} tone="warning" eyebrow="CONFIRM LOCAL RESET" title={confirm === 'learning' ? 'Reset learning progress?' : 'Erase sandbox workspace?'} message={confirm === 'learning' ? 'Completed lessons, labs, quiz scores, and flashcard reviews will be cleared.' : 'Every sandbox device, cable, and configuration will be removed.'} detail="This action cannot be undone after leaving this screen." icon="reset" onRequestClose={() => setConfirm(undefined)} secondaryAction={{ label: 'Keep data', variant: 'secondary', onPress: () => setConfirm(undefined) }} primaryAction={{ label: confirm === 'learning' ? 'Reset learning' : 'Erase workspace', onPress: () => { if (confirm === 'learning') resetLearningProgress(); else newNetwork(); setConfirm(undefined); } }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 44, marginBottom: Space.xl },
  eyebrow: { color: Palette.orange },
  title: { color: Palette.text, fontFamily: Fonts.semibold, marginTop: Space.sm, marginBottom: Space.xl },
  section: { borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface, padding: Space.lg, gap: Space.md, marginBottom: Space.lg },
  heading: { color: Palette.text, fontFamily: Fonts.semibold },
  detail: { color: Palette.textMuted },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  choice: { minWidth: 120, minHeight: 44, flexGrow: 1, borderWidth: 1, borderColor: Palette.border, alignItems: 'center', justifyContent: 'center', padding: Space.sm },
  choiceSelected: { borderColor: Palette.orange, backgroundColor: Palette.orangeSoft },
  choiceText: { color: Palette.textMuted },
  choiceTextSelected: { color: Palette.orange },
  dangerButton: { minHeight: 44, borderWidth: 1, borderColor: Palette.accent, alignItems: 'center', justifyContent: 'center', padding: Space.sm },
  dangerText: { color: Palette.accentBright },
});
