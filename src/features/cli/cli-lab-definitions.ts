import type { CliDeviceState, CliLabDefinition as PublicCliLabDefinition, CliNetworkState } from '@/core/network/cli-simulator';

export interface CliPredictionChoice { id: string; label: string; feedback: string }
export type CliLabView = 'cli' | 'topology';
export interface CliTopologyNodePosition { x: number; y: number }
export interface CliTopologyLayout {
  description: string;
  height: { compact: number; regular: number; wide: number };
  compact: Record<string, CliTopologyNodePosition>;
  regular: Record<string, CliTopologyNodePosition>;
  wide: Record<string, CliTopologyNodePosition>;
}
export interface DiagnosticScenario {
  id: string;
  context: string;
  prompt: string;
  requiredEvents: string[];
  suggestions: string[];
  hints: string[];
  choices: CliPredictionChoice[];
  correctChoiceId: string;
  createState: () => CliNetworkState;
}
export interface CliLabDefinition extends PublicCliLabDefinition {
  kind: 'diagnostic' | 'routing' | 'vlan' | 'inter-vlan';
  eyebrow: string;
  objective: string;
  scopeNote: string;
  createState: () => CliNetworkState;
  diagnosticScenarios?: DiagnosticScenario[];
  topology: CliTopologyLayout;
}

const device = (input: Partial<CliDeviceState> & Pick<CliDeviceState, 'id' | 'name' | 'type'>): CliDeviceState => ({
  mode: 'user-exec', interfaces: [], routes: [], vlans: [], ...input,
});

function diagnosticState(kind: 'link' | 'address' | 'path' | 'success'): CliNetworkState {
  const localAddress = kind === 'address' ? '192.168.20.1' : '192.168.10.1';
  const r1 = device({
    id: 'r1', name: 'NB-R1', type: 'router', mode: 'privileged-exec',
    interfaces: [{ name: 'G0/0', ipv4: localAddress, prefix: 24, adminUp: kind !== 'link', linkUp: kind !== 'link' }],
  });
  const pc = device({
    id: 'pc-a', name: 'PC-A', type: 'host', mode: 'privileged-exec',
    interfaces: [{ name: 'E0', ipv4: '192.168.10.10', prefix: 24, adminUp: true, linkUp: kind !== 'link' }],
    routes: [{ prefix: '0.0.0.0', prefixLength: 0, nextHop: '192.168.10.1', exitInterface: 'E0', source: 'default' }],
  });
  const state: CliNetworkState = { devices: [r1, pc], links: [{ aDeviceId: 'r1', aInterface: 'G0/0', bDeviceId: 'pc-a', bInterface: 'E0' }] };
  if (kind === 'path' || kind === 'success') {
    r1.interfaces.push({ name: 'G0/1', ipv4: '10.0.12.1', prefix: 30, adminUp: true, linkUp: true });
    const r2 = device({ id: 'r2', name: 'NB-R2', type: 'router', mode: 'privileged-exec', interfaces: [
      { name: 'G0/0', ipv4: '10.0.12.2', prefix: 30, adminUp: true, linkUp: true },
      { name: 'G0/1', ipv4: '192.168.30.1', prefix: 24, adminUp: true, linkUp: true },
    ], routes: [{ prefix: '192.168.10.0', prefixLength: 24, nextHop: '10.0.12.1', exitInterface: 'G0/0', source: 'static' }] });
    const remote = device({ id: 'pc-c', name: 'PC-C', type: 'host', mode: 'privileged-exec', interfaces: [{ name: 'E0', ipv4: '192.168.30.10', prefix: 24, adminUp: true, linkUp: true }], routes: [{ prefix: '0.0.0.0', prefixLength: 0, nextHop: '192.168.30.1', exitInterface: 'E0', source: 'default' }] });
    state.devices.push(r2, remote);
    state.links.push(
      { aDeviceId: 'r1', aInterface: 'G0/1', bDeviceId: 'r2', bInterface: 'G0/0' },
      { aDeviceId: 'r2', aInterface: 'G0/1', bDeviceId: 'pc-c', bInterface: 'E0' },
    );
    if (kind === 'success') r1.routes.push({ prefix: '192.168.30.0', prefixLength: 24, nextHop: '10.0.12.2', exitInterface: 'G0/1', source: 'static' });
  }
  return state;
}

