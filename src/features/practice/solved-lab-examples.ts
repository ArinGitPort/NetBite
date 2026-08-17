import { executeCliCommand, parseCliCommand, type CliNetworkState } from '@/core/network/cli-simulator';
import { applyTransportAction, createTransportLabState, deriveTransportTables, evaluateTransportObjective, type TransportLabState } from '@/core/network/transport-lab';
import { cliLabDefinitions, diagnosticScenarios, requiredStaticRoutes } from '@/features/cli/cli-lab-definitions';
import { operationsLabDefinitions, type OperationsTopologyDeviceKind } from '@/features/operations/operations-lab-definitions';
import { applySimulationConfiguration, emptyOperationsSimulationSession, evaluateSimulationObjective, operationsSimulationDefinitions, type OperationsSimulationSession, type SimulationValue } from '@/features/operations/operations-simulator';
import { practiceConfigs } from '@/features/practice/practice-configs';

export type SolvedExampleFamily = 'topology' | 'decision' | 'switching' | 'cli' | 'transport' | 'operations' | 'capstone';
export type SolvedExampleDeviceKind = OperationsTopologyDeviceKind;

export interface SolvedExampleTopology {
  description: string;
  nodes: { id: string; label: string; kind: SolvedExampleDeviceKind; detail?: string }[];
  links: { id: string; from: string; to: string; label?: string }[];
}

export interface SolvedExampleSection {
  id: string;
  title: string;
  kind: 'configuration' | 'commands' | 'table' | 'trace' | 'results';
  rows: string[];
}

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

const section = (id: string, title: string, kind: SolvedExampleSection['kind'], rows: string[]): SolvedExampleSection => ({ id, title, kind, rows });
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
    topology: { description: 'Two PCs use separate Ethernet links to one switch.', nodes: [{ id: 'pc-1', label: 'PC 1', kind: 'pc' }, { id: 'sw-1', label: 'SWITCH 1', kind: 'switch' }, { id: 'pc-2', label: 'PC 2', kind: 'pc' }], links: [{ id: 'a', from: 'pc-1', to: 'sw-1', label: 'E0 — F0/1' }, { id: 'b', from: 'pc-2', to: 'sw-1', label: 'E0 — F0/2' }] },
    sections: [section('configuration', 'COMPLETED CONNECTIONS', 'configuration', ['PC 1 E0 → SWITCH 1 F0/1', 'PC 2 E0 → SWITCH 1 F0/2']), section('trace', 'MESSAGE PATH', 'trace', ['PC 1 → SWITCH 1 → PC 2', 'Both PCs share one local Ethernet network.'])],
    explanation: why('Both PCs have an active link to the same switch.', 'A switch connects endpoints inside one local network.', 'The two endpoints now have a Layer 2 path.', 'Select each cable and confirm both endpoint ports.'),
  },
  'ethernet-cables': { title: 'MATCH ETHERNET CABLES', goal: 'Choose the traditional cable type for every device pair.', family: 'decision', sections: [section('answers', 'CORRECT CABLE DECISIONS', 'results', ['PC ↔ SWITCH / STRAIGHT-THROUGH', 'ROUTER ↔ SWITCH / STRAIGHT-THROUGH', 'SWITCH ↔ SWITCH / CROSSOVER']), section('reason', 'REASONS', 'trace', ['Unlike device roles use straight-through wiring.', 'Like device roles traditionally use crossover wiring.', 'Auto-MDIX can remove this manual distinction on supported ports.'])], explanation: why('Every device pair has the appropriate transmit/receive wiring.', 'Traditional Ethernet cabling pairs unlike roles straight-through and like roles crossover.', 'The links can be cabled correctly in the lab model.', 'On real equipment, verify whether auto-MDIX is available.') },
  'switch-decision-desk': { title: 'FOLLOW A SWITCH DECISION', goal: 'Learn sources first, then forward or flood from the destination lookup.', family: 'switching', topology: { description: 'PC-A, PC-B, and PC-C connect to one switch.', nodes: [{ id: 'a', label: 'PC-A', kind: 'pc' }, { id: 'sw', label: 'SW-1', kind: 'switch' }, { id: 'b', label: 'PC-B', kind: 'pc' }, { id: 'c', label: 'PC-C', kind: 'pc' }], links: [{ id: 'a1', from: 'a', to: 'sw', label: 'PORT 1' }, { id: 'b2', from: 'b', to: 'sw', label: 'PORT 2' }, { id: 'c3', from: 'c', to: 'sw', label: 'PORT 3' }] }, sections: [section('sequence', 'FRAME SEQUENCE', 'trace', ['1 / A→B / LEARN A ON PORT 1 / FLOOD', '2 / B→A / LEARN B ON PORT 2 / FORWARD PORT 1', '3 / C→BROADCAST / LEARN C ON PORT 3 / FLOOD PORTS 1 AND 2', '4 / A→B / REFRESH A ON PORT 1 / FORWARD PORT 2']), section('table', 'FINAL MAC TABLE', 'table', ['02:00:00:00:00:0A / PORT 1', '02:00:00:00:00:0B / PORT 2', '02:00:00:00:00:0C / PORT 3'])], explanation: why('The switch learned all three source MAC addresses.', 'A switch learns the source first, then checks the destination.', 'Known unicasts use one port while unknown unicasts and broadcasts flood eligible ports.', 'Compare the destination MAC with the final table.') },
  'layer-sorting-desk': { title: 'SORT THE OSI RESPONSIBILITIES', goal: 'Place each responsibility at the layer that owns it.', family: 'decision', sections: [section('mapping', 'COMPLETE LAYER MAP', 'results', ['7 APPLICATION / USER-FACING NETWORK SERVICES', '6 PRESENTATION / FORMAT, ENCRYPTION, COMPRESSION', '5 SESSION / DIALOG MANAGEMENT', '4 TRANSPORT / PORTS AND END-TO-END DELIVERY', '3 NETWORK / IP ADDRESSING AND ROUTING', '2 DATA LINK / FRAMES, MAC, LOCAL SWITCHING', '1 PHYSICAL / SIGNALS, MEDIA, CONNECTORS'])], explanation: why('Every responsibility is assigned to its closest OSI layer.', 'The OSI model separates networking responsibilities for discussion and troubleshooting.', 'The mapping identifies responsibility, not a literal implementation sequence.', 'Ask what information each layer adds or interprets.') },
};

