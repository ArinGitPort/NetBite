import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import {
  applyTransportAction,
  createTransportLabState,
  deriveTransportTables,
  evaluateTransportObjective,
  validateTransportLabState,
  type TransportAction,
  type TransportLabState,
  type TransportProtocol,
} from '@/core/network/transport-lab';
import { DeviceGlyph } from '@/features/devices/components/device-glyph';
import { operationsLabDefinitions } from '@/features/operations/operations-lab-definitions';
import { restoreProtocolState, type GuidedProtocolAdapter } from '@/features/protocol-labs/guided-protocol-adapter';
import { GuidedProtocolLabShell } from '@/features/protocol-labs/components/guided-protocol-lab-shell';
import { AppButton } from '@/shared/components/app-button';
import { FeedbackModal } from '@/shared/components/feedback-modal';
import { HintHistoryPanel } from '@/shared/components/hint-history-panel';
import { SelectionControl } from '@/shared/components/selection-control';
import { Text } from '@/shared/components/console-text';
import { useMeasuredResponsiveLayout } from '@/shared/responsive-layout';
import { returnToOwningChapter } from '@/shared/navigation';
import { Fonts, Palette, Space } from '@/shared/theme';
import { getRecoveryMessage, getSimulatorBoundaryCopy } from '@/shared/learner-facing-copy';
import { useGameStore } from '@/store/use-game-store';
import { useOperationsLabStore } from '@/store/use-operations-lab-store';
import { useProtocolLabStore } from '@/store/use-protocol-lab-store';

const LAB_ID = 'transport-service-desk';
const ENGINE_VERSION = 1;
const definition = operationsLabDefinitions[LAB_ID];

const adapter: GuidedProtocolAdapter<TransportLabState, TransportAction, ReturnType<typeof applyTransportAction>> = {
  id: LAB_ID,
  engineVersion: ENGINE_VERSION,
  createInitialState: createTransportLabState,
  validateState: validateTransportLabState,
  applyAction: applyTransportAction,
};

const objectives = [
  { id: 'endpoints', title: 'CONFIGURE THE ENDPOINTS', copy: 'Configure a TCP client and a matching server listener. A valid mistake remains saved until you correct it.' },
  { id: 'handshake', title: 'BUILD THE TCP CONNECTION', copy: 'Send each control segment in order and inspect how both endpoint states change.' },
  { id: 'recovery', title: 'RECOVER MISSING TCP DATA', copy: 'Deliberately omit one data segment, then use the sequence and acknowledgment evidence to recover it.' },
  { id: 'udp', title: 'COMPARE UDP DELIVERY', copy: 'Send a UDP datagram, then omit one and observe which TCP recovery information is absent.' },
] as const;

const hints = [
  ['An IP address identifies the host; the destination port must match an open process.', 'Use TCP from source port 53000 to server port 443, with TCP 443 listening.'],
  ['TCP begins with a SYN from the client.', 'The response is SYN-ACK, followed by the client final ACK.'],
  ['First arm the controlled drop, then send the 20-byte data segment.', 'Retransmit the same sequence range; the server ACK names the next expected byte.'],
  ['Prepare UDP port 53 and send one datagram successfully first.', 'A missing UDP datagram creates no TCP sequence, acknowledgment, or automatic retransmission state.'],
] as const;

interface ConfigurationDraft {
  clientAddress: string;
  clientPort: string;
  serverAddress: string;
  destinationPort: string;
  protocol: TransportProtocol;
  listenerProtocol: TransportProtocol;
  listenerPort: string;
  listenerOpen: boolean;
}

const draftFromState = (state: TransportLabState): ConfigurationDraft => ({
  clientAddress: state.client.address,
  clientPort: String(state.client.port),
  serverAddress: state.server.address,
  destinationPort: String(state.server.port),
  protocol: state.protocol,
  listenerProtocol: state.listener.protocol,
  listenerPort: String(state.listener.port),
  listenerOpen: state.listener.open,
});

