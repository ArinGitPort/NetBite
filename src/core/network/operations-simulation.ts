import { calculateSubnetRange, parseIPv4Address } from '@/core/network/advanced-networking';

export interface SimulationExplanation {
  observation: string;
  rule: string;
  proves: string;
  nextCheck?: string;
}

export interface SimulationResult<TState, TEvent = string> {
  accepted: boolean;
  mutated: boolean;
  state: TState;
  events: TEvent[];
  explanation: SimulationExplanation;
}

export type TransportProtocol = 'tcp' | 'udp';
export interface TransportEndpoint { address: string; port: number }
export interface TransportExchange {
  protocol: TransportProtocol;
  source: TransportEndpoint;
  destination: TransportEndpoint;
  listeningPorts: number[];
  dropDataUnit?: boolean;
}

export function simulateTransportExchange(exchange: TransportExchange) {
  if (!parseIPv4Address(exchange.source.address) || !parseIPv4Address(exchange.destination.address)
    || !validPort(exchange.source.port) || !validPort(exchange.destination.port)) {
    return result(false, false, exchange, [], 'The endpoint tuple is malformed.', 'IPv4 addresses and ports 1-65535 identify the bounded endpoints.', 'No exchange was created.', 'Correct the address or port.');
  }
  if (!exchange.listeningPorts.includes(exchange.destination.port)) {
    return result(true, false, exchange, ['DESTINATION HOST REACHED', 'NO LISTENING SERVICE'], 'The host was selected but no modeled process listens on the destination port.', 'Transport delivers toward the named port; IP reachability does not create an application service.', 'The application exchange cannot be accepted.', 'Verify the destination port and server service.');
  }
  const events = exchange.protocol === 'tcp'
    ? ['SYN', 'SYN-ACK', 'ACK', exchange.dropDataUnit ? 'DATA MISSING' : 'DATA', ...(exchange.dropDataUnit ? ['RETRANSMIT'] : []), 'ACKNOWLEDGED']
    : ['UDP DATAGRAM', exchange.dropDataUnit ? 'NO DELIVERY CONFIRMATION' : 'DELIVERED TO PORT'];
  return result(true, true, exchange, events, `${exchange.protocol.toUpperCase()} exchange accepted.`, exchange.protocol === 'tcp' ? 'TCP establishes state and acknowledges ordered bytes.' : 'UDP sends independent datagrams without TCP recovery state.', exchange.dropDataUnit && exchange.protocol === 'udp' ? 'UDP supplies no modeled retransmission.' : 'The destination process received the modeled data.', 'Inspect application behavior next.');
}

const validPort = (port: number) => Number.isInteger(port) && port >= 1 && port <= 65535;

export interface DhcpPool { network: string; prefix: number; start: string; end: string; gateway?: string; dns?: string; excluded?: string[] }
export interface DhcpLease { clientId: string; address: string; state: 'offered' | 'bound'; leaseStepsRemaining: number }
export interface DhcpState { pool: DhcpPool; leases: DhcpLease[] }

export function inspectDhcpPool(state: DhcpState) {
  const eligible = enumeratePool(state.pool);
  const used = new Set(state.leases.map(({ address }) => address));
  const available = eligible.filter((address) => !used.has(address));
  return { eligible, available, firstAvailable: available[0], exhausted: eligible.length > 0 && available.length === 0 };
}

export function allocateDhcpLease(state: DhcpState, clientId: string): SimulationResult<DhcpState> {
  const addresses = enumeratePool(state.pool);
  if (!clientId.trim() || addresses.length === 0) return result(false, false, state, [], 'The DHCP pool or client identity is invalid.', 'A pool must contain usable addresses inside its configured network.', 'No lease state changed.', 'Verify the pool boundaries and client ID.');
  const existing = state.leases.find((lease) => lease.clientId === clientId);
  if (existing) {
    const leases = state.leases.map((lease) => lease.clientId === clientId ? { ...lease, state: 'bound' as const, leaseStepsRemaining: 4 } : lease);
    return result(true, true, { ...state, leases }, ['DHCPREQUEST', 'DHCPACK'], `${clientId} renewed ${existing.address}.`, 'A known client can request its current valid binding.', 'The binding remains assigned and its modeled lease is refreshed.');
  }
  const used = new Set(state.leases.map(({ address }) => address));
  const address = addresses.find((candidate) => !used.has(candidate));
  if (!address) return result(true, false, state, ['DHCPDISCOVER', 'NO DHCPOFFER'], 'The configured pool has no available address.', 'A DHCP server cannot allocate outside its pool.', 'The client remains unconfigured.', 'Release a lease or expand the valid pool.');
  const lease: DhcpLease = { clientId, address, state: 'bound', leaseStepsRemaining: 4 };
  return result(true, true, { ...state, leases: [...state.leases, lease] }, ['DHCPDISCOVER', `DHCPOFFER ${address}`, `DHCPREQUEST ${address}`, `DHCPACK ${address}`], `${clientId} received ${address}/${state.pool.prefix}.`, 'Discover, Offer, Request, and ACK commit one available address and its options.', 'The server binding table now contains the client.');
}

