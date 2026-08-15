import { useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import {
  cloneCliNetwork,
  deriveVlanReachability,
  executeCliCommand,
  getCliPrompt,
  getCliSuggestions,
  parseCliCommand,
  simulatePing,
  type CliNetworkState,
  type CliOutputLine,
} from '@/core/network/cli-simulator';
import {
  requiredStaticRoutes,
  type CliLabDefinition,
  type CliPredictionChoice,
} from '@/features/cli/cli-lab-definitions';
import { CliTopologyView, createCliVisualTrace, type CliVisualTrace } from '@/features/cli/components/cli-topology-view';
import { LabSetupSupport } from '@/features/practice/components/foundation-lab-support';
import { AppButton } from '@/shared/components/app-button';
import { CliConsoleShell, type CliConsoleLine } from '@/shared/components/cli-console-shell';
import { Text } from '@/shared/components/console-text';
import { FeedbackModal } from '@/shared/components/feedback-modal';
import { PageHeader } from '@/shared/components/page-header';
import { StatusRow } from '@/shared/components/status-row';
import { useMeasuredResponsiveLayout } from '@/shared/responsive-layout';
import { Screen } from '@/shared/components/screen';
import { selectionHaptic, successHaptic, warningHaptic } from '@/shared/haptics';
import { Fonts, Palette, Space } from '@/shared/theme';
import { useGameStore } from '@/store/use-game-store';
import { returnToOwningChapter } from '@/shared/navigation';

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

function interVlanProgress(state: CliNetworkState) {
  const sw = state.devices.find(({ id }) => id === 'sw-1');
  const routerDevice = state.devices.find(({ id }) => id === 'r1');
  const trunk = sw?.interfaces.find(({ name }) => name === 'F0/24');
  const parent = routerDevice?.interfaces.find(({ name }) => name === 'G0/0');
  const vlan10 = routerDevice?.interfaces.find(({ name }) => name === 'G0/0.10');
  const vlan20 = routerDevice?.interfaces.find(({ name }) => name === 'G0/0.20');
  const trunkReady = trunk?.switchportMode === 'trunk' && sameSet(trunk.allowedVlans, [10, 20]);
  const parentReady = Boolean(parent?.adminUp && parent.linkUp && !parent.ipv4);
  const subinterfacesReady = Boolean(
    vlan10?.parentInterface === 'G0/0' && vlan10.encapsulationVlan === 10 && vlan10.ipv4 === '192.168.10.1' && vlan10.prefix === 24 && vlan10.adminUp
    && vlan20?.parentInterface === 'G0/0' && vlan20.encapsulationVlan === 20 && vlan20.ipv4 === '192.168.20.1' && vlan20.prefix === 24 && vlan20.adminUp,
  );
  const logicalInterfaces = routerDevice?.interfaces.filter(({ parentInterface }) => parentInterface) ?? [];
  const exact = trunkReady && parentReady && subinterfacesReady && logicalInterfaces.length === 2;
  return { trunkReady, parentReady, subinterfacesReady, exact };
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
          <View style={styles.guideCard}><Text variant="sectionHeading" style={styles.guideTitle}>4 / RETURN TO THE NETWORK</Text><Text variant="bodySmall">Close the full-screen console to inspect devices, links, configuration, and the latest ping path. Your console state is preserved.</Text></View>
          <AppButton label="Close guide" onPress={onClose} />
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
  const markCliGuideSeen = useGameStore((state) => state.markCliGuideSeen);
  const { mode: responsiveMode, onLayout } = useMeasuredResponsiveLayout();
  const compact = responsiveMode === 'compact';
  const wide = responsiveMode === 'wide';
  const [network, setNetwork] = useState(definition.createState);
  const [activeDeviceId, setActiveDeviceId] = useState(() => definition.kind === 'vlan' ? 'sw-a' : definition.kind === 'inter-vlan' ? 'sw-1' : 'r1');
  const [inspectedDeviceId, setInspectedDeviceId] = useState(() => definition.kind === 'vlan' ? 'sw-a' : definition.kind === 'inter-vlan' ? 'sw-1' : 'r1');
  const [visualTrace, setVisualTrace] = useState<CliVisualTrace>();
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
  const [guideVisible, setGuideVisible] = useState(false);
  const [statusVisible, setStatusVisible] = useState(wide);
  const [resetVisible, setResetVisible] = useState(false);
  const [completionVisible, setCompletionVisible] = useState(false);
  const [cliVisible, setCliVisible] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const nextTranscriptId = useRef(1);
  const pageRef = useRef<ScrollView>(null);
  const transcriptRef = useRef<ScrollView>(null);
  const activeDevice = network.devices.find(({ id }) => id === activeDeviceId) ?? network.devices[0];
  const scenario = definition.diagnosticScenarios?.[scenarioIndex];
  const routeState = routeProgress(network);
  const vlanState = vlanProgress(network);
  const interVlanState = interVlanProgress(network);
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
    if (definition.kind === 'inter-vlan') {
      if (activeDevice.type === 'host') return [activeDevice.id === 'pc-a' ? 'ping 192.168.20.20' : 'ping 192.168.10.10', 'help'];
      if (activeDevice.id === 'sw-1' && activeDevice.mode === 'global-config') return ['interface F0/24', 'end'];
      if (activeDevice.id === 'r1' && activeDevice.mode === 'global-config') return ['interface G0/0.10', 'interface G0/0.20', 'interface G0/0', 'end'];
    }
    return getCliSuggestions(activeDevice, network);
  }, [activeDevice, definition.kind, network, routeState.configured, scenario]);

  const availableHints = useMemo(() => {
    if (definition.kind === 'diagnostic') return scenario?.hints ?? [];
    if (definition.kind === 'routing') {
      const missing = requiredStaticRoutes.find((required) => !network.devices.find(({ id }) => id === required.deviceId)?.routes.some((route) => route.prefix === required.prefix && route.prefixLength === required.prefixLength && route.nextHop === required.nextHop));
      return [
        'A static route needs a destination network, contiguous mask, and adjacent next-hop address.',
        'Work one router at a time. Use SHOW IP ROUTE after each route so you can distinguish connected networks from remote networks.',
        missing ? `The next missing route is on ${network.devices.find(({ id }) => id === missing.deviceId)?.name}: IP ROUTE ${missing.prefix} 255.255.255.0 ${missing.nextHop}.` : 'The required routes are present. Select PC-A and PC-C in turn and use PING to verify both directions.',
      ];
    }
    if (definition.kind === 'inter-vlan') {
      return [
        'Read the fixed map first: PC-A uses SW-1 F0/1 in VLAN 10, PC-B uses F0/2 in VLAN 20, and F0/24 connects to R-1 G0/0.',
        'On SW-1, enter INTERFACE F0/24, set SWITCHPORT MODE TRUNK, then use SWITCHPORT TRUNK ALLOWED VLAN 10,20. Verify with SHOW INTERFACES TRUNK.',
        'On R-1, create G0/0.10 with ENCAPSULATION DOT1Q 10 and IP ADDRESS 192.168.10.1 255.255.255.0. Create G0/0.20 the same way for VLAN 20 and 192.168.20.1.',
        'Use SHOW IP INTERFACE BRIEF and SHOW IP ROUTE on R-1. Then select PC-A and ping 192.168.20.20; select PC-B and ping 192.168.10.10.',
      ];
    }
    return [
      'Create VLAN 10 and 20 on both switches before assigning endpoint and trunk ports.',
      'PC-A uses SW-A F0/1 VLAN 10. PC-B uses SW-B F0/2 VLAN 10. PC-C uses SW-B F0/3 VLAN 20.',
      'Configure F0/24 as a trunk allowing VLAN 10 and 20 on both switches, then verify with SHOW VLAN BRIEF and SHOW INTERFACES TRUNK.',
    ];
  }, [definition.kind, network.devices, scenario]);
  const revealedHints = availableHints.slice(0, hintLevel);
  const allHintsShown = availableHints.length > 0 && hintLevel >= availableHints.length;
  const hintButtonLabel = hintLevel === 0
    ? `Show a hint (1 of ${availableHints.length})`
    : allHintsShown
      ? `All ${availableHints.length} hints shown`
      : `Show next hint (${hintLevel + 1} of ${availableHints.length})`;

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
      appendTranscript(activeDevice.id, { prompt: `${prompt} ${raw}`, lines: [{ text: parsed.error, tone: 'warning' }] }); warningHaptic(); return;
    }
    const result = executeCliCommand(network, activeDevice.id, parsed.command);
    if (result.events.includes('config-change')) setSnapshots((current) => [...current, cloneCliNetwork(network)].slice(-20));
    setNetwork(result.state);
    if (result.mutated) setVisualTrace(undefined);
    if (parsed.command.kind === 'ping') setVisualTrace(createCliVisualTrace(result.state, simulatePing(result.state, activeDevice.id, parsed.command.destination), parsed.command.destination));
    const nextEvents = [...events, ...result.events];
    if (result.events.includes('ping-success:192.168.30.10') && activeDevice.id === 'pc-a') nextEvents.push('verified-forward');
    if (result.events.includes('ping-success:192.168.10.10') && activeDevice.id === 'pc-c') nextEvents.push('verified-reverse');
    if (definition.kind === 'inter-vlan' && result.events.includes('ping-success:192.168.20.20') && activeDevice.id === 'pc-a') nextEvents.push('verified-inter-vlan-forward');
    if (definition.kind === 'inter-vlan' && result.events.includes('ping-success:192.168.10.10') && activeDevice.id === 'pc-b') nextEvents.push('verified-inter-vlan-reverse');
    setEvents([...new Set(nextEvents)]);
    appendTranscript(activeDevice.id, { prompt: `${prompt} ${raw}`, lines: result.output });
    if (scenario?.requiredEvents.every((required) => nextEvents.includes(required)) || (definition.kind === 'vlan' && vlanProgress(result.state).exact) || (definition.kind === 'inter-vlan' && interVlanProgress(result.state).exact)) revealLowerContent();
    if (result.accepted) selectionHaptic(); else warningHaptic();
  };

  const navigateHistory = (direction: -1 | 1) => {
    if (!history.length) return;
    const next = Math.max(-1, Math.min(history.length - 1, historyIndex + direction));
    setHistoryIndex(next); setInput(next === -1 ? '' : history[history.length - 1 - next]);
  };

  const undo = () => {
    const previous = snapshots.at(-1); if (!previous) return;
    setNetwork(previous); setSnapshots((current) => current.slice(0, -1)); setVisualTrace(undefined);
    appendTranscript(activeDevice.id, { lines: [{ text: 'NETBITE: Last configuration change undone.', tone: 'muted' }] });
  };

  const reset = () => {
    const state = definition.kind === 'diagnostic' ? definition.diagnosticScenarios![0].createState() : definition.createState();
    const initialDeviceId = definition.kind === 'vlan' ? 'sw-a' : definition.kind === 'inter-vlan' ? 'sw-1' : 'r1';
    setNetwork(state); setActiveDeviceId(initialDeviceId); setInspectedDeviceId(initialDeviceId); setVisualTrace(undefined); setTranscripts({}); setHistory([]); setSnapshots([]); setEvents([]); setScenarioIndex(0); setSelectedPrediction(undefined); setPredictionFeedback(undefined); setVlanPredictions({}); setVlanSelections({}); setVlanFeedback({}); setResetVisible(false); setCliVisible(false); setHintLevel(0);
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
    const nextIndex = scenarioIndex + 1; setScenarioIndex(nextIndex); setNetwork(definition.diagnosticScenarios![nextIndex].createState()); setActiveDeviceId('r1'); setInspectedDeviceId('r1'); setVisualTrace(undefined); setEvents([]); setSelectedPrediction(undefined); setPredictionFeedback(undefined); setHintLevel(0); setTimeout(() => pageRef.current?.scrollTo({ y: 0, animated: true }), 0);
  };

  const finishLab = () => { completeLab(definition.id); setCompletionVisible(true); successHaptic(); };
  const diagnosticEvidenceReady = Boolean(scenario && scenario.requiredEvents.every((required) => events.includes(required)));
  const routingComplete = routeState.exact && forwardVerified && reverseVerified;
  const vlanComplete = vlanState.exact && vlanPredictions.same === true && vlanPredictions.different === true;
  const interVlanComplete = interVlanState.exact && events.includes('verified-inter-vlan-forward') && events.includes('verified-inter-vlan-reverse');

  const closeGuide = () => { markCliGuideSeen(); setGuideVisible(false); };

  const statusPanel = (
    <View style={styles.statusPanel}>
      <Pressable accessibilityRole="button" onPress={() => setStatusVisible((current) => !current)} style={styles.statusHeader}>
        <Text variant="label" style={styles.green}>OBJECTIVE STATUS</Text><Text variant="label">{statusVisible ? 'HIDE' : 'SHOW'}</Text>
      </Pressable>
      {statusVisible ? (
        <View style={styles.statusBody}>
          <Text variant="bodySmall">{definition.objective}</Text>
          {definition.kind !== 'diagnostic' ? <View accessibilityLabel={definition.kind === 'routing' ? 'Fixed path from PC-A through R1, R2, and R3 to PC-C.' : definition.kind === 'inter-vlan' ? 'PC-A connects to SW-1 F0/1 in VLAN 10. PC-B connects to F0/2 in VLAN 20. SW-1 F0/24 connects to router R-1 G0/0.' : 'PC-A connects to SW-A. SW-A connects to SW-B. PC-B and PC-C connect to SW-B.'} style={styles.networkMap}>{statusDevices.map((item) => { const trunk = item.interfaces.find(({ name }) => name === 'F0/24'); const detail = item.type === 'router' ? `${item.routes.filter(({ source }) => source === 'static').length} STATIC` : item.type === 'switch' ? `F0/24 ${trunk?.switchportMode?.toUpperCase() ?? 'ACCESS'}${trunk?.switchportMode === 'trunk' ? ` ${trunk.allowedVlans?.join(',') || 'NONE'}` : ''}` : 'ENDPOINT'; return <View key={item.id} style={[styles.networkNode, item.type === 'switch' && definition.kind === 'vlan' ? styles.networkNodeWide : styles.networkNodeStandard, item.id === activeDevice.id && styles.networkNodeActive]}><Text variant="technical" style={styles.networkNodeName}>{item.name}</Text><Text variant="technical" style={styles.networkNodeDetail}>{detail}</Text></View>; })}</View> : null}
          {definition.kind === 'inter-vlan' ? <View style={styles.fixedMap}>
            <Text variant="label" style={styles.orange}>FIXED PORT AND ADDRESS MAP</Text>
            <View style={styles.mapRecord}><Text variant="technical" style={styles.networkNodeName}>PC-A / E0</Text><Text variant="technical">192.168.10.10/24 / GW 192.168.10.1</Text><Text variant="technical" style={styles.networkNodeDetail}>SW-1 F0/1 / ACCESS VLAN 10</Text></View>
            <View style={styles.mapRecord}><Text variant="technical" style={styles.networkNodeName}>PC-B / E0</Text><Text variant="technical">192.168.20.20/24 / GW 192.168.20.1</Text><Text variant="technical" style={styles.networkNodeDetail}>SW-1 F0/2 / ACCESS VLAN 20</Text></View>
            <View style={styles.mapRecord}><Text variant="technical" style={styles.networkNodeName}>ROUTER LINK</Text><Text variant="technical">SW-1 F0/24 ↔ R-1 G0/0</Text><Text variant="technical" style={styles.networkNodeDetail}>TRUNK MUST CARRY VLAN 10 + 20</Text></View>
          </View> : null}
          {definition.kind === 'diagnostic' ? <><Text variant="technical">SCENARIO {scenarioIndex + 1} OF {definition.diagnosticScenarios!.length}</Text><Text variant="bodySmall">{scenario?.context}</Text><StatusRow label={diagnosticEvidenceReady ? 'EVIDENCE COLLECTED' : 'RUN THE EVIDENCE COMMANDS'} state={diagnosticEvidenceReady ? 'complete' : 'pending'} /></> : null}
          {definition.kind === 'routing' ? <><StatusRow label="ROUTES" value={`${routeState.configured} OF 4`} state={routeState.exact ? 'complete' : 'pending'} /><StatusRow label="PC-A → PC-C" state={forwardVerified ? 'complete' : 'pending'} /><StatusRow label="PC-C → PC-A" state={reverseVerified ? 'complete' : 'pending'} />{activeDevice.type === 'router' ? activeDevice.routes.filter(({ source }) => source === 'static').map((route) => <Text key={`${route.prefix}-${route.nextHop}`} variant="technical">S {route.prefix}/{route.prefixLength} VIA {route.nextHop}</Text>) : null}</> : null}
          {definition.kind === 'vlan' ? <><StatusRow label="VLAN 10 + 20" state={vlanState.vlans ? 'complete' : 'pending'} /><StatusRow label="ACCESS PORTS" state={vlanState.access ? 'complete' : 'pending'} /><StatusRow label="BOTH TRUNK ENDS" state={vlanState.trunks ? 'complete' : 'pending'} />{activeDevice.interfaces.filter((item) => item.switchportMode === 'trunk' || item.accessVlan !== 1).length ? activeDevice.interfaces.filter((item) => item.switchportMode === 'trunk' || item.accessVlan !== 1).map((item) => <Text key={item.name} variant="technical">{item.name} / {item.switchportMode?.toUpperCase() ?? 'UNSET'}{item.switchportMode === 'access' ? ` / VLAN ${item.accessVlan}` : item.switchportMode === 'trunk' ? ` / ${item.allowedVlans?.join(',') || 'NO VLANS'}` : ''}</Text>) : <StatusRow label={`NO PORT CHANGES ON ${activeDevice.name}`} state="attention" showStateLabel={false} />}</> : null}
          {definition.kind === 'inter-vlan' ? <>
            <StatusRow label="F0/24 TRUNK / VLAN 10 + 20" state={interVlanState.trunkReady ? 'complete' : 'pending'} />
            <StatusRow label="G0/0 PHYSICAL PARENT UP" state={interVlanState.parentReady ? 'complete' : 'pending'} />
            <StatusRow label="G0/0.10 + G0/0.20 GATEWAYS" state={interVlanState.subinterfacesReady ? 'complete' : 'pending'} />
            <StatusRow label="PC-A → PC-B" state={events.includes('verified-inter-vlan-forward') ? 'complete' : 'pending'} />
            <StatusRow label="PC-B → PC-A" state={events.includes('verified-inter-vlan-reverse') ? 'complete' : 'pending'} />
            {activeDevice.interfaces.filter(({ parentInterface }) => parentInterface).map((item) => <Text key={item.name} variant="technical">{item.name} / VLAN {item.encapsulationVlan ?? 'UNSET'} / {item.ipv4 ? `${item.ipv4}/${item.prefix}` : 'NO IP'}</Text>)}
          </> : null}
        </View>
      ) : null}
    </View>
  );

  const consoleLines: CliConsoleLine[] = activeTranscript.flatMap((entry) => [
    ...(entry.prompt ? [{ id: `${entry.id}-prompt`, text: entry.prompt, tone: 'normal' as const }] : []),
    ...entry.lines.map((line, index) => ({ id: `${entry.id}-${index}`, text: line.text, tone: line.tone })),
  ]);

  return (
    <Screen scrollRef={pageRef} scrollTestID="cli-page-scroll" header={<PageHeader leading={{ accessibilityLabel: `Back to Chapter ${definition.chapterId}`, icon: 'arrow-left', label: compact ? 'BACK' : 'BACK / CHAPTER', onPress: () => returnToOwningChapter('lab', definition.id) }} trailing={[{ accessibilityLabel: 'Open CLI help', icon: 'check', label: 'HELP', onPress: () => setGuideVisible(true) }, { accessibilityLabel: 'Reset CLI lab', icon: 'reset', label: 'RESET', onPress: () => setResetVisible(true) }]} />}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8} onLayout={onLayout} style={styles.screen} testID="cli-layout">
        <Text variant="label" style={styles.orange}>{definition.eyebrow}</Text><Text variant="screenTitle" style={styles.title}>{definition.title}</Text><Text variant="technical" style={styles.scope}>{definition.scopeNote}</Text>
        <LabSetupSupport labId={definition.id} />
        <View style={styles.workspace} testID="cli-workspace">{statusPanel}<CliTopologyView cliDeviceIds={visibleDevices.map((item) => item.id)} layout={definition.topology} mode={responsiveMode} network={network} onOpenCli={(deviceId) => { setActiveDeviceId(deviceId); setInspectedDeviceId(deviceId); setInput(''); setCliVisible(true); selectionHaptic(); }} onSelectDevice={(deviceId) => { setInspectedDeviceId(deviceId); if (visibleDevices.some((item) => item.id === deviceId)) setActiveDeviceId(deviceId); selectionHaptic(); }} selectedDeviceId={inspectedDeviceId} trace={visualTrace} /></View>
        {definition.kind === 'diagnostic' && diagnosticEvidenceReady && scenario ? <View style={styles.assessment}><Text variant="sectionHeading">{scenario.prompt}</Text><PredictionPanel choices={scenario.choices} feedback={predictionFeedback} onSelect={chooseDiagnosticPrediction} selected={selectedPrediction} /><AppButton disabled={selectedPrediction !== scenario.correctChoiceId} label={scenarioIndex === definition.diagnosticScenarios!.length - 1 ? 'Complete diagnostics' : 'Next scenario'} onPress={advanceDiagnostic} /></View> : null}
        {definition.kind === 'vlan' && vlanState.exact ? <View style={styles.assessment}><Text variant="label" style={styles.orange}>VERIFY THE RESULT</Text><Text variant="bodySmall">Use the actual port and trunk state to predict both paths.</Text><PredictionPanel choices={[{ id: 'yes', label: 'PC-A → PC-B / REACHABLE', feedback: deriveVlanReachability(network, 'pc-a', 'pc-b').reason }, { id: 'no', label: 'PC-A → PC-B / BLOCKED', feedback: 'A matching VLAN is allowed across both configured trunk endpoints, so the switches can carry this same-VLAN path.' }]} feedback={vlanFeedback.same} selected={vlanSelections.same} onSelect={(id) => { const result = deriveVlanReachability(network, 'pc-a', 'pc-b'); const correct = id === 'yes' && result.reachable; const choice = id === 'yes' ? result.reason : 'A trunk keeps VLANs separate, but it can carry VLAN 10 between the switches.'; setVlanSelections((current) => ({ ...current, same: id })); setVlanFeedback((current) => ({ ...current, same: choice })); setVlanPredictions((current) => ({ ...current, same: correct })); if (correct) successHaptic(); else warningHaptic(); }} /><PredictionPanel choices={[{ id: 'blocked', label: 'PC-A → PC-C / ROUTING REQUIRED', feedback: deriveVlanReachability(network, 'pc-a', 'pc-c').reason }, { id: 'merged', label: 'PC-A → PC-C / TRUNK MERGES VLANS', feedback: 'A trunk carries tagged VLAN contexts; it does not merge VLAN 10 and VLAN 20 into one LAN.' }]} feedback={vlanFeedback.different} selected={vlanSelections.different} onSelect={(id) => { const result = deriveVlanReachability(network, 'pc-a', 'pc-c'); const correct = id === 'blocked' && !result.reachable; const choice = id === 'blocked' ? result.reason : 'Trunks preserve VLAN separation. Communication between VLAN 10 and VLAN 20 needs Layer 3 routing.'; setVlanSelections((current) => ({ ...current, different: id })); setVlanFeedback((current) => ({ ...current, different: choice })); setVlanPredictions((current) => ({ ...current, different: correct })); if (correct) successHaptic(); else warningHaptic(); }} /></View> : null}
        {revealedHints.length ? <View accessibilityLabel={`${revealedHints.length} of ${availableHints.length} hints revealed`} style={styles.hintPanel}>
          <Text variant="label" style={styles.orange}>REVEALED HINTS / {revealedHints.length} OF {availableHints.length}</Text>
          {revealedHints.map((hint, index) => <View key={`${definition.id}-hint-${index}`} style={styles.hint}>
            <Text variant="technical" style={styles.hintNumber}>HINT {index + 1}</Text>
            <Text accessibilityLiveRegion={index === revealedHints.length - 1 ? 'polite' : 'none'} variant="bodySmall">{hint}</Text>
          </View>)}
        </View> : null}
        <View style={styles.footerActions} testID="cli-footer-actions"><AppButton disabled={!availableHints.length || allHintsShown} label={hintButtonLabel} style={[styles.actionButton, compact && styles.actionButtonStacked]} variant="utility" onPress={() => { setHintLevel((current) => Math.min(availableHints.length, current + 1)); revealLowerContent(); }} />{definition.kind === 'routing' ? <AppButton disabled={!routingComplete} label="Complete routing lab" style={[styles.actionButton, compact && styles.actionButtonStacked]} onPress={finishLab} /> : null}{definition.kind === 'vlan' ? <AppButton disabled={!vlanComplete} label="Complete VLAN lab" style={[styles.actionButton, compact && styles.actionButtonStacked]} onPress={finishLab} /> : null}{definition.kind === 'inter-vlan' ? <AppButton disabled={!interVlanComplete} label="Complete inter-VLAN lab" style={[styles.actionButton, compact && styles.actionButtonStacked]} onPress={finishLab} /> : null}</View>
      </KeyboardAvoidingView>
      <GuideModal onClose={closeGuide} visible={guideVisible} />
      <CliConsoleShell
        accessibilityLabel={`${activeDevice.name} full-screen CLI`}
        boundary="CISCO-LIKE SUBSET / ORIGINAL NETBITE OUTPUT / NO LIVE DEVICE OS"
        devices={visibleDevices.map((device) => ({ id: device.id, label: device.name }))}
        eyebrow={definition.eyebrow}
        footerActions={<AppButton disabled={!snapshots.length} label="Undo config" style={styles.actionButton} variant="secondary" onPress={undo} />}
        input={input}
        lines={consoleLines}
        onClose={() => setCliVisible(false)}
        onHistoryNext={() => navigateHistory(-1)}
        onHistoryPrevious={() => navigateHistory(1)}
        onInputChange={setInput}
        onSelectDevice={(deviceId) => { setActiveDeviceId(deviceId); setInspectedDeviceId(deviceId); setInput(''); }}
        onSubmit={submit}
        prompt={getCliPrompt(activeDevice)}
        selectedDeviceId={activeDevice.id}
        suggestions={suggestions}
        testID="cli-fullscreen-modal"
        title={`${activeDevice.name} DEVICE CONSOLE`}
        transcriptRef={transcriptRef}
        visible={cliVisible}
      />
      <FeedbackModal visible={resetVisible} tone="warning" eyebrow="CONFIRM ACTION" title="Reset this CLI lab?" message="Clear configuration, transcript, history, and current evidence." icon="reset" onRequestClose={() => setResetVisible(false)} secondaryAction={{ label: 'Keep working', variant: 'secondary', onPress: () => setResetVisible(false) }} primaryAction={{ label: 'Reset lab', variant: 'danger', onPress: reset }} />
      <FeedbackModal visible={completionVisible} tone="success" eyebrow="CLI LAB COMPLETE" title={definition.title} message="The required configuration and evidence checks are complete." detail="Your progress has been saved." icon="check" onRequestClose={() => setCompletionVisible(false)} secondaryAction={{ label: 'Review lab', variant: 'secondary', onPress: () => setCompletionVisible(false) }} primaryAction={{ label: 'Back to chapter', leadingIcon: 'arrow-left', onPress: () => returnToOwningChapter('lab', definition.id) }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { width: '100%', flexGrow: 1, minHeight: 0 },
  header: { width: '100%', minWidth: 0, minHeight: 44, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: Space.sm },
  headerActions: { minWidth: 0, maxWidth: '100%', flexShrink: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: Space.sm },
  orange: { color: Palette.orange, fontFamily: Fonts.medium }, green: { color: Palette.green, fontFamily: Fonts.medium },
  title: { color: Palette.text, fontFamily: Fonts.semibold, marginTop: Space.xs }, scope: { color: Palette.textMuted, marginVertical: Space.sm },
  viewSwitch: { width: '100%', minWidth: 0, flexDirection: 'row', marginBottom: Space.sm, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface },
  viewOption: { minWidth: 0, minHeight: 44, flex: 1, alignItems: 'center', justifyContent: 'center', padding: Space.sm },
  viewOptionActive: { borderWidth: 1, borderColor: Palette.orange, backgroundColor: Palette.orangeSoft },
  viewOptionTextActive: { color: Palette.orange, fontFamily: Fonts.semibold },
  deviceTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.xs, marginBottom: Space.sm },
  deviceTab: { minWidth: 72, minHeight: 44, flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: Space.xs, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface },
  deviceTabActive: { borderColor: Palette.orange, backgroundColor: Palette.orangeSoft }, deviceTabText: { textAlign: 'center' },
  workspace: { width: '100%', minWidth: 0, flexGrow: 1, flexShrink: 0, minHeight: 0, alignItems: 'stretch', gap: Space.sm },
  statusPanel: { width: '100%', minWidth: 0, padding: Space.sm, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface },
  statusHeader: { minHeight: 44, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, statusBody: { gap: Space.xs },
  networkMap: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.xs }, networkNode: { minWidth: 0, minHeight: 52, flexGrow: 1, justifyContent: 'center', padding: Space.xs, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.background }, networkNodeStandard: { flexBasis: '29%' }, networkNodeWide: { flexBasis: '46%' }, networkNodeActive: { borderColor: Palette.orange, backgroundColor: Palette.orangeSoft }, networkNodeName: { color: Palette.text, textAlign: 'center' }, networkNodeDetail: { color: Palette.textMuted, textAlign: 'center' },
  fixedMap: { marginTop: Space.sm, gap: Space.xs }, mapRecord: { minWidth: 0, padding: Space.sm, gap: 2, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.background },
  terminal: { width: '100%', maxWidth: '100%', flexGrow: 1, flexShrink: 0, minWidth: 0, minHeight: 540, borderWidth: 1, borderColor: Palette.border, backgroundColor: '#100E11' }, terminalCompact: { minHeight: 520 },
  terminalFullscreen: { width: '100%', maxWidth: 960, minHeight: 0, flex: 1, alignSelf: 'center' },
  terminalHeader: { width: '100%', minWidth: 0, minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: Space.sm, paddingHorizontal: Space.sm, borderBottomWidth: 1, borderBottomColor: Palette.border },
  terminalHeaderCopy: { flex: 1, minWidth: 0 }, terminalModeButton: { minWidth: 132, flexGrow: 0 },
  transcriptScroll: { minHeight: 260 }, transcriptScrollCompact: { minHeight: 220 }, transcriptFullscreen: { flex: 1, minHeight: 0 },
  transcript: { flexGrow: 1, padding: Space.sm, gap: Space.sm }, banner: { color: Palette.text }, terminalMode: { color: Palette.textMuted }, transcriptEntry: { gap: 2 }, commandLine: { color: Palette.white },
  output: { color: Palette.text }, outputMuted: { color: Palette.textMuted }, outputSuccess: { color: Palette.green }, outputWarning: { color: Palette.orange },
  liveRegion: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  suggestions: { width: '100%', minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', gap: Space.xs, padding: Space.sm, borderTopWidth: 1, borderTopColor: Palette.border },
  suggestion: { maxWidth: '100%', minWidth: 0, minHeight: 44, flexShrink: 1, justifyContent: 'center', paddingHorizontal: Space.sm, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface }, suggestionText: { minWidth: 0, flexShrink: 1, color: Palette.text },
  inputRow: { width: '100%', minWidth: 0, minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingLeft: Space.sm, borderTopWidth: 1, borderTopColor: Palette.border },
  inputRowCompact: { flexWrap: 'wrap', paddingLeft: 0 }, prompt: { color: Palette.green, fontFamily: Fonts.semibold }, promptCompact: { width: '100%', minHeight: 36, paddingHorizontal: Space.sm, paddingTop: Space.sm, borderBottomWidth: 1, borderBottomColor: Palette.border }, input: { flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: Space.xs, color: Palette.white, fontFamily: Fonts.regular, fontSize: 14, lineHeight: 22 },
  historyButton: { width: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: Palette.border },
  terminalActions: { width: '100%', minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: Space.sm, padding: Space.sm }, actionButton: { minWidth: 0, flexBasis: 200, flexGrow: 1, flexShrink: 1 }, actionButtonStacked: { width: '100%', flexBasis: '100%' },
  assessment: { padding: Space.sm, gap: Space.sm, borderWidth: 1, borderColor: Palette.orange, backgroundColor: Palette.surface },
  predictionPanel: { gap: Space.xs }, prediction: { minHeight: 44, justifyContent: 'center', padding: Space.sm, borderWidth: 1, borderColor: Palette.border }, predictionActive: { borderColor: Palette.orange }, predictionText: { textAlign: 'center' }, feedback: { color: Palette.text },
  hintPanel: { marginTop: Space.sm, padding: Space.sm, gap: Space.sm, borderWidth: 1, borderColor: Palette.orange, backgroundColor: Palette.orangeSoft },
  hint: { padding: Space.sm, gap: Space.xs, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface },
  hintNumber: { color: Palette.orange, fontFamily: Fonts.semibold },
  footerActions: { width: '100%', minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: Space.sm, marginTop: Space.sm },
  fullscreenSafe: { flex: 1, backgroundColor: Palette.background }, fullscreenBody: { flex: 1, minHeight: 0, padding: Space.sm, backgroundColor: Palette.background },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: Space.lg, backgroundColor: 'rgba(10,8,10,0.88)' }, guidePanel: { width: '100%', maxWidth: 520, alignSelf: 'center', padding: Space.lg, gap: Space.md, borderWidth: 1, borderColor: Palette.green, backgroundColor: Palette.surface }, guideCard: { padding: Space.sm, borderWidth: 1, borderColor: Palette.border }, guideTitle: { color: Palette.text, marginBottom: Space.xs },
});