export function TransportGuidedLab() {
  const stored = useProtocolLabStore((value) => value.sessions[LAB_ID]);
  const save = useProtocolLabStore((value) => value.save);
  const undo = useProtocolLabStore((value) => value.undo);
  const reset = useProtocolLabStore((value) => value.reset);
  const archive = useProtocolLabStore((value) => value.archive);
  const dismissProtocolRecovery = useProtocolLabStore((value) => value.dismissRecovery);
  const protocolRecovery = useProtocolLabStore((value) => value.recoveryCopies[LAB_ID]);
  const undoCount = useProtocolLabStore((value) => value.history[LAB_ID]?.length ?? 0);
  const legacySession = useOperationsLabStore((value) => value.sessions[LAB_ID]);
  const legacyRecovery = useOperationsLabStore((value) => value.recoveryCopies[LAB_ID]);
  const archiveLegacy = useOperationsLabStore((value) => value.archiveForUpgrade);
  const dismissLegacyRecovery = useOperationsLabStore((value) => value.dismissRecovery);
  const completeLab = useGameStore((value) => value.completeLab);
  const restored = useMemo(() => restoreProtocolState(adapter, stored), [stored]);
  const state = restored.state;
  const result = evaluateTransportObjective(state);
  const currentIndex = Math.min(state.objectiveIndex, objectives.length - 1);
  const current = objectives[currentIndex];
  const [draftOverride, setDraftOverride] = useState<ConfigurationDraft>();
  const draft = draftOverride ?? draftFromState(state);
  const draftDirty = Boolean(draftOverride);
  const [formError, setFormError] = useState<string>();
  const [traceIndex, setTraceIndex] = useState(Math.max(0, state.evidence.length - 1));
  const [resetVisible, setResetVisible] = useState(false);
  const { mode, onLayout } = useMeasuredResponsiveLayout();
  const compact = mode === 'compact';

  useEffect(() => {
    if (legacySession) archiveLegacy(LAB_ID);
  }, [archiveLegacy, legacySession]);

  useEffect(() => {
    if (stored && restored.recovered) {
      archive(LAB_ID, stored);
      reset(LAB_ID);
    }
  }, [archive, reset, restored.recovered, stored]);

  useEffect(() => {
    if (result.complete) completeLab(LAB_ID);
  }, [completeLab, result.complete]);

  const run = (action: TransportAction, recordHistory = true) => {
    const next = adapter.applyAction(state, action);
    if (!next.accepted) {
      setFormError(next.error);
      return;
    }
    save(LAB_ID, ENGINE_VERSION, next.state, recordHistory);
    setDraftOverride(undefined);
    setTraceIndex(Math.max(0, next.state.evidence.length - 1));
    setFormError(undefined);
  };

  const saveConfiguration = () => {
    run({
      type: 'configure',
      client: { address: draft.clientAddress.trim(), port: Number(draft.clientPort) },
      server: { address: draft.serverAddress.trim(), port: Number(draft.destinationPort) },
      protocol: draft.protocol,
      listener: { protocol: draft.listenerProtocol, port: Number(draft.listenerPort), open: draft.listenerOpen },
    });
  };

  const nextAction = getNextAction(state, draftDirty, saveConfiguration, run);
  const tables = deriveTransportTables(state);
  const effectiveTraceIndex = Math.min(traceIndex, Math.max(0, state.evidence.length - 1));
  const selectedEvidence = state.evidence[effectiveTraceIndex];
  const currentHints = hints[currentIndex];
  const usedHints = state.hints.filter((entry) => entry.startsWith(`${current.id} / `));
  const showConfig = state.objectiveIndex === 0 || (state.objectiveIndex === 3 && state.phase === 'configure');
  const recoveryVisible = Boolean(protocolRecovery || legacyRecovery);

  return (
    <GuidedProtocolLabShell
      autosaveLabel="SAVED ON THIS DEVICE"
      labId={LAB_ID}
      objectiveLabel={result.complete ? 'SIMULATION COMPLETE' : `OBJECTIVE ${state.objectiveIndex + 1} OF ${objectives.length}`}
      onBack={() => returnToOwningChapter('lab', LAB_ID)}
      progress={state.objectiveIndex / objectives.length}
      subtitle="FIXED CLIENT / IP PATH / SERVER TOPOLOGY"
      title={definition.title}>
      <View onLayout={onLayout}>
        {recoveryVisible ? <View style={styles.warningPanel}><Text variant="label" style={styles.orange}>LAB UPDATED</Text><Text variant="bodySmall" style={styles.muted}>{getRecoveryMessage('lab')} Earned completion was not changed.</Text><AppButton label="Dismiss notice" variant="utility" onPress={() => { dismissProtocolRecovery(LAB_ID); dismissLegacyRecovery(LAB_ID); }} /></View> : null}

        <TransportTopology compact={compact} selected={state.selectedDeviceId} state={state} onSelect={(deviceId) => run({ type: 'select-device', deviceId }, false)} />
        <DeviceInspector state={state} />

        {!result.complete ? <View style={styles.objectivePanel}>
          <Text variant="label" style={styles.green}>CURRENT OBJECTIVE</Text>
          <Text variant="sectionHeading" style={styles.heading}>{current.title}</Text>
          <Text variant="body" style={styles.body}>{current.copy}</Text>
        </View> : <View style={styles.completePanel}><Text variant="label" style={styles.green}>ALL OBJECTIVES VERIFIED</Text><Text variant="body" style={styles.body}>You built TCP state manually, recovered one missing segment, and compared the evidence available from UDP.</Text></View>}

        {showConfig && !result.complete ? <ConfigurationPanel draft={draft} error={formError ?? state.lastError} onChange={(change) => { setDraftOverride((value) => ({ ...(value ?? draftFromState(state)), ...change })); setFormError(undefined); }} /> : formError ? <Text accessibilityLiveRegion="assertive" variant="bodySmall" style={styles.error}>{formError}</Text> : null}

        {!result.complete && nextAction ? <View style={styles.primaryAction}><Text variant="technical" style={styles.muted}>NEXT STEP</Text><AppButton label={nextAction.label} onPress={nextAction.onPress} /></View> : null}

        <StateTables rows={[...tables.endpoints, ...tables.listeners, ...tables.connection]} />
        <EventTrace evidenceCount={state.evidence.length} selected={selectedEvidence} traceIndex={effectiveTraceIndex} onChange={setTraceIndex} />

        <View style={styles.whyPanel}>
          <Text variant="label" style={styles.green}>WHY THIS HAPPENED</Text>
          <Text variant="bodySmall" style={styles.body}>OBSERVATION / {state.lastExplanation.observation}</Text>
          <Text variant="bodySmall" style={styles.body}>RULE / {state.lastExplanation.rule}</Text>
          <Text variant="bodySmall" style={styles.body}>PROVES / {state.lastExplanation.proves}</Text>
          <Text variant="bodySmall" style={styles.body}>NEXT CHECK / {state.lastExplanation.nextCheck}</Text>
        </View>

        <HintHistoryPanel hints={state.hints} stripContext />
        {!result.complete && usedHints.length < currentHints.length ? <AppButton label={usedHints.length ? 'Show next hint' : 'Show a hint'} variant="secondary" onPress={() => run({ type: 'add-hint', hint: `${current.id} / ${currentHints[usedHints.length]}` }, false)} /> : null}

        <View style={styles.tools}><Text variant="label" style={styles.muted}>SESSION TOOLS</Text><AppButton disabled={undoCount === 0} label="Undo latest change" variant="utility" onPress={() => { undo(LAB_ID); setDraftOverride(undefined); setFormError(undefined); }} /><AppButton label="Reset simulator" variant="danger" onPress={() => setResetVisible(true)} /></View>
        <Text variant="bodySmall" style={styles.boundary}>{getSimulatorBoundaryCopy('transport')}</Text>
      </View>
      <FeedbackModal visible={resetVisible} tone="warning" eyebrow="CONFIRM LAB RESET" title="Reset Transport lab?" message="Endpoint settings, connection status, test results, hints, and undo history will be removed." detail="Earned course completion remains recorded." onRequestClose={() => setResetVisible(false)} secondaryAction={{ label: 'Keep working', variant: 'secondary', onPress: () => setResetVisible(false) }} primaryAction={{ label: 'Reset lab', variant: 'danger', onPress: () => { reset(LAB_ID); setResetVisible(false); setDraftOverride(undefined); setFormError(undefined); } }} />
    </GuidedProtocolLabShell>
  );
}

