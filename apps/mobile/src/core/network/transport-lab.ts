import { parseIPv4Address } from '@/core/network/advanced-networking';

export type TransportProtocol = 'tcp' | 'udp';
export type TcpConnectionState = 'CLOSED' | 'LISTEN' | 'SYN_SENT' | 'SYN_RECEIVED' | 'ESTABLISHED';
export type TransportDirection = 'client-to-server' | 'server-to-client' | 'none';

export interface TransportEndpoint {
  address: string;
  port: number;
}

export interface TransportListener {
  protocol: TransportProtocol;
  port: number;
  open: boolean;
}

export interface TransportSegment {
  id: string;
  label: string;
  protocol: TransportProtocol;
  direction: TransportDirection;
  sequence?: number;
  acknowledgment?: number;
  length?: number;
  status: 'sent' | 'delivered' | 'missing' | 'acknowledged' | 'rejected';
}

export interface TransportEvidence {
  id: string;
  text: string;
  tone: 'neutral' | 'success' | 'warning';
  segmentId?: string;
}

export interface TransportExplanation {
  observation: string;
  rule: string;
  proves: string;
  nextCheck: string;
}

export interface TransportLabState {
  version: 1;
  objectiveIndex: number;
  completedObjectiveIds: string[];
  configured: boolean;
  client: TransportEndpoint;
  server: TransportEndpoint;
  protocol: TransportProtocol;
  listener: TransportListener;
  clientTcpState: TcpConnectionState;
  serverTcpState: TcpConnectionState;
  clientSequence: number;
  serverSequence: number;
  nextExpectedClientSequence: number;
  nextExpectedServerSequence: number;
  phase: 'configure' | 'ready' | 'syn' | 'syn-ack' | 'established' | 'drop-armed' | 'data-missing' | 'retransmitted' | 'data-acknowledged' | 'udp-delivered' | 'udp-missing' | 'complete';
  segments: TransportSegment[];
  evidence: TransportEvidence[];
  hints: string[];
  selectedDeviceId: 'client' | 'network' | 'server';
  lastExplanation: TransportExplanation;
  lastError?: string;
  updatedAt: string;
}

export type TransportAction =
  | { type: 'configure'; client: TransportEndpoint; server: TransportEndpoint; protocol: TransportProtocol; listener: TransportListener }
  | { type: 'verify-endpoints' }
  | { type: 'send-syn' }
  | { type: 'send-syn-ack' }
  | { type: 'send-final-ack' }
  | { type: 'arm-data-drop' }
  | { type: 'send-data' }
  | { type: 'retransmit-data' }
  | { type: 'acknowledge-data' }
  | { type: 'prepare-udp' }
  | { type: 'send-udp' }
  | { type: 'drop-udp' }
  | { type: 'select-device'; deviceId: TransportLabState['selectedDeviceId'] }
  | { type: 'add-hint'; hint: string };

export interface TransportActionResult {
  accepted: boolean;
  mutated: boolean;
  state: TransportLabState;
  explanation: TransportExplanation;
  error?: string;
}

const now = () => new Date().toISOString();
const validPort = (port: number) => Number.isInteger(port) && port >= 1 && port <= 65535;

const explanations = {
  configure: explanation('Endpoint values are ready to be checked.', 'IP identifies a host while a transport port identifies a process on that host.', 'No connection exists until a matching listening service is verified.', 'Verify the endpoint tuple and listening service.'),
  handshake: explanation('TCP control segments are synchronizing both endpoints.', 'SYN, SYN-ACK, and ACK establish sequence state before application data.', 'A control exchange does not yet prove application data was delivered.', 'Send the next required handshake segment.'),
  established: explanation('Both endpoints reached ESTABLISHED.', 'The final ACK confirms the server SYN and completes this three-way handshake.', 'The endpoints now have synchronized TCP connection state.', 'Send application data and observe its acknowledgment.'),
  missing: explanation('The data segment did not reach the server.', 'TCP retains unacknowledged data so an endpoint can retransmit it; this practice does not invent a timer.', 'The missing acknowledgment means delivery has not been established.', 'Retransmit the outstanding sequence range.'),
  recovery: explanation('The retransmitted bytes arrived and were acknowledged.', 'A cumulative acknowledgment names the next byte the receiver expects.', 'The TCP data reached the listening process after recovery.', 'Reset the conversation and compare UDP.'),
  udp: explanation('The UDP datagram was delivered to a matching listening port.', 'UDP sends independent datagrams without TCP connection or acknowledgment state.', 'The datagram reached the process, but no TCP-style session was created.', 'Inject one missing UDP datagram and compare the available evidence.'),
  udpMissing: explanation('The UDP datagram has no delivery confirmation.', 'UDP does not provide TCP sequence, acknowledgment, or retransmission state.', 'The sender cannot conclude why no application response arrived from UDP alone.', 'The application must decide whether and how to retry.'),
};

