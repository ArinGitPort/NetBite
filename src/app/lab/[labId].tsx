import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { chapterOneLab } from '@/content/chapter-one';
import type { LabValidationResult } from '@/core/network/models';
import { TopologyCanvas } from '@/features/topology/components/topology-canvas';
import { createLabRegistry } from '@/features/practice/lab-registry';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { ContentNotFound } from '@/shared/components/content-not-found';
import { FeedbackModal } from '@/shared/components/feedback-modal';
import { IconButton } from '@/shared/components/icon-button';
import { Screen } from '@/shared/components/screen';
import { successHaptic, warningHaptic } from '@/shared/haptics';
import { Fonts, Palette, Radius, Space } from '@/shared/theme';
import { useGameStore } from '@/store/use-game-store';

function FirstNetworkLab() {
  const topology = useGameStore((state) => state.topology);
  const selectedId = useGameStore((state) => state.selectedConnectionStartId);
  const cancelConnection = useGameStore((state) => state.cancelConnection);
  const clearDeviceForRemoval = useGameStore((state) => state.clearDeviceForRemoval);
  const resetLab = useGameStore((state) => state.resetLab);
  const completeLab = useGameStore((state) => state.completeLab);
  const [connectionMode, setConnectionMode] = useState(false);
  const [result, setResult] = useState<LabValidationResult>();
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resetConfirmationVisible, setResetConfirmationVisible] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [visibleHintCount, setVisibleHintCount] = useState(0);

  useEffect(() => () => {
    cancelConnection();
    clearDeviceForRemoval();
  }, [cancelConnection, clearDeviceForRemoval]);

  const toggleConnectionMode = () => {
    if (connectionMode) cancelConnection();
    clearDeviceForRemoval();
    setConnectionMode((current) => !current);
    setResultModalVisible(false);
  };

  const check = () => {
    const validation = chapterOneLab.validate(topology);
    setResult(validation);
    setResultModalVisible(true);
    if (validation.success) {
      cancelConnection();
      setConnectionMode(false);
      completeLab(chapterOneLab.id);
      successHaptic();
    } else {
      setFailedAttempts((current) => current + 1);
      warningHaptic();
    }
  };

  const reset = () => {
    resetLab();
    setConnectionMode(false);
    setResultModalVisible(false);
    setResetConfirmationVisible(false);
    setFailedAttempts(0);
    setVisibleHintCount(0);
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <IconButton accessibilityLabel="Back to chapter" icon="arrow-left" label="BACK / CHAPTER" onPress={() => router.dismissTo('/chapter/1')} />
        <IconButton accessibilityLabel="Reset lab" icon="reset" label="RESET" onPress={() => setResetConfirmationVisible(true)} />
      </View>
      <Text variant="label" style={styles.eyebrow}>MINI LAB</Text>
      <Text variant="screenTitle" style={styles.title}>{chapterOneLab.title}</Text>
      <View style={styles.objective}>
        <Text variant="label" style={styles.objectiveLabel}>YOUR GOAL</Text>
        <Text variant="body" style={styles.objectiveText}>{chapterOneLab.objective}</Text>
      </View>

      <View style={styles.instructionsRow}>
        <Text variant="label" style={styles.instructions}>
          {connectionMode ? selectedId ? 'Now tap the second device.' : 'Tap the first device.' : 'Drag devices or choose Connect.'}
        </Text>
        <Pressable
          accessibilityLabel={connectionMode ? 'Finish connecting devices' : 'Connect devices'}
          accessibilityRole="button"
          accessibilityState={{ selected: connectionMode }}
          onPress={toggleConnectionMode}
          style={[styles.connectButton, connectionMode && styles.connectButtonActive]}>
          <Text variant="label" style={[styles.connectText, connectionMode && styles.connectTextActive]}>{connectionMode ? 'Done' : 'Connect'}</Text>
        </Pressable>
      </View>

      <TopologyCanvas key={connectionMode ? 'connection-mode' : 'edit-mode'} connectionMode={connectionMode} />

      {visibleHintCount > 0 ? (
        <View accessibilityLiveRegion="polite" style={styles.hintPanel}>
          <Text variant="label" style={styles.hintLabel}>HINT {visibleHintCount} OF {chapterOneLab.hints.length}</Text>
          <Text variant="body" style={styles.hintText}>{chapterOneLab.hints[visibleHintCount - 1]}</Text>
        </View>
      ) : null}

      {failedAttempts > 0 && visibleHintCount < chapterOneLab.hints.length ? (
        <AppButton
          label={visibleHintCount === 0 ? 'Show a hint' : 'Show next hint'}
          variant="quiet"
          onPress={() => setVisibleHintCount((current) => current + 1)}
        />
      ) : null}

      <View style={styles.actions}>
        <AppButton label="Check my network" leadingIcon="check" disabled={selectedId !== undefined} onPress={check} />
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
        visible={resultModalVisible}
        tone={result?.success ? 'success' : 'warning'}
        eyebrow={result?.success ? 'OBJECTIVE COMPLETE' : 'NETWORK CHECK'}
        title={result?.success ? 'Network complete' : 'Not quite yet'}
        message={result?.reason ?? ''}
        detail={result?.success ? result.learningTip : 'Keep building, or reveal a hint below the canvas.'}
        onRequestClose={() => setResultModalVisible(false)}
        secondaryAction={result?.success ? { label: 'Return to lab', onPress: () => setResultModalVisible(false), variant: 'secondary' } : undefined}
        primaryAction={result?.success
          ? { label: 'Back to chapter', leadingIcon: 'arrow-left', onPress: () => router.dismissTo('/chapter/1') }
          : { label: 'Keep building', onPress: () => setResultModalVisible(false) }}
      />
    </Screen>
  );
}

export default function LabScreen() {
  const { labId } = useLocalSearchParams<{ labId: string }>();
  const labs = createLabRegistry(FirstNetworkLab);
  const LabComponent = labId ? labs[labId] : undefined;
  return LabComponent ? <LabComponent /> : <ContentNotFound label="Lab" />;
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', minHeight: 44, alignItems: 'center' },
  eyebrow: { color: Palette.green, fontFamily: Fonts.medium, marginTop: Space.md },
  title: { color: Palette.text, fontFamily: Fonts.semibold, marginTop: Space.sm, marginBottom: Space.lg },
  objective: { backgroundColor: Palette.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.green, padding: Space.lg, marginBottom: Space.lg },
  objectiveLabel: { color: Palette.green, fontFamily: Fonts.medium },
  objectiveText: { color: Palette.text, marginTop: Space.xs },
  instructionsRow: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, marginBottom: Space.md },
  instructions: { flex: 1, minWidth: 0, color: Palette.textMuted, textTransform: 'uppercase' },
  connectButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Space.lg, backgroundColor: Palette.accentSoft, borderRadius: Radius.sm, borderWidth: 1, borderColor: Palette.accent },
  connectButtonActive: { backgroundColor: Palette.orangeSoft, borderColor: Palette.orange },
  connectText: { color: Palette.accentBright, fontFamily: Fonts.medium, textTransform: 'uppercase' },
  connectTextActive: { color: Palette.orange },
  actions: { gap: Space.md, marginTop: Space.xl },
  hintPanel: { marginTop: Space.md, padding: Space.md, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.orange },
  hintLabel: { color: Palette.orange, fontFamily: Fonts.medium },
  hintText: { color: Palette.text, marginTop: Space.xs },
});
