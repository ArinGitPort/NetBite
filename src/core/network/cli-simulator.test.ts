import {
  deriveConnectedRoutes,
  deriveVlanReachability,
  executeCliCommand,
  getCliSuggestions,
  maskToPrefix,
  normalizeInterfaceName,
  parseCliCommand,
  simulatePing,
  traceIPv4Path,
  type CliCommand,
  type CliNetworkState,
} from '@/core/network/cli-simulator';
import { createRoutingState, createVlanState, requiredStaticRoutes } from '@/features/cli/cli-lab-definitions';

function command(value: string): CliCommand {
  const parsed = parseCliCommand(value);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.command;
}

function run(state: CliNetworkState, deviceId: string, value: string) {
  return executeCliCommand(state, deviceId, command(value));
}

function enterGlobal(state: CliNetworkState, deviceId: string) {
  const privileged = run(state, deviceId, 'en');
  return run(privileged.state, deviceId, 'conf t').state;
}

describe('NetBite CLI parsing', () => {
  test('offers contextual ping destinations only to addressed devices', () => {
    const state = createRoutingState();
    const router = state.devices.find((device) => device.id === 'r1')!;
    const switchState: CliNetworkState = {
      devices: [{ ...router, id: 'sw', name: 'SW', type: 'switch', interfaces: router.interfaces.map((item) => ({ ...item, ipv4: undefined, prefix: undefined })) }, ...state.devices.filter((device) => device.type === 'host')],
      links: state.links,
    };
    expect(getCliSuggestions(router, state)).toEqual(expect.arrayContaining(['ping 192.168.10.10', 'ping 192.168.30.10']));
    expect(getCliSuggestions(switchState.devices[0], switchState).some((item) => item.startsWith('ping '))).toBe(false);
  });

  test('normalizes explicit aliases, case, whitespace, and interface names', () => {
    expect(parseCliCommand('  CONF   T ')).toEqual({ ok: true, command: { kind: 'configure-terminal' } });
    expect(parseCliCommand('Sh IP Route')).toEqual({ ok: true, command: { kind: 'show-ip-route' } });
    expect(normalizeInterfaceName('FastEthernet0/24')).toBe('F0/24');
    expect(normalizeInterfaceName('gi0/1')).toBe('G0/1');
  });

  test('accepts only contiguous masks and valid network addresses', () => {
    expect(maskToPrefix('255.255.255.0')).toBe(24);
    expect(maskToPrefix('255.0.255.0')).toBeNull();
    expect(parseCliCommand('ip route 192.168.30.0 255.255.255.0 10.0.12.2')).toMatchObject({ ok: true });
    expect(parseCliCommand('ip route 192.168.30.3 255.255.255.0 10.0.12.2')).toMatchObject({ ok: false });
  });

  test('validates and de-duplicates comma-separated VLAN IDs', () => {
    expect(parseCliCommand('switchport trunk allowed vlan 20,10,20')).toEqual({
      ok: true,
      command: { kind: 'switchport-trunk-allowed', vlans: [10, 20], remove: false },
    });
    expect(parseCliCommand('vlan 4095')).toMatchObject({ ok: false });
    expect(parseCliCommand('switchport trunk allowed vlan 10-20')).toMatchObject({ ok: false });
  });
});

describe('NetBite CLI execution', () => {
  test('rejects commands in the wrong mode without changing state', () => {
    const state = createRoutingState();
    const result = run(state, 'r1', 'ip route 192.168.30.0 255.255.255.0 10.0.12.2');
    expect(result.accepted).toBe(false);
    expect(result.mutated).toBe(false);
    expect(result.state).toBe(state);
    expect(state.devices.find(({ id }) => id === 'r1')?.routes).toHaveLength(0);
  });

  test('keeps a valid wrong route until an exact no command removes it', () => {
    const global = enterGlobal(createRoutingState(), 'r1');
    const added = run(global, 'r1', 'ip route 192.168.30.0 255.255.255.0 10.0.12.99');
    expect(added.accepted).toBe(true);
    expect(added.events).toContain('config-change');
    expect(added.state.devices.find(({ id }) => id === 'r1')?.routes).toHaveLength(1);

    const removed = run(added.state, 'r1', 'no ip route 192.168.30.0 255.255.255.0 10.0.12.99');
    expect(removed.state.devices.find(({ id }) => id === 'r1')?.routes).toHaveLength(0);
  });

  test('reports show commands as evidence without mutating configuration', () => {
    const state = createRoutingState();
    const enabled = run(state, 'r1', 'enable').state;
    const result = run(enabled, 'r1', 'show running-config');
    expect(result.events).toEqual(['show-running-config']);
    expect(result.mutated).toBe(false);
  });

  test('configures interface addresses and administrative state in the sandbox CLI subset', () => {
    let state = enterGlobal(createRoutingState(), 'r1');
    state = run(state, 'r1', 'interface G0/0').state;
    state = run(state, 'r1', 'ip address 172.16.1.1 255.255.255.0').state;
    expect(state.devices.find(({ id }) => id === 'r1')?.interfaces.find(({ name }) => name === 'G0/0')).toMatchObject({ ipv4: '172.16.1.1', prefix: 24 });
    state = run(state, 'r1', 'shutdown').state;
    expect(state.devices.find(({ id }) => id === 'r1')?.interfaces.find(({ name }) => name === 'G0/0')?.adminUp).toBe(false);
    state = run(state, 'r1', 'no shutdown').state;
    expect(state.devices.find(({ id }) => id === 'r1')?.interfaces.find(({ name }) => name === 'G0/0')?.adminUp).toBe(true);
  });

  test('shows and clears modeled ARP and MAC entries', () => {
    const state = createVlanState();
    const sw = state.devices.find(({ id }) => id === 'sw-a')!;
    sw.macEntries = [{ macAddress: '02:00:00:00:00:0A', interfaceName: 'F0/1', vlan: 10 }];
    const enabled = run(state, 'sw-a', 'enable').state;
    expect(run(enabled, 'sw-a', 'show mac address-table').output[0].text).toContain('VLAN 10');
    expect(run(enabled, 'sw-a', 'clear mac address-table').state.devices.find(({ id }) => id === 'sw-a')?.macEntries).toEqual([]);
  });
});