export const diagnosticScenarios: DiagnosticScenario[] = [
  {
    id: 'link', context: 'LOCAL HOST CANNOT REACH NB-R1.', prompt: 'What is the first known failure?', requiredEvents: ['show-ip-interface-brief'], suggestions: ['show ip interface brief'], hints: ['Start with the local interface state.', 'Run SHOW IP INTERFACE BRIEF on NB-R1.'], correctChoiceId: 'link', createState: () => diagnosticState('link'),
    choices: [
      { id: 'link', label: 'LOCAL INTERFACE / LINK', feedback: 'Correct. The interface report establishes that the local link is down.' },
      { id: 'route', label: 'REMOTE ROUTE', feedback: 'A remote route cannot be evaluated before restoring the failed local interface.' },
      { id: 'app', label: 'APPLICATION', feedback: 'The evidence is below the application layer: the local interface is down.' },
    ],
  },
  {
    id: 'address', context: 'THE LINK IS UP, BUT THE LOCAL LAN SHOULD BE 192.168.10.0/24.', prompt: 'What configuration mismatch is visible?', requiredEvents: ['show-running-config'], suggestions: ['show '], hints: ['Inspect the configured interface address, not only its link state.', 'Run SHOW RUNNING-CONFIG and compare the /24 network with 192.168.10.0/24.'], correctChoiceId: 'address', createState: () => diagnosticState('address'),
    choices: [
      { id: 'address', label: 'INTERFACE IS ON THE WRONG /24', feedback: 'Correct. 192.168.20.1/24 does not belong to the required 192.168.10.0/24 LAN.' },
      { id: 'format', label: 'THE IPv4 FORMAT IS INVALID', feedback: 'The address is syntactically valid; its network identity is wrong for this LAN.' },
      { id: 'mac', label: 'THE MAC ADDRESS IS TOO SHORT', feedback: 'The displayed problem is an IPv4 network mismatch, not MAC formatting.' },
    ],
  },
  {
    id: 'path', context: 'LOCAL INTERFACES ARE UP. TEST REMOTE 192.168.30.10.', prompt: 'What does the combined evidence establish?', requiredEvents: ['show-ip-route', 'ping-failure:192.168.30.10'], suggestions: ['show ip ', 'ping '], hints: ['You need both the known routes and an Echo result.', 'Run SHOW IP ROUTE, then PING 192.168.30.10.'], correctChoiceId: 'path', createState: () => diagnosticState('path'),
    choices: [
      { id: 'path', label: 'NO USABLE REMOTE ROUTE IS KNOWN', feedback: 'Correct. Local checks pass, but NB-R1 has no matching route to the remote LAN.' },
      { id: 'never', label: 'THE REMOTE HOST CAN NEVER WORK', feedback: 'This state only establishes that the current route is missing; it is not permanent.' },
      { id: 'application', label: 'A SPECIFIC APPLICATION FAILED', feedback: 'ICMP and the route table do not test a particular application service.' },
    ],
  },
  {
    id: 'success', context: 'THE ROUTE IS PRESENT. TEST REMOTE 192.168.30.10 AGAIN.', prompt: 'What does the Echo Reply prove?', requiredEvents: ['ping-success:192.168.30.10'], suggestions: ['ping '], hints: ['Test the same remote IPv4 address again.', 'Run PING 192.168.30.10 and limit your conclusion to the returned evidence.'], correctChoiceId: 'roundtrip', createState: () => diagnosticState('success'),
    choices: [
      { id: 'roundtrip', label: 'THIS IP ROUND TRIP SUCCEEDED', feedback: 'Correct. The reply is evidence for this Echo exchange and path at this time.' },
      { id: 'all-apps', label: 'EVERY APPLICATION WORKS', feedback: 'Ping does not prove that every application or transport service is available.' },
      { id: 'forever', label: 'THE PATH CAN NEVER FAIL', feedback: 'A successful test is current evidence, not a permanent guarantee.' },
    ],
  },
];