function getNextAction(state: TransportLabState, dirty: boolean, saveConfiguration: () => void, run: (action: TransportAction) => void) {
  if (dirty || !state.configured) return { label: 'Save endpoint configuration', onPress: saveConfiguration };
  if (state.objectiveIndex === 0) return { label: 'Verify endpoints and listener', onPress: () => run({ type: 'verify-endpoints' }) };
  if (state.objectiveIndex === 1) {
    if (state.phase === 'ready') return { label: 'Send SYN', onPress: () => run({ type: 'send-syn' }) };
    if (state.phase === 'syn') return { label: 'Send SYN-ACK', onPress: () => run({ type: 'send-syn-ack' }) };
    return { label: 'Send final ACK', onPress: () => run({ type: 'send-final-ack' }) };
  }
  if (state.objectiveIndex === 2) {
    if (state.phase === 'established') return { label: 'Inject one missing segment', onPress: () => run({ type: 'arm-data-drop' }) };
    if (state.phase === 'drop-armed') return { label: 'Send 20-byte data segment', onPress: () => run({ type: 'send-data' }) };
    if (state.phase === 'data-missing') return { label: 'Retransmit outstanding data', onPress: () => run({ type: 'retransmit-data' }) };
    return { label: 'Acknowledge received data', onPress: () => run({ type: 'acknowledge-data' }) };
  }
  if (state.objectiveIndex === 3) {
    if (state.phase === 'data-acknowledged') return { label: 'Prepare UDP comparison', onPress: () => run({ type: 'prepare-udp' }) };
    if (state.phase === 'configure') return { label: 'Send UDP datagram', onPress: () => run({ type: 'send-udp' }) };
    return { label: 'Inject missing UDP datagram', onPress: () => run({ type: 'drop-udp' }) };
  }
  return undefined;
}

