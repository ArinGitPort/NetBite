import {
  allocateDhcpLease,
  buildOspfTopology,
  calculateOspfRoutes,
  calculateSpanningTree,
  evaluateIpv4Acl,
  negotiateEtherChannel,
  parseIPv6Address,
  resolveDnsQuery,
  resolveIPv6Neighbor,
  selectRouteSource,
  simulateTransportExchange,
  traceIPv6Path,
  translateNatFlow,
  type SimulationExplanation,
} from '@/core/network/operations-simulation';
import { operationsLabPrerequisiteLessonIds } from '@/content/operations-learning-map';

export interface OperationsLabChoice { id: string; label: string; feedback: string }
export interface OperationsLabStage {
  id: string;
  objective: string;
  prompt: string;
  choices: OperationsLabChoice[];
  correctChoiceId: string;
  evidence: string[];
  explanation: SimulationExplanation;
  hint: string;
}
export type OperationsTopologyDeviceKind = 'pc' | 'switch' | 'router' | 'server';
export interface OperationsTopologyPoint { x: number; y: number }
export interface OperationsTopologyNode {
  id: string;
  label: string;
  kind: OperationsTopologyDeviceKind;
  detail: string;
  role: string;
  compact: OperationsTopologyPoint;
  regular: OperationsTopologyPoint;
  wide: OperationsTopologyPoint;
}
export interface OperationsTopologyLink {
  id: string;
  a: string;
  b: string;
  aPort: string;
  bPort: string;
}
export interface OperationsLabBriefing {
  goal: string;
  startingState: string[];
  workedExample: { title: string; steps: string[]; result: string };
  taskChecklist: string[];
  lessonIds: string[];
}
export interface OperationsLabDefinition {
  id: string;
  title: string;
  subtitle: string;
  prerequisites: string[];
  topology: string[];
  visualTopology: { description: string; nodes: OperationsTopologyNode[]; links: OperationsTopologyLink[] };
  briefing: OperationsLabBriefing;
  tableTitle: string;
  stages: OperationsLabStage[];
  limitations: string;
}

const choice = (id: string, label: string, feedback: string): OperationsLabChoice => ({ id, label, feedback });
const stage = (id: string, objective: string, prompt: string, correct: OperationsLabChoice, wrong: OperationsLabChoice, evidence: string[], explanation: SimulationExplanation, hint: string): OperationsLabStage => ({ id, objective, prompt, correctChoiceId: correct.id, choices: [correct, wrong], evidence, explanation, hint });
const why = (observation: string, rule: string, proves: string, nextCheck: string): SimulationExplanation => ({ observation, rule, proves, nextCheck });

const tcp = simulateTransportExchange({ protocol: 'tcp', source: { address: '192.168.10.10', port: 49152 }, destination: { address: '192.168.10.20', port: 443 }, listeningPorts: [443], dropDataUnit: true });
const dhcp = allocateDhcpLease({ pool: { network: '192.168.20.0', prefix: 24, start: '192.168.20.100', end: '192.168.20.102', excluded: ['192.168.20.100'] }, leases: [] }, 'PC1');
const dns = resolveDnsQuery({ records: [{ name: 'server.netbite.test', type: 'A', value: '192.168.10.20', ttl: 60, authoritativeServer: 'ns.netbite.test' }], cache: [], resolverReachable: true }, 'server.netbite.test', 'A');
const acl = evaluateIpv4Acl({ protocol: 'tcp', source: '192.168.10.10', destination: '192.168.20.20', destinationPort: 443 }, [{ id: 'allow-web', action: 'permit', protocol: 'tcp', source: '192.168.10.0', sourceWildcard: '0.0.0.255', destination: '192.168.20.20', destinationWildcard: '0.0.0.0', destinationPort: 443 }]);
const nat = translateNatFlow({ insideNetworks: [{ network: '192.168.10.0', prefix: 24 }], globalAddress: '203.0.113.10', nextPort: 40000, entries: [], insideUp: true, outsideUp: true }, { protocol: 'tcp', source: '192.168.10.10', sourcePort: 49152, destination: '198.51.100.20', destinationPort: 443 });
const ipv6 = parseIPv6Address('2001:db8:10::10');
const neighbor = resolveIPv6Neighbor([], '2001:db8:10::20', '02:00:00:00:00:0B');
const ipv6Route = traceIPv6Path('2001:db8:20::20', [{ prefix: '2001:db8:20::', prefixLength: 64, nextHop: 'fe80::2', exitInterface: 'G0/1' }]);
const stp = calculateSpanningTree([{ id: 'SW1', priority: 32768, mac: '00:00:00:00:00:0A' }, { id: 'SW2', priority: 24576, mac: '00:00:00:00:00:0B' }, { id: 'SW3', priority: 32768, mac: '00:00:00:00:00:0C' }], [{ id: 'AB', a: 'SW1', b: 'SW2', cost: 4, up: true }, { id: 'BC', a: 'SW2', b: 'SW3', cost: 4, up: true }, { id: 'AC', a: 'SW1', b: 'SW3', cost: 8, up: true }]);
const lacp = negotiateEtherChannel([{ id: 'A1', side: 'a', mode: 'active', up: true, speed: 1000, switchportMode: 'trunk', allowedVlans: [10,20] }, { id: 'B1', side: 'b', mode: 'passive', up: true, speed: 1000, switchportMode: 'trunk', allowedVlans: [10,20] }]);
const route = selectRouteSource('192.168.20.20', [{ prefix: '0.0.0.0', prefixLength: 0, source: 'static', administrativeDistance: 1, metric: 0 }, { prefix: '192.168.20.0', prefixLength: 24, source: 'ospf', administrativeDistance: 110, metric: 20, nextHop: '10.0.0.2' }]);
const ospfTopology = buildOspfTopology([{ id: 'R1', routerId: '1.1.1.1', advertisedPrefixes: ['192.168.10.0/24'] }, { id: 'R2', routerId: '2.2.2.2', advertisedPrefixes: ['10.0.12.0/30'] }, { id: 'R3', routerId: '3.3.3.3', advertisedPrefixes: ['192.168.30.0/24'] }], [{ a: 'R1', b: 'R2', cost: 10, area: 0, up: true, compatible: true }, { a: 'R2', b: 'R3', cost: 10, area: 0, up: true, compatible: true }]);
const ospfRoutes = calculateOspfRoutes(ospfTopology, 'R1');

