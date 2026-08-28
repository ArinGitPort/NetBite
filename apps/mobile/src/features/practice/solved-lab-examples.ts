import { deriveCliLinkContext, executeCliCommand, parseCliCommand, prefixToSubnetMask, type CliNetworkState } from '@/core/network/cli-simulator';
import { applyTransportAction, createTransportLabState, deriveTransportTables, evaluateTransportObjective, type TransportLabState } from '@/core/network/transport-lab';
import { calculateSubnetRange } from '@/core/network/advanced-networking';
import { cliLabDefinitions, diagnosticScenarios, requiredStaticRoutes, type CliLabDefinition } from '@/features/cli/cli-lab-definitions';
import { operationsLabDefinitions, type OperationsLabDefinition, type OperationsTopologyDeviceKind } from '@/features/operations/operations-lab-definitions';
import { applySimulationConfiguration, emptyOperationsSimulationSession, evaluateSimulationObjective, operationsSimulationDefinitions, type OperationsSimulationSession, type SimulationValue } from '@/features/operations/operations-simulator';
import { practiceConfigs } from '@/features/practice/practice-configs';
import { normalizeVisibleDeviceName } from '@/shared/device-display-names';
import type { AuthoredTopologyLayout, TopologyCaptionAnchor } from '@/shared/components/topology-link-labels';

export type SolvedExampleFamily = 'topology' | 'decision' | 'switching' | 'cli' | 'transport' | 'operations' | 'capstone';
export type SolvedExampleDeviceKind = OperationsTopologyDeviceKind;

export interface SolvedExampleTopology {
  description: string;
  layout?: AuthoredTopologyLayout;
  nodes: { id: string; label: string; kind: SolvedExampleDeviceKind; detail?: string }[];
  links: { id: string; from: string; to: string; label?: string; fromInterface?: string; toInterface?: string; context?: string; state?: string }[];
}

export interface SolvedExampleSection {
  id: string;
  title: string;
  kind: 'configuration' | 'commands' | 'table' | 'trace' | 'results';
  rows: string[];
  records?: SolvedExampleRecord[];
  commandGroups?: SolvedExampleCommandGroup[];
}

export interface SolvedExampleField { label: string; value: string }
export interface SolvedExampleRecord { id: string; title: string; deviceLabel?: string; fields: SolvedExampleField[] }
export interface SolvedExampleCommandGroup { deviceLabel: string; lines: string[]; explanations?: SolvedExampleRecord[] }

export interface SolvedLabExampleSnapshot {
  labId: string;
  title: string;
  goal: string;
  family: SolvedExampleFamily;
  topology?: SolvedExampleTopology;
  sections: SolvedExampleSection[];
  explanation: { observation: string; rule: string; proves: string; nextCheck: string };
}

export interface SolvedLabExampleDefinition<TSnapshot = SolvedLabExampleSnapshot> {
  labId: string;
  version: number;
  family: SolvedExampleFamily;
  accessibilityDescription: string;
  buildSnapshot: () => TSnapshot;
  validateSnapshot: (value: unknown) => value is TSnapshot;
  describeResults: (snapshot: TSnapshot) => string[];
}

const section = (id: string, title: string, kind: SolvedExampleSection['kind'], rows: string[], extra?: Pick<SolvedExampleSection, 'records' | 'commandGroups'>): SolvedExampleSection => ({ id, title, kind, rows, ...extra });
const why = (observation: string, rule: string, proves: string, nextCheck: string) => ({ observation, rule, proves, nextCheck });

function isSnapshot(value: unknown): value is SolvedLabExampleSnapshot {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<SolvedLabExampleSnapshot>;
  return typeof item.labId === 'string' && typeof item.title === 'string' && typeof item.goal === 'string'
    && Array.isArray(item.sections) && item.sections.length > 0
    && item.sections.every((entry) => entry && Array.isArray(entry.rows) && entry.rows.length > 0)
    && Boolean(item.explanation?.observation && item.explanation.rule && item.explanation.proves && item.explanation.nextCheck);
}