export function releaseDhcpLease(state: DhcpState, clientId: string): SimulationResult<DhcpState> {
  const lease = state.leases.find((candidate) => candidate.clientId === clientId);
  if (!lease) return result(Boolean(clientId.trim()), false, state, ['DHCPRELEASE NOT APPLIED'], `${clientId || 'The client'} has no current binding to release.`, 'A release can remove only a binding that exists.', 'The binding table did not change.', 'Inspect the client identifier and current bindings.');
  return result(true, true, { ...state, leases: state.leases.filter((candidate) => candidate.clientId !== clientId) }, [`DHCPRELEASE ${lease.address}`, `ADDRESS ${lease.address} AVAILABLE`], `${clientId} released ${lease.address}.`, 'Removing a binding returns its address to the configured pool.', `${lease.address} can be offered to a later client.`);
}

export function relayDhcpMessage(input: { clientNetwork: string; relayAddress?: string; serverReachable: boolean }) {
  if (!input.relayAddress) return { forwarded: false, reason: 'No DHCP relay is configured on the client gateway.' };
  if (!parseIPv4Address(input.relayAddress) || !input.serverReachable) return { forwarded: false, reason: 'The relay address or routed server path is unavailable.' };
  return { forwarded: true, reason: `The relay forwards the request with ${input.clientNetwork} as the client network context.` };
}

function enumeratePool(pool: DhcpPool) {
  const range = calculateSubnetRange(pool.network, pool.prefix);
  const start = ipv4Number(pool.start); const end = ipv4Number(pool.end);
  if (!range || start === null || end === null || start > end) return [];
  const network = ipv4Number(range.network)!; const broadcast = ipv4Number(range.broadcast)!;
  if (start <= network || end >= broadcast) return [];
  const excluded = new Set(pool.excluded ?? []);
  return Array.from({ length: Math.min(1024, end - start + 1) }, (_, index) => numberIPv4(start + index)).filter((address) => !excluded.has(address));
}

export type DnsRecordType = 'A' | 'AAAA' | 'CNAME';
export interface DnsRecord { name: string; type: DnsRecordType; value: string; ttl: number; authoritativeServer: string }
export interface DnsCacheEntry extends DnsRecord { remaining: number }
export interface DnsState { records: DnsRecord[]; cache: DnsCacheEntry[]; resolverReachable: boolean }

export function resolveDnsQuery(state: DnsState, name: string, type: DnsRecordType): SimulationResult<DnsState> {
  const normalized = name.trim().toLowerCase().replace(/\.$/, '');
  if (!normalized || !state.resolverReachable) return result(Boolean(normalized), false, state, ['QUERY NOT SENT'], 'The configured resolver path is unavailable.', 'DNS needs a reachable resolver before hierarchy or record checks matter.', 'No answer was established.', 'Verify resolver addressing and IP reachability.');
  const cached = state.cache.find((entry) => entry.name === normalized && entry.type === type && entry.remaining > 0);
  if (cached) return result(true, false, state, ['STUB QUERY', 'CACHE HIT', `${type} ${cached.value}`], 'A current cached answer was returned.', 'The TTL bounds how long the resolver may reuse this record.', `${normalized} resolved to ${cached.value}.`);
  const record = state.records.find((entry) => entry.name === normalized && entry.type === type);
  if (!record) return result(true, false, state, ['STUB QUERY', 'RECURSIVE LOOKUP', 'AUTHORITATIVE NO DATA'], 'No applicable authoritative record exists.', 'Reachable DNS infrastructure does not guarantee the requested record type exists.', 'The name was not resolved.', 'Inspect the zone name and record type.');
  const cache = [...state.cache.filter((entry) => !(entry.name === normalized && entry.type === type)), { ...record, remaining: record.ttl }];
  return result(true, true, { ...state, cache }, ['STUB QUERY', 'RECURSIVE LOOKUP', `AUTHORITY ${record.authoritativeServer}`, `${type} ${record.value}`, `CACHE TTL ${record.ttl}`], 'The authoritative answer was cached and returned.', 'The recursive resolver follows authority and retains the record for its TTL.', `${normalized} resolved to ${record.value}.`);
}

