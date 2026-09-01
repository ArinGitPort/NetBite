import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  processSwitchFrame,
  type MacTableEntry,
  type SwitchDecision,
} from '@/core/network/switching';
import { DeviceGlyph } from '@/features/devices/components/device-glyph';
import { LabSetupSupport } from '@/features/practice/components/foundation-lab-support';
import { LabGoalPanel } from '@/features/practice/components/lab-goal-panel';
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
import { PageHeader } from '@/shared/components/page-header';
import { Screen } from '@/shared/components/screen';
import { selectionHaptic, successHaptic, warningHaptic } from '@/shared/haptics';
import { Fonts, Space, type ThemeColors } from '@/shared/theme';
import { useThemeStyles } from '@/shared/theme-context';
import { useGameStore } from '@/store/use-game-store';
import { returnToOwningChapter } from '@/shared/navigation';
import { getSimulatorBoundaryCopy } from '@/shared/learner-facing-copy';

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
  const styles = useThemeStyles(createStyles);
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
    <Screen header={<PageHeader leading={{ accessibilityLabel: 'Back to Chapter 3', icon: 'arrow-left', label: 'BACK / CHAPTER', onPress: () => returnToOwningChapter('lab', 'switch-decision-desk') }} trailing={[{ accessibilityLabel: 'Reset switch desk', icon: 'reset', label: 'RESET', onPress: () => setResetVisible(true) }]} />}>

      <Text variant="label" style={styles.eyebrow}>GUIDED PRACTICE / SWITCH DESK</Text>
      <Text variant="screenTitle" style={styles.title}>PREDICT THE SWITCH DECISION</Text>
      <LabGoalPanel goal="Process four frames. Predict the output before the switch updates its MAC address table." />
      <Text variant="technical" style={styles.scopeNote}>STEP MODEL ONLY / NO TIMING OR TRAFFIC SIMULATION</Text>
      <LabSetupSupport labId={LAB_ID} />

      <View style={styles.topologyPanel}>
        <View style={styles.switchHeader}>
          <DeviceGlyph type="switch" size={58} />
          <View style={styles.switchHeaderCopy}>
            <Text variant="technical" style={styles.panelLabel}>SW1 / THREE ACTIVE PORTS</Text>
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
        primaryAction={{ label: 'Reset desk', leadingIcon: 'reset', variant: 'danger', onPress: reset }}
      />

      <FeedbackModal
        visible={completionVisible}
        tone="success"
        eyebrow="OBJECTIVE COMPLETE"
        title="Switch table learned"
        message="You learned source addresses, forwarded known unicasts, and flooded unknown and broadcast destinations."
        detail={getSimulatorBoundaryCopy('switching')}
        icon="check"
        onRequestClose={() => setCompletionVisible(false)}
        secondaryAction={{ label: 'Review desk', variant: 'secondary', onPress: () => setCompletionVisible(false) }}
        primaryAction={{ label: 'Back to chapter', leadingIcon: 'arrow-left', onPress: () => returnToOwningChapter('lab', 'switch-decision-desk') }}
      />
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  headerRow: { minHeight: 44, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Space.sm },
  eyebrow: { color: colors.orange, fontFamily: Fonts.medium, marginTop: Space.md },
  title: { color: colors.text, fontFamily: Fonts.semibold, marginTop: Space.sm, marginBottom: Space.lg },
  scopeNote: { color: colors.textMuted, marginVertical: Space.md },
  topologyPanel: { padding: Space.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  switchHeader: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Space.md, paddingBottom: Space.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  switchHeaderCopy: { flex: 1, minWidth: 0 },
  panelLabel: { color: colors.textMuted, fontFamily: Fonts.medium },
  panelCopy: { color: colors.text, marginTop: Space.xs },
  endpointRow: { flexDirection: 'row', gap: Space.xs, marginTop: Space.md },
  endpoint: { flex: 1, minWidth: 0, alignItems: 'center', padding: Space.xs, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  ingressEndpoint: { borderColor: colors.orange, backgroundColor: colors.orangeSoft },
  egressEndpoint: { borderColor: colors.green, backgroundColor: colors.greenSoft },
  endpointName: { color: colors.text, fontFamily: Fonts.medium },
  endpointPort: { color: colors.textMuted, textAlign: 'center' },
  endpointMac: { color: colors.accentBright, textAlign: 'center' },
  framePanel: { marginTop: Space.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.accent },
  frameHeading: { padding: Space.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  frameTitle: { color: colors.accentBright, fontFamily: Fonts.medium, marginTop: Space.xs },
  frameFields: { padding: Space.md, gap: Space.sm },
  frameField: { minWidth: 0, padding: Space.sm, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  fieldLabel: { color: colors.textMuted, fontFamily: Fonts.medium },
  fieldValue: { color: colors.text, marginTop: 2 },
  ingressField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Space.sm, backgroundColor: colors.orangeSoft, borderWidth: 1, borderColor: colors.orange },
  ingressValue: { color: colors.orange, fontFamily: Fonts.semibold },
  tablePanel: { marginTop: Space.md, padding: Space.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Space.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  tableHeaderText: { color: colors.textMuted, fontFamily: Fonts.medium },
  emptyTable: { color: colors.textMuted, paddingVertical: Space.sm, textAlign: 'center' },
  tableRow: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.grid },
  tableMac: { minWidth: 0, flexShrink: 1, color: colors.text },
  tablePort: { color: colors.green, fontFamily: Fonts.semibold },
  prompt: { color: colors.text, fontFamily: Fonts.medium, marginTop: Space.lg, marginBottom: Space.sm },
  predictions: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  prediction: { minWidth: 136, flexGrow: 1, flexBasis: '46%', minHeight: 56, alignItems: 'center', justifyContent: 'center', padding: Space.xs, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  predictionSelected: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  predictionText: { color: colors.textMuted, fontFamily: Fonts.medium, textAlign: 'center' },
  predictionTextSelected: { color: colors.accentBright },
  feedback: { marginTop: Space.md, padding: Space.md, backgroundColor: colors.surface, borderWidth: 1 },
  correctFeedback: { borderColor: colors.green, backgroundColor: colors.greenSoft },
  wrongFeedback: { borderColor: colors.orange, backgroundColor: colors.orangeSoft },
  feedbackLabel: { fontFamily: Fonts.medium },
  correctFeedbackText: { color: colors.green },
  wrongFeedbackText: { color: colors.orange },
  feedbackText: { color: colors.text, marginTop: Space.xs },
  actions: { marginTop: Space.lg },
});