const topologies: Record<string, string[]> = {
  'transport-service-desk': ['CLIENT PC', 'IP NETWORK', 'APPLICATION SERVER'],
  'dhcp-lease-desk': ['CLIENT VLAN', 'DHCP RELAY', 'DHCP SERVER'],
  'dns-resolution-desk': ['STUB CLIENT', 'RECURSIVE RESOLVER', 'AUTHORITATIVE SERVER'],
  'acl-policy-desk': ['SOURCE LAN', 'POLICY ROUTER', 'SERVER LAN'],
  'nat-translation-desk': ['INSIDE HOSTS', 'NAT EDGE', 'OUTSIDE SERVER'],
  'ipv6-address-desk': ['PC1 /64', 'LOCAL LINK', 'PC2 /64'],
  'ipv6-neighbor-desk': ['IPV6 HOST', 'R1', 'R2', 'REMOTE HOST'],
  'spanning-tree-desk': ['SW1', 'SW2 / ROOT', 'SW3'],
  'etherchannel-desk': ['SW1', 'PO1 / LACP', 'SW2'],
  'route-source-desk': ['SOURCE LAN', 'R1 ROUTE TABLE', 'DESTINATION LAN'],
  'ospf-area-desk': ['R1 / AREA 0', 'R2 / AREA 0', 'R3 / AREA 0'],
  'network-operations-capstone': ['OFFICE USERS', 'RESILIENT CORE', 'EDGE / SERVICES', 'IPV6 BRANCH'],
};

function inferredKind(label: string): OperationsTopologyDeviceKind {
  if (/SERVER|RESOLVER|AUTHORITATIVE|SERVICE/.test(label)) return 'server';
  if (/SW-|SWITCH|CORE|LACP|PO1/.test(label)) return 'switch';
  if (/R\d|ROUTER|RELAY|NAT|POLICY|EDGE/.test(label)) return 'router';
  return 'pc';
}

function genericVisualTopology(id: string, labels: string[]) {
  const nodes = labels.map((label, index): OperationsTopologyNode => {
    const portion = labels.length === 1 ? 50 : 10 + (index * 80 / (labels.length - 1));
    return { id: `${id}-node-${index}`, label, kind: inferredKind(label), detail: 'INSPECT CURRENT STATE', role: label, compact: { x: 50, y: 12 + index * (76 / Math.max(1, labels.length - 1)) }, regular: { x: portion, y: 50 }, wide: { x: portion, y: 50 } };
  });
  return { description: `${labels.join(' connected to ')}. Tap any device to inspect its role.`, nodes, links: nodes.slice(1).map((node, index) => ({ id: `${id}-link-${index}`, a: nodes[index].id, b: node.id, aPort: 'ETHERNET', bPort: 'ETHERNET' })) };
}

const dhcpVisualTopology = {
  description: 'PC1 and PC2 connect to SW1. SW1 connects to relay router R1. R1 reaches DHCP1 on a different IPv4 network.',
  nodes: [
    { id: 'pc-a', label: 'PC1', kind: 'pc' as const, detail: 'DHCP CLIENT / VLAN 20', role: 'Starts without an IPv4 address and asks for a lease.', compact: { x: 28, y: 12 }, regular: { x: 12, y: 20 }, wide: { x: 10, y: 20 } },
    { id: 'pc-b', label: 'PC2', kind: 'pc' as const, detail: 'DHCP CLIENT / VLAN 20', role: 'Provides a second client for binding and exhaustion tests.', compact: { x: 72, y: 12 }, regular: { x: 12, y: 78 }, wide: { x: 10, y: 78 } },
    { id: 'sw-1', label: 'SW1', kind: 'switch' as const, detail: 'CLIENT VLAN SWITCH', role: 'Floods DHCP broadcasts only inside the client VLAN.', compact: { x: 50, y: 38 }, regular: { x: 35, y: 50 }, wide: { x: 34, y: 50 } },
    { id: 'r-1', label: 'R1', kind: 'router' as const, detail: 'RELAY / 192.168.20.1', role: 'Receives the client broadcast and relays DHCP toward the remote server.', compact: { x: 50, y: 64 }, regular: { x: 62, y: 50 }, wide: { x: 62, y: 50 } },
    { id: 'dhcp-1', label: 'DHCP1', kind: 'server' as const, detail: 'SERVER / 192.168.10.5', role: 'Owns the address pools, exclusions, leases, and binding table.', compact: { x: 50, y: 89 }, regular: { x: 88, y: 50 }, wide: { x: 89, y: 50 } },
  ],
  links: [
    { id: 'pc-a-sw', a: 'pc-a', b: 'sw-1', aPort: 'ETH0', bPort: 'F0/1' },
    { id: 'pc-b-sw', a: 'pc-b', b: 'sw-1', aPort: 'ETH0', bPort: 'F0/2' },
    { id: 'sw-r', a: 'sw-1', b: 'r-1', aPort: 'F0/24', bPort: 'G0/0' },
    { id: 'r-server', a: 'r-1', b: 'dhcp-1', aPort: 'G0/1', bPort: 'ETH0' },
  ],
};

type AuthoredNode = [label: string, kind: OperationsTopologyDeviceKind, detail: string, role: string];
function lineTopology(id: string, authored: AuthoredNode[], extraLinks: [number, number, string, string][] = []) {
  const nodes = authored.map(([label, kind, detail, role], index): OperationsTopologyNode => {
    const x = authored.length === 1 ? 50 : 10 + index * (80 / (authored.length - 1));
    return { id: `${id}-node-${index}`, label, kind, detail, role, compact: { x: 50, y: 10 + index * (80 / Math.max(1, authored.length - 1)) }, regular: { x, y: 50 }, wide: { x, y: 50 } };
  });
  const links: OperationsTopologyLink[] = nodes.slice(1).map((node, index) => ({ id: `${id}-link-${index}`, a: nodes[index].id, b: node.id, aPort: 'ETHERNET', bPort: 'ETHERNET' }));
  extraLinks.forEach(([a, b, aPort, bPort], index) => links.push({ id: `${id}-extra-${index}`, a: nodes[a].id, b: nodes[b].id, aPort, bPort }));
  return { description: `${authored.map(([label]) => label).join(' connected through ')}. Tap a device to inspect its role.`, nodes, links };
}