function TransportTopology({ compact, selected, state, onSelect }: { compact: boolean; selected: TransportLabState['selectedDeviceId']; state: TransportLabState; onSelect: (id: TransportLabState['selectedDeviceId']) => void }) {
  const nodes: { id: TransportLabState['selectedDeviceId']; label: string; detail: string; kind: 'pc' | 'router' | 'server' }[] = [
    { id: 'client', label: 'PC1', detail: `${state.client.address}:${state.client.port}`, kind: 'pc' },
    { id: 'network', label: 'R1', detail: 'FORWARDS BY IP', kind: 'router' },
    { id: 'server', label: 'WEB1', detail: `${state.server.address}:${state.server.port}`, kind: 'server' },
  ];
  return <View accessible={false} style={styles.topologyPanel}><Text variant="label" style={styles.green}>FIXED INTERACTIVE TOPOLOGY</Text><Text variant="bodySmall" style={styles.muted}>Tap a device to inspect it. Configuration and protocol actions remain guided below.</Text><View style={[styles.topology, compact && styles.topologyCompact]}>{nodes.map((node, index) => <View key={node.id} style={[styles.nodeUnit, compact && styles.nodeUnitCompact]}>{index > 0 ? <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.cable, compact && styles.cableCompact]}><View style={[styles.cableLine, compact && styles.cableLineCompact]} /><Text variant="technical" style={styles.cableLabel}>{state.segments.at(-1)?.direction === 'server-to-client' ? 'RETURN' : 'PATH'}</Text></View> : null}<Pressable accessibilityHint="Selects this device for inspection" accessibilityLabel={`${node.label}, ${node.detail}${selected === node.id ? ', selected' : ''}`} accessibilityRole="button" accessibilityState={{ selected: selected === node.id }} onPress={() => onSelect(node.id)} style={[styles.node, selected === node.id && styles.nodeSelected]}>{node.kind === 'server' ? <Image accessibilityIgnoresInvertColors contentFit="contain" source={require('@/assets/images/education/server-terminal-mobile.png')} style={styles.serverImage} /> : <DeviceGlyph size={68} type={node.kind} />}<Text variant="label" style={styles.nodeLabel}>{node.label}</Text><Text variant="technical" style={styles.nodeDetail}>{node.detail}</Text></Pressable></View>)}</View></View>;
}

function DeviceInspector({ state }: { state: TransportLabState }) {
  const content = state.selectedDeviceId === 'client'
    ? [`IPv4 / ${state.client.address}`, `SOURCE PORT / ${state.client.port}`, `TCP STATE / ${state.clientTcpState}`]
    : state.selectedDeviceId === 'server'
      ? [`IPv4 / ${state.server.address}`, `TARGET PORT / ${state.server.port}`, `LISTENER / ${state.listener.open ? `${state.listener.protocol.toUpperCase()} ${state.listener.port}` : 'CLOSED'}`, `TCP STATE / ${state.serverTcpState}`]
      : ['FORWARDING BASIS / IPv4 DESTINATION', 'TRANSPORT PORTS / NOT USED FOR IP ROUTE SELECTION', 'ENDPOINT TCP STATE / NONE'];
  return <View style={styles.inspector}><Text variant="label" style={styles.orange}>SELECTED / {state.selectedDeviceId.toUpperCase()}</Text>{content.map((line) => <Text key={line} variant="technical" style={styles.body}>{line}</Text>)}</View>;
}

