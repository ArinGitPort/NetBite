import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  ethernetCableTasks,
  validateEthernetCableChoices,
  type EthernetCableLabResult,
  type EthernetCableType,
} from '@/core/network/ethernet-cabling';
import { DeviceGlyph } from '@/features/devices/components/device-glyph';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { FeedbackModal } from '@/shared/components/feedback-modal';
import { IconButton } from '@/shared/components/icon-button';
import { Screen } from '@/shared/components/screen';
import { selectionHaptic, successHaptic, warningHaptic } from '@/shared/haptics';
import { Fonts, Palette, Space } from '@/shared/theme';
import { useGameStore } from '@/store/use-game-store';

const LAB_ID = 'ethernet-cables';

export function EthernetCableLab() {
  const completeLab = useGameStore((state) => state.completeLab);
  const [selections, setSelections] = useState<Partial<Record<string, EthernetCableType>>>({});
  const [result, setResult] = useState<EthernetCableLabResult>();
  const [resultVisible, setResultVisible] = useState(false);
  const allSelected = ethernetCableTasks.every((task) => selections[task.id]);

  const selectCable = (taskId: string, cable: EthernetCableType) => {
    setSelections((current) => ({ ...current, [taskId]: cable }));
    setResultVisible(false);
    selectionHaptic();
  };

  const check = () => {
    const nextResult = validateEthernetCableChoices(selections);
    setResult(nextResult);
    setResultVisible(true);
    if (nextResult.success) {
      completeLab(LAB_ID);
      successHaptic();
    } else {
      warningHaptic();
    }
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <IconButton
          accessibilityLabel="Back to Chapter 2"
          icon="arrow-left"
          label="BACK / CHAPTER"
          onPress={() => router.dismissTo('/chapter/2')}
        />
        <IconButton
          accessibilityLabel="Reset cable choices"
          icon="reset"
          label="RESET"
          onPress={() => {
            setSelections({});
            setResult(undefined);
            setResultVisible(false);
          }}
        />
      </View>

      <Text variant="label" style={styles.eyebrow}>LESSON 3 PRACTICE / MANUAL MODE</Text>
      <Text variant="screenTitle" style={styles.title}>APPLY THE COPPER CABLE RULE</Text>
      <View style={styles.objective}>
        <Text variant="label" style={styles.objectiveLabel}>YOUR GOAL</Text>
        <Text variant="body" style={styles.objectiveText}>Apply the manual cabling rule from Lesson 3 to each copper Ethernet link.</Text>
      </View>
      <View style={styles.modernNote}>
        <Text variant="label" style={styles.modernNoteLabel}>MODERN NETWORK NOTE</Text>
        <Text variant="bodySmall" style={styles.modernNoteText}>Auto-MDIX can correct the wiring automatically. Manual mode lets you practice what the ports would otherwise handle for you.</Text>
      </View>

      <View style={styles.tasks}>
        {ethernetCableTasks.map((task, index) => {
          const choice = selections[task.id];
          return (
            <View key={task.id} style={styles.taskCard}>
              <Text variant="label" style={styles.taskLabel}>LINK {index + 1} OF {ethernetCableTasks.length}</Text>
              <View style={styles.linkDiagram}>
                <View style={styles.endpoint}>
                  <DeviceGlyph type={task.firstDevice} size={62} />
                  <Text variant="label" style={styles.endpointLabel}>{task.firstLabel}</Text>
                </View>
                <View style={[styles.cableLine, choice && styles.cableLineSelected]} />
                <View style={styles.endpoint}>
                  <DeviceGlyph type={task.secondDevice} size={62} />
                  <Text variant="label" style={styles.endpointLabel}>{task.secondLabel}</Text>
                </View>
              </View>
              <View style={styles.cableChoices}>
                {(['straight-through', 'crossover'] as const).map((cable) => {
                  const selected = choice === cable;
                  return (
                    <Pressable
                      key={cable}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      onPress={() => selectCable(task.id, cable)}
                      style={[styles.cableChoice, selected && styles.cableChoiceSelected]}>
                      <Text variant="label" style={[styles.cableChoiceText, selected && styles.cableChoiceTextSelected]}>
                        {cable === 'straight-through' ? 'STRAIGHT-THROUGH' : 'CROSSOVER'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.actions}>
        <AppButton label="Check my cables" leadingIcon="check" disabled={!allSelected} onPress={check} />
      </View>

      <FeedbackModal
        visible={resultVisible}
        tone={result?.success ? 'success' : 'warning'}
        eyebrow={result?.success ? 'OBJECTIVE COMPLETE' : 'CABLE CHECK'}
        title={result?.success ? 'Every link is patched' : `${result?.correctCount ?? 0} of ${result?.total ?? ethernetCableTasks.length} links correct`}
        message={result?.success
          ? 'You applied the traditional Ethernet copper cabling rules correctly.'
          : result?.firstIncorrectTask?.explanation ?? 'Review the cable selected for each link.'}
        detail={result?.success
          ? 'On modern equipment, auto-MDIX often makes either wiring arrangement work.'
          : `Review ${result?.firstIncorrectTask?.firstLabel ?? 'the first device'} to ${result?.firstIncorrectTask?.secondLabel ?? 'the second device'}.`}
        onRequestClose={() => setResultVisible(false)}
        secondaryAction={result?.success
          ? { label: 'Review links', variant: 'secondary', onPress: () => setResultVisible(false) }
          : undefined}
        primaryAction={result?.success
          ? { label: 'Back to chapter', leadingIcon: 'arrow-left', onPress: () => router.dismissTo('/chapter/2') }
          : { label: 'Adjust cables', onPress: () => setResultVisible(false) }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: Palette.orange, fontFamily: Fonts.medium, marginTop: Space.md },
  title: { color: Palette.text, fontFamily: Fonts.semibold, marginTop: Space.sm, marginBottom: Space.lg },
  objective: { padding: Space.lg, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.green },
  objectiveLabel: { color: Palette.green, fontFamily: Fonts.medium },
  objectiveText: { color: Palette.text, marginTop: Space.xs },
  modernNote: { padding: Space.md, marginTop: Space.md, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.orange },
  modernNoteLabel: { color: Palette.orange, fontFamily: Fonts.medium },
  modernNoteText: { color: Palette.text, marginTop: Space.xs },
  tasks: { gap: Space.md, marginTop: Space.lg },
  taskCard: { padding: Space.md, gap: Space.md, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border },
  taskLabel: { color: Palette.textMuted, fontFamily: Fonts.medium },
  linkDiagram: { minHeight: 96, flexDirection: 'row', alignItems: 'center' },
  endpoint: { width: 80, minWidth: 0, alignItems: 'center', gap: Space.xs, zIndex: 1 },
  endpointLabel: { color: Palette.text, fontFamily: Fonts.medium, textAlign: 'center', textTransform: 'uppercase' },
  cableLine: { flex: 1, height: 2, backgroundColor: Palette.border },
  cableLineSelected: { backgroundColor: Palette.accent },
  cableChoices: { flexDirection: 'row', gap: Space.sm },
  cableChoice: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Space.xs, backgroundColor: Palette.background, borderWidth: 1, borderColor: Palette.border },
  cableChoiceSelected: { backgroundColor: Palette.surfaceRaised, borderColor: Palette.accent },
  cableChoiceText: { color: Palette.textMuted, fontFamily: Fonts.medium, textAlign: 'center' },
  cableChoiceTextSelected: { color: Palette.accentBright },
  actions: { marginTop: Space.xl },
});