export function createRoutingState(): CliNetworkState {
  return {
    devices: [
      device({ id: 'pc-a', name: 'PC-A', type: 'host', interfaces: [{ name: 'E0', ipv4: '192.168.10.10', prefix: 24, adminUp: true, linkUp: true }], routes: [{ prefix: '0.0.0.0', prefixLength: 0, nextHop: '192.168.10.1', exitInterface: 'E0', source: 'default' }] }),
      device({ id: 'r1', name: 'NB-R1', type: 'router', interfaces: [{ name: 'G0/0', ipv4: '192.168.10.1', prefix: 24, adminUp: true, linkUp: true }, { name: 'G0/1', ipv4: '10.0.12.1', prefix: 30, adminUp: true, linkUp: true }] }),
      device({ id: 'r2', name: 'NB-R2', type: 'router', interfaces: [{ name: 'G0/0', ipv4: '10.0.12.2', prefix: 30, adminUp: true, linkUp: true }, { name: 'G0/1', ipv4: '10.0.23.1', prefix: 30, adminUp: true, linkUp: true }] }),
      device({ id: 'r3', name: 'NB-R3', type: 'router', interfaces: [{ name: 'G0/0', ipv4: '10.0.23.2', prefix: 30, adminUp: true, linkUp: true }, { name: 'G0/1', ipv4: '192.168.30.1', prefix: 24, adminUp: true, linkUp: true }] }),
      device({ id: 'pc-c', name: 'PC-C', type: 'host', interfaces: [{ name: 'E0', ipv4: '192.168.30.10', prefix: 24, adminUp: true, linkUp: true }], routes: [{ prefix: '0.0.0.0', prefixLength: 0, nextHop: '192.168.30.1', exitInterface: 'E0', source: 'default' }] }),
    ],
    links: [
      { aDeviceId: 'pc-a', aInterface: 'E0', bDeviceId: 'r1', bInterface: 'G0/0' },
      { aDeviceId: 'r1', aInterface: 'G0/1', bDeviceId: 'r2', bInterface: 'G0/0' },
      { aDeviceId: 'r2', aInterface: 'G0/1', bDeviceId: 'r3', bInterface: 'G0/0' },
      { aDeviceId: 'r3', aInterface: 'G0/1', bDeviceId: 'pc-c', bInterface: 'E0' },
    ],
  };
}

export const requiredStaticRoutes = [
  { deviceId: 'r1', prefix: '192.168.30.0', prefixLength: 24, nextHop: '10.0.12.2' },
  { deviceId: 'r2', prefix: '192.168.30.0', prefixLength: 24, nextHop: '10.0.23.2' },
  { deviceId: 'r3', prefix: '192.168.10.0', prefixLength: 24, nextHop: '10.0.23.1' },
  { deviceId: 'r2', prefix: '192.168.10.0', prefixLength: 24, nextHop: '10.0.12.1' },
] as const;

const linearTopology = (ids: string[], description: string): CliTopologyLayout => ({
  description,
  height: { compact: Math.max(380, ids.length * 120), regular: 270, wide: 230 },
  compact: Object.fromEntries(ids.map((id, index) => [id, { x: 50, y: 10 + (index * 80) / Math.max(ids.length - 1, 1) }])),
  regular: Object.fromEntries(ids.map((id, index) => [id, { x: 13 + (index * 74) / Math.max(ids.length - 1, 1), y: 50 }])),
  wide: Object.fromEntries(ids.map((id, index) => [id, { x: 10 + (index * 80) / Math.max(ids.length - 1, 1), y: 50 }])),
});

