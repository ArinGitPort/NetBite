import {
  applyTransportAction,
  createTransportLabState,
  deriveTransportTables,
  evaluateTransportObjective,
  validateTransportLabState,
  type TransportLabState,
} from '@/core/network/transport-lab';

function apply(state: TransportLabState, action: Parameters<typeof applyTransportAction>[1]) {
  const result = applyTransportAction(state, action);
  expect(result.accepted).toBe(true);
  return result.state;
}

function configuredState() {
  let state = createTransportLabState();
  state = apply(state, { type: 'configure', client: { address: '192.0.2.10', port: 53000 }, server: { address: '192.0.2.20', port: 443 }, protocol: 'tcp', listener: { protocol: 'tcp', port: 443, open: true } });
  return apply(state, { type: 'verify-endpoints' });
}

function establishedState() {
  let state = configuredState();
  state = apply(state, { type: 'send-syn' });
  state = apply(state, { type: 'send-syn-ack' });
  return apply(state, { type: 'send-final-ack' });
}

describe('step-driven Transport lab engine', () => {
  test('builds the TCP handshake through explicit state transitions', () => {
    let state = configuredState();
    expect(state).toMatchObject({ objectiveIndex: 1, serverTcpState: 'LISTEN', phase: 'ready' });
    state = apply(state, { type: 'send-syn' });
    expect(state).toMatchObject({ clientTcpState: 'SYN_SENT', serverTcpState: 'SYN_RECEIVED', nextExpectedClientSequence: 1001 });
    state = apply(state, { type: 'send-syn-ack' });
    expect(state.nextExpectedServerSequence).toBe(5001);
    state = apply(state, { type: 'send-final-ack' });
    expect(state).toMatchObject({ clientTcpState: 'ESTABLISHED', serverTcpState: 'ESTABLISHED', objectiveIndex: 2 });
    expect(state.segments.map(({ label }) => label)).toEqual(['SYN', 'SYN-ACK', 'ACK']);
  });

  test('keeps missing data outstanding until retransmission and acknowledgment', () => {
    let state = establishedState();
    state = apply(state, { type: 'arm-data-drop' });
    state = apply(state, { type: 'send-data' });
    expect(state.nextExpectedClientSequence).toBe(1001);
    expect(state.segments.at(-1)).toMatchObject({ status: 'missing', sequence: 1001, length: 20 });
    state = apply(state, { type: 'retransmit-data' });
    expect(state.nextExpectedClientSequence).toBe(1021);
    state = apply(state, { type: 'acknowledge-data' });
    expect(state).toMatchObject({ objectiveIndex: 3, phase: 'data-acknowledged' });
    expect(state.segments.at(-1)).toMatchObject({ acknowledgment: 1021, status: 'acknowledged' });
  });

  test('compares delivered and missing UDP without creating TCP recovery state', () => {
    let state = establishedState();
    state = apply(state, { type: 'arm-data-drop' });
    state = apply(state, { type: 'send-data' });
    state = apply(state, { type: 'retransmit-data' });
    state = apply(state, { type: 'acknowledge-data' });
    state = apply(state, { type: 'prepare-udp' });
    state = apply(state, { type: 'configure', client: state.client, server: state.server, protocol: 'udp', listener: state.listener });
    state = apply(state, { type: 'send-udp' });
    expect(state).toMatchObject({ protocol: 'udp', phase: 'udp-delivered', clientTcpState: 'CLOSED', serverTcpState: 'CLOSED' });
    state = apply(state, { type: 'drop-udp' });
    expect(evaluateTransportObjective(state).complete).toBe(true);
    expect(state.evidence.at(-1)?.text).toMatch(/NO TRANSPORT ACK/);
  });

  test('rejects malformed configuration without mutation', () => {
    const state = createTransportLabState();
    const result = applyTransportAction(state, { type: 'configure', client: { address: '999.1.1.1', port: 70000 }, server: { address: '192.0.2.20', port: 443 }, protocol: 'tcp', listener: { protocol: 'tcp', port: 443, open: true } });
    expect(result).toMatchObject({ accepted: false, mutated: false, state });
  });

  test.each([
    ['closed service', { protocol: 'tcp' as const, target: 443, listenerProtocol: 'tcp' as const, listenerPort: 443, open: false }, /No service is listening/],
    ['wrong destination port', { protocol: 'tcp' as const, target: 80, listenerProtocol: 'tcp' as const, listenerPort: 443, open: true }, /targets port 80/],
    ['protocol mismatch', { protocol: 'tcp' as const, target: 53, listenerProtocol: 'udp' as const, listenerPort: 53, open: true }, /listens with UDP/],
  ])('retains valid incorrect configuration for %s', (_, config, expected) => {
    let state = createTransportLabState();
    state = apply(state, { type: 'configure', client: { address: '192.0.2.10', port: 53000 }, server: { address: '192.0.2.20', port: config.target }, protocol: config.protocol, listener: { protocol: config.listenerProtocol, port: config.listenerPort, open: config.open } });
    const result = applyTransportAction(state, { type: 'verify-endpoints' });
    expect(result.accepted).toBe(true);
    expect(result.state).toMatchObject({ objectiveIndex: 0, server: { port: config.target }, listener: { port: config.listenerPort } });
    expect(result.state.lastError).toMatch(expected);
  });

  test('rejects out-of-order actions and missing acknowledgment without mutation', () => {
    const state = configuredState();
    const earlyData = applyTransportAction(state, { type: 'send-data' });
    expect(earlyData).toMatchObject({ accepted: false, mutated: false });
    expect(earlyData.state).toBe(state);

    let missing = establishedState();
    missing = apply(missing, { type: 'arm-data-drop' });
    missing = apply(missing, { type: 'send-data' });
    const earlyAck = applyTransportAction(missing, { type: 'acknowledge-data' });
    expect(earlyAck).toMatchObject({ accepted: false, mutated: false });
  });

  test('derives readable socket and state tables and validates saved state', () => {
    const state = establishedState();
    const tables = deriveTransportTables(state);
    expect(tables.endpoints).toContain('SOCKET PAIR / TCP 192.0.2.10:53000 -> 192.0.2.20:443');
    expect(tables.connection).toContain('CLIENT TCP / ESTABLISHED');
    expect(validateTransportLabState(JSON.parse(JSON.stringify(state)))).toBe(true);
    expect(validateTransportLabState({ version: 1 })).toBe(false);
  });
});
