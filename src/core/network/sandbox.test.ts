import {
  addSandboxDevice,
  applyBeginnerLanSetup,
  clearSandboxLearnedState,
  configureSandboxDevice,
  connectSandboxInterfaces,
  createEmptySandboxWorkspace,
  createGuidedSandboxWorkspace,
  createReadyRoutedSandboxWorkspace,
  createSandboxCliState,
  executeSandboxCliCommand,
  getSandboxPingReadiness,
  isSandboxWorkspace,
  previewBeginnerLanSetup,
  processSandboxFrame,
  simulateSandboxPing,
  validateSandboxTopology,
} from '@/core/network/sandbox';

function switchedLan() {
  let state = createEmptySandboxWorkspace();
  state = addSandboxDevice(state, 'pc', { x: 0, y: 0 }).state;
  state = addSandboxDevice(state, 'switch', { x: 100, y: 0 }).state;
  state = addSandboxDevice(state, 'pc', { x: 200, y: 0 }).state;
  const first = connectSandboxInterfaces(state, 'pc-1', 'switch-1');
  if (first.ok) state = first.state;
  const second = connectSandboxInterfaces(state, 'pc-2', 'switch-1');
  if (second.ok) state = second.state;
  state = configureSandboxDevice(state, 'pc-1', { interfaceId: 'E0', interface: { ipv4: '192.168.1.10', prefix: 24 } }).state;
  state = configureSandboxDevice(state, 'pc-2', { interfaceId: 'E0', interface: { ipv4: '192.168.1.20', prefix: 24 } }).state;
  return state;
}

