import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import type { OperationsLabDefinition } from '@/features/operations/operations-lab-definitions';
import { OperationsLabBriefing } from '@/features/operations/components/operations-lab-briefing';
import { OperationsLabTopology } from '@/features/operations/components/operations-lab-topology';
import { evaluateOperationsAdapterObjective } from '@/features/operations/operations-adapters';
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
import { CliConsoleShell, type CliConsoleLine, type CliConsoleTaskContext } from '@/shared/components/cli-console-shell';
import { FeedbackModal } from '@/shared/components/feedback-modal';
import { HintHistoryPanel } from '@/shared/components/hint-history-panel';
import { PageHeader } from '@/shared/components/page-header';
import { StatusRow } from '@/shared/components/status-row';
import { SelectionControl } from '@/shared/components/selection-control';
import { Text } from '@/shared/components/console-text';
import { ProgressBar } from '@/shared/components/progress-bar';
import { Screen } from '@/shared/components/screen';
import { ScreenActionBar } from '@/shared/components/screen-action-bar';
import { useMeasuredResponsiveLayout } from '@/shared/responsive-layout';
import { Fonts, Radius, Space, type ThemeColors } from '@/shared/theme';
import { useTheme, useThemeStyles } from '@/shared/theme-context';
import { returnToOwningChapter } from '@/shared/navigation';
import { router } from 'expo-router';
import { AppRoutes } from '@/shared/routes';
import { getLabResultLabel, getRecoveryMessage, getSimulatorBoundaryCopy } from '@/shared/learner-facing-copy';
import { useOperationsLabStore } from '@/store/use-operations-lab-store';
import { useGameStore } from '@/store/use-game-store';