export const advanceDnsTime = (state: DnsState, steps = 1): DnsState => ({
  ...state,
  cache: state.cache.map((entry) => ({ ...entry, remaining: Math.max(0, entry.remaining - Math.max(0, steps)) })),
});

export type AclProtocol = 'ip' | 'tcp' | 'udp' | 'icmp';
export interface Ipv4Flow { protocol: Exclude<AclProtocol, 'ip'>; source: string; destination: string; sourcePort?: number; destinationPort?: number }
export interface Ipv4AclRule { id: string; action: 'permit' | 'deny'; protocol: AclProtocol; source: string; sourceWildcard: string; destination: string; destinationWildcard: string; destinationPort?: number }
export function evaluateIpv4Acl(flow: Ipv4Flow, rules: Ipv4AclRule[]) {
  if (!parseIPv4Address(flow.source) || !parseIPv4Address(flow.destination)) return { action: 'deny' as const, matchedRuleId: 'invalid', reason: 'The flow contains an invalid IPv4 address.' };
  const match = rules.find((rule) => (rule.protocol === 'ip' || rule.protocol === flow.protocol)
    && wildcardMatch(flow.source, rule.source, rule.sourceWildcard)
    && wildcardMatch(flow.destination, rule.destination, rule.destinationWildcard)
    && (rule.destinationPort === undefined || rule.destinationPort === flow.destinationPort));
  return match
    ? { action: match.action, matchedRuleId: match.id, reason: `First match: ${match.id} ${match.action}.` }
    : { action: 'deny' as const, matchedRuleId: 'implicit-deny', reason: 'No explicit rule matched, so implicit deny applies.' };
}

function wildcardMatch(address: string, ruleAddress: string, wildcard: string) {
  const value = ipv4Number(address); const rule = ipv4Number(ruleAddress); const mask = ipv4Number(wildcard);
  return value !== null && rule !== null && mask !== null && (((value ^ rule) & (~mask >>> 0)) >>> 0) === 0;
}

export interface NatFlow extends Ipv4Flow { sourcePort: number; destinationPort: number }
export interface NatEntry { protocol: NatFlow['protocol']; insideAddress: string; insidePort: number; globalAddress: string; globalPort: number; destination: string; destinationPort: number }
export interface NatState { insideNetworks: { network: string; prefix: number }[]; globalAddress: string; nextPort: number; entries: NatEntry[]; insideUp: boolean; outsideUp: boolean }
export function translateNatFlow(state: NatState, flow: NatFlow): SimulationResult<NatState, string> {
  if (!state.insideUp || !state.outsideUp) return result(true, false, state, ['NO TRANSLATION'], 'A NAT boundary interface is down.', 'Translation requires an active inside-to-outside path.', 'No entry was created.', 'Restore both boundary interfaces.');
  const eligible = state.insideNetworks.some(({ network, prefix }) => calculateSubnetRange(flow.source, prefix)?.network === calculateSubnetRange(network, prefix)?.network);
  if (!eligible || !validPort(flow.sourcePort) || !validPort(flow.destinationPort)) return result(false, false, state, ['NO MATCH'], 'The flow does not match valid inside traffic.', 'PAT creates state only for eligible and well-formed flows.', 'No entry was created.', 'Check the source selection rule and ports.');
  const existing = state.entries.find((entry) => entry.protocol === flow.protocol && entry.insideAddress === flow.source && entry.insidePort === flow.sourcePort && entry.destination === flow.destination && entry.destinationPort === flow.destinationPort);
  if (existing) return result(true, false, state, [`USE ${existing.globalAddress}:${existing.globalPort}`], 'The existing PAT entry was reused.', 'The full transport tuple identifies the translation state.', 'Return traffic can reverse this mapping.');
  const entry: NatEntry = { protocol: flow.protocol, insideAddress: flow.source, insidePort: flow.sourcePort, globalAddress: state.globalAddress, globalPort: state.nextPort, destination: flow.destination, destinationPort: flow.destinationPort };
  return result(true, true, { ...state, nextPort: state.nextPort + 1, entries: [...state.entries, entry] }, [`CREATE ${entry.globalAddress}:${entry.globalPort}`, 'FORWARD OUTSIDE'], 'PAT created a translation for the new flow.', 'The translated global port keeps simultaneous inside flows distinct.', 'Return traffic can be matched to the inside endpoint.');
}

