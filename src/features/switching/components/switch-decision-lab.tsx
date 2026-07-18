import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  processSwitchFrame,
  type MacTableEntry,
  type SwitchDecision,
} from '@/core/network/switching';
import { DeviceGlyph } from '@/features/devices/components/device-glyph';
import {
  SWITCH_DESK_ENDPOINTS,
  SWITCH_DESK_PORTS,
  SWITCH_DESK_SCENARIOS,
  SWITCH_PREDICTIONS,
  type SwitchPrediction,
} from '@/features/switching/switch-desk-scenarios';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { FeedbackModal } from '@/shared/components/feedback-modal';
import { IconButton } from '@/shared/components/icon-button';
import { Screen } from '@/shared/components/screen';
import { selectionHaptic, successHaptic, warningHaptic } from '@/shared/haptics';
import { Fonts, Palette, Space } from '@/shared/theme';
import { useGameStore } from '@/store/use-game-store';

const LAB_ID = 'switch-decision-desk';

function expectedPrediction(decision: SwitchDecision): SwitchPrediction {
  if (decision.action === 'flood') return 'flood';
  return `port-${decision.egressPorts[0]}` as SwitchPrediction;
}

function decisionExplanation(decision: SwitchDecision) {
  if (decision.reason === 'broadcast') {
    return `BROADCAST / LEARN SOURCE ON P${decision.learnedEntry.port} / FLOOD PORTS ${decision.egressPorts.join(' + ')}`;
  }
  if (decision.reason === 'unknown-unicast') {
    return `UNKNOWN DESTINATION / LEARN SOURCE ON P${decision.learnedEntry.port} / FLOOD PORTS ${decision.egressPorts.join(' + ')}`;
  }
  return `KNOWN DESTINATION / LEARN SOURCE ON P${decision.learnedEntry.port} / FORWARD TO PORT ${decision.egressPorts[0]}`;
}