function ConfigurationPanel({ draft, error, onChange }: { draft: ConfigurationDraft; error?: string; onChange: (change: Partial<ConfigurationDraft>) => void }) {
  return <View style={styles.configPanel}><Text variant="label" style={styles.orange}>ENDPOINT CONFIGURATION</Text><Text variant="bodySmall" style={styles.muted}>Valid mistakes are saved. Malformed addresses or ports are rejected without changing the simulation.</Text><View style={styles.fieldGrid}><Input label="Client IPv4" value={draft.clientAddress} onChange={(clientAddress) => onChange({ clientAddress })} /><Input label="Source port" keyboard="number-pad" value={draft.clientPort} onChange={(clientPort) => onChange({ clientPort })} /><Input label="Server IPv4" value={draft.serverAddress} onChange={(serverAddress) => onChange({ serverAddress })} /><Input label="Destination port" keyboard="number-pad" value={draft.destinationPort} onChange={(destinationPort) => onChange({ destinationPort })} /><Choice label="Client protocol" value={draft.protocol} onChange={(protocol) => onChange({ protocol })} /><Choice label="Listener protocol" value={draft.listenerProtocol} onChange={(listenerProtocol) => onChange({ listenerProtocol })} /><Input label="Listening port" keyboard="number-pad" value={draft.listenerPort} onChange={(listenerPort) => onChange({ listenerPort })} /><View style={styles.field}><Text variant="technical" style={styles.muted}>SERVICE STATE</Text><SelectionControl accessibilityRole="switch" grow={false} label={draft.listenerOpen ? 'Listening' : 'Closed'} selected={draft.listenerOpen} onPress={() => onChange({ listenerOpen: !draft.listenerOpen })} /></View></View>{error ? <Text accessibilityLiveRegion="assertive" variant="bodySmall" style={styles.error}>{error}</Text> : null}</View>;
}

function Input({ label, value, onChange, keyboard = 'default' }: { label: string; value: string; onChange: (value: string) => void; keyboard?: 'default' | 'number-pad' }) {
  return <View style={styles.field}><Text variant="technical" style={styles.muted}>{label}</Text><TextInput accessibilityLabel={label} autoCapitalize="none" autoCorrect={false} keyboardType={keyboard} onChangeText={onChange} placeholder={`ENTER ${label.toUpperCase()}`} placeholderTextColor={Palette.textMuted} selectionColor={Palette.orange} style={styles.input} value={value} /></View>;
}

function Choice({ label, value, onChange }: { label: string; value: TransportProtocol; onChange: (value: TransportProtocol) => void }) {
  return <View style={styles.field}><Text variant="technical" style={styles.muted}>{label}</Text><View style={styles.choiceRow}>{(['tcp', 'udp'] as const).map((protocol) => <Pressable key={protocol} accessibilityRole="radio" accessibilityState={{ checked: value === protocol }} onPress={() => onChange(protocol)} style={[styles.choice, value === protocol && styles.choiceSelected]}><Text variant="label">{protocol.toUpperCase()}</Text></Pressable>)}</View></View>;
}

function StateTables({ rows }: { rows: string[] }) {
  return <View style={styles.panel}><Text variant="label" style={styles.green}>LIVE ENDPOINT STATE</Text>{rows.map((row) => <Text key={row} variant="technical" style={styles.tableRow}>{row}</Text>)}</View>;
}

function EventTrace({ evidenceCount, selected, traceIndex, onChange }: { evidenceCount: number; selected?: TransportLabState['evidence'][number]; traceIndex: number; onChange: (index: number) => void }) {
  return <View style={styles.panel}><Text variant="label" style={styles.green}>EVENT TRACE</Text>{selected ? <><Text variant="technical" style={styles.muted}>EVENT {traceIndex + 1} OF {evidenceCount}</Text><Text accessibilityLiveRegion="polite" variant="bodySmall" style={[styles.body, selected.tone === 'warning' && styles.orange]}>{selected.text}</Text><View style={styles.traceActions}><AppButton disabled={traceIndex <= 0} label="Previous event" variant="utility" onPress={() => onChange(Math.max(0, traceIndex - 1))} /><AppButton disabled={traceIndex >= evidenceCount - 1} label="Next event" variant="utility" onPress={() => onChange(Math.min(evidenceCount - 1, traceIndex + 1))} /></View></> : <Text variant="technical" style={styles.muted}>NO EVENTS / COMPLETE THE CURRENT ACTION</Text>}</View>;
}

