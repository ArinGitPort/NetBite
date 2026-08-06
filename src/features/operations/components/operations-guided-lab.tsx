import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import type { OperationsLabDefinition } from '@/features/operations/operations-lab-definitions';
import {
  applySimulationConfiguration,
  emptyOperationsSimulationSession,
  evaluateSimulationObjective,
  executeOperationsCliCommand,
  getOperationsCliSuggestions,
  operationsSimulationDefinitions,
  type SimulationFieldDefinition,
  type SimulationValue,
} from '@/features/operations/operations-simulator';
import { AppButton } from '@/shared/components/app-button';
import { FeedbackModal } from '@/shared/components/feedback-modal';
import { IconButton } from '@/shared/components/icon-button';
import { Text } from '@/shared/components/console-text';
import { ProgressBar } from '@/shared/components/progress-bar';
import { Screen } from '@/shared/components/screen';
import { useMeasuredResponsiveLayout } from '@/shared/responsive-layout';
import { Fonts, Palette, Radius, Space } from '@/shared/theme';
import { returnToOwningChapter } from '@/shared/navigation';
import { router } from 'expo-router';
import { AppRoutes } from '@/shared/routes';
import { useOperationsLabStore } from '@/store/use-operations-lab-store';
import { useGameStore } from '@/store/use-game-store';

function FieldControl({ field, value, onChange }: { field: SimulationFieldDefinition; value: SimulationValue | undefined; onChange: (value: SimulationValue) => void }) {
  if (field.kind === 'toggle') {
    const enabled = value === true;
    return <View style={styles.fieldBlock}><Text variant="technical" style={styles.fieldLabel}>{field.label}</Text><View style={styles.toggleRow}><Pressable accessibilityRole="radio" accessibilityState={{ checked: enabled }} onPress={() => onChange(true)} style={[styles.option, enabled && styles.optionSelected]}><Text variant="label" style={styles.optionText}>[ {enabled ? 'X' : ' '} ] ENABLED</Text></Pressable><Pressable accessibilityRole="radio" accessibilityState={{ checked: value === false }} onPress={() => onChange(false)} style={[styles.option, value === false && styles.optionSelected]}><Text variant="label" style={styles.optionText}>[ {value === false ? 'X' : ' '} ] DISABLED</Text></Pressable></View></View>;
  }
  if (field.kind === 'select') {
    return <View style={styles.fieldBlock}><Text variant="technical" style={styles.fieldLabel}>{field.label}</Text><View style={styles.optionGrid}>{field.options?.map((entry) => <Pressable key={String(entry.value)} accessibilityRole="radio" accessibilityState={{ checked: value === entry.value }} onPress={() => onChange(entry.value)} style={[styles.option, value === entry.value && styles.optionSelected]}><Text variant="label" style={styles.optionText}>{entry.label}</Text></Pressable>)}</View></View>;
  }
  return <View style={styles.fieldBlock}><Text variant="technical" style={styles.fieldLabel}>{field.label}</Text><TextInput accessibilityLabel={field.label} autoCapitalize="none" autoCorrect={false} keyboardType={field.kind === 'number' ? 'number-pad' : 'default'} onChangeText={(next) => onChange(field.kind === 'number' ? Number(next) : next)} placeholder={field.placeholder ?? `ENTER ${field.label.toUpperCase()}`} placeholderTextColor={Palette.textMuted} selectionColor={Palette.orange} style={styles.input} value={value === undefined || Number.isNaN(value) ? '' : String(value)} /></View>;
}