function practiceSnapshot(labId: string): SolvedLabExampleSnapshot {
  const config = practiceConfigs[labId];
  if (!config) throw new Error(`No practice definition for ${labId}.`);
  return { labId, title: config.title, goal: config.objective, family: 'decision', sections: [section('decisions', 'CORRECT DECISIONS', 'results', config.stages.map((stage, index) => { const choice = stage.choices.find((entry) => entry.id === stage.correctChoiceId); return `${index + 1} / ${choice?.label ?? stage.correctChoiceId} / ${stage.result}`; })), section('reasons', 'WHY EACH DECISION IS CORRECT', 'trace', config.stages.map((stage, index) => `${index + 1} / ${stage.explanation}`))], explanation: why('Every stage uses the supplied network facts.', 'The decision must follow the addressing, subnet, gateway, ARP, or ICMP rule taught before the lab.', 'The complete sequence satisfies the lab objective.', 'Compare each supplied fact with the corresponding decision.') };
}

function topologyFromCli(state: CliNetworkState): SolvedExampleTopology {
  return { description: 'Completed fixed CLI topology.', nodes: state.devices.map((device) => ({ id: device.id, label: device.name, kind: device.type === 'host' ? 'pc' : device.type, detail: device.interfaces.map((item) => `${item.name}${item.ipv4 ? ` ${item.ipv4}/${item.prefix}` : ''}`).join(' / ') })), links: state.links.map((link, index) => ({ id: `link-${index}`, from: link.aDeviceId, to: link.bDeviceId, label: `${link.aInterface} — ${link.bInterface}` })) };
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
    return { labId, title: definition.title, goal: definition.objective, family: 'cli', topology: topologyFromCli(diagnosticScenarios.at(-1)!.createState()), sections: [section('commands', 'SUPPORTED COMMAND EVIDENCE', 'commands', rows), section('results', 'VERIFICATION', 'results', diagnosticScenarios.map((scenario) => scenario.choices.find((choice) => choice.id === scenario.correctChoiceId)?.feedback ?? scenario.correctChoiceId))], explanation: why('Each conclusion is limited to the displayed CLI evidence.', 'Diagnostic commands reveal specific state but do not prove unrelated causes.', 'All four scenarios have the required evidence and supported conclusion.', 'Read the command output before choosing the conclusion.') };
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
  const configuration = state.devices.flatMap((device) => [`${device.name} / MODE ${device.mode.toUpperCase()}`, ...device.interfaces.map((item) => `${item.name} / ${item.ipv4 ? `${item.ipv4}/${item.prefix}` : item.switchportMode?.toUpperCase() ?? 'UP'}${item.accessVlan ? ` / VLAN ${item.accessVlan}` : ''}${item.allowedVlans ? ` / ALLOWED ${item.allowedVlans.join(',')}` : ''}`), ...device.routes.filter((route) => route.source === 'static').map((route) => `ROUTE ${route.prefix}/${route.prefixLength} VIA ${route.nextHop}`)]);
  return { labId, title: definition.title, goal: definition.objective, family: 'cli', topology: topologyFromCli(state), sections: [section('configuration', 'FINAL DEVICE CONFIGURATION', 'configuration', configuration), section('transcript', 'COMMAND TRANSCRIPT', 'commands', transcript), section('verification', 'RESULTING EVIDENCE', 'results', definition.kind === 'routing' ? ['PC-A → PC-C / SUCCESS', 'PC-C → PC-A / SUCCESS', 'FOUR REQUIRED STATIC ROUTES PRESENT'] : definition.kind === 'vlan' ? ['VLAN 10 AND 20 PRESENT', 'ACCESS PORTS ASSIGNED', 'BOTH TRUNKS ALLOW VLAN 10 AND 20'] : ['G0/0.10 / VLAN 10 / 192.168.10.1/24', 'G0/0.20 / VLAN 20 / 192.168.20.1/24', 'BIDIRECTIONAL INTER-VLAN PING / SUCCESS'])], explanation: why('The accepted commands produced the displayed device state.', 'Verification is derived from configuration, routes, VLAN context, and forward/return paths.', 'The completed state satisfies the lab requirements.', 'Compare the configuration first, then its verification evidence.') };
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
  return { labId: 'transport-service-desk', title: 'BUILD TRANSPORT EXCHANGES', goal: 'Configure endpoints, complete TCP recovery, then compare UDP.', family: 'transport', topology: { description: 'Client traffic crosses an IP-forwarding router to an application server.', nodes: [{ id: 'client', label: 'CLIENT PC', kind: 'pc', detail: `${state.client.address}:${state.client.port}` }, { id: 'network', label: 'R-1', kind: 'router', detail: 'IP FORWARDER' }, { id: 'server', label: 'APPLICATION SERVER', kind: 'server', detail: `${state.server.address}:${state.server.port}` }], links: [{ id: 'one', from: 'client', to: 'network' }, { id: 'two', from: 'network', to: 'server' }] }, sections: [section('configuration', 'ENDPOINT CONFIGURATION', 'configuration', [...tables.endpoints, ...tables.listeners]), section('state', 'FINAL PROTOCOL STATE', 'table', tables.connection), section('trace', 'EVENT TRACE', 'trace', state.evidence.map((entry) => entry.text))], explanation: state.lastExplanation };
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
  return { labId, title: authored.title, goal: authored.briefing.goal, family: labId === 'network-operations-capstone' ? 'capstone' : 'operations', topology: { description: topology.description, nodes: topology.nodes.map((node) => ({ id: node.id, label: node.label, kind: node.kind, detail: node.detail })), links: topology.links.map((link) => ({ id: link.id, from: link.a, to: link.b, label: `${link.aPort} - ${link.bPort}` })) }, sections: [section('configuration', 'CORRECT CONFIGURATION', 'configuration', Object.entries(session.configuration).map(([key, value]) => `${key.toUpperCase()} / ${String(value).toUpperCase()}`)), section('tables', authored.tableTitle, 'table', tables.length ? tables : ['NO ADDITIONAL TABLE ROWS']), section('trace', 'VERIFICATION EVIDENCE', 'trace', evidence)], explanation: { observation: explanation.observation, rule: explanation.rule, proves: explanation.proves, nextCheck: explanation.nextCheck ?? 'Compare the current evidence with the completed objective.' } };
}