const authoredVisualTopologies: Record<string, ReturnType<typeof lineTopology>> = {
  'transport-service-desk': lineTopology('transport', [['PC1', 'pc', 'APPLICATION CLIENT', 'Starts the transport exchange.'], ['R1', 'router', 'IP FORWARDER', 'Forwards by IP information rather than application ports.'], ['WEB1', 'server', 'LISTENING SERVICE', 'Receives traffic for an open TCP or UDP port.']]),
  'dns-resolution-desk': lineTopology('dns', [['PC1', 'pc', 'STUB RESOLVER', 'Asks its configured recursive resolver.'], ['DNS1', 'server', 'CACHE + RECURSION', 'Checks cache and follows referrals when needed.'], ['DNS2', 'server', 'ROOT / TLD REFERRAL', 'Points the resolver toward the responsible authority.'], ['DNS3', 'server', 'AUTHORITATIVE RECORDS', 'Returns the current record for its zone.']]),
  'acl-policy-desk': lineTopology('acl', [['PC1', 'pc', 'SOURCE / 192.168.10.10', 'Creates the test traffic tuple.'], ['R1', 'router', 'ACL ON G0/0 IN', 'Evaluates the ordered rules at the configured interface and direction.'], ['WEB1', 'server', 'HTTPS / TCP 443', 'Receives only traffic permitted through the policy.']]),
  'nat-translation-desk': lineTopology('nat', [['PC1', 'pc', 'INSIDE LOCAL', 'Starts with a private source address and port.'], ['R1', 'router', 'NAT INSIDE / OUTSIDE', 'Selects eligible traffic and creates translation state.'], ['WEB1', 'server', 'OUTSIDE SERVICE', 'Replies to the translated global address and port.']]),
  'ipv6-address-desk': lineTopology('ipv6-address', [['PC1', 'pc', '2001:DB8:10::10/64', 'Uses one valid global unicast address.'], ['SW1', 'switch', 'LOCAL ETHERNET LINK', 'Connects the two IPv6 interfaces on one link.'], ['PC2', 'pc', '2001:DB8:10::20/64', 'Uses another address in the same /64.']]),
  'ipv6-neighbor-desk': lineTopology('ipv6-neighbor', [['PC1', 'pc', 'SOURCE HOST', 'Selects a local neighbor or default router as next hop.'], ['R1', 'router', 'FE80::1', 'Advertises router information and routes remote traffic.'], ['R2', 'router', 'FE80::2', 'Provides the next routed hop.'], ['PC2', 'pc', 'REMOTE HOST', 'Requires a usable return route.']]),
  'spanning-tree-desk': lineTopology('stp', [['SW1', 'switch', 'PRIORITY 32768', 'Compares bridge information and selects a root path.'], ['SW2', 'switch', 'PRIORITY 24576', 'Becomes root when it has the lowest bridge ID.'], ['SW3', 'switch', 'PRIORITY 32768', 'Keeps one redundant path from forwarding ordinary frames.']], [[0, 2, 'F0/2', 'F0/2']]),
  'etherchannel-desk': lineTopology('etherchannel', [['SW1', 'switch', 'LACP ACTIVE', 'Negotiates compatible physical members.'], ['SW2', 'switch', 'LACP PASSIVE', 'Forms the other endpoint of Port-channel1.']], [[0, 1, 'F0/2', 'F0/2']]),
  'route-source-desk': lineTopology('route-source', [['PC1', 'pc', 'SOURCE LAN', 'Creates traffic for the destination.'], ['R1', 'router', 'ROUTE CANDIDATES', 'Matches prefixes, compares sources, and installs one best route.'], ['PC2', 'pc', 'DESTINATION LAN', 'Represents the target reached by the installed route.']]),
  'ospf-area-desk': lineTopology('ospf', [['R1', 'router', 'ROUTER ID 1.1.1.1', 'Forms a neighbor and calculates routes from the LSDB.'], ['R2', 'router', 'ROUTER ID 2.2.2.2', 'Connects both OSPF links in area 0.'], ['R3', 'router', 'ROUTER ID 3.3.3.3', 'Advertises the remote destination prefix.']]),
  'network-operations-capstone': lineTopology('operations-capstone', [['PC1', 'pc', 'IPV4 + IPV6 CLIENT', 'Starts the required and unauthorized test flows.'], ['SW1', 'switch', 'VLAN / STP / LACP', 'Provides resilient Layer 2 forwarding.'], ['R1', 'router', 'OSPF / ACL / PAT', 'Routes, filters, and translates eligible traffic.'], ['SERVER1', 'server', 'DHCP / DNS / APPLICATION', 'Provides the required office services.'], ['PC2', 'pc', 'REMOTE IPV6 HOST', 'Tests Neighbor Discovery and static return routing.']]),
};

