import {
  deriveConnectedRoutes,
  deriveCliLinkContext,
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
import { createInterVlanState, createRoutingState, createVlanState, requiredStaticRoutes } from '@/features/cli/cli-lab-definitions';

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

  test('creates unique tagged router subinterfaces and removes them explicitly', () => {
    let state = enterGlobal(createInterVlanState(), 'r1');
    state = run(state, 'r1', 'interface G0/0.10').state;
    expect(state.devices.find(({ id }) => id === 'r1')?.mode).toBe('subinterface-config');
    expect(normalizeInterfaceName('GigabitEthernet0/0.10')).toBe('G0/0.10');
    state = run(state, 'r1', 'encapsulation dot1q 10').state;
    state = run(state, 'r1', 'ip address 192.168.10.1 255.255.255.0').state;
    state = run(state, 'r1', 'exit').state;
    state = run(state, 'r1', 'interface G0/0.20').state;
    const duplicate = run(state, 'r1', 'encapsulation dot1q 10');
    expect(duplicate.accepted).toBe(false);
    expect(duplicate.state).toBe(state);
    state = run(state, 'r1', 'encapsulation dot1q 20').state;
    state = run(state, 'r1', 'ip address 192.168.20.1 255.255.255.0').state;
    state = run(state, 'r1', 'end').state;
    expect(deriveConnectedRoutes(state.devices.find(({ id }) => id === 'r1')!).map(({ prefix }) => prefix).sort()).toEqual(['192.168.10.0', '192.168.20.0']);
    state = enterGlobal(state, 'r1');
    state = run(state, 'r1', 'no interface G0/0.20').state;
    expect(state.devices.find(({ id }) => id === 'r1')?.interfaces.some(({ name }) => name === 'G0/0.20')).toBe(false);
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

  test('routes an Echo round trip between two VLANs only after trunk and subinterfaces are complete', () => {
    let state = createInterVlanState();
    expect(simulatePing(state, 'pc-a', '192.168.20.20').success).toBe(false);
    state = configure(state, 'sw-1', ['interface F0/24', 'switchport mode trunk', 'switchport trunk allowed vlan 10,20', 'end']);
    state = configure(state, 'r1', ['interface G0/0.10', 'encapsulation dot1q 10', 'ip address 192.168.10.1 255.255.255.0', 'exit', 'interface G0/0.20', 'encapsulation dot1q 20', 'ip address 192.168.20.1 255.255.255.0', 'end']);
    expect(simulatePing(state, 'pc-a', '192.168.20.20').success).toBe(true);
    expect(simulatePing(state, 'pc-b', '192.168.10.10').success).toBe(true);
    state = enterGlobal(state, 'r1');
    state = run(state, 'r1', 'interface G0/0').state;
    state = run(state, 'r1', 'shutdown').state;
    expect(simulatePing(state, 'pc-a', '192.168.20.20').success).toBe(false);
  });
});

describe('CLI topology link context', () => {
  test('labels routed links with their live subnet and reports mismatches or down links', () => {
    const state = createRoutingState();
    expect(deriveCliLinkContext(state, state.links[0])).toEqual({ kind: 'network', label: '192.168.10.0/24', tone: 'normal' });
    expect(deriveCliLinkContext(state, state.links[1])).toEqual({ kind: 'network', label: '10.0.12.0/30', tone: 'normal' });

    state.devices.find(({ id }) => id === 'r2')!.interfaces.find(({ name }) => name === 'G0/0')!.ipv4 = '10.0.99.2';
    expect(deriveCliLinkContext(state, state.links[1])).toEqual({ kind: 'mismatch', label: 'SUBNET MISMATCH', tone: 'warning' });
    state.devices.find(({ id }) => id === 'r1')!.interfaces.find(({ name }) => name === 'G0/1')!.adminUp = false;
    expect(deriveCliLinkContext(state, state.links[1])).toEqual({ kind: 'operational', label: 'LINK DOWN', networkLabel: undefined, tone: 'warning' });
  });

  test('derives access and trunk context from current switch configuration', () => {
    const state = createVlanState();
    expect(deriveCliLinkContext(state, state.links[0])).toEqual({ kind: 'vlan', label: 'ACCESS / VLAN 1', tone: 'normal' });
    expect(deriveCliLinkContext(state, state.links[1])).toEqual({ kind: 'trunk', label: 'NOT TRUNKED', tone: 'warning' });

    const swA = state.devices.find(({ id }) => id === 'sw-a')!.interfaces.find(({ name }) => name === 'F0/24')!;
    const swB = state.devices.find(({ id }) => id === 'sw-b')!.interfaces.find(({ name }) => name === 'F0/24')!;
    Object.assign(swA, { switchportMode: 'trunk', allowedVlans: [20, 10] });
    Object.assign(swB, { switchportMode: 'trunk', allowedVlans: [10, 20] });
    expect(deriveCliLinkContext(state, state.links[1])).toEqual({ kind: 'trunk', label: 'TRUNK / VLAN 10,20', tone: 'success' });

    swB.allowedVlans = [30];
    expect(deriveCliLinkContext(state, state.links[1])).toEqual({ kind: 'trunk', label: 'NO COMMON VLANs', tone: 'warning' });
  });

  test('compares a router trunk with its currently configured subinterface VLANs', () => {
    let state = createInterVlanState();
    const configureDevice = (input: CliNetworkState, deviceId: string, commands: string[]) => {
      let next = enterGlobal(input, deviceId);
      for (const value of commands) next = run(next, deviceId, value).state;
      return next;
    };
    const trunk = state.links.find(({ aDeviceId, bDeviceId }) => aDeviceId === 'sw-1' && bDeviceId === 'r1')!;
    expect(deriveCliLinkContext(state, trunk)).toEqual({ kind: 'trunk', label: 'NOT TRUNKED', tone: 'warning' });

    state = configureDevice(state, 'sw-1', ['interface F0/24', 'switchport mode trunk', 'switchport trunk allowed vlan 10,20', 'end']);
    expect(deriveCliLinkContext(state, trunk)).toEqual({ kind: 'trunk', label: 'NO COMMON VLANs', tone: 'warning' });
    state = configureDevice(state, 'r1', ['interface G0/0.10', 'encapsulation dot1q 10', 'ip address 192.168.10.1 255.255.255.0', 'end']);
    expect(deriveCliLinkContext(state, trunk)).toEqual({ kind: 'trunk', label: 'TRUNK / VLAN 10', tone: 'success' });
  });
});