const foundationStatic: Record<string, Omit<SolvedLabExampleSnapshot, 'labId'>> = {
  'first-network': {
    title: 'BUILD YOUR FIRST NETWORK', goal: 'Connect both PCs to the same switch.', family: 'topology',
    topology: { description: 'Two PCs use separate Ethernet links to one switch.', layout: { width: 680, height: 340, nodes: { 'pc-1': { x: 120, y: 92 }, 'sw-1': { x: 340, y: 244 }, 'pc-2': { x: 560, y: 92 } }, captions: { a: { kind: 'link', side: 'above', gap: 38 }, b: { kind: 'link', side: 'below', gap: 38 } } }, nodes: [{ id: 'pc-1', label: 'PC1', kind: 'pc' }, { id: 'sw-1', label: 'SW1', kind: 'switch' }, { id: 'pc-2', label: 'PC2', kind: 'pc' }], links: [{ id: 'a', from: 'pc-1', to: 'sw-1', fromInterface: 'E0', toInterface: 'F0/1', context: 'ETHERNET LINK', state: 'UP' }, { id: 'b', from: 'pc-2', to: 'sw-1', fromInterface: 'E0', toInterface: 'F0/2', context: 'ETHERNET LINK', state: 'UP' }] },
    sections: [section('configuration', 'COMPLETED CONNECTIONS', 'configuration', ['PC1 E0 → SW1 F0/1', 'PC2 E0 → SW1 F0/2']), section('trace', 'MESSAGE PATH', 'trace', ['PC1 → SW1 → PC2', 'Both PCs share one local Ethernet network.'])],
    explanation: why('Both PCs have an active link to the same switch.', 'A switch connects endpoints inside one local network.', 'The two endpoints now have a Layer 2 path.', 'Select each cable and confirm both endpoint ports.'),
  },
  'ethernet-cables': { title: 'MATCH ETHERNET CABLES', goal: 'Choose the traditional cable type for every device pair.', family: 'decision', sections: [section('answers', 'CORRECT CABLE DECISIONS', 'results', ['PC ↔ SWITCH / STRAIGHT-THROUGH', 'ROUTER ↔ SWITCH / STRAIGHT-THROUGH', 'SWITCH ↔ SWITCH / CROSSOVER']), section('reason', 'REASONS', 'trace', ['Unlike device roles use straight-through wiring.', 'Like device roles traditionally use crossover wiring.', 'Auto-MDIX can remove this manual distinction on supported ports.'])], explanation: why('Every device pair has the appropriate transmit/receive wiring.', 'Traditional Ethernet cabling pairs unlike roles straight-through and like roles crossover.', 'The links can be cabled correctly in the lab model.', 'On real equipment, verify whether auto-MDIX is available.') },
  'switch-decision-desk': { title: 'FOLLOW A SWITCH DECISION', goal: 'Learn sources first, then forward or flood from the destination lookup.', family: 'switching', topology: { description: 'PC1, PC2, and PC3 connect to one switch.', nodes: [{ id: 'a', label: 'PC1', kind: 'pc' }, { id: 'sw', label: 'SW1', kind: 'switch' }, { id: 'b', label: 'PC2', kind: 'pc' }, { id: 'c', label: 'PC3', kind: 'pc' }], links: [{ id: 'a1', from: 'a', to: 'sw', label: 'PORT 1' }, { id: 'b2', from: 'b', to: 'sw', label: 'PORT 2' }, { id: 'c3', from: 'c', to: 'sw', label: 'PORT 3' }] }, sections: [section('sequence', 'FRAME SEQUENCE', 'trace', ['1 / A→B / LEARN A ON PORT 1 / FLOOD', '2 / B→A / LEARN B ON PORT 2 / FORWARD PORT 1', '3 / C→BROADCAST / LEARN C ON PORT 3 / FLOOD PORTS 1 AND 2', '4 / A→B / REFRESH A ON PORT 1 / FORWARD PORT 2']), section('table', 'FINAL MAC TABLE', 'table', ['02:00:00:00:00:0A / PORT 1', '02:00:00:00:00:0B / PORT 2', '02:00:00:00:00:0C / PORT 3'])], explanation: why('The switch learned all three source MAC addresses.', 'A switch learns the source first, then checks the destination.', 'Known unicasts use one port while unknown unicasts and broadcasts flood eligible ports.', 'Compare the destination MAC with the final table.') },
  'layer-sorting-desk': { title: 'SORT THE OSI RESPONSIBILITIES', goal: 'Place each responsibility at the layer that owns it.', family: 'decision', sections: [section('mapping', 'COMPLETE LAYER MAP', 'results', ['7 APPLICATION / USER-FACING NETWORK SERVICES', '6 PRESENTATION / FORMAT, ENCRYPTION, COMPRESSION', '5 SESSION / DIALOG MANAGEMENT', '4 TRANSPORT / PORTS AND END-TO-END DELIVERY', '3 NETWORK / IP ADDRESSING AND ROUTING', '2 DATA LINK / FRAMES, MAC, LOCAL SWITCHING', '1 PHYSICAL / SIGNALS, MEDIA, CONNECTORS'])], explanation: why('Every responsibility is assigned to its closest OSI layer.', 'The OSI model separates networking responsibilities for discussion and troubleshooting.', 'The mapping identifies responsibility, not a literal implementation sequence.', 'Ask what information each layer adds or interprets.') },
};