const styles = StyleSheet.create({
  topologyPanel: { borderWidth: 1, borderColor: Palette.border, padding: Space.lg, gap: Space.sm, marginBottom: Space.md, minWidth: 0 },
  topology: { flexDirection: 'row', alignItems: 'center', width: '100%', minWidth: 0, marginTop: Space.sm },
  topologyCompact: { flexDirection: 'column', alignItems: 'stretch' },
  nodeUnit: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center' },
  nodeUnitCompact: { width: '100%', flexDirection: 'column' },
  node: { minWidth: 0, flex: 1, minHeight: 150, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Palette.border, padding: Space.sm, backgroundColor: Palette.surface },
  nodeSelected: { borderColor: Palette.orange, backgroundColor: Palette.orangeSoft },
  nodeLabel: { color: Palette.text, textAlign: 'center', marginTop: Space.xs },
  nodeDetail: { color: Palette.textMuted, textAlign: 'center', flexShrink: 1 },
  serverImage: { width: 68, height: 68 },
  cable: { width: 42, minWidth: 24, alignItems: 'center', justifyContent: 'center' },
  cableCompact: { width: '100%', minHeight: 52 },
  cableLine: { height: 2, width: '100%', backgroundColor: Palette.accent },
  cableLineCompact: { height: 40, width: 2 },
  cableLabel: { color: Palette.orange, marginTop: Space.xs },
  inspector: { borderLeftWidth: 3, borderColor: Palette.orange, backgroundColor: Palette.surfaceRaised, padding: Space.lg, gap: Space.xs, marginBottom: Space.md },
  objectivePanel: { borderLeftWidth: 3, borderColor: Palette.orange, backgroundColor: Palette.surfaceRaised, padding: Space.lg, gap: Space.sm, marginBottom: Space.md },
  completePanel: { borderWidth: 1, borderColor: Palette.green, backgroundColor: Palette.greenSoft, padding: Space.lg, gap: Space.sm, marginBottom: Space.md },
  configPanel: { borderWidth: 1, borderColor: Palette.orange, padding: Space.lg, gap: Space.md, marginBottom: Space.md },
  fieldGrid: { minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: Space.md },
  field: { minWidth: 220, flexBasis: 220, flexGrow: 1, flexShrink: 1, gap: Space.xs },
  input: { minHeight: 48, borderWidth: 1, borderColor: Palette.border, color: Palette.text, fontFamily: Fonts.regular, fontSize: 14, paddingHorizontal: Space.md, paddingVertical: Space.sm },
  choiceRow: { flexDirection: 'row', gap: Space.sm },
  choice: { minHeight: 48, flex: 1, minWidth: 90, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Palette.border, padding: Space.sm },
  choiceSelected: { borderColor: Palette.orange, backgroundColor: Palette.orangeSoft },
  primaryAction: { borderWidth: 1, borderColor: Palette.accent, padding: Space.lg, gap: Space.sm, marginBottom: Space.md },
  panel: { borderWidth: 1, borderColor: Palette.border, padding: Space.lg, gap: Space.sm, marginBottom: Space.md },
  tableRow: { color: Palette.text, borderBottomWidth: 1, borderBottomColor: Palette.border, paddingVertical: Space.sm },
  traceActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  whyPanel: { borderLeftWidth: 3, borderColor: Palette.green, backgroundColor: Palette.surfaceRaised, padding: Space.lg, gap: Space.sm, marginBottom: Space.md },
  hintPanel: { borderWidth: 1, borderColor: Palette.orange, padding: Space.lg, gap: Space.sm, marginBottom: Space.md },
  warningPanel: { borderWidth: 1, borderColor: Palette.orange, padding: Space.lg, gap: Space.sm, marginBottom: Space.md },
  tools: { borderTopWidth: 1, borderColor: Palette.border, gap: Space.sm, marginTop: Space.xl, paddingTop: Space.lg },
  boundary: { color: Palette.textMuted, marginVertical: Space.xl },
  heading: { color: Palette.text, fontFamily: Fonts.semibold },
  body: { color: Palette.text },
  muted: { color: Palette.textMuted },
  green: { color: Palette.green, fontFamily: Fonts.semibold },
  orange: { color: Palette.orange, fontFamily: Fonts.semibold },
  error: { color: Palette.danger, borderWidth: 1, borderColor: Palette.danger, padding: Space.md },
});