export function OperationsGuidedLab({ definition, onComplete }: { definition: OperationsLabDefinition; onComplete?: () => void }) {
  const simulator = operationsSimulationDefinitions[definition.id];
  const stored = useOperationsLabStore((state) => state.sessions[definition.id]);
  const recoveryCopy = useOperationsLabStore((state) => state.recoveryCopies[definition.id]);
  const save = useOperationsLabStore((state) => state.save);
  const undo = useOperationsLabStore((state) => state.undo);
  const reset = useOperationsLabStore((state) => state.reset);
  const dismissRecovery = useOperationsLabStore((state) => state.dismissRecovery);
  const undoCount = useOperationsLabStore((state) => state.history[definition.id]?.length ?? 0);
  const completeLab = useGameStore((state) => state.completeLab);
  const session = stored ?? emptyOperationsSimulationSession();
  const finished = session.stageIndex >= simulator.stages.length;
  const currentIndex = Math.min(session.stageIndex, simulator.stages.length - 1);
  const current = simulator.stages[currentIndex];
  const authored = definition.stages[currentIndex];
  const [draft, setDraft] = useState<Record<string, SimulationValue>>({});
  const [validationError, setValidationError] = useState<string>();
  const [cliOpen, setCliOpen] = useState(false);
  const [cliInput, setCliInput] = useState('');
  const [cliOutput, setCliOutput] = useState<string>();
  const [resetVisible, setResetVisible] = useState(false);
  const { mode, onLayout } = useMeasuredResponsiveLayout();
  const compact = mode === 'compact';
  const priorStageRef = useRef(session.stageIndex);

  useEffect(() => {
    if (priorStageRef.current !== session.stageIndex) {
      priorStageRef.current = session.stageIndex;
      setDraft({});
      setValidationError(undefined);
      setCliOutput(undefined);
    }
  }, [session.stageIndex]);

  useEffect(() => {
    if (finished) {
      if (onComplete) onComplete();
      else completeLab(definition.id);
    }
  }, [completeLab, definition.id, finished, onComplete]);

  const effectiveDraft = useMemo(() => Object.fromEntries(current.fields.map((field) => [field.id, draft[field.id] ?? session.configuration[field.id]])), [current.fields, draft, session.configuration]);
  const dirty = current.fields.some((field) => draft[field.id] !== undefined && draft[field.id] !== session.configuration[field.id]);
  const configured = current.fields.every((field) => session.configuration[field.id] !== undefined) && !dirty;
  const suggestions = getOperationsCliSuggestions(simulator, currentIndex);

  const applyConfiguration = () => {
    const applied = applySimulationConfiguration(session, current, effectiveDraft);
    if (!applied.accepted) { setValidationError(applied.error); return; }
    save(definition.id, applied.session);
    setDraft({});
    setValidationError(undefined);
  };

  const verify = () => {
    const result = evaluateSimulationObjective(definition.id, current, session, authored.explanation);
    const next = {
      ...session,
      lastResult: result,
      evidence: result.evidence,
      tables: { ...(session.tables ?? {}), [definition.tableTitle]: result.tableRows },
      traceIndex: 0,
      stageIndex: result.passed ? session.stageIndex + 1 : session.stageIndex,
      completedObjectiveIds: result.passed && !session.completedObjectiveIds.includes(current.id) ? [...session.completedObjectiveIds, current.id] : session.completedObjectiveIds,
    };
    save(definition.id, next);
  };

  const showHint = () => {
    const nextHint = current.hints.find((hint) => !session.hints.includes(`${current.id} / ${hint}`));
    if (nextHint) save(definition.id, { ...session, hints: [...session.hints, `${current.id} / ${nextHint}`] });
  };

  const runCli = () => {
    const result = executeOperationsCliCommand(simulator, session, cliInput);
    setCliOutput(result.output);
    if (result.accepted) save(definition.id, { ...session, configuration: result.configuration, lastResult: undefined, evidence: [] });
    setCliInput('');
  };

  if (!simulator) return <Screen><Text variant="screenTitle">SIMULATOR UNAVAILABLE</Text><AppButton label="Back to course" onPress={() => router.replace(AppRoutes.courses)} /></Screen>;

  return <Screen>
    <View onLayout={onLayout}>
      <View style={styles.header}><IconButton accessibilityLabel="Back from guided simulator" icon="arrow-left" label={definition.id === 'network-operations-capstone' ? 'BACK / COURSES' : 'BACK / MODULE'} onPress={() => definition.id === 'network-operations-capstone' ? router.dismissTo(AppRoutes.courses) : returnToOwningChapter('lab', definition.id)} /><Text variant="technical" style={styles.saveStatus}>LOCAL AUTOSAVE / V2</Text></View>
      <Text variant="label" style={styles.eyebrow}>GUIDED MINI-SIMULATOR</Text>
      <Text variant="screenTitle" style={styles.title}>{definition.title}</Text>
      <Text variant="technical" style={styles.subtitle}>{definition.subtitle}</Text>
      <ProgressBar progress={session.stageIndex / simulator.stages.length} />
      <Text accessibilityLiveRegion="polite" variant="label" style={styles.status}>{finished ? 'SIMULATION COMPLETE' : `OBJECTIVE ${session.stageIndex + 1} OF ${simulator.stages.length}`}</Text>

      {recoveryCopy ? <View style={styles.recovery}><Text variant="label" style={styles.warningTitle}>PREVIOUS LAB FORMAT SAVED</Text><Text variant="bodySmall" style={styles.line}>An unfinished choice-based session could not safely become device configuration. Its recovery copy was preserved; this simulator starts from a clean modeled state.</Text><AppButton label="Dismiss notice" variant="utility" onPress={() => dismissRecovery(definition.id)} /></View> : null}

      <View accessibilityLabel={`Fixed topology: ${definition.topology.join(', then ')}`} accessible style={styles.topology}><Text variant="label" style={styles.panelTitle}>FIXED MODELED TOPOLOGY</Text><View style={[styles.topologyRow, compact && styles.topologyColumn]}>{definition.topology.map((node, index) => <View key={node} style={[styles.topologyUnit, compact && styles.topologyUnitCompact]}>{index > 0 ? <Text variant="technical" style={styles.connector}>{compact ? '↓' : '→'}</Text> : null}<View style={styles.node}><Text variant="technical" style={styles.nodeText}>{node}</Text><Text variant="technical" style={styles.nodeState}>{finished ? 'VERIFIED' : 'MODELED'}</Text></View></View>)}</View></View>

      <View style={styles.panel}><Text variant="label" style={styles.panelTitle}>PREREQUISITES</Text>{definition.prerequisites.map((item) => <Text key={item} variant="bodySmall" style={styles.line}>[X] {item}</Text>)}</View>

      {!finished ? <>
        <View style={styles.objective}><Text variant="label" style={styles.panelTitle}>CURRENT OBJECTIVE</Text><Text variant="sectionHeading" style={styles.objectiveTitle}>{authored.objective}</Text><Text variant="body" style={styles.line}>{authored.prompt}</Text></View>
        <View style={styles.inspector}><Text variant="label" style={styles.inspectorTitle}>DEVICE / PROTOCOL INSPECTOR</Text><Text variant="bodySmall" style={styles.line}>Enter a valid configuration, save it, then run the objective test. Valid mistakes remain editable.</Text>{current.fields.map((field) => <FieldControl key={field.id} field={field} value={effectiveDraft[field.id]} onChange={(value) => { setDraft((state) => ({ ...state, [field.id]: value })); setValidationError(undefined); }} />)}
          {validationError ? <Text accessibilityLiveRegion="assertive" variant="bodySmall" style={styles.error}>{validationError}</Text> : null}
          {!configured ? <AppButton label="Save configuration" onPress={applyConfiguration} /> : <AppButton label={current.actionLabel} leadingIcon="check" onPress={verify} />}
        </View>

        {simulator.cliEnabled ? <View style={styles.cliPanel}><Pressable accessibilityRole="button" accessibilityState={{ expanded: cliOpen }} onPress={() => setCliOpen((value) => !value)} style={styles.disclosure}><Text variant="label" style={styles.cliTitle}>OPTIONAL NETBITE CLI</Text><Text variant="label">{cliOpen ? 'HIDE' : 'OPEN'}</Text></Pressable>{cliOpen ? <><Text variant="technical" style={styles.line}>BOUNDED COMMAND MODE / SAME STATE AS INSPECTOR</Text><View style={styles.suggestions}>{suggestions.map((suggestion) => <Pressable key={suggestion} accessibilityRole="button" onPress={() => setCliInput(suggestion)} style={styles.suggestion}><Text variant="technical">{suggestion}</Text></Pressable>)}</View><TextInput accessibilityLabel="Operations CLI command" autoCapitalize="none" autoCorrect={false} onChangeText={setCliInput} onSubmitEditing={runCli} placeholder="ENTER SUPPORTED COMMAND" placeholderTextColor={Palette.textMuted} selectionColor={Palette.orange} style={styles.input} value={cliInput} /><AppButton disabled={!cliInput.trim()} label="Run command" onPress={runCli} />{cliOutput ? <Text accessibilityLiveRegion="polite" variant="technical" style={styles.cliOutput}>{cliOutput}</Text> : null}</> : null}</View> : null}
      </> : <View style={styles.complete}><Text variant="label" style={styles.panelTitle}>ALL OBJECTIVES VERIFIED</Text><Text variant="body">Completion came from the final modeled configuration and its evidence. Reset remains available for another run without removing earned completion.</Text></View>}

      <View style={styles.panel}><Text variant="label" style={styles.panelTitle}>{definition.tableTitle}</Text>{(session.tables?.[definition.tableTitle] ?? []).length ? session.tables[definition.tableTitle].map((row, index) => <Text key={`${index}-${row}`} variant="technical" style={styles.tableRow}>{row}</Text>) : <Text variant="technical" style={styles.line}>NO CURRENT STATE / RUN THE OBJECTIVE TEST</Text>}</View>
      <View style={styles.panel}><Text variant="label" style={styles.panelTitle}>EVENT TRACE</Text>{session.evidence.length ? <><Text variant="technical" style={styles.traceCount}>TRACE STEP {Math.min(session.traceIndex + 1, session.evidence.length)} OF {session.evidence.length}</Text><Text accessibilityLiveRegion="polite" variant="bodySmall" style={[styles.evidence, session.evidence[session.traceIndex]?.tone === 'warning' && styles.warningText]}>{session.evidence[session.traceIndex]?.text}</Text><View style={styles.traceActions}><AppButton disabled={session.traceIndex <= 0} label="Previous step" variant="utility" onPress={() => save(definition.id, { ...session, traceIndex: Math.max(0, session.traceIndex - 1) })} /><AppButton disabled={session.traceIndex >= session.evidence.length - 1} label="Next step" variant="utility" onPress={() => save(definition.id, { ...session, traceIndex: Math.min(session.evidence.length - 1, session.traceIndex + 1) })} /></View></> : <Text variant="technical" style={styles.line}>NO EVENTS YET / SAVE AND RUN THE CURRENT OBJECTIVE</Text>}</View>

      {session.lastResult ? <View style={[styles.feedback, session.lastResult.passed ? styles.feedbackSuccess : styles.feedbackWarning]}><Text variant="label" style={session.lastResult.passed ? styles.panelTitle : styles.warningTitle}>{session.lastResult.passed ? 'OBJECTIVE PASSED' : session.lastResult.accepted ? 'CONFIGURATION NEEDS WORK' : 'ACTION NEEDED'}</Text><Text variant="bodySmall" style={styles.line}>{session.lastResult.message}</Text></View> : null}

      {!finished ? <View style={styles.why}><Text variant="label" style={styles.panelTitle}>WHY THIS HAPPENED</Text><Text variant="bodySmall" style={styles.line}>OBSERVATION / {session.lastResult?.explanation.observation ?? authored.explanation.observation}</Text><Text variant="bodySmall" style={styles.line}>RULE / {session.lastResult?.explanation.rule ?? authored.explanation.rule}</Text><Text variant="bodySmall" style={styles.line}>PROVES / {session.lastResult?.explanation.proves ?? authored.explanation.proves}</Text><Text variant="bodySmall" style={styles.line}>NEXT CHECK / {session.lastResult?.explanation.nextCheck ?? authored.explanation.nextCheck}</Text></View> : null}

      {session.hints.length ? <View style={styles.hints}><Text variant="label" style={styles.warningTitle}>HINT HISTORY</Text>{session.hints.map((hint, index) => <Text key={`${index}-${hint}`} variant="bodySmall" style={styles.line}>{index + 1}. {hint.replace(/^.*? \/ /, '')}</Text>)}</View> : null}
      {!finished && session.hints.filter((hint) => hint.startsWith(`${current.id} / `)).length < current.hints.length ? <AppButton label={session.hints.some((hint) => hint.startsWith(`${current.id} / `)) ? 'Show next hint' : 'Show a hint'} variant="secondary" onPress={showHint} /> : null}

      <View style={styles.tools}><Text variant="label" style={styles.toolsTitle}>SESSION TOOLS</Text><AppButton disabled={undoCount === 0} label="Undo latest change" variant="utility" onPress={() => { undo(definition.id); setValidationError(undefined); setDraft({}); }} /><AppButton label="Reset simulator" variant="danger" onPress={() => setResetVisible(true)} /></View>
      <Text variant="technical" style={styles.limit}>MODEL BOUNDARY / {definition.limitations}</Text>
    </View>
    <FeedbackModal visible={resetVisible} tone="warning" eyebrow="CONFIRM SIMULATOR RESET" title="Reset this simulator?" message="Configuration, evidence, trace position, undo history, and hints for this lab will be removed." detail="Earned course completion is retained." onRequestClose={() => setResetVisible(false)} secondaryAction={{ label: 'Keep working', variant: 'secondary', onPress: () => setResetVisible(false) }} primaryAction={{ label: 'Reset simulator', variant: 'danger', onPress: () => { reset(definition.id); setResetVisible(false); setDraft({}); setValidationError(undefined); } }} />
  </Screen>;
}