function practiceSnapshot(labId: string): SolvedLabExampleSnapshot {
  const config = practiceConfigs[labId];
  if (!config) throw new Error(`No practice definition for ${labId}.`);
  return { labId, title: config.title, goal: config.objective, family: 'decision', sections: [section('decisions', 'CORRECT DECISIONS', 'results', config.stages.map((stage, index) => { const choice = stage.choices.find((entry) => entry.id === stage.correctChoiceId); return `${index + 1} / ${choice?.label ?? stage.correctChoiceId} / ${stage.result}`; })), section('reasons', 'WHY EACH DECISION IS CORRECT', 'trace', config.stages.map((stage, index) => `${index + 1} / ${stage.explanation}`))], explanation: why('Every stage uses the supplied network facts.', 'The decision must follow the addressing, subnet, gateway, ARP, or ICMP rule taught before the lab.', 'The complete sequence satisfies the lab objective.', 'Compare each supplied fact with the corresponding decision.') };
}

function cliSolvedLayout(state: CliNetworkState, definition: CliLabDefinition): AuthoredTopologyLayout {
  const mode = 'wide' as const;
  const width = definition.topology.width[mode];
  const height = definition.topology.height[mode];
  const positions = definition.topology[mode];
  const captions: Record<string, TopologyCaptionAnchor> = {};
  state.links.forEach((link, index) => {
    const liveLinkId = `${link.aDeviceId}-${link.aInterface}-${link.bDeviceId}-${link.bInterface}`;
    const anchor = definition.topology.linkCaptions?.[liveLinkId]?.[mode];
    if (anchor) captions[`link-${index}`] = anchor;
  });
  return {
    width,
    height,
    nodes: Object.fromEntries(state.devices.map((device) => {
      const point = positions[device.id];
      return [device.id, { x: width * point.x / 100, y: height * point.y / 100 }];
    })),
    captions,
  };
}

function topologyFromCli(state: CliNetworkState, definition: CliLabDefinition): SolvedExampleTopology {
  return {
    description: 'Completed fixed CLI topology. Port labels stay with device endpoints and link context uses the authored network layout.',
    layout: cliSolvedLayout(state, definition),
    nodes: state.devices.map((device) => ({ id: device.id, label: device.name, kind: device.type === 'host' ? 'pc' : device.type })),
    links: state.links.map((link, index) => {
      const context = deriveCliLinkContext(state, link);
      return {
        id: `link-${index}`, from: link.aDeviceId, to: link.bDeviceId,
        fromInterface: link.aInterface, toInterface: link.bInterface,
        context: context.kind === 'operational' ? context.networkLabel : context.label,
        state: context.kind === 'operational' ? context.label : context.tone === 'warning' ? 'ATTENTION' : 'UP',
      };
    }),
  };
}

function runCli(state: CliNetworkState, deviceId: string, commands: string[], transcript: string[]) {
  let next = state;
  for (const input of commands) {
    const parsed = parseCliCommand(input);
    if (!parsed.ok) throw new Error(`Solved example command rejected: ${input}`);
    const prompt = next.devices.find((device) => device.id === deviceId)?.name ?? deviceId;
    const result = executeCliCommand(next, deviceId, parsed.command);
    if (!result.accepted) throw new Error(`Solved example command unavailable: ${input}`);
    transcript.push(`${prompt}> ${input}`, ...result.output.map(({ text }) => text));
    next = result.state;
  }
  return next;
}