export function createTransportLabState(): TransportLabState {
  return {
    version: 1,
    objectiveIndex: 0,
    completedObjectiveIds: [],
    configured: false,
    client: { address: '192.0.2.10', port: 53000 },
    server: { address: '192.0.2.20', port: 443 },
    protocol: 'tcp',
    listener: { protocol: 'tcp', port: 443, open: true },
    clientTcpState: 'CLOSED',
    serverTcpState: 'CLOSED',
    clientSequence: 1000,
    serverSequence: 5000,
    nextExpectedClientSequence: 1000,
    nextExpectedServerSequence: 5000,
    phase: 'configure',
    segments: [],
    evidence: [],
    hints: [],
    selectedDeviceId: 'client',
    lastExplanation: explanations.configure,
    updatedAt: now(),
  };
}

export function validateTransportLabState(value: unknown): value is TransportLabState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<TransportLabState>;
  return state.version === 1
    && Number.isInteger(state.objectiveIndex)
    && typeof state.configured === 'boolean'
    && Array.isArray(state.completedObjectiveIds)
    && Boolean(state.client && parseIPv4Address(state.client.address) && validPort(state.client.port))
    && Boolean(state.server && parseIPv4Address(state.server.address) && validPort(state.server.port))
    && Boolean(state.listener && validPort(state.listener.port))
    && Array.isArray(state.segments)
    && Array.isArray(state.evidence)
    && Array.isArray(state.hints);
}

export function configureTransportEndpoint(state: TransportLabState, client: TransportEndpoint, server: TransportEndpoint, protocol: TransportProtocol): TransportActionResult {
  return applyTransportAction(state, { type: 'configure', client, server, protocol, listener: state.listener });
}

export function configureTransportListener(state: TransportLabState, listener: TransportListener): TransportActionResult {
  return applyTransportAction(state, { type: 'configure', client: state.client, server: state.server, protocol: state.protocol, listener });
}

export function applyTransportAction(state: TransportLabState, action: TransportAction): TransportActionResult {
  if (action.type === 'select-device') return success({ ...state, selectedDeviceId: action.deviceId, updatedAt: now() }, state.lastExplanation);
  if (action.type === 'add-hint') {
    if (state.hints.includes(action.hint)) return failure(state, 'That hint is already visible.', state.lastExplanation);
    return success({ ...state, hints: [...state.hints, action.hint], updatedAt: now() }, state.lastExplanation);
  }
  if (action.type === 'configure') return configure(state, action);
  if (action.type === 'verify-endpoints') return verifyEndpoints(state);
  if (action.type === 'send-syn') return sendSyn(state);
  if (action.type === 'send-syn-ack') return sendSynAck(state);
  if (action.type === 'send-final-ack') return sendFinalAck(state);
  if (action.type === 'arm-data-drop') return requirePhase(state, 'established', () => success({ ...state, phase: 'drop-armed', lastError: undefined, updatedAt: now() }, explanations.established));
  if (action.type === 'send-data') return sendData(state);
  if (action.type === 'retransmit-data') return retransmit(state);
  if (action.type === 'acknowledge-data') return acknowledgeData(state);
  if (action.type === 'prepare-udp') return prepareUdp(state);
  if (action.type === 'send-udp') return sendUdp(state);
  return dropUdp(state);
}