export interface ParsedIPv6 { hextets: number[]; expanded: string; compressed: string }
export function parseIPv6Address(input: string): ParsedIPv6 | null {
  const value = input.trim().toLowerCase().split('%')[0];
  if (!value || value.includes('.') || (value.match(/::/g)?.length ?? 0) > 1) return null;
  const halves = value.split('::');
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves.length > 1 && halves[1] ? halves[1].split(':') : [];
  if (halves.length === 1 && left.length !== 8) return null;
  const missing = 8 - left.length - right.length;
  if (missing < (halves.length === 2 ? 1 : 0)) return null;
  const groups = [...left, ...Array(missing).fill('0'), ...right];
  if (groups.length !== 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/.test(group))) return null;
  const hextets = groups.map((group) => Number.parseInt(group, 16));
  const expanded = hextets.map((group) => group.toString(16).padStart(4, '0')).join(':');
  return { hextets, expanded, compressed: compressIPv6(hextets) };
}

function compressIPv6(groups: number[]) {
  const text = groups.map((group) => group.toString(16));
  let bestStart = -1; let bestLength = 0;
  for (let start = 0; start < groups.length;) {
    if (groups[start] !== 0) { start += 1; continue; }
    let end = start; while (end < groups.length && groups[end] === 0) end += 1;
    if (end - start > bestLength && end - start >= 2) { bestStart = start; bestLength = end - start; }
    start = end;
  }
  if (bestStart < 0) return text.join(':');
  const left = text.slice(0, bestStart).join(':'); const right = text.slice(bestStart + bestLength).join(':');
  return `${left}::${right}`;
}

export interface IPv6Neighbor { address: string; mac: string; state: 'reachable' | 'stale' }
export function resolveIPv6Neighbor(cache: IPv6Neighbor[], target: string, ownerMac?: string) {
  const parsed = parseIPv6Address(target);
  if (!parsed) return { action: 'invalid' as const, cache, reason: 'The target IPv6 address is invalid.' };
  const existing = cache.find((entry) => parseIPv6Address(entry.address)?.expanded === parsed.expanded);
  if (existing) return { action: 'cache-hit' as const, cache, mac: existing.mac, reason: 'A neighbor-cache entry supplies the link-layer address.' };
  if (!ownerMac) return { action: 'solicitation-unanswered' as const, cache, reason: 'Neighbor Solicitation received no modeled owner response.' };
  const entry: IPv6Neighbor = { address: parsed.compressed, mac: ownerMac, state: 'reachable' };
  return { action: 'neighbor-advertisement' as const, cache: [...cache, entry], mac: ownerMac, reason: 'Neighbor Advertisement supplied the target link-layer address.' };
}

export interface IPv6Route { prefix: string; prefixLength: number; nextHop?: string; exitInterface: string }
export function traceIPv6Path(destination: string, routes: IPv6Route[]) {
  const parsed = parseIPv6Address(destination);
  if (!parsed) return { reachable: false, reason: 'The destination IPv6 address is invalid.' };
  const matches = routes.filter((route) => ipv6PrefixMatch(parsed.hextets, parseIPv6Address(route.prefix)?.hextets, route.prefixLength)).sort((a, b) => b.prefixLength - a.prefixLength);
  const selected = matches[0];
  return selected ? { reachable: true, route: selected, reason: `Selected ${selected.prefix}/${selected.prefixLength} by longest prefix.` } : { reachable: false, reason: 'No IPv6 route matches the destination.' };
}

function ipv6PrefixMatch(address: number[], network: number[] | undefined, prefix: number) {
  if (!network || !Number.isInteger(prefix) || prefix < 0 || prefix > 128) return false;
  for (let bit = 0; bit < prefix; bit += 1) {
    const group = Math.floor(bit / 16); const shift = 15 - (bit % 16);
    if (((address[group] >>> shift) & 1) !== ((network[group] >>> shift) & 1)) return false;
  }
  return true;
}