function cliSnapshot(labId: string): SolvedLabExampleSnapshot {
  const definition = cliLabDefinitions[labId];
  if (!definition) throw new Error(`No CLI definition for ${labId}.`);
  if (definition.kind === 'diagnostic') {
    const rows = diagnosticScenarios.flatMap((scenario, index) => [`SCENARIO ${index + 1} / ${scenario.context}`, ...scenario.suggestions.map((command) => `COMMAND / ${command}`), `CONCLUSION / ${scenario.choices.find((choice) => choice.id === scenario.correctChoiceId)?.label}`]);
    return { labId, title: definition.title, goal: definition.objective, family: 'cli', topology: topologyFromCli(diagnosticScenarios.at(-1)!.createState(), definition), sections: [section('commands', 'SUPPORTED COMMAND EVIDENCE', 'commands', rows), section('results', 'VERIFICATION', 'results', diagnosticScenarios.map((scenario) => scenario.choices.find((choice) => choice.id === scenario.correctChoiceId)?.feedback ?? scenario.correctChoiceId))], explanation: why('Each conclusion is limited to the displayed CLI evidence.', 'Diagnostic commands reveal specific state but do not prove unrelated causes.', 'All four scenarios have the required evidence and supported conclusion.', 'Read the command output before choosing the conclusion.') };
  }
  let state = definition.createState();
  const transcript: string[] = [];
  if (definition.kind === 'routing') {
    for (const deviceId of [...new Set(requiredStaticRoutes.map(({ deviceId }) => deviceId))]) {
      const commands = requiredStaticRoutes.filter((route) => route.deviceId === deviceId).map((route) => `ip route ${route.prefix} 255.255.255.0 ${route.nextHop}`);
      state = runCli(state, deviceId, ['enable', 'configure terminal', ...commands, 'end', 'show ip route'], transcript);
    }
    state = runCli(state, 'pc-a', ['ping 192.168.30.10'], transcript);
    state = runCli(state, 'pc-c', ['ping 192.168.10.10'], transcript);
  } else if (definition.kind === 'vlan') {
    state = runCli(state, 'sw-a', ['enable', 'configure terminal', 'vlan 10', 'exit', 'vlan 20', 'exit', 'interface F0/1', 'switchport mode access', 'switchport access vlan 10', 'exit', 'interface F0/24', 'switchport mode trunk', 'switchport trunk allowed vlan 10,20', 'end', 'show vlan brief', 'show interfaces trunk'], transcript);
    state = runCli(state, 'sw-b', ['enable', 'configure terminal', 'vlan 10', 'exit', 'vlan 20', 'exit', 'interface F0/2', 'switchport mode access', 'switchport access vlan 10', 'exit', 'interface F0/3', 'switchport mode access', 'switchport access vlan 20', 'exit', 'interface F0/24', 'switchport mode trunk', 'switchport trunk allowed vlan 10,20', 'end', 'show vlan brief', 'show interfaces trunk'], transcript);
  } else {
    state = runCli(state, 'sw-1', ['enable', 'configure terminal', 'interface F0/24', 'switchport mode trunk', 'switchport trunk allowed vlan 10,20', 'end', 'show interfaces trunk'], transcript);
    state = runCli(state, 'r1', ['enable', 'configure terminal', 'interface G0/0', 'no shutdown', 'exit', 'interface G0/0.10', 'encapsulation dot1q 10', 'ip address 192.168.10.1 255.255.255.0', 'exit', 'interface G0/0.20', 'encapsulation dot1q 20', 'ip address 192.168.20.1 255.255.255.0', 'end', 'show ip interface brief', 'show ip route'], transcript);
    state = runCli(state, 'pc-a', ['ping 192.168.20.20'], transcript);
    state = runCli(state, 'pc-b', ['ping 192.168.10.10'], transcript);
  }
  const configurationRecords = cliConfigurationRecords(state);
  const commandGroups = cliCommandGroups(state, transcript);
  const verification = definition.kind === 'routing'
    ? ['PC1 TO PC3 — SUCCESS', 'PC3 TO PC1 — SUCCESS', 'FOUR REQUIRED STATIC ROUTES PRESENT']
    : definition.kind === 'vlan'
      ? ['VLAN 10 AND VLAN 20 PRESENT', 'ACCESS PORTS ASSIGNED', 'BOTH TRUNKS ALLOW VLAN 10 AND VLAN 20']
      : ['G0/0.10 SERVES VLAN 10 AT 192.168.10.1/24', 'G0/0.20 SERVES VLAN 20 AT 192.168.20.1/24', 'BIDIRECTIONAL INTER-VLAN PING — SUCCESS'];
  return {
    labId, title: definition.title, goal: definition.objective, family: 'cli', topology: topologyFromCli(state, definition),
    sections: [
      section('configuration', 'FINAL DEVICE CONFIGURATION', 'configuration', ['Select a device to inspect its completed interfaces, routes, and VLAN state.'], { records: configurationRecords }),
      section('transcript', 'COMMAND TRANSCRIPT', 'commands', transcript, { commandGroups }),
      section('verification', 'RESULTING EVIDENCE', 'results', verification),
    ],
    explanation: why('The accepted commands produced the displayed device state.', 'Verification is derived from configuration, routes, VLAN context, and forward and return paths.', 'The completed state satisfies the lab requirements.', 'Compare the configuration first, then its verification evidence.'),
  };
}