function configure(state: TransportLabState, action: Extract<TransportAction, { type: 'configure' }>): TransportActionResult {
  if (!parseIPv4Address(action.client.address) || !parseIPv4Address(action.server.address)) return failure(state, 'Enter complete valid client and server IPv4 addresses.', explanations.configure);
  if (!validPort(action.client.port) || !validPort(action.server.port) || !validPort(action.listener.port)) return failure(state, 'Transport ports must be whole numbers from 1 through 65535.', explanations.configure);
  const next = {
    ...state,
    client: { ...action.client },
    server: { ...action.server },
    protocol: action.protocol,
    listener: { ...action.listener },
    configured: true,
    phase: 'configure' as const,
    clientTcpState: 'CLOSED' as const,
    serverTcpState: action.listener.open && action.listener.protocol === 'tcp' ? 'LISTEN' as const : 'CLOSED' as const,
    segments: state.objectiveIndex === 0 ? [] : state.segments,
    evidence: state.objectiveIndex === 0 ? [evidence('configuration', 'Endpoint and listener configuration saved.', 'neutral')] : [...state.evidence, evidence(`configuration-${state.evidence.length}`, 'UDP endpoint and listener configuration saved.', 'neutral')],
    lastExplanation: explanations.configure,
    lastError: undefined,
    updatedAt: now(),
  };
  return success(next, explanations.configure);
}

function verifyEndpoints(state: TransportLabState): TransportActionResult {
  if (state.objectiveIndex !== 0) return failure(state, 'Endpoint verification belongs to objective 1.', explanations.configure);
  if (!state.configured) return failure(state, 'Save the endpoint and listener configuration before verification.', explanations.configure);
  const listenerError = listenerMismatch(state, 'tcp');
  if (listenerError) return transportFailure(state, listenerError, 'The endpoint host is known, but no matching TCP process accepts this destination tuple.', 'Correct the protocol, destination port, or listening state.');
  if (state.protocol !== 'tcp') return transportFailure(state, 'The client is configured for UDP while this objective requires TCP.', 'Both endpoints must use the same transport protocol.', 'Select TCP on the client.');
  return success(completeObjective({ ...state, phase: 'ready', serverTcpState: 'LISTEN', evidence: [evidence('listener', `SERVER LISTEN / TCP ${state.listener.port}`, 'success')] }, 'endpoints'), explanations.configure);
}

function sendSyn(state: TransportLabState): TransportActionResult {
  return requirePhase(state, 'ready', () => {
    const segment = makeSegment('syn', 'SYN', 'tcp', 'client-to-server', 'delivered', state.clientSequence);
    return success({ ...state, phase: 'syn', clientTcpState: 'SYN_SENT', serverTcpState: 'SYN_RECEIVED', nextExpectedClientSequence: state.clientSequence + 1, segments: [...state.segments, segment], evidence: [...state.evidence, evidence('syn', `SYN / SEQ ${state.clientSequence}`, 'neutral', segment.id)], lastExplanation: explanations.handshake, lastError: undefined, updatedAt: now() }, explanations.handshake);
  });
}

function sendSynAck(state: TransportLabState): TransportActionResult {
  return requirePhase(state, 'syn', () => {
    const segment = makeSegment('syn-ack', 'SYN-ACK', 'tcp', 'server-to-client', 'delivered', state.serverSequence, state.nextExpectedClientSequence);
    return success({ ...state, phase: 'syn-ack', nextExpectedServerSequence: state.serverSequence + 1, segments: [...state.segments, segment], evidence: [...state.evidence, evidence('syn-ack', `SYN-ACK / SEQ ${state.serverSequence} / ACK ${state.nextExpectedClientSequence}`, 'neutral', segment.id)], lastExplanation: explanations.handshake, lastError: undefined, updatedAt: now() }, explanations.handshake);
  });
}

function sendFinalAck(state: TransportLabState): TransportActionResult {
  return requirePhase(state, 'syn-ack', () => {
    const segment = makeSegment('final-ack', 'ACK', 'tcp', 'client-to-server', 'delivered', state.nextExpectedClientSequence, state.nextExpectedServerSequence);
    const next = completeObjective({ ...state, phase: 'established', clientTcpState: 'ESTABLISHED', serverTcpState: 'ESTABLISHED', segments: [...state.segments, segment], evidence: [...state.evidence, evidence('established', `ACK / SEQ ${state.nextExpectedClientSequence} / ACK ${state.nextExpectedServerSequence} / CONNECTION ESTABLISHED`, 'success', segment.id)], lastExplanation: explanations.established, lastError: undefined }, 'handshake');
    return success(next, explanations.established);
  });
}