function FieldControl({ field, value, onChange }: { field: SimulationFieldDefinition; value: SimulationValue | undefined; onChange: (value: SimulationValue) => void }) {
  const styles = useThemeStyles(createStyles);
  const { colors } = useTheme();
  const formatLabels: Partial<Record<NonNullable<SimulationFieldDefinition['format']>, string>> = {
    ipv4: 'IPv4 address, for example 192.168.10.10.',
    ipv6: 'IPv6 address; compressed notation such as 2001:db8::10 is accepted.',
    port: 'Whole-number transport port from 0 through 65535.',
    prefix4: 'IPv4 prefix length from 0 through 32. You may enter 24 or /24.',
    prefix6: 'IPv6 prefix length from 0 through 128. You may enter 64 or /64.',
    positive: 'Enter a positive whole number.',
    'csv-vlan': 'Enter VLAN IDs separated by commas, for example 10,20.',
    text: 'Enter the named value exactly as shown in the task information.',
  };
  const helpText = field.helpText ?? `${field.incorrectFeedback} ${field.format ? formatLabels[field.format] ?? '' : ''}`.trim();
  if (field.kind === 'toggle') {
    const enabled = value === true;
    return <View style={styles.fieldBlock}><Text variant="technical" style={styles.fieldLabel}>{field.label}</Text><View accessibilityLabel={field.label} accessibilityRole="radiogroup" style={styles.toggleRow}><SelectionControl label="Enabled" selected={enabled} onPress={() => onChange(true)} /><SelectionControl label="Disabled" selected={value === false} onPress={() => onChange(false)} /></View></View>;
  }
  if (field.kind === 'select') {
    return <View style={styles.fieldBlock}><Text variant="technical" style={styles.fieldLabel}>{field.label}</Text><View style={styles.optionGrid}>{field.options?.map((entry) => <Pressable key={String(entry.value)} accessibilityRole="radio" accessibilityState={{ checked: value === entry.value }} onPress={() => onChange(entry.value)} style={[styles.option, value === entry.value && styles.optionSelected]}><Text variant="label" style={styles.optionText}>{entry.label}</Text></Pressable>)}</View></View>;
  }
  const changeText = (next: string) => {
    if (field.kind !== 'number') return onChange(next);
    const normalized = field.format === 'prefix4' || field.format === 'prefix6' ? next.trim().replace(/^\//, '') : next;
    onChange(normalized === '' ? Number.NaN : Number(normalized));
  };
  return <View style={styles.fieldBlock}>
    <Text variant="technical" style={styles.fieldLabel}>{field.label}</Text>
    <Text variant="bodySmall" style={styles.fieldHelp}>{helpText}</Text>
    <TextInput accessibilityHint={helpText} accessibilityLabel={field.label} autoCapitalize="none" autoCorrect={false} keyboardType={field.kind === 'number' ? 'number-pad' : 'default'} onChangeText={changeText} placeholder={field.placeholder ?? (field.kind === 'number' ? 'ENTER A NUMBER' : 'ENTER THE SUPPLIED VALUE')} placeholderTextColor={colors.textMuted} selectionColor={colors.orange} style={styles.input} value={value === undefined || Number.isNaN(value) ? '' : String(value)} />
  </View>;
}

export function OperationsGuidedLab({ definition, onComplete }: { definition: OperationsLabDefinition; onComplete?: () => void }) {
  const styles = useThemeStyles(createStyles);
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
  const [cliVisible, setCliVisible] = useState(false);
  const [cliInput, setCliInput] = useState('');
  const [cliLines, setCliLines] = useState<CliConsoleLine[]>([]);
  const [resetVisible, setResetVisible] = useState(false);
  const [briefingOpen, setBriefingOpen] = useState(session.stageIndex === 0);
  const { mode, onLayout } = useMeasuredResponsiveLayout();
  const priorStageRef = useRef(session.stageIndex);

  useEffect(() => {
    if (priorStageRef.current !== session.stageIndex) {
      priorStageRef.current = session.stageIndex;
      setDraft({});
      setValidationError(undefined);
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
  const draftReady = current.fields.every((field) => {
    const value = effectiveDraft[field.id];
    return value !== undefined && value !== '' && !(typeof value === 'number' && Number.isNaN(value));
  });
  const currentOutcome = useMemo(() => evaluateSimulationObjective(definition.id, current, session, authored.explanation), [authored.explanation, current, definition.id, session]);
  const objectiveState = finished ? 'complete' : session.lastResult && !session.lastResult.passed ? 'attention' : configured ? 'ready' : Object.keys(session.configuration).length ? 'in-progress' : 'not-started';
  const workspaceTitle = ({
    'dhcp-lease-desk': 'DHCP SERVER AND CLIENT CONTROLS',
    'dns-resolution-desk': 'DNS RESOLVER AND RECORD CONTROLS',
    'acl-policy-desk': 'ACL POLICY AND TEST-FLOW CONTROLS',
    'nat-translation-desk': 'NAT BOUNDARY AND FLOW CONTROLS',
    'ipv6-address-desk': 'IPV6 INTERFACE CONTROLS',
    'ipv6-neighbor-desk': 'IPV6 NEIGHBOR AND ROUTE CONTROLS',
    'spanning-tree-desk': 'SPANNING TREE CONTROLS',
    'etherchannel-desk': 'LACP MEMBER AND PORT-CHANNEL CONTROLS',
    'route-source-desk': 'ROUTE CANDIDATE CONTROLS',
    'ospf-area-desk': 'OSPF ROUTER AND LINK CONTROLS',
    'network-operations-capstone': 'INTEGRATED NETWORK CONTROLS',
  } as Record<string, string>)[definition.id] ?? 'DEVICE / PROTOCOL CONTROLS';
  const suggestions = getOperationsCliSuggestions(simulator, currentIndex);
  const scenarioFacts = current.providedFacts?.length
    ? current.providedFacts
    : definition.briefing.startingState;
  const cliTaskContext = useMemo<CliConsoleTaskContext>(() => ({
    title: authored.objective,
    state: objectiveState,
    progress: `${Math.min(session.stageIndex + 1, simulator.stages.length)} OF ${simulator.stages.length}`,
    requirement: authored.prompt,
    facts: scenarioFacts.map((value, index) => ({ label: `SUPPLIED FACT ${index + 1}`, value })),
    commandFormat: suggestions[0],
    evidence: `Use ${current.actionLabel.toUpperCase()} and inspect what the test shows.`,
    nextAction: configured ? `Run ${current.actionLabel.toUpperCase()} and inspect the resulting table and trace.` : 'Configure the current objective using the supplied facts.',
  }), [authored.objective, authored.prompt, configured, current.actionLabel, objectiveState, scenarioFacts, session.stageIndex, simulator.stages.length, suggestions]);
  const liveTableRows = useMemo(() => {
    const savedRows = session.tables?.[definition.tableTitle] ?? [];
    if (savedRows.length || finished || definition.id === 'dhcp-lease-desk') return savedRows;
    return evaluateOperationsAdapterObjective(definition.id, current.id, session).tables.flatMap(({ title, rows }) => [title, ...rows]);
  }, [current.id, definition.id, definition.tableTitle, finished, session]);

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
      protocolState: result.protocolState ?? session.protocolState,
    };
    save(definition.id, next);
  };

  const showHint = () => {
    const nextHint = current.hints.find((hint) => !session.hints.includes(`${current.id} / ${hint}`));
    if (nextHint) save(definition.id, { ...session, hints: [...session.hints, `${current.id} / ${nextHint}`] });
  };

  const runCli = () => {
    const result = executeOperationsCliCommand(simulator, session, cliInput);
    const command = cliInput.trim();
    if (!command) return;
    setCliLines((lines) => [...lines, { id: `${Date.now()}-command`, text: `NETBITE> ${command}` }, { id: `${Date.now()}-output`, text: result.output, tone: result.accepted ? 'success' as const : 'warning' as const }].slice(-200));
    if (result.accepted) save(definition.id, { ...session, configuration: result.configuration, lastResult: undefined, evidence: [] });
    setCliInput('');
  };

  if (!simulator) return <Screen header={<PageHeader leading={{ accessibilityLabel: 'Back to course library', icon: 'arrow-left', label: 'BACK / COURSES', onPress: () => router.replace(AppRoutes.courses) }} />}><Text variant="screenTitle">SIMULATOR UNAVAILABLE</Text></Screen>;

  const footer = finished ? undefined : <ScreenActionBar feedback={validationError} label={`OBJECTIVE ${currentIndex + 1} / ${configured ? 'RUN PROTOCOL ACTION' : 'SAVE CONFIGURATION'}`} tone={validationError ? 'error' : 'normal'}><AppButton disabled={!configured && !draftReady} label={configured ? current.actionLabel : 'Save configuration'} leadingIcon={configured ? 'check' : undefined} onPress={configured ? verify : applyConfiguration} /></ScreenActionBar>;

  return <Screen footer={footer} header={<PageHeader leading={{ accessibilityLabel: 'Back from guided simulator', icon: 'arrow-left', label: definition.id === 'network-operations-capstone' ? 'BACK / COURSES' : 'BACK / MODULE', onPress: () => definition.id === 'network-operations-capstone' ? router.dismissTo(AppRoutes.courses) : returnToOwningChapter('lab', definition.id) }} status="SAVED ON THIS DEVICE" />}>
    <View onLayout={onLayout}>
      <Text variant="label" style={styles.eyebrow}>GUIDED MINI-SIMULATOR</Text>
      <Text variant="screenTitle" style={styles.title}>{definition.title}</Text>
      <Text variant="technical" style={styles.subtitle}>{definition.subtitle}</Text>
      <ProgressBar progress={session.stageIndex / simulator.stages.length} />
      <Text accessibilityLiveRegion="polite" variant="label" style={styles.status}>{finished ? 'SIMULATION COMPLETE' : `OBJECTIVE ${session.stageIndex + 1} OF ${simulator.stages.length}`}</Text>

      {recoveryCopy ? <View style={styles.recovery}><Text variant="label" style={styles.warningTitle}>LAB UPDATED</Text><Text variant="bodySmall" style={styles.line}>{getRecoveryMessage('lab')} This updated lab starts from the beginning.</Text><AppButton label="Dismiss notice" variant="utility" onPress={() => dismissRecovery(definition.id)} /></View> : null}

      {definition.id === 'network-operations-capstone' ? <View style={styles.phasePanel} accessibilityLabel="Integrated lab phase progress"><Text variant="label" style={styles.panelTitle}>GUIDED PHASES</Text><StatusRow label="IPv4 Small Office" value={`${session.completedObjectiveIds.filter((id) => id.startsWith('office-')).length} OF 5`} state={session.completedObjectiveIds.includes('office-verify') ? 'complete' : current.id.startsWith('office-') ? 'attention' : 'pending'} /><StatusRow label="IPv6 Branch" value={`${session.completedObjectiveIds.filter((id) => id.startsWith('branch-')).length} OF 3`} state={session.completedObjectiveIds.includes('branch-fault') ? 'complete' : current.id.startsWith('branch-') ? 'attention' : 'locked'} /></View> : null}

      <OperationsLabBriefing labId={definition.id} briefing={definition.briefing} expanded={briefingOpen} onToggle={() => setBriefingOpen((value) => !value)} />
      <OperationsLabTopology definition={definition} finished={finished} mode={mode} session={session} stageId={current?.id} />

      <View style={styles.panel}><Text variant="label" style={styles.panelTitle}>PREREQUISITES</Text>{definition.prerequisites.map((item) => <StatusRow key={item} label={item} state="complete" variant="bodySmall" showStateLabel={false} />)}</View>

      {!finished ? <>
        <View style={styles.objective}><Text variant="label" style={styles.panelTitle}>CURRENT OBJECTIVE / {objectiveState.replace('-', ' ').toUpperCase()}</Text><Text variant="sectionHeading" style={styles.objectiveTitle}>{authored.objective}</Text><Text variant="body" style={styles.line}>{authored.prompt}</Text><Text variant="bodySmall" style={styles.objectiveEvidence}>{getLabResultLabel(definition.id)} / {currentOutcome.message}</Text><Text variant="bodySmall" style={styles.objectiveHelp}>NEXT STEP / {configured ? `Run ${current.actionLabel.toUpperCase()} and inspect the result.` : 'Configure the required values below, then save them.'}</Text><Text variant="bodySmall" style={styles.objectiveHelp}>NEED THE METHOD? OPEN “LEARN THE SETUP” ABOVE OR REVEAL A HINT BELOW.</Text></View>
        <View style={styles.inspector}><Text variant="label" style={styles.inspectorTitle}>{workspaceTitle}</Text><Text variant="bodySmall" style={styles.line}>Change the device configuration, save it, then run the current protocol action. Valid mistakes remain visible until you repair them.</Text>
          {scenarioFacts.length ? <View accessibilityLabel="Information provided for this objective" style={styles.providedFacts}><Text variant="label" style={styles.providedTitle}>SUPPLIED SCENARIO FACTS</Text>{scenarioFacts.map((fact) => <Text key={fact} variant="bodySmall" style={styles.providedFact}>• {fact}</Text>)}</View> : null}
          <Text variant="label" style={styles.configurationTitle}>LEARNER CONFIGURATION</Text>
          {current.fields.map((field) => <FieldControl key={field.id} field={field} value={effectiveDraft[field.id]} onChange={(value) => { setDraft((state) => ({ ...state, [field.id]: value })); setValidationError(undefined); }} />)}
          {validationError ? <Text accessibilityLiveRegion="assertive" variant="bodySmall" style={styles.error}>{validationError}</Text> : null}
          {configured ? <Text variant="label" style={styles.protocolActionTitle}>READY TO RUN / USE THE ACTION BAR BELOW</Text> : null}
        </View>

        {simulator.cliEnabled ? <View style={styles.cliPanel}><Text variant="label" style={styles.cliTitle}>OPTIONAL NETBITE CLI</Text><Text variant="bodySmall" style={styles.line}>The console changes the same configuration shown in the device panel.</Text><AppButton label="Open full-screen CLI" variant="secondary" onPress={() => setCliVisible(true)} /></View> : null}
      </> : <View style={styles.complete}><Text variant="label" style={styles.panelTitle}>ALL OBJECTIVES COMPLETE</Text><Text variant="body">Your final configuration and test results satisfy the lab. You can reset the lab for another run without removing earned completion.</Text></View>}

      <View style={styles.panel}><Text variant="label" style={styles.panelTitle}>{definition.tableTitle}</Text>{liveTableRows.length ? liveTableRows.map((row, index) => <Text key={`${index}-${row}`} variant="technical" style={styles.tableRow}>{row}</Text>) : <Text variant="technical" style={styles.line}>NO RESULTS YET / CONFIGURE THE CURRENT OBJECTIVE</Text>}</View>
      <View style={styles.panel}><Text variant="label" style={styles.panelTitle}>EVENT HISTORY</Text>{session.evidence.length ? <><Text variant="technical" style={styles.traceCount}>STEP {Math.min(session.traceIndex + 1, session.evidence.length)} OF {session.evidence.length}</Text><Text accessibilityLiveRegion="polite" variant="bodySmall" style={[styles.evidence, session.evidence[session.traceIndex]?.tone === 'warning' && styles.warningText]}>{session.evidence[session.traceIndex]?.text}</Text><View style={styles.traceActions}><AppButton disabled={session.traceIndex <= 0} label="Previous step" variant="utility" onPress={() => save(definition.id, { ...session, traceIndex: Math.max(0, session.traceIndex - 1) })} /><AppButton disabled={session.traceIndex >= session.evidence.length - 1} label="Next step" variant="utility" onPress={() => save(definition.id, { ...session, traceIndex: Math.min(session.evidence.length - 1, session.traceIndex + 1) })} /></View></> : <Text variant="technical" style={styles.line}>NO EVENTS YET / SAVE AND RUN THE CURRENT OBJECTIVE</Text>}</View>

      {session.lastResult ? <View style={[styles.feedback, session.lastResult.passed ? styles.feedbackSuccess : styles.feedbackWarning]}><Text variant="label" style={session.lastResult.passed ? styles.panelTitle : styles.warningTitle}>{session.lastResult.passed ? 'OBJECTIVE PASSED' : session.lastResult.accepted ? 'CONFIGURATION NEEDS WORK' : 'ACTION NEEDED'}</Text><Text variant="bodySmall" style={styles.line}>{session.lastResult.message}</Text></View> : null}

      {!finished ? <View style={styles.why}><Text variant="label" style={styles.panelTitle}>WHY THIS HAPPENED</Text><Text variant="bodySmall" style={styles.line}>OBSERVATION / {session.lastResult?.explanation.observation ?? authored.explanation.observation}</Text><Text variant="bodySmall" style={styles.line}>RULE / {session.lastResult?.explanation.rule ?? authored.explanation.rule}</Text><Text variant="bodySmall" style={styles.line}>PROVES / {session.lastResult?.explanation.proves ?? authored.explanation.proves}</Text><Text variant="bodySmall" style={styles.line}>NEXT CHECK / {session.lastResult?.explanation.nextCheck ?? authored.explanation.nextCheck}</Text></View> : null}

      <HintHistoryPanel hints={session.hints} stripContext />
      {!finished && session.hints.filter((hint) => hint.startsWith(`${current.id} / `)).length < current.hints.length ? <AppButton label={session.hints.some((hint) => hint.startsWith(`${current.id} / `)) ? 'Show next hint' : 'Show a hint'} variant="secondary" onPress={showHint} /> : null}

      <View style={styles.tools}><Text variant="label" style={styles.toolsTitle}>SESSION TOOLS</Text><AppButton disabled={undoCount === 0} label="Undo latest change" variant="utility" onPress={() => { undo(definition.id); setValidationError(undefined); setDraft({}); }} /><AppButton label="Reset simulator" variant="danger" onPress={() => setResetVisible(true)} /></View>
      <Text variant="technical" style={styles.limit}>WHAT THIS PRACTICE SUPPORTS / {definition.limitations}</Text>
    </View>
    {simulator.cliEnabled ? <CliConsoleShell accessibilityLabel={`${definition.title} full-screen CLI`} boundary={getSimulatorBoundaryCopy('operations')} eyebrow="NETWORK OPERATIONS / CLI" input={cliInput} lines={cliLines} onClose={() => setCliVisible(false)} onInputChange={setCliInput} onSubmit={runCli} prompt="NETBITE>" suggestions={suggestions} taskContext={cliTaskContext} testID="operations-cli-modal" title={definition.title} visible={cliVisible} /> : null}
    <FeedbackModal visible={resetVisible} tone="warning" eyebrow="CONFIRM SIMULATOR RESET" title="Reset this simulator?" message="Configuration, evidence, trace position, undo history, and hints for this lab will be removed." detail="Earned course completion is retained." onRequestClose={() => setResetVisible(false)} secondaryAction={{ label: 'Keep working', variant: 'secondary', onPress: () => setResetVisible(false) }} primaryAction={{ label: 'Reset simulator', variant: 'danger', onPress: () => { reset(definition.id); setResetVisible(false); setCliVisible(false); setCliLines([]); setDraft({}); setValidationError(undefined); } }} />
  </Screen>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  header: { minHeight: 44, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Space.sm, marginBottom: Space.lg },
  saveStatus: { color: colors.green }, eyebrow: { color: colors.orange }, title: { color: colors.text, fontFamily: Fonts.semibold, marginTop: Space.sm }, subtitle: { color: colors.textMuted, marginVertical: Space.sm }, status: { color: colors.green, marginVertical: Space.md },
  topology: { borderWidth: 1, borderColor: colors.border, padding: Space.lg, marginBottom: Space.md, gap: Space.md }, topologyRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.xs }, topologyColumn: { flexDirection: 'column', alignItems: 'stretch' }, topologyUnit: { flexDirection: 'row', alignItems: 'center', flexGrow: 1, minWidth: 110, gap: Space.xs }, topologyUnitCompact: { flexDirection: 'column', minWidth: 0, width: '100%' }, connector: { color: colors.orange }, node: { minHeight: 56, flex: 1, minWidth: 90, padding: Space.sm, borderWidth: 1, borderColor: colors.green, justifyContent: 'center' }, nodeText: { color: colors.text, textAlign: 'center' }, nodeState: { color: colors.green, textAlign: 'center', marginTop: Space.xs },
  panel: { borderWidth: 1, borderColor: colors.border, padding: Space.lg, marginBottom: Space.md, gap: Space.sm }, phasePanel: { borderWidth: 1, borderColor: colors.green, backgroundColor: colors.greenSoft, padding: Space.md, marginBottom: Space.md, gap: Space.sm }, panelTitle: { color: colors.green, fontFamily: Fonts.semibold }, warningTitle: { color: colors.orange, fontFamily: Fonts.semibold }, objective: { borderLeftWidth: 3, borderColor: colors.orange, backgroundColor: colors.surfaceRaised, padding: Space.lg, gap: Space.sm, marginBottom: Space.md }, objectiveTitle: { color: colors.text }, objectiveEvidence: { color: colors.green, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: Space.sm }, objectiveHelp: { color: colors.orange, marginTop: Space.xs }, line: { color: colors.textMuted },
  inspector: { borderWidth: 1, borderColor: colors.orange, padding: Space.lg, gap: Space.md, marginBottom: Space.md }, inspectorTitle: { color: colors.orange, fontFamily: Fonts.semibold }, providedFacts: { minWidth: 0, gap: Space.sm, borderLeftWidth: 3, borderLeftColor: colors.green, backgroundColor: colors.greenSoft, padding: Space.md }, providedTitle: { color: colors.green, fontFamily: Fonts.semibold }, providedFact: { color: colors.text }, configurationTitle: { color: colors.text, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: Space.md }, protocolActionTitle: { color: colors.green, marginTop: Space.xs }, fieldBlock: { minWidth: 0, gap: Space.xs }, fieldLabel: { color: colors.text, fontFamily: Fonts.medium }, fieldHelp: { color: colors.textMuted, marginBottom: Space.xs }, input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: Radius.sm, color: colors.text, fontFamily: Fonts.regular, fontSize: 14, paddingHorizontal: Space.md, paddingVertical: Space.sm }, optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }, toggleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }, option: { minHeight: 48, minWidth: 120, flexGrow: 1, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border, padding: Space.sm }, optionSelected: { borderColor: colors.orange, backgroundColor: colors.orangeSoft }, optionText: { color: colors.text, textAlign: 'center' }, error: { color: colors.danger, borderWidth: 1, borderColor: colors.danger, padding: Space.md },
  cliPanel: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, padding: Space.md, gap: Space.md, marginBottom: Space.md }, disclosure: { minHeight: 44, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Space.md }, cliTitle: { color: colors.text }, suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.xs }, suggestion: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, paddingHorizontal: Space.sm }, cliOutput: { color: colors.green, padding: Space.sm, borderLeftWidth: 2, borderColor: colors.green },
  evidence: { color: colors.text, minHeight: 44, paddingVertical: Space.sm }, tableRow: { color: colors.text, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: Space.sm }, warningText: { color: colors.orange }, traceCount: { color: colors.textMuted }, traceActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }, feedback: { borderWidth: 1, padding: Space.lg, gap: Space.sm, marginBottom: Space.md }, feedbackSuccess: { borderColor: colors.green }, feedbackWarning: { borderColor: colors.orange }, why: { borderLeftWidth: 3, borderColor: colors.orange, backgroundColor: colors.surfaceRaised, padding: Space.lg, gap: Space.sm, marginBottom: Space.md }, hints: { borderWidth: 1, borderColor: colors.orange, padding: Space.lg, gap: Space.sm, marginBottom: Space.md }, recovery: { borderWidth: 1, borderColor: colors.orange, padding: Space.lg, gap: Space.sm, marginBottom: Space.md }, complete: { borderWidth: 1, borderColor: colors.green, backgroundColor: colors.greenSoft, padding: Space.lg, gap: Space.sm, marginVertical: Space.lg }, tools: { borderTopWidth: 1, borderColor: colors.border, gap: Space.sm, marginTop: Space.xl, paddingTop: Space.lg }, toolsTitle: { color: colors.textMuted }, limit: { color: colors.textMuted, marginVertical: Space.xl },
});