const authoredBriefings: Record<string, Omit<OperationsLabBriefing, 'taskChecklist' | 'lessonIds'>> = {
  'transport-service-desk': {
    goal: 'Configure one client socket and one listening service, establish TCP state, recover missing data, then compare UDP.',
    startingState: ['Client PC is 192.168.10.10.', 'Application Server is 192.168.10.20.', 'R1 forwards IP traffic and does not choose application ports.'],
    workedExample: { title: 'EXAMPLE / DIFFERENT WEB SERVICE', steps: ['A client chooses source TCP port 50000.', 'The server listens on TCP port 80.', 'The client sends to 192.168.10.20:80.', 'SYN, SYN-ACK, and ACK establish the TCP connection before data.'], result: 'The socket pair is 192.168.10.10:50000 to 192.168.10.20:80. The assessed task uses different ports.' },
  },
  'dns-resolution-desk': {
    goal: 'Configure a resolver and record, follow one lookup, reuse the cache, then expire it with learner-controlled time.',
    startingState: ['PC1 has no cached answer.', 'Recursive DNS is reachable at 192.168.10.53.', 'The authoritative server owns the netbite.test zone.'],
    workedExample: { title: 'EXAMPLE / PRINTER RECORD', steps: ['PC1 asks its configured recursive resolver for printer.netbite.test.', 'The resolver finds no current cache entry.', 'Authority returns A 192.168.10.30 with TTL 30.', 'A second identical query before expiry uses the cached A record.'], result: 'The TTL permits temporary reuse; it does not make the authoritative record permanent.' },
  },
  'acl-policy-desk': {
    goal: 'Describe a flow, create an ordered IPv4 ACL rule, apply it at the correct interface and direction, then inspect the match.',
    startingState: ['PC1 is 192.168.10.10.', 'WEB1 is 192.168.20.20 and listens on TCP 443.', 'Traffic from PC1 enters R1 through G0/0.'],
    workedExample: { title: 'EXAMPLE / DNS PERMIT', steps: ['Describe UDP 192.168.10.10 to 192.168.20.53 destination port 53.', 'Match source 192.168.10.0 with wildcard 0.0.0.255.', 'Place the specific permit before the implicit deny.', 'Apply the ACL inbound where the source traffic enters.'], result: 'The first matching rule decides this DNS flow. The assessed task uses HTTPS.' },
  },
  'nat-translation-desk': {
    goal: 'Mark the NAT boundary, select inside traffic, create PAT entries, and match the returning flow.',
    startingState: ['PC1 uses private address 192.168.10.10.', 'R1 has an inside and an outside interface.', 'The outside server replies to the translated global tuple.'],
    workedExample: { title: 'EXAMPLE / ONE PAT FLOW', steps: ['Select source 192.168.10.20 from 192.168.10.0/24.', 'Mark the LAN interface inside and WAN interface outside.', 'Translate source 192.168.10.20:50000 to 203.0.113.10:40010.', 'Use that table entry to reverse the reply.'], result: 'The port distinguishes this flow while hosts share one global IPv4 address.' },
  },
  'ipv6-address-desk': {
    goal: 'Enter, expand, compress, classify, and assign valid IPv6 addresses without hiding notation errors.',
    startingState: ['PC1 and PC2 share one Ethernet link.', 'The exercise prefix is 2001:db8:10::/64.', 'No DHCPv6 or live address timer is used.'],
    workedExample: { title: 'EXAMPLE / EXPAND ONE ADDRESS', steps: ['Start with 2001:db8:20::5.', 'Count the written groups.', 'Insert enough 0000 groups to make eight total.', 'Remove leading zeroes and compress the longest zero run once.'], result: 'Expansion and compression change only the written form, not the 128-bit address.' },
  },
  'ipv6-neighbor-desk': {
    goal: 'Resolve an IPv6 neighbor, learn a router, install one route, and verify both forward and return paths.',
    startingState: ['PC1 uses IPv6 Neighbor Discovery, not ARP.', 'R1 advertises link-local address fe80::1.', 'The remote branch is 2001:db8:20::/64.'],
    workedExample: { title: 'EXAMPLE / LOCAL NEIGHBOR', steps: ['Choose the local target IPv6 address.', 'Send a Neighbor Solicitation using ICMPv6.', 'The owner returns a Neighbor Advertisement with link-layer information.', 'Store the mapping in the neighbor cache.'], result: 'The cache resolves a local next hop. A remote destination still needs a router and return route.' },
  },
  'spanning-tree-desk': {
    goal: 'Elect one root bridge, calculate root paths and port roles, then recalculate after a link change.',
    startingState: ['SW1, SW2, and SW3 form a physical triangle.', 'All three links are active.', 'SW2 starts with the lowest bridge priority.'],
    workedExample: { title: 'EXAMPLE / TWO ROOT CANDIDATES', steps: ['Compare bridge priority first.', 'If priorities tie, compare the MAC-derived bridge identifier.', 'Keep the switch with the lower complete bridge ID as root.', 'Each other switch chooses its lowest-cost root path.'], result: 'One redundant port can discard ordinary frames while the physical link remains available.' },
  },
  'etherchannel-desk': {
    goal: 'Make two LACP endpoints compatible, form one port-channel, and verify trunk forwarding through the bundle.',
    startingState: ['SW1 and SW2 have two candidate physical links.', 'Both links must agree on speed and switchport settings.', 'At least one LACP endpoint must use active mode.'],
    workedExample: { title: 'EXAMPLE / ONE COMPATIBLE MEMBER', steps: ['Set SW1 F0/1 to active and SW2 F0/1 to passive.', 'Match speed and trunk mode.', 'Match the allowed VLAN list.', 'Inspect whether F0/1 becomes an active Po1 member.'], result: 'LACP can form the logical channel only from compatible negotiated members.' },
  },
  'route-source-desk': {
    goal: 'Separate prefix matching, route-source preference, protocol metric, installation, and final forwarding.',
    startingState: ['R1 has connected, static, OSPF, and default candidates.', 'The destination is 192.168.20.20.', 'Only matching prefixes enter the selection step.'],
    workedExample: { title: 'EXAMPLE / MATCH BEFORE PREFERENCE', steps: ['Test 192.168.20.20 against every route prefix.', 'Keep matching /0 and /24 candidates.', 'Prefer /24 because it is more specific.', 'Compare administrative distance only if equal prefixes come from different sources.'], result: 'A less-specific route does not win merely because it has a lower administrative distance.' },
  },
  'ospf-area-desk': {
    goal: 'Configure unique router IDs and compatible area-0 links, build neighbor and topology state, then calculate and repair routes.',
    startingState: ['R1, R2, and R3 form a fixed line topology.', 'All intended OSPF links belong to area 0.', 'R3 advertises the remote destination prefix.'],
    workedExample: { title: 'EXAMPLE / NEIGHBOR CHECK', steps: ['Confirm both interfaces are active and share a subnet.', 'Compare OSPF area and required Hello settings.', 'Reject duplicate router IDs.', 'Form the adjacency only after the required settings agree.'], result: 'Physical connectivity alone does not prove that two routers are OSPF neighbors.' },
  },
  'network-operations-capstone': {
    goal: 'Configure and verify the dependencies of one IPv4 office and one IPv6 branch, then repair the supplied faults.',
    startingState: ['The topology is fixed and autosaved locally.', 'Office services depend on Layer 2, addressing, routing, policy, and translation.', 'The IPv6 branch depends on addressing, Neighbor Discovery, and return routing.'],
    workedExample: { title: 'EXAMPLE / DEPENDENCY ORDER', steps: ['Bring up the local VLAN and trunk path.', 'Confirm addressing and gateway information.', 'Verify forward and return routes.', 'Apply policy or translation only after reachability exists.'], result: 'Testing in dependency order prevents a later feature from hiding an earlier fault.' },
  },
};

function briefingFor(id: string, title: string, subtitle: string, stages: OperationsLabStage[]): OperationsLabBriefing {
  if (id === 'dhcp-lease-desk') return {
    goal: 'Build a valid DHCP pool, watch one client complete DORA, then prove what happens when the pool is full and when a relay is required.',
    startingState: ['PC1 and PC2 have no leased IPv4 address.', 'SW1 carries the client VLAN.', 'R1 is the gateway and DHCP relay at 192.168.20.1.', 'DHCP1 is reachable at 192.168.10.5.'],
    workedExample: { title: 'HOW TO READ THE POOL SETTINGS', steps: ['PC1 and PC2 live in 192.168.20.0/24. The pool must supply addresses from that client subnet, even though DHCP1 itself is on 192.168.10.0/24.', 'Read 192.168.20.0/24 as network ID 192.168.20.0 and prefix length 24.', 'The full /24 host range is 192.168.20.1 through 192.168.20.254, but this task limits DHCP to 192.168.20.100 through 192.168.20.102.', 'Reserve 192.168.20.100 by excluding it. DHCP must skip that address.', 'The first remaining address the server may offer is 192.168.20.101.'], result: 'Enter the five values provided by the task, save them, then let the simulator calculate the first available offer.' },
    taskChecklist: stages.map((item) => item.objective), lessonIds: [...(operationsLabPrerequisiteLessonIds[id as keyof typeof operationsLabPrerequisiteLessonIds] ?? [])],
  };
  const authored = authoredBriefings[id];
  if (authored) return { ...authored, taskChecklist: stages.map((item) => item.objective), lessonIds: [...(operationsLabPrerequisiteLessonIds[id as keyof typeof operationsLabPrerequisiteLessonIds] ?? [])] };
  return { goal: `${title}. ${subtitle}.`, startingState: ['The topology is fixed so you can focus on the protocol decision.', 'No result is preselected. Saved configuration controls the evidence.'], workedExample: { title: 'HOW TO APPROACH THIS LAB', steps: ['Read the current objective.', 'Inspect the topology and identify the device making the decision.', 'Use the shown rule on the worked state.', 'Save one configuration, run the test, and read the evidence before changing another value.'], result: 'A valid mistake stays editable. Use the evidence and hints to repair it.' }, taskChecklist: stages.map((item) => item.objective), lessonIds: [...(operationsLabPrerequisiteLessonIds[id as keyof typeof operationsLabPrerequisiteLessonIds] ?? [])] };
}

