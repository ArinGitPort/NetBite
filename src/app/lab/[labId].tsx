import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { validateTwoPCsToSameSwitch, type LabValidationResult } from '@/core/network/models';
import { TopologyCanvas } from '@/features/topology/components/topology-canvas';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { FeedbackModal } from '@/shared/components/feedback-modal';
import { IconButton } from '@/shared/components/icon-button';
import { Screen } from '@/shared/components/screen';
import { Fonts, Palette, Radius, Space } from '@/shared/theme';
import { useGameStore } from '@/store/use-game-store';

export default function LabScreen() {
  const topology = useGameStore((state) => state.topology);
  const selectedId = useGameStore((state) => state.selectedConnectionStartId);
  const cancelConnection = useGameStore((state) => state.cancelConnection);
  const resetLab = useGameStore((state) => state.resetLab);
  const completeLab = useGameStore((state) => state.completeLab);
  const [connectionMode, setConnectionMode] = useState(false);
  const [result, setResult] = useState<LabValidationResult>();
  const [resetConfirmationVisible, setResetConfirmationVisible] = useState(false);

  const toggleConnectionMode = () => {
    if (connectionMode) cancelConnection();
    setConnectionMode((current) => !current);
    setResult(undefined);
  };

  const check = () => {
    const validation = validateTwoPCsToSameSwitch(topology);
    setResult(validation);
    if (validation.success) completeLab();
  };

  const reset = () => {
    resetLab();
    setConnectionMode(false);
    setResult(undefined);
    setResetConfirmationVisible(false);
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <IconButton accessibilityLabel="Back to chapter" icon="arrow-left" label="BACK / CHAPTER" onPress={() => router.dismissTo('/chapter/1')} />
        <IconButton accessibilityLabel="Reset lab" icon="reset" label="RESET" onPress={() => setResetConfirmationVisible(true)} />
      </View>
      <Text style={styles.eyebrow}>MINI LAB</Text>
      <Text style={styles.title}>BUILD YOUR FIRST NETWORK</Text>
      <View style={styles.objective}>
        <Text style={styles.objectiveLabel}>YOUR GOAL</Text>
        <Text style={styles.objectiveText}>Connect both PCs to the same switch.</Text>
      </View>

      <View style={styles.instructionsRow}>
        <Text style={styles.instructions}>
          {connectionMode ? selectedId ? 'Now tap the second device.' : 'Tap the first device.' : 'Drag devices or choose Connect.'}
        </Text>
        <Pressable onPress={toggleConnectionMode} style={[styles.connectButton, connectionMode && styles.connectButtonActive]}>
          <Text style={[styles.connectText, connectionMode && styles.connectTextActive]}>{connectionMode ? 'Done' : 'Connect'}</Text>
        </Pressable>
      </View>

      <TopologyCanvas connectionMode={connectionMode} />

      <View style={styles.actions}>
        <AppButton label="Check my network" leadingIcon="check" onPress={check} />
      </View>

      <FeedbackModal
        visible={resetConfirmationVisible}
        tone="warning"
        eyebrow="CONFIRM ACTION"
        title="Reset this lab?"
        message="This restores the original three devices and removes every cable and device you added."
        detail="This action cannot be undone."
        icon="reset"
        onRequestClose={() => setResetConfirmationVisible(false)}
        secondaryAction={{ label: 'Keep my network', onPress: () => setResetConfirmationVisible(false), variant: 'secondary' }}
        primaryAction={{ label: 'Reset lab', leadingIcon: 'reset', onPress: reset }}
      />

      <FeedbackModal
        visible={result !== undefined}
        tone={result?.success ? 'success' : 'warning'}
        eyebrow={result?.success ? 'OBJECTIVE COMPLETE' : 'NETWORK CHECK'}
        title={result?.success ? 'Network complete' : 'Not quite yet'}
        message={result?.reason ?? ''}
        detail={result?.learningTip}
        icon={result?.success ? 'check' : undefined}
        onRequestClose={() => setResult(undefined)}
        secondaryAction={result?.success ? { label: 'View topology', onPress: () => setResult(undefined), variant: 'secondary' } : undefined}
        primaryAction={result?.success
          ? { label: 'Back to chapter', leadingIcon: 'arrow-left', onPress: () => router.dismissTo('/chapter/1') }
          : { label: 'Keep building', onPress: () => setResult(undefined) }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', minHeight: 44, alignItems: 'center' },
  eyebrow: { color: Palette.green, fontFamily: Fonts.medium, fontSize: 11, letterSpacing: 1.5, marginTop: Space.md },
  title: { color: Palette.text, fontFamily: Fonts.semibold, fontSize: 16, lineHeight: 24, letterSpacing: 1.5, marginTop: Space.sm, marginBottom: Space.lg },
  objective: { backgroundColor: Palette.greenSoft, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.green, padding: Space.lg, marginBottom: Space.lg },
  objectiveLabel: { color: Palette.green, fontFamily: Fonts.medium, fontSize: 11, letterSpacing: 1.5 },
  objectiveText: { color: Palette.text, fontSize: 12, lineHeight: 20, marginTop: Space.xs },
  instructionsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Space.md },
  instructions: { flex: 1, color: Palette.textMuted, fontSize: 11, lineHeight: 16, letterSpacing: 1.5, textTransform: 'uppercase' },
  connectButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Space.lg, backgroundColor: Palette.accentSoft, borderRadius: Radius.sm, borderWidth: 1, borderColor: Palette.accent },
  connectButtonActive: { backgroundColor: Palette.orangeSoft, borderColor: Palette.orange },
  connectText: { color: Palette.accentBright, fontFamily: Fonts.medium, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' },
  connectTextActive: { color: Palette.orange },
  actions: { gap: Space.md, marginTop: Space.xl },
});