function sendData(state: TransportLabState): TransportActionResult {
  return requirePhase(state, 'drop-armed', () => {
    const segment = { ...makeSegment('data-missing', 'DATA / 20 BYTES', 'tcp', 'client-to-server', 'missing', state.nextExpectedClientSequence, state.nextExpectedServerSequence), length: 20 };
    return success({ ...state, phase: 'data-missing', segments: [...state.segments, segment], evidence: [...state.evidence, evidence('data-missing', `DATA MISSING / SEQ ${state.nextExpectedClientSequence} / 20 BYTES / NO NEW ACK`, 'warning', segment.id)], lastExplanation: explanations.missing, lastError: undefined, updatedAt: now() }, explanations.missing);
  });
}

function retransmit(state: TransportLabState): TransportActionResult {
  return requirePhase(state, 'data-missing', () => {
    const segment = { ...makeSegment('retransmit', 'RETRANSMIT / 20 BYTES', 'tcp', 'client-to-server', 'delivered', state.nextExpectedClientSequence, state.nextExpectedServerSequence), length: 20 };
    return success({ ...state, phase: 'retransmitted', nextExpectedClientSequence: state.nextExpectedClientSequence + 20, segments: [...state.segments, segment], evidence: [...state.evidence, evidence('retransmit', `RETRANSMIT / SEQ ${state.nextExpectedClientSequence} / SERVER NOW EXPECTS ${state.nextExpectedClientSequence + 20}`, 'neutral', segment.id)], lastExplanation: explanations.missing, lastError: undefined, updatedAt: now() }, explanations.missing);
  });
}

function acknowledgeData(state: TransportLabState): TransportActionResult {
  return requirePhase(state, 'retransmitted', () => {
    const segment = makeSegment('data-ack', 'ACK', 'tcp', 'server-to-client', 'acknowledged', state.nextExpectedServerSequence, state.nextExpectedClientSequence);
    const next = completeObjective({ ...state, phase: 'data-acknowledged', segments: [...state.segments, segment], evidence: [...state.evidence, evidence('data-ack', `ACK ${state.nextExpectedClientSequence} / ALL 20 BYTES ACCOUNTED FOR`, 'success', segment.id)], lastExplanation: explanations.recovery, lastError: undefined }, 'recovery');
    return success(next, explanations.recovery);
  });
}

function prepareUdp(state: TransportLabState): TransportActionResult {
  if (state.objectiveIndex !== 3) return failure(state, 'Complete TCP recovery before preparing the UDP comparison.', explanations.recovery);
  return success({ ...state, configured: false, protocol: 'udp', client: { ...state.client, port: 53001 }, server: { ...state.server, port: 53 }, listener: { protocol: 'udp', port: 53, open: true }, clientTcpState: 'CLOSED', serverTcpState: 'CLOSED', phase: 'configure', evidence: [...state.evidence, evidence('udp-ready', 'UDP COMPARISON VALUES PREPARED / SAVE THEM BEFORE SENDING', 'neutral')], lastExplanation: explanations.udp, lastError: undefined, updatedAt: now() }, explanations.udp);
}

function sendUdp(state: TransportLabState): TransportActionResult {
  if (state.objectiveIndex !== 3 || state.phase !== 'configure' || !state.configured) return failure(state, 'Prepare and save the UDP comparison before sending its first datagram.', explanations.udp);
  const mismatch = listenerMismatch(state, 'udp');
  if (state.protocol !== 'udp' || mismatch) return transportFailure(state, mismatch ?? 'The client protocol is not UDP.', 'UDP delivery still requires a matching destination protocol and port.', 'Correct the UDP endpoint and listener configuration.');
  const datagram = makeSegment('udp-delivered', 'UDP DATAGRAM', 'udp', 'client-to-server', 'delivered');
  return success({ ...state, phase: 'udp-delivered', segments: [datagram], evidence: [...state.evidence, evidence('udp-delivered', `UDP DATAGRAM DELIVERED / ${socketPair(state)}`, 'success', datagram.id)], lastExplanation: explanations.udp, lastError: undefined, updatedAt: now() }, explanations.udp);
}

function dropUdp(state: TransportLabState): TransportActionResult {
  return requirePhase(state, 'udp-delivered', () => {
    const datagram = makeSegment('udp-missing', 'UDP DATAGRAM', 'udp', 'client-to-server', 'missing');
    const next = completeObjective({ ...state, phase: 'complete', segments: [...state.segments, datagram], evidence: [...state.evidence, evidence('udp-missing', 'UDP DATAGRAM MISSING / NO TRANSPORT ACK / NO AUTOMATIC RETRANSMISSION IN THIS MODEL', 'warning', datagram.id)], lastExplanation: explanations.udpMissing, lastError: undefined }, 'udp');
    return success(next, explanations.udpMissing);
  });
}