function transportSnapshot(): SolvedLabExampleSnapshot {
  let state: TransportLabState = createTransportLabState();
  const actions = [
    { type: 'configure', client: state.client, server: state.server, protocol: 'tcp', listener: state.listener }, { type: 'verify-endpoints' }, { type: 'send-syn' }, { type: 'send-syn-ack' }, { type: 'send-final-ack' }, { type: 'arm-data-drop' }, { type: 'send-data' }, { type: 'retransmit-data' }, { type: 'acknowledge-data' }, { type: 'prepare-udp' },
  ] as const;
  for (const action of actions) { const result = applyTransportAction(state, action); if (!result.accepted) throw new Error(result.error); state = result.state; }
  let result = applyTransportAction(state, { type: 'configure', client: state.client, server: state.server, protocol: 'udp', listener: state.listener }); state = result.state;
  result = applyTransportAction(state, { type: 'send-udp' }); state = result.state;
  result = applyTransportAction(state, { type: 'drop-udp' }); state = result.state;
  if (!evaluateTransportObjective(state).complete) throw new Error('Transport solved state is incomplete.');
  const tables = deriveTransportTables(state);
  return { labId: 'transport-service-desk', title: 'BUILD TRANSPORT EXCHANGES', goal: 'Configure endpoints, complete TCP recovery, then compare UDP.', family: 'transport', topology: { description: 'Client traffic crosses an IP-forwarding router to an application server.', layout: { width: 720, height: 280, nodes: { client: { x: 100, y: 140 }, network: { x: 360, y: 140 }, server: { x: 620, y: 140 } }, captions: {} }, nodes: [{ id: 'client', label: 'PC1', kind: 'pc', detail: `${state.client.address}:${state.client.port}` }, { id: 'network', label: 'R1', kind: 'router', detail: 'IP FORWARDER' }, { id: 'server', label: 'WEB1', kind: 'server', detail: `${state.server.address}:${state.server.port}` }], links: [{ id: 'one', from: 'client', to: 'network', fromInterface: 'E0', toInterface: 'G0/0', state: 'UP' }, { id: 'two', from: 'network', to: 'server', fromInterface: 'G0/1', toInterface: 'E0', state: 'UP' }] }, sections: [section('configuration', 'ENDPOINT CONFIGURATION', 'configuration', [...tables.endpoints, ...tables.listeners]), section('state', 'FINAL CONNECTION STATUS', 'table', tables.connection), section('trace', 'EVENT TRACE', 'trace', state.evidence.map((entry) => entry.text))], explanation: state.lastExplanation };
}