export interface StpSwitch { id: string; priority: number; mac: string }
export interface StpLink { id: string; a: string; b: string; cost: number; up: boolean }
export interface StpPortRole { linkId: string; switchId: string; role: 'root' | 'designated' | 'alternate'; forwarding: boolean }
export function calculateSpanningTree(switches: StpSwitch[], links: StpLink[]) {
  if (switches.length === 0) return { rootId: undefined, roles: [] as StpPortRole[], errors: ['At least one switch is required.'] };
  const ordered = [...switches].sort((a, b) => a.priority - b.priority || normalizeMac(a.mac).localeCompare(normalizeMac(b.mac)) || a.id.localeCompare(b.id));
  const rootId = ordered[0].id;
  const distance = Object.fromEntries(switches.map(({ id }) => [id, id === rootId ? 0 : Number.POSITIVE_INFINITY]));
  const parent: Record<string, string | undefined> = {};
  for (let pass = 0; pass < switches.length - 1; pass += 1) {
    for (const link of links.filter(({ up }) => up)) {
      if (distance[link.a] + link.cost < distance[link.b]) { distance[link.b] = distance[link.a] + link.cost; parent[link.b] = link.id; }
      if (distance[link.b] + link.cost < distance[link.a]) { distance[link.a] = distance[link.b] + link.cost; parent[link.a] = link.id; }
    }
  }
  const roles: StpPortRole[] = [];
  for (const link of links.filter(({ up }) => up)) {
    const aRoot = parent[link.a] === link.id; const bRoot = parent[link.b] === link.id;
    if (aRoot) { roles.push({ linkId: link.id, switchId: link.a, role: 'root', forwarding: true }, { linkId: link.id, switchId: link.b, role: 'designated', forwarding: true }); continue; }
    if (bRoot) { roles.push({ linkId: link.id, switchId: link.b, role: 'root', forwarding: true }, { linkId: link.id, switchId: link.a, role: 'designated', forwarding: true }); continue; }
    const aWins = distance[link.a] < distance[link.b] || (distance[link.a] === distance[link.b] && link.a.localeCompare(link.b) < 0);
    roles.push({ linkId: link.id, switchId: aWins ? link.a : link.b, role: 'designated', forwarding: true }, { linkId: link.id, switchId: aWins ? link.b : link.a, role: 'alternate', forwarding: false });
  }
  return { rootId, roles, errors: [] as string[] };
}

const normalizeMac = (mac: string) => mac.replace(/[^0-9a-f]/gi, '').padStart(12, '0').toLowerCase();

export interface LacpMember { id: string; side: 'a' | 'b'; mode: 'active' | 'passive'; up: boolean; speed: number; switchportMode: 'access' | 'trunk'; allowedVlans: number[] }
export function negotiateEtherChannel(members: LacpMember[]) {
  const sides = { a: members.filter((member) => member.side === 'a' && member.up), b: members.filter((member) => member.side === 'b' && member.up) };
  if (!sides.a.length || !sides.b.length) return { formed: false, activeMemberIds: [] as string[], suspendedMemberIds: members.map(({ id }) => id), reason: 'Both endpoints need an active physical member.' };
  if (![...sides.a, ...sides.b].some(({ mode }) => mode === 'active')) return { formed: false, activeMemberIds: [], suspendedMemberIds: members.map(({ id }) => id), reason: 'Two passive LACP endpoints do not initiate negotiation.' };
  const reference = sides.a[0];
  const compatible = (member: LacpMember) => member.speed === reference.speed && member.switchportMode === reference.switchportMode && [...member.allowedVlans].sort().join(',') === [...reference.allowedVlans].sort().join(',');
  const active = members.filter((member) => member.up && compatible(member));
  const formed = active.some(({ side }) => side === 'a') && active.some(({ side }) => side === 'b');
  return { formed, activeMemberIds: formed ? active.map(({ id }) => id) : [], suspendedMemberIds: members.filter((member) => !active.includes(member)).map(({ id }) => id), reason: formed ? 'Compatible members formed one logical LACP channel.' : 'Member settings do not agree across both endpoints.' };
}

export type DynamicRouteSource = 'connected' | 'static' | 'ospf';
export interface DynamicRoute { prefix: string; prefixLength: number; source: DynamicRouteSource; administrativeDistance: number; metric: number; nextHop?: string }
export function selectRouteSource(destination: string, routes: DynamicRoute[]) {
  const candidates = routes.filter((route) => ipv4PrefixMatch(destination, route.prefix, route.prefixLength));
  const selected = [...candidates].sort((a, b) => b.prefixLength - a.prefixLength || a.administrativeDistance - b.administrativeDistance || a.metric - b.metric)[0];
  return { candidates, selected, reason: selected ? `Selected ${selected.prefix}/${selected.prefixLength}, then AD ${selected.administrativeDistance}, then metric ${selected.metric}.` : 'No route matches the destination.' };
}