function listenerMismatch(state: TransportLabState, protocol: TransportProtocol) {
  if (!state.listener.open) return `No service is listening on ${state.server.address}:${state.server.port}.`;
  if (state.listener.protocol !== protocol) return `The server listens with ${state.listener.protocol.toUpperCase()}, not ${protocol.toUpperCase()}.`;
  if (state.listener.port !== state.server.port) return `The client targets port ${state.server.port}, but the service listens on port ${state.listener.port}.`;
  return undefined;
}

function completeObjective(state: TransportLabState, id: string): TransportLabState {
  const completedObjectiveIds = state.completedObjectiveIds.includes(id) ? state.completedObjectiveIds : [...state.completedObjectiveIds, id];
  return { ...state, completedObjectiveIds, objectiveIndex: Math.min(4, state.objectiveIndex + 1), updatedAt: now() };
}

function requirePhase(state: TransportLabState, expected: TransportLabState['phase'], operation: () => TransportActionResult) {
  return state.phase === expected ? operation() : failure(state, `That action is out of order. The current state is ${state.phase.replaceAll('-', ' ').toUpperCase()}.`, state.lastExplanation);
}

function transportFailure(state: TransportLabState, observation: string, rule: string, nextCheck: string): TransportActionResult {
  const detail = explanation(observation, rule, 'The requested exchange has not been established.', nextCheck);
  return success({ ...state, evidence: [...state.evidence, evidence(`failure-${state.evidence.length}`, observation, 'warning')], lastExplanation: detail, lastError: observation, updatedAt: now() }, detail);
}

function failure(state: TransportLabState, error: string, detail: TransportExplanation): TransportActionResult {
  return { accepted: false, mutated: false, state, explanation: detail, error };
}

function success(state: TransportLabState, detail: TransportExplanation): TransportActionResult {
  return { accepted: true, mutated: true, state, explanation: detail };
}

function explanation(observation: string, rule: string, proves: string, nextCheck: string): TransportExplanation {
  return { observation, rule, proves, nextCheck };
}

function evidence(id: string, text: string, tone: TransportEvidence['tone'], segmentId?: string): TransportEvidence {
  return { id, text, tone, segmentId };
}

function makeSegment(id: string, label: string, protocol: TransportProtocol, direction: TransportDirection, status: TransportSegment['status'], sequence?: number, acknowledgment?: number): TransportSegment {
  return { id, label, protocol, direction, status, sequence, acknowledgment };
}

export function deriveTransportTables(state: TransportLabState) {
  return {
    endpoints: [
      `CLIENT / ${state.client.address}:${state.client.port}`,
      `SERVER / ${state.server.address}:${state.server.port}`,
      `SOCKET PAIR / ${socketPair(state)}`,
    ],
    listeners: [`${state.listener.open ? 'OPEN' : 'CLOSED'} / ${state.listener.protocol.toUpperCase()} ${state.server.address}:${state.listener.port}`],
    connection: state.protocol === 'tcp' ? [
      `CLIENT TCP / ${state.clientTcpState}`,
      `SERVER TCP / ${state.serverTcpState}`,
      `NEXT CLIENT SEQ / ${state.nextExpectedClientSequence}`,
      `NEXT SERVER SEQ / ${state.nextExpectedServerSequence}`,
    ] : ['UDP / NO TCP CONNECTION STATE'],
  };
}

export function evaluateTransportObjective(state: TransportLabState) {
  const ids = ['endpoints', 'handshake', 'recovery', 'udp'];
  return { complete: state.objectiveIndex >= 4, currentObjectiveId: ids[Math.min(state.objectiveIndex, 3)], completedObjectiveIds: state.completedObjectiveIds };
}

export function explainTransportOutcome(state: TransportLabState): TransportExplanation {
  return state.lastExplanation;
}

export function socketPair(state: TransportLabState) {
  return `${state.protocol.toUpperCase()} ${state.client.address}:${state.client.port} -> ${state.server.address}:${state.server.port}`;
}