function operationsSolvedLayout(topology: OperationsLabDefinition['visualTopology']): AuthoredTopologyLayout {
  const integrated = topology.nodes.length > 6;
  const width = Math.max(760, topology.nodes.length * (integrated ? 230 : 210));
  const height = integrated ? 560 : 360;
  return {
    width,
    height,
    nodes: Object.fromEntries(topology.nodes.map((node) => [node.id, { x: width * node.wide.x / 100, y: height * node.wide.y / 100 }])),
    captions: {},
  };
}

function operationsSnapshot(labId: string): SolvedLabExampleSnapshot {
  const definition = operationsSimulationDefinitions[labId];
  const authored = operationsLabDefinitions[labId];
  if (!definition || !authored) throw new Error(`No Operations definition for ${labId}.`);
  let session: OperationsSimulationSession = emptyOperationsSimulationSession();
  const evidence: string[] = [];
  const tables: string[] = [];
  for (const stage of definition.stages) {
    const draft = Object.fromEntries(stage.fields.map((field) => [field.id, field.expected])) as Record<string, SimulationValue>;
    const configured = applySimulationConfiguration(session, stage, draft);
    if (!configured.accepted) throw new Error(configured.error);
    session = configured.session;
    const authoredStage = authored.stages.find((item) => item.id === stage.id);
    const result = evaluateSimulationObjective(labId, stage, session, authoredStage?.explanation ?? authored.stages[0].explanation);
    if (!result.accepted || !result.passed) throw new Error(`Solved ${labId}/${stage.id} did not validate: ${result.message}`);
    session = { ...session, configuration: { ...session.configuration }, completedObjectiveIds: [...session.completedObjectiveIds, stage.id], stageIndex: session.stageIndex + 1, evidence: result.evidence, tables: { ...session.tables, [stage.id]: result.tableRows }, lastResult: result, protocolState: result.protocolState ?? session.protocolState };
    evidence.push(`${stage.actionLabel.toUpperCase()} / ${result.message}`, ...result.evidence.map((entry) => entry.text));
    tables.push(...result.tableRows.map((row) => `${stage.id.toUpperCase()} / ${row}`));
  }
  const topology = authored.visualTopology;
  const explanation = session.lastResult?.explanation ?? authored.stages.at(-1)!.explanation;
  return { labId, title: authored.title, goal: authored.briefing.goal, family: labId === 'network-operations-capstone' ? 'capstone' : 'operations', topology: { description: topology.description, layout: operationsSolvedLayout(topology), nodes: topology.nodes.map((node) => ({ id: node.id, label: node.label, kind: node.kind, detail: node.detail })), links: topology.links.map((link) => ({ id: link.id, from: link.a, to: link.b, fromInterface: link.aPort, toInterface: link.bPort, state: 'UP' })) }, sections: [section('configuration', 'CORRECT CONFIGURATION', 'configuration', Object.entries(session.configuration).map(([key, value]) => `${key.replaceAll('.', ' ').replace(/([A-Z])/g, ' $1').toUpperCase()}    ${String(value).toUpperCase()}`)), section('tables', authored.tableTitle, 'table', tables.length ? tables : ['NO ADDITIONAL TABLE ROWS']), section('trace', 'VERIFICATION RESULTS', 'trace', evidence)], explanation: { observation: explanation.observation, rule: explanation.rule, proves: explanation.proves, nextCheck: explanation.nextCheck ?? 'Compare the test results with the completed objective.' } };
}

const practiceIds = ['ipv4-configurator', 'subnet-range-desk', 'gateway-forwarding-desk', 'arp-resolution-desk'] as const;
const cliIds = ['ping-diagnostic-desk', 'static-route-board', 'vlan-port-desk', 'inter-vlan-routing-desk'] as const;
const operationsIds = ['dhcp-lease-desk', 'dns-resolution-desk', 'acl-policy-desk', 'nat-translation-desk', 'ipv6-address-desk', 'ipv6-neighbor-desk', 'spanning-tree-desk', 'etherchannel-desk', 'route-source-desk', 'ospf-area-desk', 'network-operations-capstone'] as const;