const practiceIds = ['ipv4-configurator', 'subnet-range-desk', 'gateway-forwarding-desk', 'arp-resolution-desk'] as const;
const cliIds = ['ping-diagnostic-desk', 'static-route-board', 'vlan-port-desk', 'inter-vlan-routing-desk'] as const;
const operationsIds = ['dhcp-lease-desk', 'dns-resolution-desk', 'acl-policy-desk', 'nat-translation-desk', 'ipv6-address-desk', 'ipv6-neighbor-desk', 'spanning-tree-desk', 'etherchannel-desk', 'route-source-desk', 'ospf-area-desk', 'network-operations-capstone'] as const;

const definitions: SolvedLabExampleDefinition[] = [
  ...Object.keys(foundationStatic).map((labId): SolvedLabExampleDefinition => ({ labId, version: 1, family: foundationStatic[labId].family, accessibilityDescription: `Read-only solved example for ${foundationStatic[labId].title}.`, buildSnapshot: () => ({ labId, ...foundationStatic[labId] }), validateSnapshot: isSnapshot, describeResults: (snapshot) => snapshot.sections.flatMap((entry) => entry.rows) })),
  ...practiceIds.map((labId): SolvedLabExampleDefinition => ({ labId, version: 1, family: 'decision', accessibilityDescription: `Read-only solved decisions for ${labId}.`, buildSnapshot: () => practiceSnapshot(labId), validateSnapshot: isSnapshot, describeResults: (snapshot) => snapshot.sections.flatMap((entry) => entry.rows) })),
  ...cliIds.map((labId): SolvedLabExampleDefinition => ({ labId, version: 1, family: 'cli', accessibilityDescription: `Read-only solved CLI configuration and verification for ${labId}.`, buildSnapshot: () => cliSnapshot(labId), validateSnapshot: isSnapshot, describeResults: (snapshot) => snapshot.sections.flatMap((entry) => entry.rows) })),
  { labId: 'transport-service-desk', version: 1, family: 'transport', accessibilityDescription: 'Read-only completed TCP recovery and UDP comparison.', buildSnapshot: transportSnapshot, validateSnapshot: isSnapshot, describeResults: (snapshot) => snapshot.sections.flatMap((entry) => entry.rows) },
  ...operationsIds.map((labId): SolvedLabExampleDefinition => ({ labId, version: 1, family: labId === 'network-operations-capstone' ? 'capstone' : 'operations', accessibilityDescription: `Read-only solved protocol state for ${labId}.`, buildSnapshot: () => operationsSnapshot(labId), validateSnapshot: isSnapshot, describeResults: (snapshot) => snapshot.sections.flatMap((entry) => entry.rows) })),
];

export const solvedLabExampleDefinitions: Readonly<Record<string, SolvedLabExampleDefinition>> = Object.freeze(Object.fromEntries(definitions.map((definition) => [definition.labId, definition])));

export function getSolvedLabExample(labId: string) { return solvedLabExampleDefinitions[labId]; }
export function validateSolvedLabExample(labId: string, value: unknown) { return Boolean(getSolvedLabExample(labId)?.validateSnapshot(value)); }
export function buildSolvedLabExample(labId: string) {
  const definition = getSolvedLabExample(labId);
  if (!definition) return undefined;
  const snapshot = definition.buildSnapshot();
  if (!definition.validateSnapshot(snapshot)) throw new Error(`Solved example ${labId} failed validation.`);
  return snapshot;
}
export function deriveSolvedExampleSections(snapshot: SolvedLabExampleSnapshot) { return snapshot.sections; }