export interface OspfRouter { id: string; routerId: string; advertisedPrefixes: string[] }
export interface OspfLink { a: string; b: string; cost: number; area: number; up: boolean; compatible: boolean }
export function buildOspfTopology(routers: OspfRouter[], links: OspfLink[], area = 0) {
  const routerIds = new Set<string>(); const errors: string[] = [];
  routers.forEach((router) => { if (routerIds.has(router.routerId)) errors.push(`Duplicate router ID ${router.routerId}.`); routerIds.add(router.routerId); });
  const adjacencies = links.filter((link) => link.up && link.compatible && link.area === area && routers.some(({ id }) => id === link.a) && routers.some(({ id }) => id === link.b));
  return { area, routers, adjacencies, errors };
}

export function calculateOspfRoutes(topology: ReturnType<typeof buildOspfTopology>, sourceId: string) {
  const distance = Object.fromEntries(topology.routers.map(({ id }) => [id, id === sourceId ? 0 : Number.POSITIVE_INFINITY]));
  const previous: Record<string, string | undefined> = {};
  const unvisited = new Set(topology.routers.map(({ id }) => id));
  while (unvisited.size) {
    const current = [...unvisited].sort((a, b) => distance[a] - distance[b] || a.localeCompare(b))[0];
    unvisited.delete(current);
    for (const link of topology.adjacencies.filter((entry) => entry.a === current || entry.b === current)) {
      const neighbor = link.a === current ? link.b : link.a;
      const candidate = distance[current] + link.cost;
      if (candidate < distance[neighbor]) { distance[neighbor] = candidate; previous[neighbor] = current; }
    }
  }
  return topology.routers.flatMap((router) => router.id === sourceId || !Number.isFinite(distance[router.id]) ? [] : router.advertisedPrefixes.map((prefix) => ({ prefix, cost: distance[router.id], nextHopRouterId: firstHop(previous, sourceId, router.id), advertisingRouterId: router.routerId })));
}

export interface OperationsCapstoneState {
  ipv4: { vlans: boolean; etherChannel: boolean; spanningTree: boolean; dhcp: boolean; dns: boolean; ospf: boolean; pat: boolean; acl: boolean; forward: boolean; returnPath: boolean };
  ipv6: { addressing: boolean; routerDiscovery: boolean; neighborDiscovery: boolean; staticRoutes: boolean; injectedFaultCorrected: boolean; forward: boolean; returnPath: boolean };
}

export function validateOperationsCapstone(state: OperationsCapstoneState) {
  const ipv4Missing = Object.entries(state.ipv4).filter(([, ready]) => !ready).map(([key]) => key);
  const ipv6Missing = Object.entries(state.ipv6).filter(([, ready]) => !ready).map(([key]) => key);
  return {
    complete: ipv4Missing.length === 0 && ipv6Missing.length === 0,
    parts: { ipv4Complete: ipv4Missing.length === 0, ipv6Complete: ipv6Missing.length === 0 },
    failures: [...ipv4Missing.map((item) => `IPv4 small office: ${item} is incomplete.`), ...ipv6Missing.map((item) => `IPv6 branch: ${item} is incomplete.`)],
  };
}

function firstHop(previous: Record<string, string | undefined>, source: string, destination: string) {
  let current = destination; let parent = previous[current];
  while (parent && parent !== source) { current = parent; parent = previous[current]; }
  return parent === source ? current : undefined;
}

function ipv4PrefixMatch(address: string, network: string, prefix: number) {
  const addressValue = ipv4Number(address); const networkValue = ipv4Number(network);
  if (addressValue === null || networkValue === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return ((addressValue & mask) >>> 0) === ((networkValue & mask) >>> 0);
}

function ipv4Number(value: string) {
  const octets = parseIPv4Address(value);
  return octets ? octets.reduce((total, octet) => total * 256 + octet, 0) >>> 0 : null;
}
const numberIPv4 = (value: number) => [24, 16, 8, 0].map((shift) => ((value >>> 0) >>> shift) & 255).join('.');

function result<TState, TEvent = string>(accepted: boolean, mutated: boolean, state: TState, events: TEvent[], observation: string, rule: string, proves: string, nextCheck?: string): SimulationResult<TState, TEvent> {
  return { accepted, mutated, state, events, explanation: { observation, rule, proves, nextCheck } };
}