const vlanTopology: CliTopologyLayout = {
  description: 'PC-A connects to NB-SW-A. NB-SW-A connects to NB-SW-B. PC-B and PC-C connect to NB-SW-B.',
  height: { compact: 540, regular: 350, wide: 300 },
  compact: { 'pc-a': { x: 50, y: 9 }, 'sw-a': { x: 50, y: 33 }, 'sw-b': { x: 50, y: 57 }, 'pc-b': { x: 27, y: 85 }, 'pc-c': { x: 73, y: 85 } },
  regular: { 'pc-a': { x: 10, y: 50 }, 'sw-a': { x: 32, y: 50 }, 'sw-b': { x: 59, y: 50 }, 'pc-b': { x: 88, y: 27 }, 'pc-c': { x: 88, y: 73 } },
  wide: { 'pc-a': { x: 9, y: 50 }, 'sw-a': { x: 31, y: 50 }, 'sw-b': { x: 59, y: 50 }, 'pc-b': { x: 89, y: 25 }, 'pc-c': { x: 89, y: 75 } },
};

const interVlanTopology: CliTopologyLayout = {
  description: 'PC-A and PC-B use separate access VLANs on NB-SW-1. NB-SW-1 connects by one trunk to router NB-R1.',
  height: { compact: 480, regular: 350, wide: 300 },
  compact: { r1: { x: 50, y: 12 }, 'sw-1': { x: 50, y: 48 }, 'pc-a': { x: 25, y: 84 }, 'pc-b': { x: 75, y: 84 } },
  regular: { r1: { x: 50, y: 18 }, 'sw-1': { x: 50, y: 54 }, 'pc-a': { x: 18, y: 82 }, 'pc-b': { x: 82, y: 82 } },
  wide: { r1: { x: 50, y: 17 }, 'sw-1': { x: 50, y: 53 }, 'pc-a': { x: 17, y: 80 }, 'pc-b': { x: 83, y: 80 } },
};

export function createVlanState(): CliNetworkState {
  const switchInterfaces = () => [1, 2, 3, 24].map((port) => ({ name: `F0/${port}`, adminUp: true, linkUp: true, switchportMode: 'access' as const, accessVlan: 1 }));
  return {
    devices: [
      device({ id: 'pc-a', name: 'PC-A', type: 'host', interfaces: [{ name: 'E0', adminUp: true, linkUp: true }] }),
      device({ id: 'sw-a', name: 'NB-SW-A', type: 'switch', interfaces: switchInterfaces(), vlans: [1] }),
      device({ id: 'sw-b', name: 'NB-SW-B', type: 'switch', interfaces: switchInterfaces(), vlans: [1] }),
      device({ id: 'pc-b', name: 'PC-B', type: 'host', interfaces: [{ name: 'E0', adminUp: true, linkUp: true }] }),
      device({ id: 'pc-c', name: 'PC-C', type: 'host', interfaces: [{ name: 'E0', adminUp: true, linkUp: true }] }),
    ],
    links: [
      { aDeviceId: 'pc-a', aInterface: 'E0', bDeviceId: 'sw-a', bInterface: 'F0/1' },
      { aDeviceId: 'sw-a', aInterface: 'F0/24', bDeviceId: 'sw-b', bInterface: 'F0/24' },
      { aDeviceId: 'pc-b', aInterface: 'E0', bDeviceId: 'sw-b', bInterface: 'F0/2' },
      { aDeviceId: 'pc-c', aInterface: 'E0', bDeviceId: 'sw-b', bInterface: 'F0/3' },
    ],
  };
}