const definitions: SolvedLabExampleDefinition[] = [
  ...Object.keys(foundationStatic).map((labId): SolvedLabExampleDefinition => ({ labId, version: 1, family: foundationStatic[labId].family, accessibilityDescription: `Read-only solved example for ${foundationStatic[labId].title}.`, buildSnapshot: () => ({ labId, ...foundationStatic[labId] }), validateSnapshot: isSnapshot, describeResults: (snapshot) => snapshot.sections.flatMap((entry) => entry.rows) })),
  ...practiceIds.map((labId): SolvedLabExampleDefinition => ({ labId, version: 1, family: 'decision', accessibilityDescription: `Read-only solved decisions for ${labId}.`, buildSnapshot: () => practiceSnapshot(labId), validateSnapshot: isSnapshot, describeResults: (snapshot) => snapshot.sections.flatMap((entry) => entry.rows) })),
  ...cliIds.map((labId): SolvedLabExampleDefinition => ({ labId, version: 1, family: 'cli', accessibilityDescription: `Read-only solved CLI configuration and verification for ${labId}.`, buildSnapshot: () => cliSnapshot(labId), validateSnapshot: isSnapshot, describeResults: (snapshot) => snapshot.sections.flatMap((entry) => entry.rows) })),
  { labId: 'transport-service-desk', version: 1, family: 'transport', accessibilityDescription: 'Read-only completed TCP recovery and UDP comparison.', buildSnapshot: transportSnapshot, validateSnapshot: isSnapshot, describeResults: (snapshot) => snapshot.sections.flatMap((entry) => entry.rows) },
  ...operationsIds.map((labId): SolvedLabExampleDefinition => ({ labId, version: 1, family: labId === 'network-operations-capstone' ? 'capstone' : 'operations', accessibilityDescription: `Read-only completed configuration for ${labId}.`, buildSnapshot: () => operationsSnapshot(labId), validateSnapshot: isSnapshot, describeResults: (snapshot) => snapshot.sections.flatMap((entry) => entry.rows) })),
];

export const solvedLabExampleDefinitions: Readonly<Record<string, SolvedLabExampleDefinition>> = Object.freeze(Object.fromEntries(definitions.map((definition) => [definition.labId, definition])));

export function getSolvedLabExample(labId: string) { return solvedLabExampleDefinitions[labId]; }
export function validateSolvedLabExample(labId: string, value: unknown) { return Boolean(getSolvedLabExample(labId)?.validateSnapshot(value)); }
export function buildSolvedLabExample(labId: string) {
  const definition = getSolvedLabExample(labId);
  if (!definition) return undefined;
  const snapshot = normalizeSnapshot(definition.buildSnapshot());
  if (!definition.validateSnapshot(snapshot)) throw new Error(`Solved example ${labId} failed validation.`);
  return snapshot;
}

function cliConfigurationRecords(state: CliNetworkState): SolvedExampleRecord[] {
  return state.devices.flatMap((device) => {
    const interfaces: SolvedExampleRecord[] = device.interfaces.map((item) => {
      const range = item.ipv4 && item.prefix !== undefined ? calculateSubnetRange(item.ipv4, item.prefix) : undefined;
      const fields: SolvedExampleField[] = [
        { label: 'Device', value: device.name },
        { label: 'State', value: item.adminUp && item.linkUp ? 'Up' : 'Down' },
      ];
      if (item.ipv4 && item.prefix !== undefined) fields.splice(1, 0,
        { label: 'IPv4 address', value: item.ipv4 },
        { label: 'Prefix length', value: `/${item.prefix}` },
        { label: 'Subnet mask', value: prefixToSubnetMask(item.prefix) ?? 'Invalid prefix' },
        { label: 'Network', value: range ? `${range.network}/${item.prefix}` : 'Invalid address' },
      );
      if (item.parentInterface) fields.push({ label: 'Physical parent', value: item.parentInterface });
      if (item.encapsulationVlan !== undefined) fields.push({ label: '802.1Q VLAN', value: String(item.encapsulationVlan) });
      if (item.switchportMode) fields.push({ label: 'Switchport mode', value: item.switchportMode === 'access' ? 'Access' : 'Trunk' });
      if (item.switchportMode === 'access') fields.push({ label: 'Access VLAN', value: String(item.accessVlan ?? 'Not configured') });
      if (item.switchportMode === 'trunk') fields.push({ label: 'Allowed VLANs', value: item.allowedVlans?.join(', ') || 'Not configured' });
      return { id: `${device.id}-interface-${item.name}`, title: `INTERFACE ${item.name}`, deviceLabel: device.name, fields };
    });
    const routes = device.routes.filter((route) => route.source === 'static').map((route, index): SolvedExampleRecord => ({
      id: `${device.id}-route-${index}`, title: 'STATIC ROUTE', deviceLabel: device.name,
      fields: [
        { label: 'Device', value: device.name },
        { label: 'Destination', value: `${route.prefix}/${route.prefixLength}` },
        { label: 'Subnet mask', value: prefixToSubnetMask(route.prefixLength) ?? 'Invalid prefix' },
        { label: 'Next hop', value: route.nextHop ?? 'Directly connected' },
      ],
    }));
    const vlans = device.vlans.filter((vlan) => vlan !== 1).map((vlan): SolvedExampleRecord => ({
      id: `${device.id}-vlan-${vlan}`, title: `VLAN ${vlan}`, deviceLabel: device.name,
      fields: [{ label: 'Device', value: device.name }, { label: 'Status', value: 'Available' }],
    }));
    return [...interfaces, ...routes, ...vlans];
  });
}

