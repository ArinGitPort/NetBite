import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from 'react-native';

import {
  cloneCliNetwork,
  deriveVlanReachability,
  executeCliCommand,
  getCliPrompt,
  getCliSuggestions,
  parseCliCommand,
  type CliNetworkState,
  type CliOutputLine,
} from '@/core/network/cli-simulator';
import {
  requiredStaticRoutes,
  type CliLabDefinition,
  type CliPredictionChoice,
} from '@/features/cli/cli-lab-definitions';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { FeedbackModal } from '@/shared/components/feedback-modal';
import { IconButton } from '@/shared/components/icon-button';
import { useMeasuredResponsiveLayout } from '@/shared/responsive-layout';
import { Screen } from '@/shared/components/screen';
import { selectionHaptic, successHaptic, warningHaptic } from '@/shared/haptics';
import { Fonts, Palette, Space } from '@/shared/theme';
import { useGameStore } from '@/store/use-game-store';

interface TranscriptEntry { id: number; prompt?: string; lines: CliOutputLine[] }

function sameSet(values: number[] | undefined, expected: number[]) {
  return Boolean(values && values.length === expected.length && expected.every((value) => values.includes(value)));
}

function routeProgress(state: CliNetworkState) {
  const configured = requiredStaticRoutes.filter((required) => state.devices.find(({ id }) => id === required.deviceId)?.routes.some((route) =>
    route.prefix === required.prefix && route.prefixLength === required.prefixLength && route.nextHop === required.nextHop,
  )).length;
  const staticCount = state.devices.flatMap(({ routes }) => routes).filter(({ source }) => source === 'static').length;
  return { configured, exact: configured === requiredStaticRoutes.length && staticCount === requiredStaticRoutes.length };
}

function vlanProgress(state: CliNetworkState) {
  const swA = state.devices.find(({ id }) => id === 'sw-a'); const swB = state.devices.find(({ id }) => id === 'sw-b');
  const port = (device: typeof swA, name: string) => device?.interfaces.find((item) => item.name === name);
  const vlans = [swA, swB].every((item) => item && [10, 20].every((vlan) => item.vlans.includes(vlan)));
  const access = port(swA, 'F0/1')?.switchportMode === 'access' && port(swA, 'F0/1')?.accessVlan === 10
    && port(swB, 'F0/2')?.switchportMode === 'access' && port(swB, 'F0/2')?.accessVlan === 10
    && port(swB, 'F0/3')?.switchportMode === 'access' && port(swB, 'F0/3')?.accessVlan === 20;
  const trunks = [port(swA, 'F0/24'), port(swB, 'F0/24')].every((item) => item?.switchportMode === 'trunk' && sameSet(item.allowedVlans, [10, 20]));
  return { vlans, access, trunks, exact: vlans && access && trunks };
}

function GuideModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modalBackdrop}>
        <View accessibilityRole="alert" accessibilityViewIsModal style={styles.guidePanel}>
          <Text variant="label" style={styles.orange}>NETBITE CLI / QUICK START</Text>
          <View style={styles.guideCard}><Text variant="sectionHeading" style={styles.guideTitle}>1 / READ THE PROMPT</Text><Text variant="bodySmall">The ending shows the mode: &gt; user, # privileged, (config)# configuration.</Text></View>
          <View style={styles.guideCard}><Text variant="sectionHeading" style={styles.guideTitle}>2 / TYPE OR TAP</Text><Text variant="bodySmall">Suggestions reduce mobile typing. You can still enter any supported command yourself.</Text></View>
          <View style={styles.guideCard}><Text variant="sectionHeading" style={styles.guideTitle}>3 / INSPECT AND CORRECT</Text><Text variant="bodySmall">Valid configuration changes remain active. Use NO commands, Undo, or Reset to correct mistakes.</Text></View>
          <AppButton label="Open the console" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