export function createInterVlanState(): CliNetworkState {
  return {
    devices: [
      device({ id: 'pc-a', name: 'PC-A', type: 'host', interfaces: [{ name: 'E0', ipv4: '192.168.10.10', prefix: 24, adminUp: true, linkUp: true }], routes: [{ prefix: '0.0.0.0', prefixLength: 0, nextHop: '192.168.10.1', exitInterface: 'E0', source: 'default' }] }),
      device({ id: 'sw-1', name: 'NB-SW-1', type: 'switch', interfaces: [
        { name: 'F0/1', adminUp: true, linkUp: true, switchportMode: 'access', accessVlan: 10 },
        { name: 'F0/2', adminUp: true, linkUp: true, switchportMode: 'access', accessVlan: 20 },
        { name: 'F0/24', adminUp: true, linkUp: true, switchportMode: 'access', accessVlan: 1 },
      ], vlans: [1, 10, 20] }),
      device({ id: 'r1', name: 'NB-R1', type: 'router', interfaces: [
        { name: 'G0/0', adminUp: true, linkUp: true },
      ] }),
      device({ id: 'pc-b', name: 'PC-B', type: 'host', interfaces: [{ name: 'E0', ipv4: '192.168.20.20', prefix: 24, adminUp: true, linkUp: true }], routes: [{ prefix: '0.0.0.0', prefixLength: 0, nextHop: '192.168.20.1', exitInterface: 'E0', source: 'default' }] }),
    ],
    links: [
      { aDeviceId: 'pc-a', aInterface: 'E0', bDeviceId: 'sw-1', bInterface: 'F0/1' },
      { aDeviceId: 'pc-b', aInterface: 'E0', bDeviceId: 'sw-1', bInterface: 'F0/2' },
      { aDeviceId: 'sw-1', aInterface: 'F0/24', bDeviceId: 'r1', bInterface: 'G0/0' },
    ],
  };
}

export const cliLabDefinitions: Record<string, CliLabDefinition> = {
  'ping-diagnostic-desk': {
    id: 'ping-diagnostic-desk', chapterId: '8', kind: 'diagnostic', eyebrow: 'CLI MINI LAB / DIAGNOSTICS', title: 'READ THE NETWORK EVIDENCE',
    objective: 'Run the required commands, then make only the conclusion their output supports.', scopeNote: 'DETERMINISTIC STATE / NO LIVE PACKETS OR TIMING', createState: diagnosticScenarios[0].createState, diagnosticScenarios,
    topology: linearTopology(['pc-a', 'r1', 'r2', 'pc-c'], 'The diagnostic path runs from PC-A through the available routers to PC-C. Only devices present in the current scenario are shown.'),
  },
  'static-route-board': {
    id: 'static-route-board', chapterId: '9', kind: 'routing', eyebrow: 'CLI MINI LAB / STATIC ROUTING', title: 'BUILD THE FORWARD AND RETURN PATH',
    objective: 'Configure exactly four static routes, then verify both directions between PC-A and PC-C.', scopeNote: 'FIXED THREE-ROUTER TOPOLOGY / STATE-BASED VALIDATION', createState: createRoutingState,
    topology: linearTopology(['pc-a', 'r1', 'r2', 'r3', 'pc-c'], 'PC-A connects through NB-R1, NB-R2, and NB-R3 to PC-C.'),
  },
  'vlan-port-desk': {
    id: 'vlan-port-desk', chapterId: '10', kind: 'vlan', eyebrow: 'CLI MINI LAB / VLAN CONFIG', title: 'BUILD TWO VLAN PATHS',
    objective: 'Create VLAN 10 and 20, configure access ports, and carry both VLANs across the trunk.', scopeNote: 'NO STP OR INTER-VLAN ROUTING / CONFIGURATION STATE MODEL', createState: createVlanState,
    topology: vlanTopology,
  },
  'inter-vlan-routing-desk': {
    id: 'inter-vlan-routing-desk', chapterId: '12', kind: 'inter-vlan', eyebrow: 'CLI MINI LAB / ROUTER-ON-A-STICK', title: 'ROUTE BETWEEN TWO VLANs',
    objective: 'Build the VLAN 10 and VLAN 20 router trunk, configure both gateway subinterfaces, and verify both directions.', scopeNote: 'FIXED TOPOLOGY / DETERMINISTIC 802.1Q + ROUTING STATE', createState: createInterVlanState,
    topology: interVlanTopology,
  },
};