describe('deterministic IPv4 simulation', () => {
  function configuredRoutingState() {
    let state = createRoutingState();
    for (const required of requiredStaticRoutes) {
      state = enterGlobal(state, required.deviceId);
      state = run(state, required.deviceId, `ip route ${required.prefix} 255.255.255.0 ${required.nextHop}`).state;
      state = run(state, required.deviceId, 'end').state;
    }
    return state;
  }

  test('derives connected routes only from usable interfaces', () => {
    const state = createRoutingState();
    const r1 = state.devices.find(({ id }) => id === 'r1')!;
    expect(deriveConnectedRoutes(r1).map(({ prefix }) => prefix)).toEqual(['192.168.10.0', '10.0.12.0']);
    r1.interfaces[0].linkUp = false;
    expect(deriveConnectedRoutes(r1).map(({ prefix }) => prefix)).toEqual(['10.0.12.0']);
  });

  test('requires both forward and return paths for a successful ping', () => {
    const empty = createRoutingState();
    expect(simulatePing(empty, 'pc-a', '192.168.30.10').forward.reason).toBe('no-route');

    const configured = configuredRoutingState();
    const result = simulatePing(configured, 'pc-a', '192.168.30.10');
    expect(result.success).toBe(true);
    expect(result.forward.hops).toEqual(['PC-A', 'NB-R1', 'NB-R2', 'NB-R3', 'PC-C']);
    expect(result.output.some(({ text }) => text.includes('THIS ROUND TRIP SUCCEEDED'))).toBe(true);
  });

  test('distinguishes missing return paths, unreachable next hops, and loops', () => {
    let forwardOnly = createRoutingState();
    for (const required of requiredStaticRoutes.slice(0, 2)) {
      forwardOnly = enterGlobal(forwardOnly, required.deviceId);
      forwardOnly = run(forwardOnly, required.deviceId, `ip route ${required.prefix} 255.255.255.0 ${required.nextHop}`).state;
      forwardOnly = run(forwardOnly, required.deviceId, 'end').state;
    }
    expect(simulatePing(forwardOnly, 'pc-a', '192.168.30.10').reverse?.reason).toBe('no-route');

    const unreachable = enterGlobal(createRoutingState(), 'r1');
    const badNextHop = run(unreachable, 'r1', 'ip route 192.168.30.0 255.255.255.0 10.0.12.99').state;
    expect(traceIPv4Path(badNextHop, 'pc-a', '192.168.30.10').reason).toBe('next-hop-unreachable');

    let loop = createRoutingState();
    loop = enterGlobal(loop, 'r1');
    loop = run(loop, 'r1', 'ip route 192.168.30.0 255.255.255.0 10.0.12.2').state;
    loop = run(loop, 'r1', 'end').state;
    loop = enterGlobal(loop, 'r2');
    loop = run(loop, 'r2', 'ip route 192.168.30.0 255.255.255.0 10.0.12.1').state;
    expect(traceIPv4Path(loop, 'pc-a', '192.168.30.10').reason).toBe('loop');
  });
});

describe('configuration-derived VLAN reachability', () => {
  function configure(state: CliNetworkState, deviceId: string, commands: string[]) {
    let next = enterGlobal(state, deviceId);
    for (const value of commands) next = run(next, deviceId, value).state;
    return next;
  }

  test('requires matching access VLANs and both trunk endpoints', () => {
    let state = createVlanState();
    const swA = ['vlan 10', 'exit', 'vlan 20', 'exit', 'interface F0/1', 'switchport mode access', 'switchport access vlan 10', 'exit', 'interface F0/24', 'switchport mode trunk', 'switchport trunk allowed vlan 10,20', 'end'];
    const swB = ['vlan 10', 'exit', 'vlan 20', 'exit', 'interface F0/2', 'switchport mode access', 'switchport access vlan 10', 'exit', 'interface F0/3', 'switchport mode access', 'switchport access vlan 20', 'exit', 'interface F0/24', 'switchport mode trunk', 'switchport trunk allowed vlan 10,20', 'end'];
    state = configure(state, 'sw-a', swA);
    expect(deriveVlanReachability(state, 'pc-a', 'pc-b').reachable).toBe(false);
    state = configure(state, 'sw-b', swB);
    expect(deriveVlanReachability(state, 'pc-a', 'pc-b')).toMatchObject({ reachable: true });
    expect(deriveVlanReachability(state, 'pc-a', 'pc-c')).toMatchObject({ reachable: false });
  });
});