function cliCommandGroups(state: CliNetworkState, transcript: string[]): SolvedExampleCommandGroup[] {
  const groups = new Map<string, string[]>();
  let current = state.devices[0]?.name ?? 'DEVICE';
  for (const line of transcript) {
    const promptDevice = state.devices.find((device) => line.startsWith(`${device.name}>`));
    if (promptDevice) current = promptDevice.name;
    groups.set(current, [...(groups.get(current) ?? []), line]);
  }
  return [...groups].map(([deviceLabel, lines]) => ({
    deviceLabel,
    lines,
    explanations: lines.flatMap((line, index) => {
      const match = line.match(/^\S+>\s+ip route\s+(\S+)\s+(\S+)\s+(\S+)$/i);
      return match ? [{
        id: `${deviceLabel}-route-command-${index}`, title: 'STATIC ROUTE COMMAND', deviceLabel,
        fields: [
          { label: 'Destination network', value: match[1] },
          { label: 'Subnet mask', value: match[2] },
          { label: 'Next hop', value: match[3] },
        ],
      }] : [];
    }),
  }));
}
export function deriveSolvedExampleSections(snapshot: SolvedLabExampleSnapshot) { return snapshot.sections; }

function normalizeSnapshot(snapshot: SolvedLabExampleSnapshot): SolvedLabExampleSnapshot {
  const text = (value: string) => normalizeVisibleDeviceName(value)
    .replaceAll('\u00e2\u2020\u2019', '\u2192')
    .replaceAll('\u00e2\u2020\u201d', '\u2194')
    .replaceAll('\u00e2\u20ac\u201d', '\u2014');
  return {
    ...snapshot,
    title: text(snapshot.title),
    goal: text(snapshot.goal),
    topology: snapshot.topology ? {
      ...snapshot.topology,
      description: text(snapshot.topology.description),
      nodes: snapshot.topology.nodes.map((node) => ({ ...node, label: text(node.label), detail: node.detail ? text(node.detail) : undefined })),
      links: snapshot.topology.links.map((link) => ({ ...link, label: link.label ? text(link.label) : undefined })),
    } : undefined,
    sections: snapshot.sections.map((entry) => ({
      ...entry,
      title: text(entry.title),
      rows: entry.rows.map(text),
      records: entry.records?.map((record) => ({ ...record, title: text(record.title), deviceLabel: record.deviceLabel ? text(record.deviceLabel) : undefined, fields: record.fields.map((field) => ({ label: text(field.label), value: text(field.value) })) })),
      commandGroups: entry.commandGroups?.map((group) => ({ ...group, deviceLabel: text(group.deviceLabel), lines: group.lines.map(text), explanations: group.explanations?.map((record) => ({ ...record, title: text(record.title), deviceLabel: record.deviceLabel ? text(record.deviceLabel) : undefined, fields: record.fields.map((field) => ({ label: text(field.label), value: text(field.value) })) })) })),
    })),
    explanation: {
      observation: text(snapshot.explanation.observation), rule: text(snapshot.explanation.rule), proves: text(snapshot.explanation.proves), nextCheck: text(snapshot.explanation.nextCheck),
    },
  };
}