const common = (id: string, title: string, subtitle: string, prerequisites: string[], tableTitle: string, concepts: [string,string,string,string,string[],SimulationExplanation,string][], limitations: string): OperationsLabDefinition => {
  const labels = topologies[id] ?? ['SOURCE', 'NETWORK', 'DESTINATION'];
  const stages = concepts.map(([stageId, objective, prompt, correctLabel, evidence, explanation, hint]) => stage(stageId, objective, prompt, choice('correct', correctLabel, 'Correct. The device state now meets this objective.'), choice('misconception', `RECHECK / ${objective.toUpperCase()}`, 'That configuration does not meet this objective. Read the evidence, undo it, or correct the setting.'), evidence, explanation, hint));
  return { id, title, subtitle, prerequisites, topology: labels, visualTopology: id === 'dhcp-lease-desk' ? dhcpVisualTopology : authoredVisualTopologies[id] ?? genericVisualTopology(id, labels), briefing: briefingFor(id, title, subtitle, stages), tableTitle, limitations, stages };
};

export const operationsLabDefinitions: Record<string, OperationsLabDefinition> = Object.fromEntries([
  common('transport-service-desk', 'BUILD TRANSPORT EXCHANGES', 'TCP AND UDP ENDPOINT STATE', ['IPv4 endpoints', 'Application services'], 'CONNECTION STATE', [
    ['endpoint','Select the listening endpoint','A client uses an ephemeral source port. Which destination identifies HTTPS?','TARGET TCP PORT 443',['CLIENT 192.168.10.10:49152','SERVER 192.168.10.20:443'],why('The server is listening on TCP 443.','The destination port selects the receiving process.','The endpoint tuple can reach the intended service.','Inspect protocol state.'),'The server port identifies the service; the client source port identifies this exchange.'],
    ['handshake','Establish TCP state','Which exchange establishes state before application data?','SEND SYN / SYN-ACK / ACK',tcp.events.slice(0,3),tcp.explanation,'TCP begins with three control exchanges.'],
    ['recovery','Recover missing TCP data','The modeled data unit is missing. What should TCP state do?','RETRANSMIT UNACKNOWLEDGED DATA',tcp.events,tcp.explanation,'TCP acknowledgments reveal which ordered bytes still need delivery.'],
    ['udp','Contrast UDP behavior','A DNS-style UDP datagram receives no reply. What can transport conclude?','NO UDP DELIVERY CONFIRMATION',['UDP 49153 -> 53','NO TRANSPORT ACK'],why('No UDP response was observed.','UDP has no TCP-style handshake or retransmission state.','The datagram was sent, not that the application received it.','Check reachability and the DNS service.'),'Do not infer delivery from the absence of a UDP transport error.'],
  ],'No sockets, real timing, congestion control, or random loss.'),
  common('dhcp-lease-desk','OPERATE A DHCP POOL','DORA, LEASES, EXCLUSIONS, AND RELAY',['UDP endpoints','IPv4 subnet ranges'],'DHCP BINDINGS',[
    ['pool','Build the client address pool','Configure a small pool for the clients in 192.168.20.0/24, then check the first available lease.','OFFER 192.168.20.101',dhcp.events,dhcp.explanation,'The pool must match the client subnet. After excluding the first pool address, allocation begins at the next free address.'],
    ['dora','Complete DORA','Which client message accepts one offered address?','SEND DHCPREQUEST',['DISCOVER','OFFER','REQUEST','ACK'],why('The client has received an offer.','DHCPREQUEST identifies the selected offer; DHCPACK commits the lease.','The client and server can bind the same lease.','Inspect the binding table.'),'Discover and Offer do not complete a binding.'],
    ['renew','Renew the existing lease','What should PC1 do while its current binding is still known?','RENEW PC1 BINDING',['DHCPREQUEST 192.168.20.101','DHCPACK 192.168.20.101'],why('PC1 already has a valid binding.','A known client can request its current address and refresh the modeled lease.','Renewal keeps the same address assigned to PC1.','Inspect the binding rather than allocating a second address.'),'Renewal does not require a different address.'],
    ['exhaust','Expose pool exhaustion','What happens after every usable pool address is bound?','REPORT NO AVAILABLE LEASE',['POOL 192.168.20.101-102','FREE 0'],why('No unbound usable address remains.','A pool cannot allocate outside its configured range.','A new client cannot obtain a lease from this pool.','Release a lease or expand the pool.'),'A server must not invent an address outside the pool.'],
    ['release','Return one address to the pool','What happens when PC2 releases its current binding?','RELEASE PC2 BINDING',['DHCPRELEASE 192.168.20.102','ADDRESS AVAILABLE'],why('PC2 no longer needs its current address.','Removing the binding returns that address to the configured pool.','A later client can be offered 192.168.20.102.','Inspect the binding and available-address list.'),'A release does not expand the configured subnet.'],
    ['relay','Relay across a router','What lets a broadcast-originating client reach a remote DHCP server?','USE THE CONFIGURED RELAY ADDRESS',['CLIENT VLAN 20','RELAY 192.168.20.1','SERVER 192.168.10.5'],why('The server is outside the client broadcast domain.','A relay forwards DHCP messages and identifies the client subnet.','The server can select the correct pool.','Verify relay reachability and pool scope.'),'Routers do not forward the original local broadcast unchanged.'],
  ],'No real lease timers, DHCPv6, failover, or vendor-specific output.'),
  common('dns-resolution-desk','TRACE DNS RESOLUTION','AUTHORITY, CACHE, AND LOGICAL TIME',['UDP/TCP endpoints','IPv4 reachability'],'RESOLVER CACHE',[
    ['stub','Send to the recursive resolver','Where does the host stub normally send its query?','QUERY THE CONFIGURED RESOLVER',['STUB -> RECURSIVE RESOLVER'],why('The application needs an address for a name.','A stub delegates iterative hierarchy work to its configured recursive resolver.','The resolver now owns this lookup attempt.','Inspect its cache first.'),'The stub does not normally contact every root and authoritative server itself.'],
    ['hierarchy','Follow authority','A cache miss occurs. Which evidence chain can reach the authoritative answer?','ROOT -> TLD -> AUTHORITATIVE',dns.events,dns.explanation,'Each referral narrows the namespace toward the authority.'],
    ['cache','Reuse a valid cache entry','The same query arrives before TTL expiry. What happens?','ANSWER FROM CACHE',['CACHE HIT','A 192.168.10.20','TTL REMAINS'],why('A matching unexpired entry exists.','A resolver may answer from cached data while its TTL remains.','No hierarchy walk is needed for this query.','Inspect remaining logical TTL.'),'Caching is not permanent.'],
    ['expiry','Advance logical time','TTL reaches zero. What must the next query do?','REMOVE ENTRY AND RESOLVE AGAIN',['CACHE ENTRY EXPIRED','NEXT QUERY IS A MISS'],why('The learned entry reached its logical expiry.','Expired DNS data cannot be used as a current answer.','A fresh resolution is required.','Check resolver and authoritative reachability.'),'The learner controls logical time; NetBite does not imitate wall-clock delays.'],
  ],'No live DNS packets, DNSSEC, recursive server implementation, or wall-clock timing.'),
  common('acl-policy-desk','APPLY AN IPV4 TRAFFIC POLICY','ORDERED FIRST-MATCH FILTERING',['IPv4 prefixes','TCP/UDP ports'],'ACL MATCH TRACE',[
    ['tuple','Build the traffic tuple','Which fields identify this HTTPS flow?','TCP / SOURCE / DESTINATION / PORT 443',['TCP','192.168.10.10 -> 192.168.20.20','DEST PORT 443'],why('A flow is ready for policy evaluation.','Extended ACL rules can inspect protocol, addresses, and ports.','The tuple contains the fields this rule needs.','Inspect wildcard ranges and order.'),'A destination address alone cannot distinguish every service.'],
    ['wildcard','Interpret the wildcard','What does 192.168.10.0 0.0.0.255 match?','ALL 192.168.10.0/24 HOSTS',['BASE 192.168.10.0','WILDCARD 0.0.0.255'],why('The final-octet wildcard bits may vary.','A zero bit must match; a one bit may differ.','The source falls within the selected /24 range.','Inspect rule order.'),'This is inverse-mask matching, not another subnet assignment.'],
    ['match','Evaluate first match','Which rule decides the modeled HTTPS flow?','ALLOW-WEB PERMIT',[`MATCH ${acl.matchedRuleId}`,`ACTION ${acl.action.toUpperCase()}`],why(acl.reason,'ACL entries are evaluated in order and processing stops at the first match.','The allow-web rule permits this exact modeled flow.','Test a different source or service to expose the implicit deny.'),'Stop at the first matching rule; do not combine later rules.'],
    ['direction','Apply at the correct boundary','Which application tests traffic as it enters G0/0?','APPLY INBOUND ON G0/0',['G0/0 IN','MATCH allow-web'],why('The flow enters the selected interface.','ACL direction is relative to the router interface.','This application evaluates the intended traffic point.','Test permitted and denied flows.'),'Inbound does not mean toward the Internet; it means into this interface.'],
  ],'Named IPv4 ACL practice only; no reflexive, time-based, IPv6, or downloadable ACLs.'),
  common('nat-translation-desk','BUILD NAT AND PAT STATE','INSIDE, OUTSIDE, AND RETURN MATCHING',['IPv4 routes','ACL traffic selection'],'TRANSLATION TABLE',[
    ['roles','Mark NAT boundaries','Which interfaces must be identified before translation?','MARK INSIDE AND OUTSIDE',['G0/0 INSIDE','G0/1 OUTSIDE'],why('The router sits between private and public scope.','NAT translates only across correctly identified boundaries.','The flow has a translation direction.','Inspect the selected inside source.'),'A public address alone does not identify inside and outside interfaces.'],
    ['selection','Select the inside flow','Which source should this PAT rule select?','192.168.10.10 IN 192.168.10.0/24',['MATCH 192.168.10.0/24'],why('The source matches the configured inside network.','Dynamic NAT/PAT applies only to selected traffic.','This flow is eligible for translation.','Create the translation tuple.'),'The selector does not permit every private network automatically.'],
    ['pat','Create simultaneous PAT state','How can hosts share one global address?','USE UNIQUE GLOBAL SOURCE PORTS',nat.events,nat.explanation,'PAT distinguishes flows by protocol and port tuple.'],
    ['return','Match the reply','What state sends the reply to the original inside host?','LOOK UP THE TRANSLATION ENTRY',['203.0.113.10:40000','-> 192.168.10.10:49152'],why('A reply targets the allocated global tuple.','The translation table maps that tuple back to the inside local endpoint.','The modeled return flow can be reversed correctly.','Verify routing and table lifetime assumptions.'),'The outside host does not address the private endpoint directly.'],
  ],'No real timers, port exhaustion timing, NAT64, hairpin NAT, or vendor output.'),
  common('ipv6-address-desk','CONFIGURE IPV6 IDENTITIES','EXPANSION, COMPRESSION, PREFIX, AND SCOPE',['Hexadecimal place values','Interface prefixes'],'IPV6 INTERFACES',[
    ['parse','Expand an IPv6 address','What is the complete form of 2001:db8:10::10?','EXPAND ALL EIGHT GROUPS',[ipv6?.expanded ?? 'INVALID'],why('The address uses one double-colon compression.','IPv6 contains eight 16-bit hexadecimal groups; :: replaces one run of zero groups.','The address parses into exactly 128 bits.','Verify canonical compression.'),'Count explicit groups, then insert enough zero groups to total eight.'],
    ['compress','Apply canonical compression','How should the expanded address be shortened?','COMPRESS THE LONGEST ZERO RUN',[ipv6?.compressed ?? 'INVALID'],why('Several adjacent groups are zero.','Canonical text compresses the longest zero run once and removes leading group zeroes.','The shorter text represents the same 128 bits.','Inspect prefix length separately.'),'Only one :: may appear in an IPv6 address.'],
    ['scope','Classify local scope','Which address is link-local?','FE80::1',['FE80::1 / LINK-LOCAL','2001:DB8::10 / DOCUMENTATION GLOBAL'],why('FE80::/10 identifies link-local unicast scope.','Link-local addresses operate only on the attached link and are not routed onward.','This address can identify a local IPv6 next hop.','Check the outgoing interface zone.'),'A link-local address is not an Internet-routable global identity.'],
    ['prefix','Validate interface settings','Which setting places both hosts on the same /64?','2001:DB8:10::10/64 AND ::20/64',['PREFIX 2001:DB8:10::/64','HOSTS ::10 AND ::20'],why('Both addresses share the first 64 prefix bits.','The prefix defines on-link identity; the remaining bits identify interfaces within the subnet.','The hosts can attempt local Neighbor Discovery.','Check uniqueness and interface state.'),'Text compression does not change the prefix boundary.'],
  ],'No DHCPv6, privacy addresses, arbitrary extension headers, or binary conversion drills.'),
  common('ipv6-neighbor-desk','TRACE IPV6 DELIVERY','NDP, ROUTER DISCOVERY, AND ROUTING',['IPv6 addressing','Routing and return paths'],'NEIGHBOR / ROUTE STATE',[
    ['ns','Resolve a local neighbor','Which message asks for the target link-layer mapping?','SEND NEIGHBOR SOLICITATION',[`ACTION ${neighbor.action.toUpperCase()}`,`TARGET MAC ${neighbor.mac ?? 'UNRESOLVED'}`],why(neighbor.reason,'IPv6 Neighbor Discovery uses ICMPv6 solicitation and advertisement messages.','The owner mapping can enter the neighbor cache.','Inspect target scope and local-link reachability.'),'IPv6 uses ICMPv6 Neighbor Discovery, not ARP or broadcast.'],
    ['ra','Select a router','Which control message advertises a default router and on-link prefix?','INSPECT ROUTER ADVERTISEMENT',['ROUTER FE80::1','PREFIX 2001:DB8:10::/64'],why('The host received router information on its local link.','Router Advertisements identify candidate routers and prefix information.','The host can select FE80::1 for remote traffic.','Verify router lifetime and interface state in real systems.'),'The router is selected locally; DNS does not provide a default gateway.'],
    ['route','Select the remote path','Which route matches 2001:db8:20::20?','USE 2001:DB8:20::/64 VIA FE80::2',[ipv6Route.reason, ipv6Route.route ? `EXIT ${ipv6Route.route.exitInterface} / NEXT HOP ${ipv6Route.route.nextHop}` : 'NO ROUTE'],why(ipv6Route.reason,'IPv6 forwarding selects the longest matching prefix.','The modeled packet has a usable outgoing route.','Resolve the local next-hop neighbor.'),'Longest-prefix matching applies to IPv6 routes too.'],
    ['return','Verify the round trip','What else is required after the forward path succeeds?','VERIFY A RETURN ROUTE',['FORWARD 2001:DB8:10::/64 -> 20::/64','RETURN 2001:DB8:20::/64 -> 10::/64'],why('The request reached the destination subnet.','An Echo Reply independently needs valid neighbor and route decisions back to the source.','One-way forwarding is not a successful ping.','Trace the reverse route and neighbor cache.'),'A forward route never implies a return route.'],
  ],'No DHCPv6, OSPFv3, real timers, packet loss, or full NUD state machine.'),
  common('spanning-tree-desk','CALCULATE A LOOP-FREE TREE','ROOT, COST, ROLES, AND CHANGE',['Switching and VLANs','Bridge identifiers'],'SPANNING TREE STATE',[
    ['root','Elect the root bridge','Which bridge wins the election?','SELECT SW2', [`ROOT ${stp.rootId}`],why('SW2 has the lowest complete bridge ID.','The lowest bridge priority wins before the MAC-derived portion.','All switches can use SW2 as the path reference.','Calculate each nonroot path cost.'),'Compare priority first, then MAC only to break a tie.'],
    ['ports','Assign root ports','What does each nonroot switch choose?','LOWEST-COST PATH TO SW2',stp.roles.map((role) => `${role.switchId} ${role.linkId} / ${role.role.toUpperCase()}`),why('Each nonroot switch has received root path information.',"One root port supplies that switch's best path toward the root.",'The best-root paths are known.','Select designated ports per segment.'),'Root port is a per-switch role, not every port facing approximately toward the root.'],
    ['block','Remove the data loop','What happens to the inferior redundant port?','ALTERNATE / DISCARDING',stp.roles.filter((role) => !role.forwarding).map((role) => `${role.switchId} ${role.linkId} / DISCARDING`),why('All physical links exist but one path is redundant.','The alternate port discards ordinary frames while retaining control participation.','The active forwarding graph is loop-free.','Test an active-link failure.'),'Do not unplug the alternate; its redundancy is useful.'],
    ['change','Recalculate after failure','An active link goes down. What must the model do?','RE-ELECT EVERY AFFECTED ROLE',['FAILED LINK REMOVED','COSTS RECALCULATED','ALTERNATE MAY FORWARD'],why('The prior tree contains an unavailable path.','STP recomputes the best loop-free tree from current links and bridge information.','A surviving redundant path may take over.','Verify root identity and all port roles.'),'NetBite does not invent a universal convergence delay.'],
  ],'Single-VLAN rapid spanning-tree practice; no timing, MST, PVST+, guards, or vendor state machine.'),
  common('etherchannel-desk','FORM AN LACP PORT-CHANNEL','MEMBER COMPATIBILITY AND LOGICAL STATE',['Trunks and VLANs','STP roles'],'PORT-CHANNEL STATE',[
    ['mode','Start LACP negotiation','Which mode pairing can initiate this bundle?','ACTIVE + PASSIVE',[`FORMED ${lacp.formed ? 'YES' : 'NO'}`,`ACTIVE ${lacp.activeMemberIds.join(', ')}`],why(lacp.reason,'At least one LACP endpoint must actively initiate negotiation.','The compatible endpoints can form a logical channel.','Verify all proposed member settings.'),'At least one endpoint must use active mode; passive plus passive does not begin negotiation.'],
    ['members','Validate members','Which settings must agree?','SPEED, SWITCHPORT MODE, AND ALLOWED VLANS',['A1 1G TRUNK VLAN 10,20','B1 1G TRUNK VLAN 10,20'],why('The proposed members describe the same logical service.','Incompatible links are rejected rather than silently rewritten.','These members may join one bundle.','Inspect every additional member.'),'Matching channel-group numbers alone do not guarantee compatibility.'],
    ['bundle','Create logical state','What does switching and STP inspect after formation?','PORT-CHANNEL 1', ['PO1 / UP','MEMBERS A1 B1'],why('Compatible LACP members formed a bundle.','Higher-level switching treats the port-channel as one logical link.','STP sees one logical connection rather than parallel independent links.','Verify the logical trunk.'),'Do not configure STP as if each member were an independent path.'],
    ['reach','Verify trunk reachability','Which evidence confirms VLAN 10 and 20 cross the bundle?','TEST BOTH VLANS THROUGH PO1',['PO1 TRUNK / ALLOWED 10,20','VLAN 10 PASS','VLAN 20 PASS'],why('The logical trunk is up with both VLANs allowed.','Reachability requires compatible endpoints and allowed VLAN context.','Both modeled VLAN paths are available.','Test failure after removing one member.'),'A formed bundle does not permit VLANs omitted from its trunk list.'],
  ],'LACP only; no PAgP, load-hash traffic distribution, timing, or vendor-specific suspension behavior.'),
  common('route-source-desk','SELECT INSTALLED ROUTES','PREFIX, SOURCE, AD, AND METRIC',['Static routing','Longest-prefix match'],'ROUTING INFORMATION BASE',[
    ['sources','Compare route sources','What describes how a route was learned?','CONNECTED / STATIC / OSPF',['C / CONNECTED','S / STATIC','O / OSPF'],why('Multiple control sources can offer routes.','Route source and administrative distance help choose among equal prefixes.','Candidates can be compared without changing packet forwarding yet.','Compare destination prefixes first.'),'Route source is not the destination address.'],
    ['prefix','Choose the destination match','Which candidate covers 192.168.20.20 most specifically?','192.168.20.0/24 OSPF',[route.reason, route.selected ? `SELECTED ${route.selected.prefix}/${route.selected.prefixLength}` : 'NO MATCH'],why(route.reason,'Route selection compares prefix length before AD and metric.','The /24 is more specific than the default route.','Resolve its next hop and verify return routing.'),'Longest prefix is evaluated before administrative distance between different prefixes.'],
    ['ad','Resolve equal-prefix sources','Static and OSPF offer the same /24. Which wins by default?','LOWER ADMINISTRATIVE DISTANCE',['STATIC AD 1','OSPF AD 110','STATIC INSTALLED'],why('Two sources offer the same destination prefix.','Lower administrative distance is preferred between different route sources for that prefix.','The static candidate is installed because its AD is lower.','Inspect protocol metrics only among comparable same-source routes.'),'Administrative distance chooses between route sources; it is not the OSPF path cost.'],
    ['withdraw','Recalculate after removal','The installed static path disappears. What should happen?','INSTALL THE BEST REMAINING CANDIDATE',['STATIC WITHDRAWN','OSPF /24 INSTALLED'],why('The preferred candidate is no longer available.','The routing table is recalculated from current eligible candidates.','The OSPF route can become active without inventing timing.','Verify its next hop and return path.'),'A removed preferred route does not permanently suppress alternatives.'],
  ],'No real protocol exchange, convergence timing, BGP, EIGRP, or route redistribution.'),
  common('ospf-area-desk','BUILD SINGLE-AREA OSPF','NEIGHBORS, LSDB, SPF, AND FAILURE',['Dynamic route selection','IPv4 subnetting'],'OSPF TOPOLOGY STATE',[
    ['identity','Validate router identities','What must uniquely identify each OSPF router?','UNIQUE ROUTER IDS',['R1 1.1.1.1','R2 2.2.2.2','R3 3.3.3.3'],why('Three routers participate in area 0.','A router ID identifies an OSPF router in protocol state.','The three routers have unique identities.','Verify adjacency parameters.'),'Router IDs are identifiers, not proof of reachable interface addresses.'],
    ['neighbor','Form compatible neighbors','Which links can form adjacency?','UP LINKS IN THE SAME AREA WITH COMPATIBLE SETTINGS',ospfTopology.adjacencies.map((link) => `${link.a} <-> ${link.b}`),why('The routers exchange Hello information on active links.','Area and relevant link settings must agree before adjacency.','The listed neighbors can exchange topology information.','Inspect advertised links and prefixes.'),'Physical connectivity alone does not form an OSPF adjacency.'],
    ['spf','Calculate best paths','What computation uses the synchronized topology state?','RUN SPF FROM R1',ospfRoutes.map((item) => `${item.prefix} COST ${item.cost} VIA ${item.nextHopRouterId}`),why('R1 has the current area topology.','SPF calculates lowest accumulated cost paths from the local router.','R1 can derive routes toward R3 prefixes.','Verify the installed route and return direction.'),'SPF does not choose by administrative distance between links inside OSPF.'],
    ['failure','Recover from a broken link','What happens after a topology link is removed?','REBUILD TOPOLOGY AND RECALCULATE SPF',['LINK STATE CHANGED','LSDB VIEW UPDATED','SPF RECALCULATED'],why('A previously known adjacency is no longer usable.','The routers update their topology information and run SPF again.','Routes reflect only the surviving links.','Check for an alternate path or an unreachable prefix.'),'NetBite shows the new route result without pretending to measure real convergence time or packet loss.'],
  ],'Single-area OSPFv2 only; no authentication, DR/BDR detail, special areas, timing, or arbitrary IOS.'),
  common('network-operations-capstone','OPERATIONS CAPSTONE','PART 1 IPV4 SMALL OFFICE / PART 2 IPV6 BRANCH',['All Network Operations modules'],'DEPENDENCY VERIFICATION',[
    ['office-l2','Build the resilient office Layer 2 path','Which configuration provides VLAN separation plus a redundant logical uplink?','ACCESS VLANS + TRUNK + LACP + STP',['VLAN 10 USERS / VLAN 20 SERVERS','PO1 TRUNK ALLOWS 10,20','STP TREE LOOP-FREE'],why('The physical office has redundant switched paths.','Compatible LACP members form one logical trunk and STP protects the remaining Layer 2 graph.','Both VLANs have a loop-free active path.','Verify address services next.'),'Validate VLAN membership before bundling and spanning-tree roles.'],
    ['office-services','Provide host configuration and names','What must be operational before clients can locate the internal service?','DHCP LEASE + DNS A RECORD',['PC1 192.168.10.101/24','DNS server.netbite.test = 192.168.20.20'],why('The client needs usable IPv4 settings and a name mapping.','DHCP supplies configuration; DNS resolves the application name independently.','The client can identify the server endpoint.','Verify routed policy and reachability.'),'Address assignment and name resolution are separate dependencies.'],
    ['office-routing','Create the office routed path','What builds reachable dynamic paths across the three routers?','FORM OSPF AREA 0 AND INSTALL ROUTES',['R1 <-> R2 <-> R3','SERVER /24 INSTALLED','RETURN /24 INSTALLED'],why('Compatible OSPF neighbors share their current topology information.','SPF-derived routes need usable forward and return paths.','Both office prefixes are installed.','Apply edge translation and policy.'),'A neighbor relationship alone does not prove the destination prefix is installed.'],
    ['office-edge','Permit service and translate egress','Which order preserves required HTTPS while blocking the unauthorized flow?','MATCH ACL FIRST, THEN CREATE PAT STATE',['HTTPS PERMIT MATCHED','UNAUTHORIZED FLOW DENIED','PAT ENTRY CREATED'],why('Two flows reach the edge policy with different tuples.','Ordered ACL rules select policy; eligible inside traffic then receives a PAT entry.','The required service passes while the prohibited tuple does not.','Run forward and return tests.'),'Do not use a blanket permit merely to make the test pass.'],
    ['office-verify','Verify the IPv4 office','What proves the required exchange works?','TEST FORWARD AND RETURN PATHS',['IPV4 FORWARD PASS','IPV4 RETURN PASS','DNS SERVICE REACHED'],why('Every configured dependency is now active.','A successful service exchange requires both directions, not just one installed route.','The IPv4 capstone part meets its objective.','Begin the IPv6 branch.'),'A one-way trace is incomplete evidence.'],
    ['branch-local','Configure IPv6 local operation','Which state lets the branch host select and resolve its router?','GLOBAL /64 + ROUTER ADVERTISEMENT + NDP',['PC-V6 2001:DB8:10::10/64','ROUTER FE80::1','NEIGHBOR REACHABLE'],why('The host has a valid global address and remote destination.','Router discovery selects the local next hop; NDP resolves its link-layer mapping.','The branch can construct the first-hop frame.','Verify remote IPv6 routes.'),'IPv6 has no ARP broadcast or IPv4 default-gateway field.'],
    ['branch-route','Build IPv6 forward and return routes','What is required on both routers?','STATIC /64 ROUTES IN BOTH DIRECTIONS',['2001:DB8:20::/64 VIA FE80::2','2001:DB8:10::/64 VIA FE80::1'],why('Each router initially knows only its connected prefixes.','A static route supplies the remote prefix and local next hop.','Both IPv6 directions have route candidates.','Correct the injected interface fault.'),'One static route does not create its reverse.'],
    ['branch-fault','Recover the injected IPv6 fault','The route is correct but its parent interface is shut. What must change?','ENABLE THE PARENT INTERFACE',['PARENT INTERFACE UP','NDP RE-RUN','IPV6 FORWARD PASS','IPV6 RETURN PASS'],why('The selected next hop depends on a disabled physical interface.','Logical IPv6 forwarding cannot use a down outgoing link.','Restoring the parent allows neighbor and route processing to complete.','Review both capstone parts.'),'Changing the destination route cannot repair a disabled local interface.'],
  ],'Guided fixed topologies only; no production IOS, live services, arbitrary timing, or packet loss.'),
].map((definition) => [definition.id, definition]));