const styles = StyleSheet.create({
  header: { minHeight: 44, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Space.sm, marginBottom: Space.lg },
  saveStatus: { color: Palette.green }, eyebrow: { color: Palette.orange }, title: { color: Palette.text, fontFamily: Fonts.semibold, marginTop: Space.sm }, subtitle: { color: Palette.textMuted, marginVertical: Space.sm }, status: { color: Palette.green, marginVertical: Space.md },
  topology: { borderWidth: 1, borderColor: Palette.border, padding: Space.lg, marginBottom: Space.md, gap: Space.md }, topologyRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.xs }, topologyColumn: { flexDirection: 'column', alignItems: 'stretch' }, topologyUnit: { flexDirection: 'row', alignItems: 'center', flexGrow: 1, minWidth: 110, gap: Space.xs }, topologyUnitCompact: { flexDirection: 'column', minWidth: 0, width: '100%' }, connector: { color: Palette.orange }, node: { minHeight: 56, flex: 1, minWidth: 90, padding: Space.sm, borderWidth: 1, borderColor: Palette.green, justifyContent: 'center' }, nodeText: { color: Palette.text, textAlign: 'center' }, nodeState: { color: Palette.green, textAlign: 'center', marginTop: Space.xs },
  panel: { borderWidth: 1, borderColor: Palette.border, padding: Space.lg, marginBottom: Space.md, gap: Space.sm }, panelTitle: { color: Palette.green, fontFamily: Fonts.semibold }, warningTitle: { color: Palette.orange, fontFamily: Fonts.semibold }, objective: { borderLeftWidth: 3, borderColor: Palette.orange, backgroundColor: Palette.surfaceRaised, padding: Space.lg, gap: Space.sm, marginBottom: Space.md }, objectiveTitle: { color: Palette.text }, line: { color: Palette.textMuted },
  inspector: { borderWidth: 1, borderColor: Palette.orange, padding: Space.lg, gap: Space.md, marginBottom: Space.md }, inspectorTitle: { color: Palette.orange, fontFamily: Fonts.semibold }, fieldBlock: { gap: Space.xs }, fieldLabel: { color: Palette.textMuted }, input: { minHeight: 48, borderWidth: 1, borderColor: Palette.border, borderRadius: Radius.sm, color: Palette.text, fontFamily: Fonts.regular, fontSize: 14, paddingHorizontal: Space.md, paddingVertical: Space.sm }, optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }, toggleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }, option: { minHeight: 48, minWidth: 120, flexGrow: 1, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Palette.border, padding: Space.sm }, optionSelected: { borderColor: Palette.orange, backgroundColor: Palette.orangeSoft }, optionText: { color: Palette.text, textAlign: 'center' }, error: { color: Palette.danger, borderWidth: 1, borderColor: Palette.danger, padding: Space.md },
  cliPanel: { borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.background, padding: Space.md, gap: Space.md, marginBottom: Space.md }, disclosure: { minHeight: 44, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Space.md }, cliTitle: { color: Palette.text }, suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.xs }, suggestion: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: Palette.border, paddingHorizontal: Space.sm }, cliOutput: { color: Palette.green, padding: Space.sm, borderLeftWidth: 2, borderColor: Palette.green },
  evidence: { color: Palette.text, minHeight: 44, paddingVertical: Space.sm }, tableRow: { color: Palette.text, borderBottomWidth: 1, borderBottomColor: Palette.border, paddingVertical: Space.sm }, warningText: { color: Palette.orange }, traceCount: { color: Palette.textMuted }, traceActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }, feedback: { borderWidth: 1, padding: Space.lg, gap: Space.sm, marginBottom: Space.md }, feedbackSuccess: { borderColor: Palette.green }, feedbackWarning: { borderColor: Palette.orange }, why: { borderLeftWidth: 3, borderColor: Palette.orange, backgroundColor: Palette.surfaceRaised, padding: Space.lg, gap: Space.sm, marginBottom: Space.md }, hints: { borderWidth: 1, borderColor: Palette.orange, padding: Space.lg, gap: Space.sm, marginBottom: Space.md }, recovery: { borderWidth: 1, borderColor: Palette.orange, padding: Space.lg, gap: Space.sm, marginBottom: Space.md }, complete: { borderWidth: 1, borderColor: Palette.green, backgroundColor: Palette.greenSoft, padding: Space.lg, gap: Space.sm, marginVertical: Space.lg }, tools: { borderTopWidth: 1, borderColor: Palette.border, gap: Space.sm, marginTop: Space.xl, paddingTop: Space.lg }, toolsTitle: { color: Palette.textMuted }, limit: { color: Palette.textMuted, marginVertical: Space.xl },
});