describe('sandbox domain', () => {
  test('separates ping form readiness from simulated network failures', () => {
    const unconfigured = createGuidedSandboxWorkspace();
    expect(getSandboxPingReadiness(unconfigured, undefined, '')).toMatchObject({
      ready: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ code: 'source-required' }),
        expect.objectContaining({ code: 'destination-required' }),
      ]),
    });
    expect(getSandboxPingReadiness(unconfigured, 'pc-1', 'not-an-address')).toMatchObject({
      ready: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ code: 'source-unconfigured' }),
        expect.objectContaining({ code: 'destination-invalid' }),
      ]),
    });

    let addressed = configureSandboxDevice(unconfigured, 'pc-1', { interfaceId: 'E0', interface: { ipv4: '192.168.10.10', prefix: 24, adminUp: false } }).state;
    expect(getSandboxPingReadiness(addressed, 'pc-1', '192.168.10.20').issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'source-interface-down' })]));
    addressed = configureSandboxDevice(addressed, 'pc-1', { interfaceId: 'E0', interface: { adminUp: true } }).state;
    expect(getSandboxPingReadiness(addressed, 'pc-1', '192.168.10.20')).toMatchObject({ ready: true, issues: [] });
  });

  test('selects the route-facing router address for ping readiness', () => {
    const state = createReadyRoutedSandboxWorkspace();
    expect(getSandboxPingReadiness(state, 'router-1', '192.168.20.20')).toMatchObject({
      ready: true,
      sourceInterfaceId: 'G0/1',
      sourceAddress: '192.168.20.1',
    });
    expect(getSandboxPingReadiness(state, 'router-1', '192.168.10.10')).toMatchObject({ sourceInterfaceId: 'G0/0', sourceAddress: '192.168.10.1' });
  });

  test('rejects malformed persisted workspace structures', () => {
    const valid = createReadyRoutedSandboxWorkspace();
    expect(isSandboxWorkspace(valid)).toBe(true);
    expect(isSandboxWorkspace({ ...valid, devices: valid.devices.map((device) => device.id === 'pc-1' ? { ...device, interfaces: [] } : device) })).toBe(false);
    expect(isSandboxWorkspace({ ...valid, links: [{ ...valid.links[0], a: { deviceId: 'missing', interfaceId: 'E0' } }] })).toBe(false);
  });

  test('previews and explicitly applies a working beginner switched LAN', () => {
    let state = createGuidedSandboxWorkspace();
    const first = connectSandboxInterfaces(state, 'pc-1', 'switch-1'); if (first.ok) state = first.state;
    const second = connectSandboxInterfaces(state, 'pc-2', 'switch-1'); if (second.ok) state = second.state;
    const preview = previewBeginnerLanSetup(state);
    expect(preview).toMatchObject({ pcIds: ['pc-1', 'pc-2'], switchId: 'switch-1', requiresChanges: true, overwritesExistingConfiguration: false });
    expect(state.devices.find((device) => device.id === 'pc-1')?.interfaces[0].ipv4).toBeUndefined();

    const result = applyBeginnerLanSetup(state);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.devices.find((device) => device.id === 'pc-1')).toMatchObject({ defaultGateway: undefined, interfaces: [expect.objectContaining({ ipv4: '192.168.10.10', prefix: 24, adminUp: true })] });
    expect(result.state.devices.find((device) => device.id === 'pc-2')).toMatchObject({ defaultGateway: undefined, interfaces: [expect.objectContaining({ ipv4: '192.168.10.20', prefix: 24, adminUp: true })] });
    expect(simulateSandboxPing(result.state, 'pc-1', '192.168.10.20').success).toBe(true);
  });

  test('reports when the beginner setup will replace existing configuration', () => {
    let state = createGuidedSandboxWorkspace();
    const first = connectSandboxInterfaces(state, 'pc-1', 'switch-1'); if (first.ok) state = first.state;
    const second = connectSandboxInterfaces(state, 'pc-2', 'switch-1'); if (second.ok) state = second.state;
    state = configureSandboxDevice(state, 'pc-1', { interfaceId: 'E0', interface: { ipv4: '10.0.0.10', prefix: 24 }, defaultGateway: '10.0.0.1' }).state;
    expect(previewBeginnerLanSetup(state)).toMatchObject({ overwritesExistingConfiguration: true });
    expect(state.devices.find((device) => device.id === 'pc-1')?.interfaces[0].ipv4).toBe('10.0.0.10');
  });

  test('provides a connected and addressed routed-network preset', () => {
    const state = createReadyRoutedSandboxWorkspace();
    expect(state.devices).toHaveLength(5);
    expect(state.links).toHaveLength(4);
    expect(state.devices.find((device) => device.id === 'pc-1')).toMatchObject({ defaultGateway: '192.168.10.1', interfaces: [expect.objectContaining({ ipv4: '192.168.10.10', prefix: 24 })] });
    expect(state.devices.find((device) => device.id === 'router-1')?.interfaces).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'G0/0', ipv4: '192.168.10.1', prefix: 24 }), expect.objectContaining({ id: 'G0/1', ipv4: '192.168.20.1', prefix: 24 })]));
    expect(state.devices.find((device) => device.id === 'pc-2')).toMatchObject({ defaultGateway: '192.168.20.1', interfaces: [expect.objectContaining({ ipv4: '192.168.20.20', prefix: 24 })] });
    expect(simulateSandboxPing(state, 'pc-1', '192.168.20.20').success).toBe(true);
    const interfaces = executeSandboxCliCommand(state, 'router-1', 'show ip interface brief');
    expect(interfaces.result?.output.map((line) => line.text).join('\n')).toEqual(expect.stringContaining('G0/0     192.168.10.1'));
    expect(interfaces.result?.output.map((line) => line.text).join('\n')).toEqual(expect.stringContaining('G0/1     192.168.20.1'));
    const routes = executeSandboxCliCommand(state, 'router-1', 'show ip route');
    expect(routes.result?.output.map((line) => line.text).join('\n')).toEqual(expect.stringContaining('192.168.10.0/24'));
    expect(routes.result?.output.map((line) => line.text).join('\n')).toEqual(expect.stringContaining('192.168.20.0/24'));
  });

  test('runs sandbox CLI ping through switches and synchronizes learned state', () => {
    const state = createReadyRoutedSandboxWorkspace();
    const left = executeSandboxCliCommand(state, 'router-1', 'ping 192.168.10.10');
    expect(left.trace).toMatchObject({ success: true });
    expect(left.trace?.events.flatMap((item) => item.deviceIds)).toEqual(expect.arrayContaining(['router-1', 'switch-1', 'pc-1']));

    const right = executeSandboxCliCommand(left.state, 'router-1', 'ping 192.168.20.20', left.sessionState);
    expect(right.trace).toMatchObject({ success: true });
    expect(right.result?.events).toContain('ping-success:192.168.20.20');
    expect(right.result?.output.map((line) => line.text).join('\n')).toContain('THIS ROUND TRIP SUCCEEDED');
    expect(right.trace?.events.flatMap((item) => item.deviceIds)).toEqual(expect.arrayContaining(['router-1', 'switch-2', 'pc-2']));
    expect(right.state.devices.find((device) => device.id === 'router-1')?.arpTable).toEqual(expect.arrayContaining([
      expect.objectContaining({ ip: '192.168.10.10', interfaceId: 'G0/0' }),
      expect.objectContaining({ ip: '192.168.20.20', interfaceId: 'G0/1' }),
    ]));
    expect(right.sessionState.devices.find((device) => device.id === 'router-1')?.arpEntries).toEqual(expect.arrayContaining([
      expect.objectContaining({ ip: '192.168.20.20', interfaceName: 'G0/1' }),
    ]));
  });

  test('explains disabled routed interfaces and unaddressed switch ping sources', () => {
    let state = createReadyRoutedSandboxWorkspace();
    state = configureSandboxDevice(state, 'router-1', { interfaceId: 'G0/1', interface: { adminUp: false } }).state;
    const disabled = executeSandboxCliCommand(state, 'router-1', 'ping 192.168.20.20');
    expect(disabled.trace).toMatchObject({ success: false });
    expect(disabled.trace?.reason).toContain('required interface is disabled');

    const switchPing = executeSandboxCliCommand(state, 'switch-1', 'ping 192.168.10.10');
    expect(switchPing.trace).toMatchObject({ success: false });
    expect(switchPing.result?.output.map((line) => line.text).join('\n')).toContain('NO ACTIVE IPV4 INTERFACE');
  });

  test('allocates free ports and blocks duplicates', () => {
    let state = createEmptySandboxWorkspace();
    state = addSandboxDevice(state, 'pc', { x: 0, y: 0 }).state;
    state = addSandboxDevice(state, 'switch', { x: 0, y: 0 }).state;
    const connected = connectSandboxInterfaces(state, 'pc-1', 'switch-1');
    expect(connected).toMatchObject({ ok: true, link: { a: { interfaceId: 'E0' }, b: { interfaceId: 'F0/1' } } });
    if (!connected.ok) return;
    expect(connectSandboxInterfaces(connected.state, 'pc-1', 'switch-1')).toMatchObject({ ok: false, reason: 'duplicate' });
  });

  test('rejects a switch cycle because STP is outside the model', () => {
    let state = createEmptySandboxWorkspace();
    for (let i = 0; i < 3; i += 1) state = addSandboxDevice(state, 'switch', { x: i * 100, y: 0 }).state;
    const one = connectSandboxInterfaces(state, 'switch-1', 'switch-2'); if (one.ok) state = one.state;
    const two = connectSandboxInterfaces(state, 'switch-2', 'switch-3'); if (two.ok) state = two.state;
    expect(connectSandboxInterfaces(state, 'switch-3', 'switch-1')).toMatchObject({ ok: false, reason: 'layer2-cycle' });
  });

  test('reports logical conflicts without rejecting valid syntax', () => {
    let state = switchedLan();
    state = configureSandboxDevice(state, 'pc-2', { interfaceId: 'E0', interface: { ipv4: '192.168.1.10' } }).state;
    expect(validateSandboxTopology(state)).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'duplicate-ipv4', level: 'warning' })]));
    expect(configureSandboxDevice(state, 'pc-2', { interfaceId: 'E0', interface: { ipv4: '999.1.1.1' } })).toMatchObject({ ok: false });
  });

  test('does not erase an address when updating an unrelated interface field', () => {
    let state = switchedLan();
    state = configureSandboxDevice(state, 'pc-1', { interfaceId: 'E0', interface: { adminUp: false } }).state;
    expect(state.devices.find((device) => device.id === 'pc-1')?.interfaces[0]).toMatchObject({ adminUp: false, ipv4: '192.168.1.10', prefix: 24 });
  });

  test('stops ambiguous duplicate destinations and off-subnet gateways', () => {
    let duplicated = switchedLan();
    duplicated = configureSandboxDevice(duplicated, 'pc-2', { interfaceId: 'E0', interface: { ipv4: '192.168.1.10' } }).state;
    expect(simulateSandboxPing(duplicated, 'pc-1', '192.168.1.10').reason).toContain('duplicated');

    let remote = switchedLan();
    remote = configureSandboxDevice(remote, 'pc-1', { defaultGateway: '10.0.0.1' }).state;
    expect(simulateSandboxPing(remote, 'pc-1', '192.168.2.10').reason).toContain('gateway off subnet');
  });

  test('sends a same-LAN frame and learns the source MAC', () => {
    const state = switchedLan();
    const destinationMac = state.devices.find((device) => device.id === 'pc-2')!.interfaces[0].macAddress;
    const result = processSandboxFrame(state, 'pc-1', destinationMac);
    expect(result.success).toBe(true);
    expect(result.state.devices.find((device) => device.id === 'switch-1')!.macTable[0]).toMatchObject({ vlan: 1 });
  });

  test('simulates an Echo round trip and records ARP evidence', () => {
    const result = simulateSandboxPing(switchedLan(), 'pc-1', '192.168.1.20');
    expect(result).toMatchObject({ success: true });
    expect(result.state.devices.find((device) => device.id === 'pc-1')!.arpTable).toEqual(expect.arrayContaining([expect.objectContaining({ ip: '192.168.1.20' })]));
    expect(clearSandboxLearnedState(result.state).devices.every((device) => device.arpTable.length === 0 && device.macTable.length === 0)).toBe(true);
    expect(simulateSandboxPing(result.state, 'pc-1', '192.168.1.20').state).toEqual(result.state);
  });

  test('requires both ends of a VLAN trunk to carry the access VLAN', () => {
    let state = createEmptySandboxWorkspace();
    state = addSandboxDevice(state, 'pc', { x: 0, y: 0 }).state;
    state = addSandboxDevice(state, 'switch', { x: 100, y: 0 }).state;
    state = addSandboxDevice(state, 'switch', { x: 200, y: 0 }).state;
    state = addSandboxDevice(state, 'pc', { x: 300, y: 0 }).state;
    for (const [a, b] of [['pc-1', 'switch-1'], ['switch-1', 'switch-2'], ['switch-2', 'pc-2']] as const) {
      const connection = connectSandboxInterfaces(state, a, b); if (connection.ok) state = connection.state;
    }
    state = configureSandboxDevice(state, 'switch-1', { vlans: [10] }).state;
    state = configureSandboxDevice(state, 'switch-2', { vlans: [10] }).state;
    state = configureSandboxDevice(state, 'switch-1', { interfaceId: 'F0/1', interface: { accessVlan: 10 } }).state;
    state = configureSandboxDevice(state, 'switch-1', { interfaceId: 'F0/2', interface: { switchportMode: 'trunk', allowedVlans: [10] } }).state;
    state = configureSandboxDevice(state, 'switch-2', { interfaceId: 'F0/1', interface: { switchportMode: 'trunk', allowedVlans: [] } }).state;
    state = configureSandboxDevice(state, 'switch-2', { interfaceId: 'F0/2', interface: { accessVlan: 10 } }).state;
    state = configureSandboxDevice(state, 'pc-1', { interfaceId: 'E0', interface: { ipv4: '192.168.10.10', prefix: 24 } }).state;
    state = configureSandboxDevice(state, 'pc-2', { interfaceId: 'E0', interface: { ipv4: '192.168.10.20', prefix: 24 } }).state;
    const mac = state.devices.find((device) => device.id === 'pc-2')!.interfaces[0].macAddress;
    expect(processSandboxFrame(state, 'pc-1', mac).success).toBe(false);
    expect(simulateSandboxPing(state, 'pc-1', '192.168.10.20').reason).toContain('required VLAN is blocked');
    state = configureSandboxDevice(state, 'switch-2', { interfaceId: 'F0/1', interface: { allowedVlans: [10] } }).state;
    expect(processSandboxFrame(state, 'pc-1', mac).success).toBe(true);
  });

  test('traces a routed round trip and explains frame replacement', () => {
    let state = createEmptySandboxWorkspace();
    state = addSandboxDevice(state, 'pc', { x: 0, y: 0 }).state;
    state = addSandboxDevice(state, 'router', { x: 100, y: 0 }).state;
    state = addSandboxDevice(state, 'pc', { x: 200, y: 0 }).state;
    const left = connectSandboxInterfaces(state, 'pc-1', 'router-1'); if (left.ok) state = left.state;
    const right = connectSandboxInterfaces(state, 'router-1', 'pc-2'); if (right.ok) state = right.state;
    state = configureSandboxDevice(state, 'pc-1', { interfaceId: 'E0', interface: { ipv4: '192.168.1.10', prefix: 24 }, defaultGateway: '192.168.1.1' }).state;
    state = configureSandboxDevice(state, 'router-1', { interfaceId: 'G0/0', interface: { ipv4: '192.168.1.1', prefix: 24 } }).state;
    state = configureSandboxDevice(state, 'router-1', { interfaceId: 'G0/1', interface: { ipv4: '192.168.2.1', prefix: 24 } }).state;
    state = configureSandboxDevice(state, 'pc-2', { interfaceId: 'E0', interface: { ipv4: '192.168.2.10', prefix: 24 }, defaultGateway: '192.168.2.1' }).state;
    const result = simulateSandboxPing(state, 'pc-1', '192.168.2.10');
    expect(result.success).toBe(true);
    expect(result.events).toEqual(expect.arrayContaining([expect.objectContaining({ title: 'LINK-LAYER FRAME REPLACED' })]));
  });

  test('keeps CLI modes in a transient session while merging configuration', () => {
    let state = createEmptySandboxWorkspace();
    state = addSandboxDevice(state, 'router', { x: 0, y: 0 }).state;
    let session = createSandboxCliState(state);
    let execution = executeSandboxCliCommand(state, 'router-1', 'enable', session);
    state = execution.state; session = execution.sessionState;
    expect(execution.workspaceMutated).toBe(false);
    execution = executeSandboxCliCommand(state, 'router-1', 'conf t', session);
    expect(execution.result?.accepted).toBe(true);
    expect(execution.sessionState.devices[0].mode).toBe('global-config');
  });
});