export function SwitchDecisionLab() {
  const completeLab = useGameStore((state) => state.completeLab);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [macTable, setMacTable] = useState<MacTableEntry[]>([]);
  const [prediction, setPrediction] = useState<SwitchPrediction>();
  const [resolvedDecision, setResolvedDecision] = useState<SwitchDecision>();
  const [feedback, setFeedback] = useState<string>();
  const [resetVisible, setResetVisible] = useState(false);
  const [completionVisible, setCompletionVisible] = useState(false);
  const scenario = SWITCH_DESK_SCENARIOS[scenarioIndex];
  const previewDecision = processSwitchFrame(macTable, scenario.frame, SWITCH_DESK_PORTS);
  const finalScenario = scenarioIndex === SWITCH_DESK_SCENARIOS.length - 1;

  const choosePrediction = (nextPrediction: SwitchPrediction) => {
    if (resolvedDecision) return;
    setPrediction(nextPrediction);
    setFeedback(undefined);
    selectionHaptic();
  };

  const checkPrediction = () => {
    if (!prediction || resolvedDecision) return;
    if (prediction !== expectedPrediction(previewDecision)) {
      setFeedback(
        previewDecision.reason === 'known-unicast'
          ? `The destination is already mapped to port ${previewDecision.egressPorts[0]}. Choose that one port.`
          : previewDecision.reason === 'broadcast'
            ? 'A broadcast is intentionally sent through every other active port.'
            : 'The destination is absent from the table, so the switch must flood every other active port.',
      );
      warningHaptic();
      return;
    }

    setMacTable(previewDecision.tableAfter);
    setResolvedDecision(previewDecision);
    setFeedback(decisionExplanation(previewDecision));
    successHaptic();
  };

  const continueLab = () => {
    if (!resolvedDecision) return;
    if (finalScenario) {
      completeLab(LAB_ID);
      setCompletionVisible(true);
      return;
    }
    setScenarioIndex((current) => current + 1);
    setPrediction(undefined);
    setResolvedDecision(undefined);
    setFeedback(undefined);
    selectionHaptic();
  };

  const reset = () => {
    setScenarioIndex(0);
    setMacTable([]);
    setPrediction(undefined);
    setResolvedDecision(undefined);
    setFeedback(undefined);
    setResetVisible(false);
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <IconButton accessibilityLabel="Back to Chapter 3" icon="arrow-left" label="BACK / CHAPTER" onPress={() => router.dismissTo('/chapter/3')} />
        <IconButton accessibilityLabel="Reset switch desk" icon="reset" label="RESET" onPress={() => setResetVisible(true)} />
      </View>

      <Text variant="label" style={styles.eyebrow}>GUIDED PRACTICE / SWITCH DESK</Text>
      <Text variant="screenTitle" style={styles.title}>PREDICT THE SWITCH DECISION</Text>
      <View style={styles.objective}>
        <Text variant="label" style={styles.objectiveLabel}>YOUR GOAL</Text>
        <Text variant="body" style={styles.objectiveText}>Process four frames. Predict the output before the switch updates its MAC address table.</Text>
      </View>
      <Text variant="technical" style={styles.scopeNote}>STEP MODEL ONLY / NO TIMING OR TRAFFIC SIMULATION</Text>

      <View style={styles.topologyPanel}>
        <View style={styles.switchHeader}>
          <DeviceGlyph type="switch" size={58} />
          <View style={styles.switchHeaderCopy}>
            <Text variant="technical" style={styles.panelLabel}>SWITCH 1 / THREE ACTIVE PORTS</Text>
            <Text variant="bodySmall" style={styles.panelCopy}>The ingress port is marked before each decision. Correct output ports appear after the prediction.</Text>
          </View>
        </View>
        <View style={styles.endpointRow}>
          {SWITCH_DESK_ENDPOINTS.map((endpoint) => {
            const ingress = endpoint.port === scenario.frame.ingressPort;
            const egress = resolvedDecision?.egressPorts.includes(endpoint.port);
            const portState = ingress ? 'ingress' : egress ? 'egress' : 'idle';
            return (
              <View
                key={endpoint.id}
                accessible
                accessibilityLabel={`${endpoint.name}, MAC ${endpoint.macAddress}, port ${endpoint.port}, ${portState}`}
                style={[styles.endpoint, ingress && styles.ingressEndpoint, egress && styles.egressEndpoint]}>
                <DeviceGlyph type="pc" size={42} />
                <Text variant="label" style={styles.endpointName}>{endpoint.name}</Text>
                <Text variant="technical" style={styles.endpointPort}>PORT {endpoint.port}{ingress ? ' / IN' : egress ? ' / OUT' : ''}</Text>
                <Text variant="technical" numberOfLines={1} style={styles.endpointMac}>...{endpoint.macAddress.slice(-2)}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.framePanel}>
        <View style={styles.frameHeading}>
          <Text variant="technical" style={styles.panelLabel}>FRAME {scenarioIndex + 1} OF {SWITCH_DESK_SCENARIOS.length}</Text>
          <Text variant="label" style={styles.frameTitle}>{scenario.title}</Text>
        </View>
        <View style={styles.frameFields}>
          <View style={styles.frameField}><Text variant="technical" style={styles.fieldLabel}>SOURCE / {scenario.sourceName}</Text><Text variant="bodySmall" style={styles.fieldValue}>{scenario.frame.sourceMac}</Text></View>
          <View style={styles.frameField}><Text variant="technical" style={styles.fieldLabel}>DESTINATION / {scenario.destinationName}</Text><Text variant="bodySmall" style={styles.fieldValue}>{scenario.frame.destinationMac}</Text></View>
          <View style={styles.ingressField}><Text variant="technical" style={styles.fieldLabel}>INGRESS</Text><Text variant="label" style={styles.ingressValue}>PORT {scenario.frame.ingressPort}</Text></View>
        </View>
      </View>

      <View
        accessible
        accessibilityLabel={`MAC address table, ${macTable.length} learned ${macTable.length === 1 ? 'address' : 'addresses'}, ${resolvedDecision ? 'after' : 'before'} decision`}
        style={styles.tablePanel}>
        <Text variant="technical" style={styles.panelLabel}>
          MAC ADDRESS TABLE / {resolvedDecision ? 'AFTER DECISION' : 'BEFORE DECISION'}
        </Text>
        <View style={styles.tableHeader}><Text variant="technical" style={styles.tableHeaderText}>MAC ADDRESS</Text><Text variant="technical" style={styles.tableHeaderText}>PORT</Text></View>
        {macTable.length === 0 ? <Text variant="technical" style={styles.emptyTable}>NO ADDRESSES LEARNED</Text> : macTable.map((entry) => (
          <View key={entry.macAddress} style={styles.tableRow}>
            <Text variant="bodySmall" style={styles.tableMac}>{entry.macAddress}</Text>
            <Text variant="label" style={styles.tablePort}>{entry.port}</Text>
          </View>
        ))}
      </View>

      <Text variant="sectionHeading" style={styles.prompt}>WHAT SHOULD THE SWITCH DO?</Text>
      <View accessibilityRole="radiogroup" style={styles.predictions}>
        {SWITCH_PREDICTIONS.map((option) => {
          const selected = prediction === option.id;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled: Boolean(resolvedDecision) }}
              disabled={Boolean(resolvedDecision)}
              onPress={() => choosePrediction(option.id)}
              style={[styles.prediction, selected && styles.predictionSelected]}>
              <Text variant="label" style={[styles.predictionText, selected && styles.predictionTextSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {feedback ? (
        <View accessibilityLiveRegion="assertive" accessibilityRole="alert" style={[styles.feedback, resolvedDecision ? styles.correctFeedback : styles.wrongFeedback]}>
          <Text variant="label" style={[styles.feedbackLabel, resolvedDecision ? styles.correctFeedbackText : styles.wrongFeedbackText]}>{resolvedDecision ? 'DECISION CONFIRMED' : 'CHECK THE TABLE'}</Text>
          <Text variant="bodySmall" style={styles.feedbackText}>{feedback}</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        {resolvedDecision ? (
          <AppButton label={finalScenario ? 'Complete switch desk' : 'Next frame'} trailingIcon="arrow-right" onPress={continueLab} />
        ) : (
          <AppButton label="Check switch decision" leadingIcon="check" disabled={!prediction} onPress={checkPrediction} />
        )}
      </View>

      <FeedbackModal
        visible={resetVisible}
        tone="warning"
        eyebrow="CONFIRM ACTION"
        title="Reset the switch desk?"
        message="This clears the learned MAC table and returns to the first frame."
        onRequestClose={() => setResetVisible(false)}
        secondaryAction={{ label: 'Keep progress', variant: 'secondary', onPress: () => setResetVisible(false) }}
        primaryAction={{ label: 'Reset desk', leadingIcon: 'reset', onPress: reset }}
      />

      <FeedbackModal
        visible={completionVisible}
        tone="success"
        eyebrow="OBJECTIVE COMPLETE"
        title="Switch table learned"
        message="You learned source addresses, forwarded known unicasts, and flooded unknown and broadcast destinations."
        detail="The desk is a deterministic teaching model, not live Ethernet traffic."
        icon="check"
        onRequestClose={() => setCompletionVisible(false)}
        secondaryAction={{ label: 'Review desk', variant: 'secondary', onPress: () => setCompletionVisible(false) }}
        primaryAction={{ label: 'Back to chapter', leadingIcon: 'arrow-left', onPress: () => router.dismissTo('/chapter/3') }}
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
  scopeNote: { color: Palette.textMuted, marginVertical: Space.md },
  topologyPanel: { padding: Space.md, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border },
  switchHeader: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Space.md, paddingBottom: Space.md, borderBottomWidth: 1, borderBottomColor: Palette.border },
  switchHeaderCopy: { flex: 1, minWidth: 0 },
  panelLabel: { color: Palette.textMuted, fontFamily: Fonts.medium },
  panelCopy: { color: Palette.text, marginTop: Space.xs },
  endpointRow: { flexDirection: 'row', gap: Space.xs, marginTop: Space.md },
  endpoint: { flex: 1, minWidth: 0, alignItems: 'center', padding: Space.xs, backgroundColor: Palette.background, borderWidth: 1, borderColor: Palette.border },
  ingressEndpoint: { borderColor: Palette.orange },
  egressEndpoint: { borderColor: Palette.green },
  endpointName: { color: Palette.text, fontFamily: Fonts.medium },
  endpointPort: { color: Palette.textMuted, textAlign: 'center' },
  endpointMac: { color: Palette.accentBright, textAlign: 'center' },
  framePanel: { marginTop: Space.md, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.accent },
  frameHeading: { padding: Space.md, borderBottomWidth: 1, borderBottomColor: Palette.border },
  frameTitle: { color: Palette.accentBright, fontFamily: Fonts.medium, marginTop: Space.xs },
  frameFields: { padding: Space.md, gap: Space.sm },
  frameField: { minWidth: 0, padding: Space.sm, backgroundColor: Palette.background, borderWidth: 1, borderColor: Palette.border },
  fieldLabel: { color: Palette.textMuted, fontFamily: Fonts.medium },
  fieldValue: { color: Palette.text, marginTop: 2 },
  ingressField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Space.sm, backgroundColor: Palette.background, borderWidth: 1, borderColor: Palette.orange },
  ingressValue: { color: Palette.orange, fontFamily: Fonts.semibold },
  tablePanel: { marginTop: Space.md, padding: Space.md, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Space.sm, borderBottomWidth: 1, borderBottomColor: Palette.border },
  tableHeaderText: { color: Palette.textMuted, fontFamily: Fonts.medium },
  emptyTable: { color: Palette.textMuted, paddingVertical: Space.sm, textAlign: 'center' },
  tableRow: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: Palette.grid },
  tableMac: { color: Palette.text },
  tablePort: { color: Palette.green, fontFamily: Fonts.semibold },
  prompt: { color: Palette.text, fontFamily: Fonts.medium, marginTop: Space.lg, marginBottom: Space.sm },
  predictions: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  prediction: { width: '48%', minHeight: 56, alignItems: 'center', justifyContent: 'center', padding: Space.xs, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border },
  predictionSelected: { backgroundColor: Palette.surfaceRaised, borderColor: Palette.accent },
  predictionText: { color: Palette.textMuted, fontFamily: Fonts.medium, textAlign: 'center' },
  predictionTextSelected: { color: Palette.accentBright },
  feedback: { marginTop: Space.md, padding: Space.md, backgroundColor: Palette.surface, borderWidth: 1 },
  correctFeedback: { borderColor: Palette.green },
  wrongFeedback: { borderColor: Palette.orange },
  feedbackLabel: { fontFamily: Fonts.medium },
  correctFeedbackText: { color: Palette.green },
  wrongFeedbackText: { color: Palette.orange },
  feedbackText: { color: Palette.text, marginTop: Space.xs },
  actions: { marginTop: Space.lg },
});