function PredictionPanel({ choices, selected, feedback, onSelect }: { choices: CliPredictionChoice[]; selected?: string; feedback?: string; onSelect: (id: string) => void }) {
  return (
    <View style={styles.predictionPanel}>
      {choices.map((choice) => (
        <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected === choice.id }} key={choice.id} onPress={() => onSelect(choice.id)} style={[styles.prediction, selected === choice.id && styles.predictionActive]}>
          <Text variant="label" style={styles.predictionText}>{choice.label}</Text>
        </Pressable>
      ))}
      {feedback ? <Text accessibilityLiveRegion="polite" variant="bodySmall" style={styles.feedback}>{feedback}</Text> : null}
    </View>
  );
}

export function CliLab({ definition }: { definition: CliLabDefinition }) {
  const completeLab = useGameStore((state) => state.completeLab);
  const cliGuideSeen = useGameStore((state) => state.cliGuideSeen);
  const markCliGuideSeen = useGameStore((state) => state.markCliGuideSeen);
  const { mode: responsiveMode, onLayout } = useMeasuredResponsiveLayout();
  const compact = responsiveMode === 'compact';
  const wide = responsiveMode === 'wide';
  const [network, setNetwork] = useState(definition.createState);
  const [activeDeviceId, setActiveDeviceId] = useState(() => definition.kind === 'vlan' ? 'sw-a' : definition.kind === 'diagnostic' ? 'r1' : 'r1');
  const [input, setInput] = useState('');
  const [transcripts, setTranscripts] = useState<Record<string, TranscriptEntry[]>>({});
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [snapshots, setSnapshots] = useState<CliNetworkState[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [selectedPrediction, setSelectedPrediction] = useState<string>();
  const [predictionFeedback, setPredictionFeedback] = useState<string>();
  const [vlanPredictions, setVlanPredictions] = useState<Record<string, boolean>>({});
  const [vlanSelections, setVlanSelections] = useState<Record<string, string>>({});
  const [vlanFeedback, setVlanFeedback] = useState<Record<string, string>>({});
  const [guideVisible, setGuideVisible] = useState(!cliGuideSeen);
  const [statusVisible, setStatusVisible] = useState(wide);
  const [resetVisible, setResetVisible] = useState(false);
  const [completionVisible, setCompletionVisible] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const nextTranscriptId = useRef(1);
  const pageRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const transcriptRef = useRef<ScrollView>(null);
  const activeDevice = network.devices.find(({ id }) => id === activeDeviceId) ?? network.devices[0];
  const scenario = definition.diagnosticScenarios?.[scenarioIndex];
  const routeState = routeProgress(network);
  const vlanState = vlanProgress(network);
  const forwardVerified = events.includes('verified-forward');
  const reverseVerified = events.includes('verified-reverse');

  const visibleDevices = network.devices.filter((item) => definition.kind === 'diagnostic' ? item.id === 'r1' : definition.kind === 'vlan' ? item.type === 'switch' : true);
  const statusDevices = definition.kind === 'vlan'
    ? [...network.devices.filter((item) => item.type === 'switch'), ...network.devices.filter((item) => item.type === 'host')]
    : network.devices;
  const activeTranscript = transcripts[activeDevice.id] ?? [];

  const taskSuggestions = useMemo(() => {
    if (definition.kind === 'diagnostic') return scenario?.suggestions ?? [];
    if (definition.kind === 'routing') {
      if (activeDevice.type === 'host') return [activeDevice.id === 'pc-a' ? 'ping 192.168.30.10' : 'ping 192.168.10.10', 'help'];
      if (activeDevice.mode === 'global-config') {
        const commands = requiredStaticRoutes.filter(({ deviceId }) => deviceId === activeDevice.id).map(({ prefix, nextHop }) => `ip route ${prefix} 255.255.255.0 ${nextHop}`);
        return routeState.configured === 0 ? [...commands.slice(0, 1), 'end'] : ['ip route ', 'end'];
      }
    }
    if (definition.kind === 'vlan' && activeDevice.mode === 'global-config') return ['vlan 10', 'vlan 20', 'interface F0/1', 'interface F0/2', 'interface F0/3', 'interface F0/24', 'end'];
    return getCliSuggestions(activeDevice);
  }, [activeDevice, definition.kind, routeState.configured, scenario]);

  const hintText = useMemo(() => {
    if (hintLevel === 0) return undefined;
    if (definition.kind === 'diagnostic') return scenario?.hints[Math.min(hintLevel - 1, scenario.hints.length - 1)];
    if (definition.kind === 'routing') {
      const missing = requiredStaticRoutes.find((required) => !network.devices.find(({ id }) => id === required.deviceId)?.routes.some((route) => route.prefix === required.prefix && route.prefixLength === required.prefixLength && route.nextHop === required.nextHop));
      if (hintLevel === 1) return 'A static route needs a destination network, contiguous mask, and adjacent next-hop address.';
      return missing ? `On ${network.devices.find(({ id }) => id === missing.deviceId)?.name}, use IP ROUTE ${missing.prefix} 255.255.255.0 ${missing.nextHop}.` : 'Select PC-A and PC-C in turn and use PING to verify both directions.';
    }
    if (hintLevel === 1) return 'Create VLAN 10 and 20 on both switches before assigning endpoint and trunk ports.';
    return 'PC-A uses SW-A F0/1 VLAN 10. PC-B uses SW-B F0/2 VLAN 10. PC-C uses SW-B F0/3 VLAN 20. Configure F0/24 as a trunk allowing 10,20 on both switches.';
  }, [definition.kind, hintLevel, network.devices, scenario]);

  const suggestions = taskSuggestions.filter((item) => !input || item.toLowerCase().startsWith(input.trim().toLowerCase())).slice(0, compact ? 4 : 6);

  const appendTranscript = (deviceId: string, entry: Omit<TranscriptEntry, 'id'>) => {
    const nextEntry = { ...entry, id: nextTranscriptId.current++ };
    setTranscripts((current) => ({ ...current, [deviceId]: [...(current[deviceId] ?? []), nextEntry].slice(-200) }));
    setTimeout(() => transcriptRef.current?.scrollToEnd({ animated: false }), 0);
  };

  const revealLowerContent = () => setTimeout(() => pageRef.current?.scrollToEnd({ animated: true }), 0);

  const submit = () => {
    const raw = input.trim(); if (!raw) return;
    const prompt = getCliPrompt(activeDevice);
    const parsed = parseCliCommand(raw);
    setHistory((current) => [...current.filter((item) => item !== raw), raw].slice(-50)); setHistoryIndex(-1); setInput('');
    if (!parsed.ok) {
      appendTranscript(activeDevice.id, { prompt: `${prompt} ${raw}`, lines: [{ text: parsed.error, tone: 'warning' }] }); warningHaptic(); inputRef.current?.focus(); return;
    }
    const result = executeCliCommand(network, activeDevice.id, parsed.command);
    if (result.events.includes('config-change')) setSnapshots((current) => [...current, cloneCliNetwork(network)].slice(-20));
    setNetwork(result.state);
    const nextEvents = [...events, ...result.events];
    if (result.events.includes('ping-success:192.168.30.10') && activeDevice.id === 'pc-a') nextEvents.push('verified-forward');
    if (result.events.includes('ping-success:192.168.10.10') && activeDevice.id === 'pc-c') nextEvents.push('verified-reverse');
    setEvents([...new Set(nextEvents)]);
    appendTranscript(activeDevice.id, { prompt: `${prompt} ${raw}`, lines: result.output });
    if (scenario?.requiredEvents.every((required) => nextEvents.includes(required)) || (definition.kind === 'vlan' && vlanProgress(result.state).exact)) revealLowerContent();
    if (result.accepted) selectionHaptic(); else warningHaptic();
    inputRef.current?.focus();
  };

  const navigateHistory = (direction: -1 | 1) => {
    if (!history.length) return;
    const next = Math.max(-1, Math.min(history.length - 1, historyIndex + direction));
    setHistoryIndex(next); setInput(next === -1 ? '' : history[history.length - 1 - next]); inputRef.current?.focus();
  };

  const onKeyPress = (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (event.nativeEvent.key === 'ArrowUp') navigateHistory(1);
    if (event.nativeEvent.key === 'ArrowDown') navigateHistory(-1);
    if (event.nativeEvent.key === 'Tab' && suggestions[0]) setInput(suggestions[0]);
  };

  const undo = () => {
    const previous = snapshots.at(-1); if (!previous) return;
    setNetwork(previous); setSnapshots((current) => current.slice(0, -1));
    appendTranscript(activeDevice.id, { lines: [{ text: 'NETBITE: Last configuration change undone.', tone: 'muted' }] });
  };

  const reset = () => {
    const state = definition.kind === 'diagnostic' ? definition.diagnosticScenarios![0].createState() : definition.createState();
    setNetwork(state); setActiveDeviceId(definition.kind === 'vlan' ? 'sw-a' : 'r1'); setTranscripts({}); setHistory([]); setSnapshots([]); setEvents([]); setScenarioIndex(0); setSelectedPrediction(undefined); setPredictionFeedback(undefined); setVlanPredictions({}); setVlanSelections({}); setVlanFeedback({}); setResetVisible(false); setHintLevel(0);
    setTimeout(() => pageRef.current?.scrollTo({ y: 0, animated: true }), 0);
  };

  const chooseDiagnosticPrediction = (id: string) => {
    if (!scenario) return;
    const choice = scenario.choices.find((item) => item.id === id)!; setSelectedPrediction(id); setPredictionFeedback(choice.feedback);
    if (id === scenario.correctChoiceId) successHaptic(); else warningHaptic();
  };

  const advanceDiagnostic = () => {
    if (!scenario || selectedPrediction !== scenario.correctChoiceId) return;
    if (scenarioIndex === definition.diagnosticScenarios!.length - 1) return finishLab();
    const nextIndex = scenarioIndex + 1; setScenarioIndex(nextIndex); setNetwork(definition.diagnosticScenarios![nextIndex].createState()); setActiveDeviceId('r1'); setEvents([]); setSelectedPrediction(undefined); setPredictionFeedback(undefined); setHintLevel(0); setTimeout(() => pageRef.current?.scrollTo({ y: 0, animated: true }), 0);
  };

  const finishLab = () => { completeLab(definition.id); setCompletionVisible(true); successHaptic(); };
  const diagnosticEvidenceReady = Boolean(scenario && scenario.requiredEvents.every((required) => events.includes(required)));
  const routingComplete = routeState.exact && forwardVerified && reverseVerified;
  const vlanComplete = vlanState.exact && vlanPredictions.same === true && vlanPredictions.different === true;

  const closeGuide = () => { markCliGuideSeen(); setGuideVisible(false); };

  const statusPanel = (
    <View style={styles.statusPanel}>
      <Pressable accessibilityRole="button" onPress={() => setStatusVisible((current) => !current)} style={styles.statusHeader}>
        <Text variant="label" style={styles.green}>OBJECTIVE STATUS</Text><Text variant="label">{statusVisible ? 'HIDE' : 'SHOW'}</Text>
      </Pressable>
      {statusVisible ? (
        <View style={styles.statusBody}>
          <Text variant="bodySmall">{definition.objective}</Text>
          {definition.kind !== 'diagnostic' ? <View accessibilityLabel={definition.kind === 'routing' ? 'Fixed path from PC-A through R1, R2, and R3 to PC-C.' : 'PC-A connects to SW-A. SW-A connects to SW-B. PC-B and PC-C connect to SW-B.'} style={styles.networkMap}>{statusDevices.map((item) => { const trunk = item.interfaces.find(({ name }) => name === 'F0/24'); const detail = item.type === 'router' ? `${item.routes.filter(({ source }) => source === 'static').length} STATIC` : item.type === 'switch' ? `F0/24 ${trunk?.switchportMode?.toUpperCase() ?? 'ACCESS'}${trunk?.switchportMode === 'trunk' ? ` ${trunk.allowedVlans?.join(',') || 'NONE'}` : ''}` : 'ENDPOINT'; return <View key={item.id} style={[styles.networkNode, item.type === 'switch' && definition.kind === 'vlan' ? styles.networkNodeWide : styles.networkNodeStandard, item.id === activeDevice.id && styles.networkNodeActive]}><Text variant="technical" style={styles.networkNodeName}>{item.name}</Text><Text variant="technical" style={styles.networkNodeDetail}>{detail}</Text></View>; })}</View> : null}
          {definition.kind === 'diagnostic' ? <><Text variant="technical">SCENARIO {scenarioIndex + 1} OF {definition.diagnosticScenarios!.length}</Text><Text variant="bodySmall">{scenario?.context}</Text><Text variant="technical" style={diagnosticEvidenceReady ? styles.complete : styles.pending}>{diagnosticEvidenceReady ? '[X] EVIDENCE COLLECTED' : '[ ] RUN THE EVIDENCE COMMANDS'}</Text></> : null}
          {definition.kind === 'routing' ? <><Text variant="technical" style={routeState.exact ? styles.complete : styles.pending}>[{routeState.exact ? 'X' : ' '}] ROUTES {routeState.configured}/4</Text><Text variant="technical" style={forwardVerified ? styles.complete : styles.pending}>[{forwardVerified ? 'X' : ' '}] PC-A → PC-C</Text><Text variant="technical" style={reverseVerified ? styles.complete : styles.pending}>[{reverseVerified ? 'X' : ' '}] PC-C → PC-A</Text>{activeDevice.type === 'router' ? activeDevice.routes.filter(({ source }) => source === 'static').map((route) => <Text key={`${route.prefix}-${route.nextHop}`} variant="technical">S {route.prefix}/{route.prefixLength} VIA {route.nextHop}</Text>) : null}</> : null}
          {definition.kind === 'vlan' ? <><Text variant="technical" style={vlanState.vlans ? styles.complete : styles.pending}>[{vlanState.vlans ? 'X' : ' '}] VLAN 10 + 20</Text><Text variant="technical" style={vlanState.access ? styles.complete : styles.pending}>[{vlanState.access ? 'X' : ' '}] ACCESS PORTS</Text><Text variant="technical" style={vlanState.trunks ? styles.complete : styles.pending}>[{vlanState.trunks ? 'X' : ' '}] BOTH TRUNK ENDS</Text>{activeDevice.interfaces.filter((item) => item.switchportMode === 'trunk' || item.accessVlan !== 1).length ? activeDevice.interfaces.filter((item) => item.switchportMode === 'trunk' || item.accessVlan !== 1).map((item) => <Text key={item.name} variant="technical">{item.name} / {item.switchportMode?.toUpperCase() ?? 'UNSET'}{item.switchportMode === 'access' ? ` / VLAN ${item.accessVlan}` : item.switchportMode === 'trunk' ? ` / ${item.allowedVlans?.join(',') || 'NO VLANS'}` : ''}</Text>) : <Text variant="technical" style={styles.pending}>NO PORT CHANGES ON {activeDevice.name}</Text>}</> : null}
        </View>
      ) : null}
    </View>
  );

  const terminal = (
    <View style={[styles.terminal, compact && styles.terminalCompact]}>
      <ScrollView ref={transcriptRef} accessibilityLabel={`${activeDevice.name} terminal transcript`} contentContainerStyle={styles.transcript} keyboardShouldPersistTaps="handled" nestedScrollEnabled testID="cli-transcript-scroll">
        <Text variant="technical" style={styles.banner}>NETBITE CLI / EDUCATIONAL STATE SIMULATOR</Text>
        {activeTranscript.map((entry) => <View key={entry.id} style={styles.transcriptEntry}>{entry.prompt ? <Text variant="technical" style={styles.commandLine}>{entry.prompt}</Text> : null}{entry.lines.map((line, index) => <Text key={`${entry.id}-${index}`} variant="technical" style={line.tone === 'warning' ? styles.outputWarning : line.tone === 'success' ? styles.outputSuccess : line.tone === 'muted' ? styles.outputMuted : styles.output}>{line.text}</Text>)}</View>)}
      </ScrollView>
      <Text accessibilityLiveRegion="polite" style={styles.liveRegion}>{activeTranscript.at(-1)?.lines.at(-1)?.text ?? ''}</Text>
      <View style={styles.suggestions}>{suggestions.map((suggestion) => <Pressable accessibilityRole="button" key={suggestion} onPress={() => { setInput(suggestion); inputRef.current?.focus(); }} style={styles.suggestion}><Text variant="technical" style={styles.suggestionText}>{suggestion}</Text></Pressable>)}</View>
      <View style={[styles.inputRow, compact && styles.inputRowCompact]}>
        <Text variant="technical" style={[styles.prompt, compact && styles.promptCompact]}>{getCliPrompt(activeDevice)}</Text>
        <TextInput ref={inputRef} accessibilityLabel={`Command for ${activeDevice.name}`} autoCapitalize="none" autoCorrect={false} onChangeText={setInput} onKeyPress={onKeyPress} onSubmitEditing={submit} placeholder="ENTER COMMAND" placeholderTextColor={Palette.textMuted} returnKeyType="send" spellCheck={false} style={styles.input} value={input} />
        <Pressable accessibilityLabel="Previous command" accessibilityRole="button" onPress={() => navigateHistory(1)} style={styles.historyButton}><Text variant="label">↑</Text></Pressable>
        <Pressable accessibilityLabel="Next command" accessibilityRole="button" onPress={() => navigateHistory(-1)} style={styles.historyButton}><Text variant="label">↓</Text></Pressable>
      </View>
      <View style={styles.terminalActions}><AppButton disabled={!input.trim()} label="Run command" style={styles.actionButton} onPress={submit} /><AppButton disabled={!snapshots.length} label="Undo config" style={styles.actionButton} variant="secondary" onPress={undo} /></View>
    </View>
  );

  return (
    <Screen scrollRef={pageRef} scrollTestID="cli-page-scroll">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8} onLayout={onLayout} style={styles.screen} testID="cli-layout">
        <View style={styles.header}><IconButton accessibilityLabel={`Back to Chapter ${definition.chapterId}`} icon="arrow-left" label={compact ? 'BACK' : 'BACK / CHAPTER'} onPress={() => router.dismissTo(`/chapter/${definition.chapterId}`)} /><View style={styles.headerActions}><IconButton accessibilityLabel="Open CLI help" icon="check" label="HELP" onPress={() => setGuideVisible(true)} /><IconButton accessibilityLabel="Reset CLI lab" icon="reset" label="RESET" onPress={() => setResetVisible(true)} /></View></View>
        <Text variant="label" style={styles.orange}>{definition.eyebrow}</Text><Text variant="screenTitle" style={styles.title}>{definition.title}</Text><Text variant="technical" style={styles.scope}>{definition.scopeNote}</Text>
        <View style={styles.deviceTabs}>{visibleDevices.map((item) => <Pressable accessibilityRole="tab" accessibilityState={{ selected: item.id === activeDevice.id }} key={item.id} onPress={() => { setActiveDeviceId(item.id); setInput(''); selectionHaptic(); }} style={[styles.deviceTab, item.id === activeDevice.id && styles.deviceTabActive]}><Text variant="label" style={styles.deviceTabText}>{item.name}</Text></Pressable>)}</View>
        <View style={styles.workspace} testID="cli-workspace">{statusPanel}{terminal}</View>
        {definition.kind === 'diagnostic' && diagnosticEvidenceReady && scenario ? <View style={styles.assessment}><Text variant="sectionHeading">{scenario.prompt}</Text><PredictionPanel choices={scenario.choices} feedback={predictionFeedback} onSelect={chooseDiagnosticPrediction} selected={selectedPrediction} /><AppButton disabled={selectedPrediction !== scenario.correctChoiceId} label={scenarioIndex === definition.diagnosticScenarios!.length - 1 ? 'Complete diagnostics' : 'Next scenario'} onPress={advanceDiagnostic} /></View> : null}
        {definition.kind === 'vlan' && vlanState.exact ? <View style={styles.assessment}><Text variant="label" style={styles.orange}>VERIFY THE RESULT</Text><Text variant="bodySmall">Use the actual port and trunk state to predict both paths.</Text><PredictionPanel choices={[{ id: 'yes', label: 'PC-A → PC-B / REACHABLE', feedback: deriveVlanReachability(network, 'pc-a', 'pc-b').reason }, { id: 'no', label: 'PC-A → PC-B / BLOCKED', feedback: 'A matching VLAN is allowed across both configured trunk endpoints, so the switches can carry this same-VLAN path.' }]} feedback={vlanFeedback.same} selected={vlanSelections.same} onSelect={(id) => { const result = deriveVlanReachability(network, 'pc-a', 'pc-b'); const correct = id === 'yes' && result.reachable; const choice = id === 'yes' ? result.reason : 'A trunk keeps VLANs separate, but it can carry VLAN 10 between the switches.'; setVlanSelections((current) => ({ ...current, same: id })); setVlanFeedback((current) => ({ ...current, same: choice })); setVlanPredictions((current) => ({ ...current, same: correct })); if (correct) successHaptic(); else warningHaptic(); }} /><PredictionPanel choices={[{ id: 'blocked', label: 'PC-A → PC-C / ROUTING REQUIRED', feedback: deriveVlanReachability(network, 'pc-a', 'pc-c').reason }, { id: 'merged', label: 'PC-A → PC-C / TRUNK MERGES VLANS', feedback: 'A trunk carries tagged VLAN contexts; it does not merge VLAN 10 and VLAN 20 into one LAN.' }]} feedback={vlanFeedback.different} selected={vlanSelections.different} onSelect={(id) => { const result = deriveVlanReachability(network, 'pc-a', 'pc-c'); const correct = id === 'blocked' && !result.reachable; const choice = id === 'blocked' ? result.reason : 'Trunks preserve VLAN separation. Communication between VLAN 10 and VLAN 20 needs Layer 3 routing.'; setVlanSelections((current) => ({ ...current, different: id })); setVlanFeedback((current) => ({ ...current, different: choice })); setVlanPredictions((current) => ({ ...current, different: correct })); if (correct) successHaptic(); else warningHaptic(); }} /></View> : null}
        {hintText ? <Text accessibilityLiveRegion="polite" variant="bodySmall" style={styles.hint}>{hintText}</Text> : null}
        <View style={styles.footerActions}><AppButton disabled={hintLevel >= 2} label={hintLevel === 0 ? 'Show a hint' : hintLevel === 1 ? 'Show next hint' : 'Hints shown'} style={styles.actionButton} variant="quiet" onPress={() => { setHintLevel((current) => Math.min(2, current + 1)); revealLowerContent(); }} />{definition.kind === 'routing' ? <AppButton disabled={!routingComplete} label="Complete routing lab" style={styles.actionButton} onPress={finishLab} /> : null}{definition.kind === 'vlan' ? <AppButton disabled={!vlanComplete} label="Complete VLAN lab" style={styles.actionButton} onPress={finishLab} /> : null}</View>
      </KeyboardAvoidingView>
      <GuideModal onClose={closeGuide} visible={guideVisible} />
      <FeedbackModal visible={resetVisible} tone="warning" eyebrow="CONFIRM ACTION" title="Reset this CLI lab?" message="Clear configuration, transcript, history, and current evidence." icon="reset" onRequestClose={() => setResetVisible(false)} secondaryAction={{ label: 'Keep working', variant: 'secondary', onPress: () => setResetVisible(false) }} primaryAction={{ label: 'Reset lab', onPress: reset }} />
      <FeedbackModal visible={completionVisible} tone="success" eyebrow="CLI LAB COMPLETE" title={definition.title} message="The required configuration and evidence checks are complete." detail="Your progress has been saved." icon="check" onRequestClose={() => setCompletionVisible(false)} secondaryAction={{ label: 'Review lab', variant: 'secondary', onPress: () => setCompletionVisible(false) }} primaryAction={{ label: 'Back to chapter', leadingIcon: 'arrow-left', onPress: () => router.dismissTo(`/chapter/${definition.chapterId}`) }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { width: '100%', flexGrow: 1, minHeight: 0 },
  header: { minHeight: 44, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: Space.sm },
  headerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  orange: { color: Palette.orange, fontFamily: Fonts.medium }, green: { color: Palette.green, fontFamily: Fonts.medium },
  title: { color: Palette.text, fontFamily: Fonts.semibold, marginTop: Space.xs }, scope: { color: Palette.textMuted, marginVertical: Space.sm },
  deviceTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.xs, marginBottom: Space.sm },
  deviceTab: { minWidth: 72, minHeight: 44, flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: Space.xs, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface },
  deviceTabActive: { borderColor: Palette.orange, backgroundColor: Palette.orangeSoft }, deviceTabText: { textAlign: 'center' },
  workspace: { flexGrow: 1, flexShrink: 0, minHeight: 0, gap: Space.sm },
  statusPanel: { minWidth: 0, padding: Space.sm, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface },
  statusHeader: { minHeight: 44, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, statusBody: { gap: Space.xs },
  networkMap: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.xs }, networkNode: { minWidth: 0, minHeight: 52, flexGrow: 1, justifyContent: 'center', padding: Space.xs, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.background }, networkNodeStandard: { flexBasis: '29%' }, networkNodeWide: { flexBasis: '46%' }, networkNodeActive: { borderColor: Palette.orange, backgroundColor: Palette.orangeSoft }, networkNodeName: { color: Palette.text, textAlign: 'center' }, networkNodeDetail: { color: Palette.textMuted, textAlign: 'center' },
  complete: { color: Palette.green }, pending: { color: Palette.textMuted },
  terminal: { flexGrow: 1, flexShrink: 0, minWidth: 0, minHeight: 360, borderWidth: 1, borderColor: Palette.border, backgroundColor: '#100E11' }, terminalCompact: { minHeight: 320 },
  transcript: { flexGrow: 1, padding: Space.sm, gap: Space.sm }, banner: { color: Palette.textMuted }, transcriptEntry: { gap: 2 }, commandLine: { color: Palette.white },
  output: { color: Palette.text }, outputMuted: { color: Palette.textMuted }, outputSuccess: { color: Palette.green }, outputWarning: { color: Palette.orange },
  liveRegion: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.xs, padding: Space.sm, borderTopWidth: 1, borderTopColor: Palette.border },
  suggestion: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Space.sm, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface }, suggestionText: { color: Palette.text },
  inputRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingLeft: Space.sm, borderTopWidth: 1, borderTopColor: Palette.border },
  inputRowCompact: { flexWrap: 'wrap', paddingLeft: 0 }, prompt: { color: Palette.green, fontFamily: Fonts.semibold }, promptCompact: { width: '100%', minHeight: 36, paddingHorizontal: Space.sm, paddingTop: Space.sm, borderBottomWidth: 1, borderBottomColor: Palette.border }, input: { flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: Space.xs, color: Palette.white, fontFamily: Fonts.regular, fontSize: 14, lineHeight: 22 },
  historyButton: { width: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: Palette.border },
  terminalActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm, padding: Space.sm }, actionButton: { minWidth: 0, flexBasis: 140, flexGrow: 1 },
  assessment: { padding: Space.sm, gap: Space.sm, borderWidth: 1, borderColor: Palette.orange, backgroundColor: Palette.surface },
  predictionPanel: { gap: Space.xs }, prediction: { minHeight: 44, justifyContent: 'center', padding: Space.sm, borderWidth: 1, borderColor: Palette.border }, predictionActive: { borderColor: Palette.orange }, predictionText: { textAlign: 'center' }, feedback: { color: Palette.text },
  hint: { marginTop: Space.sm, padding: Space.sm, borderWidth: 1, borderColor: Palette.orange, backgroundColor: Palette.orangeSoft }, footerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm, marginTop: Space.sm },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: Space.lg, backgroundColor: 'rgba(10,8,10,0.88)' }, guidePanel: { width: '100%', maxWidth: 520, alignSelf: 'center', padding: Space.lg, gap: Space.md, borderWidth: 1, borderColor: Palette.green, backgroundColor: Palette.surface }, guideCard: { padding: Space.sm, borderWidth: 1, borderColor: Palette.border }, guideTitle: { color: Palette.text, marginBottom: Space.xs },
});
