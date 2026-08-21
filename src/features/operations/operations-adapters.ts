import {
  buildOspfTopology,
  allocateDhcpLease,
  advanceDnsTime,
  calculateOspfRoutes,
  calculateSpanningTree,
  evaluateIpv4Acl,
  inspectDhcpPool,
  negotiateEtherChannel,
  parseIPv6Address,
  relayDhcpMessage,
  releaseDhcpLease,
  resolveDnsQuery,
  resolveIPv6Neighbor,
  selectRouteSource,
  simulateTransportExchange,
  traceIPv6Path,
  translateNatFlow,
  validateOperationsCapstone,
  type DhcpState,
  type DynamicRoute,
  type DnsState,
  type NatState,
  type IPv6Neighbor,
  type SimulationExplanation,
} from '@/core/network/operations-simulation';
import type { OperationsSimulationSession, SimulationValue } from '@/features/operations/operations-simulator';

export interface OperationsDeviceRecord {
  id: string;
  title: string;
  lines: string[];
  status: 'ready' | 'attention' | 'inactive';
}

export interface OperationsProtocolEvent {
  id: string;
  title: string;
  detail: string;
  deviceIds: string[];
  tone: 'neutral' | 'success' | 'warning';
}

export interface OperationsDerivedTable {
  id: string;
  title: string;
  rows: string[];
}

export interface OperationsObjectiveResult {
  passed: boolean;
  message: string;
  events: OperationsProtocolEvent[];
  tables: OperationsDerivedTable[];
  explanation?: Partial<SimulationExplanation>;
  protocolState?: Record<string, unknown>;
}

export interface OperationsVisualTrace {
  activeDeviceIds: string[];
  activeLinkIds: string[];
  failedDeviceId?: string;
  failedLinkId?: string;
  text: string;
}

export interface OperationsCliCommandResult {
  accepted: boolean;
  updates: Record<string, SimulationValue>;
  output: string;
}

export interface OperationsSimulationAdapter<TState = Record<string, unknown>, TAction = Record<string, SimulationValue>> {
  id: string;
  createInitialState: () => TState;
  validateAction: (state: TState, action: TAction) => { accepted: boolean; message?: string };
  applyAction: (state: TState, action: TAction) => { accepted: boolean; state: TState; message?: string };
  inspectDevice: (deviceId: string, deviceLabel: string, session: OperationsSimulationSession) => OperationsDeviceRecord;
  deriveTables: (session: OperationsSimulationSession) => OperationsDerivedTable[];
  deriveTrace: (stageId: string, session: OperationsSimulationSession, nodes: readonly { id: string; label: string }[], links: readonly { id: string; a: string; b: string }[]) => OperationsVisualTrace | undefined;
  evaluateObjective: (stageId: string, session: OperationsSimulationSession) => OperationsObjectiveResult;
  evaluateObjectives: (session: OperationsSimulationSession, stageIds: readonly string[]) => OperationsObjectiveResult[];
}

type Configuration = Record<string, SimulationValue>;

const text = (value: SimulationValue | undefined, fallback = 'NOT CONFIGURED') => value === undefined || value === '' ? fallback : String(value);
const enabled = (value: SimulationValue | undefined) => value === true ? 'UP / ENABLED' : value === false ? 'DOWN / DISABLED' : 'NOT CONFIGURED';
const event = (id: string, detail: string, tone: OperationsProtocolEvent['tone'] = 'neutral', deviceIds: string[] = []): OperationsProtocolEvent => ({ id, title: id.replaceAll('-', ' ').toUpperCase(), detail, tone, deviceIds });
const table = (id: string, title: string, rows: string[]): OperationsDerivedTable => ({ id, title, rows });
const result = (passed: boolean, message: string, rows: string[], explanation?: Partial<SimulationExplanation>, protocolState?: Record<string, unknown>): OperationsObjectiveResult => ({
  passed,
  message,
  events: rows.map((detail, index) => event(`step-${index + 1}`, detail, passed ? 'success' : 'warning')),
  tables: [table('current-state', 'CURRENT MODELED STATE', rows)],
  explanation,
  protocolState,
});

function dhcpState(session: OperationsSimulationSession): DhcpState | undefined {
  const value = session.protocolState?.dhcp;
  return value && typeof value === 'object' && Array.isArray((value as DhcpState).leases) ? value as DhcpState : undefined;
}

function dnsState(configuration: Configuration, session: OperationsSimulationSession): DnsState {
  const saved = session.protocolState?.dns as DnsState | undefined;
  return {
    records: configuration['dns.name'] && configuration['dns.value'] ? [{ name: text(configuration['dns.name']), type: 'A' as const, value: text(configuration['dns.value']), ttl: Number(configuration['dns.ttl'] ?? 0), authoritativeServer: 'ns.netbite.test' }] : [],
    cache: saved?.cache ?? [],
    resolverReachable: configuration['dns.reachable'] === true,
  };
}

function aclEvaluation(configuration: Configuration) {
  return evaluateIpv4Acl({
    protocol: text(configuration['acl.protocol'], 'tcp') as 'tcp' | 'udp' | 'icmp',
    source: text(configuration['acl.source'], '0.0.0.0'),
    destination: text(configuration['acl.destination'], '0.0.0.0'),
    destinationPort: Number(configuration['acl.port'] ?? 0),
  }, configuration['acl.action'] ? [{
    id: `NETBITE-IN-${Number(configuration['acl.sequence'] ?? 10)}`,
    action: text(configuration['acl.action']) as 'permit' | 'deny',
    protocol: 'tcp',
    source: text(configuration['acl.network'], '0.0.0.0'),
    sourceWildcard: text(configuration['acl.wildcard'], '0.0.0.0'),
    destination: '192.168.20.20',
    destinationWildcard: '0.0.0.0',
    destinationPort: 443,
  }] : []);
}

function natState(configuration: Configuration, session: OperationsSimulationSession): NatState {
  const saved = session.protocolState?.nat as NatState | undefined;
  return {
    insideNetworks: [{ network: text(configuration['nat.network'], '0.0.0.0'), prefix: Number(configuration['nat.prefix'] ?? 0) }],
    globalAddress: text(configuration['nat.global'], '0.0.0.0'),
    nextPort: saved?.nextPort ?? 40000,
    entries: saved?.entries ?? [],
    insideUp: configuration['nat.insideUp'] === true,
    outsideUp: configuration['nat.outsideUp'] === true,
  };
}

function natEvaluation(configuration: Configuration, session: OperationsSimulationSession, flowIndex = 0, state = natState(configuration, session)) {
  return translateNatFlow(state, { protocol: 'tcp', source: `192.168.10.${10 + flowIndex}`, sourcePort: 49152 + flowIndex, destination: '198.51.100.20', destinationPort: 443 });
}

function stpEvaluation(configuration: Configuration) {
  return calculateSpanningTree([
    { id: 'SW1', priority: Number(configuration['stp.priorityA'] ?? 32768), mac: '00:00:00:00:00:0A' },
    { id: 'SW2', priority: Number(configuration['stp.priorityB'] ?? 32768), mac: '00:00:00:00:00:0B' },
    { id: 'SW3', priority: Number(configuration['stp.priorityC'] ?? 32768), mac: '00:00:00:00:00:0C' },
  ], [
    { id: 'AB', a: 'SW1', b: 'SW2', cost: Number(configuration['stp.costAB'] ?? 4), up: configuration['stp.failedLink'] !== 'AB' },
    { id: 'BC', a: 'SW2', b: 'SW3', cost: Number(configuration['stp.costBC'] ?? 4), up: true },
    { id: 'AC', a: 'SW1', b: 'SW3', cost: Number(configuration['stp.costAC'] ?? 8), up: true },
  ]);
}

function lacpEvaluation(configuration: Configuration) {
  const vlans = text(configuration['lacp.vlans'], '').split(',').filter(Boolean).map(Number);
  return negotiateEtherChannel([
    { id: 'SW1 F0/1', side: 'a', mode: text(configuration['lacp.modeA'], 'passive') as 'active' | 'passive', up: configuration['lacp.membersUp'] === true, speed: Number(configuration['lacp.speedA'] ?? 0), switchportMode: text(configuration['lacp.switchportMode'], 'access') as 'access' | 'trunk', allowedVlans: vlans },
    { id: 'SW2 F0/1', side: 'b', mode: text(configuration['lacp.modeB'], 'passive') as 'active' | 'passive', up: configuration['lacp.membersUp'] === true, speed: Number(configuration['lacp.speedB'] ?? 0), switchportMode: text(configuration['lacp.switchportMode'], 'access') as 'access' | 'trunk', allowedVlans: vlans },
  ]);
}

function routeCandidates(configuration: Configuration): DynamicRoute[] {
  const routes: DynamicRoute[] = [];
  if (configuration['route.connected'] === true) routes.push({ prefix: '192.168.10.0', prefixLength: 24, source: 'connected', administrativeDistance: 0, metric: 0 });
  if (configuration['route.static'] === true && configuration['route.staticAvailable'] !== false) routes.push({ prefix: '192.168.20.0', prefixLength: 24, source: 'static', administrativeDistance: Number(configuration['route.staticAd'] ?? 1), metric: 0, nextHop: '10.0.0.2' });
  if (configuration['route.ospf'] === true) routes.push({ prefix: '192.168.20.0', prefixLength: Number(configuration['route.prefix'] ?? 24), source: 'ospf', administrativeDistance: Number(configuration['route.ospfAd'] ?? 110), metric: 20, nextHop: '10.0.0.2' });
  routes.push({ prefix: '0.0.0.0', prefixLength: 0, source: 'static', administrativeDistance: 254, metric: 0, nextHop: '10.0.0.2' });
  return routes;
}

function ospfEvaluation(configuration: Configuration) {
  const topology = buildOspfTopology([
    { id: 'R1', routerId: text(configuration['ospf.r1'], '0.0.0.0'), advertisedPrefixes: ['192.168.10.0/24'] },
    { id: 'R2', routerId: text(configuration['ospf.r2'], '0.0.0.0'), advertisedPrefixes: ['10.0.12.0/30'] },
    { id: 'R3', routerId: text(configuration['ospf.r3'], '0.0.0.0'), advertisedPrefixes: configuration['ospf.advertise'] === true ? ['192.168.30.0/24'] : [] },
  ], [
    { a: 'R1', b: 'R2', cost: Number(configuration['ospf.cost12'] ?? 10), area: Number(configuration['ospf.area12'] ?? -1), up: configuration['ospf.linksUp'] === true, compatible: Number(configuration['ospf.area12']) === 0 },
    { a: 'R2', b: 'R3', cost: Number(configuration['ospf.cost23'] ?? 10), area: Number(configuration['ospf.area23'] ?? -1), up: configuration['ospf.linksUp'] === true && configuration['ospf.failedLink'] !== 'r2-r3-down', compatible: Number(configuration['ospf.area23']) === 0 },
  ]);
  return { topology, routes: calculateOspfRoutes(topology, 'R1') };
}

function evaluate(labId: string, stageId: string, session: OperationsSimulationSession): OperationsObjectiveResult {
  const c = session.configuration;
  if (labId === 'transport-service-desk') {
    const protocol = text(c['transport.protocol'], 'tcp') as 'tcp' | 'udp';
    const exchange = simulateTransportExchange({ protocol, source: { address: '192.168.10.10', port: Number(c['transport.sourcePort'] ?? 0) }, destination: { address: '192.168.10.20', port: Number(c['transport.destinationPort'] ?? 0) }, listeningPorts: c['transport.listeningPort'] === undefined ? [] : [Number(c['transport.listeningPort'])], dropDataUnit: c['transport.drop'] === true });
    const passed = stageId === 'endpoint'
      ? protocol === 'tcp' && Number(c['transport.sourcePort']) === 49152 && Number(c['transport.destinationPort']) === 443 && Number(c['transport.listeningPort']) === 443
      : stageId === 'handshake'
        ? c['transport.event'] === 'handshake'
        : stageId === 'recovery'
          ? c['transport.drop'] === true && c['transport.recovery'] === 'retransmit'
          : protocol === 'udp' && Number(c['transport.destinationPort']) === 53 && Number(c['transport.listeningPort']) === 53 && c['transport.udpConclusion'] === 'no-confirmation';
    return result(passed, passed ? 'The transport state satisfies the current objective.' : 'The endpoint, event order, or recovery choice still needs attention.', exchange.events);
  }
  if (labId === 'dhcp-lease-desk') {
    const saved = dhcpState(session);
    const state: DhcpState = saved ?? {
      pool: {
        network: text(c['dhcp.network']),
        prefix: Number(c['dhcp.prefix'] ?? -1),
        start: text(c['dhcp.start']),
        end: text(c['dhcp.end']),
        gateway: text(c['dhcp.gateway']),
        excluded: c['dhcp.excluded'] ? [text(c['dhcp.excluded'])] : [],
      },
      leases: [],
    };
    const rows = () => {
      const pool = inspectDhcpPool(state);
      return [`POOL ${state.pool.network}/${state.pool.prefix}`, `AVAILABLE ${pool.available.join(', ') || 'NONE'}`, ...state.leases.map((lease) => `${lease.clientId} ${lease.address} ${lease.state.toUpperCase()}`)];
    };
    if (stageId === 'pool') {
      const pool = inspectDhcpPool(state);
      const passed = c['dhcp.network'] === '192.168.20.0' && Number(c['dhcp.prefix']) === 24 && c['dhcp.start'] === '192.168.20.100' && c['dhcp.end'] === '192.168.20.102' && c['dhcp.excluded'] === '192.168.20.100' && c['dhcp.gateway'] === '192.168.20.1' && Number(c['dhcp.leaseSteps']) === 4 && pool.firstAvailable === '192.168.20.101';
      return result(passed, passed ? 'The pool belongs to the client subnet and has a valid first offer.' : 'The pool, exclusion, gateway, or lease setting does not match the client subnet.', rows(), undefined, { dhcp: state });
    }
    if (stageId === 'dora' || stageId === 'renew') {
      const client = text(c[stageId === 'dora' ? 'dhcp.client' : 'dhcp.renewClient']);
      const allocation = allocateDhcpLease(state, client);
      const passed = client === 'PC1' && allocation.state.leases.some((lease) => lease.clientId === 'PC1' && lease.address === '192.168.20.101');
      return result(passed, allocation.explanation.observation, allocation.events, allocation.explanation, { dhcp: allocation.state });
    }
    if (stageId === 'exhaust') {
      let next = state;
      const events: string[] = [];
      for (const client of ['PC2', 'PC3'].slice(0, Number(c['dhcp.requestCount'] ?? 0))) {
        const allocation = allocateDhcpLease(next, client);
        next = allocation.state;
        events.push(...allocation.events.map((entry) => `${client} / ${entry}`));
      }
      const exhausted = inspectDhcpPool(next).exhausted;
      return result(exhausted, exhausted ? 'All non-excluded addresses are now bound.' : 'At least one address remains available.', events, undefined, { dhcp: next });
    }
    if (stageId === 'release') {
      const released = releaseDhcpLease(state, text(c['dhcp.releaseClient']));
      return result(released.mutated, released.explanation.observation, released.events, released.explanation, { dhcp: released.state });
    }
    const relay = relayDhcpMessage({ clientNetwork: '192.168.20.0/24', relayAddress: text(c['dhcp.relay']), serverReachable: c['dhcp.serverReachable'] === true });
    return result(relay.forwarded, relay.reason, [`RELAY ${text(c['dhcp.relay'])}`, `SERVER PATH ${relay.forwarded ? 'FORWARDED' : 'STOPPED'}`, relay.reason], undefined, { dhcp: state });
  }
  if (labId === 'dns-resolution-desk') {
    const state = dnsState(c, session);
    const query = resolveDnsQuery(state, text(c['dns.name'], 'server.netbite.test'), 'A');
    if (stageId === 'stub') return result(state.resolverReachable && c['dns.resolver'] === '192.168.10.53', state.resolverReachable ? 'The stub resolver has a usable configured destination.' : 'The configured resolver cannot currently be reached.', [`RESOLVER ${text(c['dns.resolver'])}`, `PATH ${state.resolverReachable ? 'REACHABLE' : 'UNREACHABLE'}`]);
    if (stageId === 'hierarchy') return result(query.accepted && query.state.cache.length === 1, query.explanation.observation, query.events, undefined, { dns: query.state });
    if (stageId === 'cache') {
      const cacheHit = state.cache.some((entry) => entry.name === text(c['dns.name']).toLowerCase() && entry.type === 'A' && entry.remaining > 0);
      return result(c['dns.queryMode'] === 'reuse' && cacheHit, 'Only an identical current name-and-type query can reuse this entry.', [`CACHE KEY ${text(c['dns.name'])} / A`, `CACHE ${cacheHit ? 'HIT' : 'MISS'}`], undefined, { dns: state });
    }
    const advanced = advanceDnsTime(state, Number(c['dns.advance'] ?? 0));
    const expired = advanced.cache.length > 0 && advanced.cache.every((entry) => entry.remaining === 0);
    return result(expired, 'Logical time must reach the saved TTL before the cached record expires.', [`TTL ${text(c['dns.ttl'])}`, `ADVANCED ${text(c['dns.advance'])}`, expired ? 'CACHE EXPIRED' : 'CACHE CURRENT'], undefined, { dns: advanced });
  }
  if (labId === 'acl-policy-desk') {
    const acl = aclEvaluation(c);
    if (stageId === 'tuple') return result(c['acl.protocol'] === 'tcp' && c['acl.source'] === '192.168.10.10' && c['acl.destination'] === '192.168.20.20' && Number(c['acl.port']) === 443, 'The test tuple must describe the supplied HTTPS flow.', [`${text(c['acl.protocol']).toUpperCase()} ${text(c['acl.source'])} -> ${text(c['acl.destination'])}:${text(c['acl.port'])}`]);
    if (stageId === 'wildcard') return result(c['acl.network'] === '192.168.10.0' && c['acl.wildcard'] === '0.0.0.255', 'The wildcard must select the complete supplied source subnet.', [`SOURCE MATCH ${text(c['acl.network'])} ${text(c['acl.wildcard'])}`]);
    if (stageId === 'match') return result(acl.action === 'permit' && acl.matchedRuleId !== 'implicit-deny', acl.reason, [`MATCH ${acl.matchedRuleId}`, `ACTION ${acl.action.toUpperCase()}`]);
    return result(c['acl.interface'] === 'G0/0' && c['acl.direction'] === 'in' && acl.action === 'permit', 'The ACL must be applied where the supplied flow enters R1.', [`INTERFACE ${text(c['acl.interface'])}`, `DIRECTION ${text(c['acl.direction']).toUpperCase()}`, `TEST ${acl.action.toUpperCase()}`]);
  }
  if (labId === 'nat-translation-desk') {
    const initial = natState(c, session);
    const first = natEvaluation(c, session, 0, initial);
    const second = natEvaluation(c, session, 1, first.state);
    if (stageId === 'roles') return result(c['nat.insideUp'] === true && c['nat.outsideUp'] === true, first.explanation.observation, first.events, undefined, { nat: initial });
    if (stageId === 'selection') {
      const selected = c['nat.network'] === '192.168.10.0' && Number(c['nat.prefix']) === 24;
      return result(first.mutated && selected, selected ? first.explanation.observation : 'The inside selection does not match the supplied private network.', first.events, undefined, { nat: initial });
    }
    if (stageId === 'pat') return result(first.mutated && second.mutated && Number(c['nat.flowCount']) >= 2 && c['nat.global'] === '203.0.113.10', 'Eligible flows create distinct PAT tuples.', [...first.events, ...second.events], undefined, { nat: second.state });
    const savedNat = natState(c, session);
    return result(c['nat.returnCheck'] === 'table' && savedNat.entries.length >= 2, 'Return traffic must match the current global tuple.', [...savedNat.entries.map((entry) => `MATCH ${entry.globalAddress}:${entry.globalPort} -> ${entry.insideAddress}:${entry.insidePort}`), c['nat.returnCheck'] === 'table' ? 'REVERSE MATCH CHECKED' : 'REVERSE MATCH NOT CHECKED'], undefined, { nat: savedNat });
  }
  if (labId === 'ipv6-address-desk') {
    const parsed = parseIPv6Address(text(c['ipv6.address'], ''));
    if (stageId === 'parse') return result(Boolean(parsed), parsed ? 'The address expands to eight hexadecimal groups.' : 'The address is not valid IPv6 notation.', parsed ? [`EXPANDED ${parsed.expanded}`] : ['PARSE FAILED']);
    if (stageId === 'compress') { const candidate = parseIPv6Address(text(c['ipv6.compressed'], '')); return result(Boolean(parsed && candidate && parsed.expanded === candidate.expanded), 'Compressed and expanded forms must represent the same 128 bits.', candidate ? [`EXPANDED ${candidate.expanded}`, `CANONICAL ${candidate.compressed}`] : ['PARSE FAILED']); }
    if (stageId === 'scope') return result(c['ipv6.scope'] === 'link-local', 'FE80::/10 identifies link-local unicast scope.', [`FE80::1 / ${text(c['ipv6.scope']).toUpperCase()}`]);
    const a = parseIPv6Address(text(c['ipv6.hostA'], '')); const b = parseIPv6Address(text(c['ipv6.hostB'], ''));
    return result(Boolean(a && b && a.expanded !== b.expanded && Number(c['ipv6.prefix']) === 64 && a.hextets.slice(0, 4).join(':') === b.hextets.slice(0, 4).join(':')), 'Both unique interfaces must share the supplied /64 prefix.', [`PC1 ${a?.compressed ?? 'INVALID'}/64`, `PC2 ${b?.compressed ?? 'INVALID'}/64`]);
  }
  if (labId === 'ipv6-neighbor-desk') {
    const savedNeighbors = (session.protocolState?.ipv6Neighbors as IPv6Neighbor[] | undefined) ?? [];
    const neighbor = resolveIPv6Neighbor(savedNeighbors, text(c['nd.target'], ''), text(c['nd.ownerMac'], '') || undefined);
    const path = traceIPv6Path('2001:db8:20::20', [{ prefix: text(c['nd.routePrefix'], '::'), prefixLength: Number(c['nd.routeLength'] ?? 0), nextHop: text(c['nd.nextHop'], ''), exitInterface: 'G0/1' }]);
    if (stageId === 'ns') return result(neighbor.action === 'neighbor-advertisement' || neighbor.action === 'cache-hit', neighbor.reason, [`NEIGHBOR ${neighbor.action.toUpperCase()}`, neighbor.mac ? `MAC ${neighbor.mac}` : 'NO CACHE ENTRY'], undefined, { ...session.protocolState, ipv6Neighbors: neighbor.cache });
    if (stageId === 'ra') return result(c['nd.ra'] === true && c['nd.router'] === 'fe80::1', 'Router information must name the local link-local next hop.', [`ROUTER ${text(c['nd.router'])}`, `ADVERTISEMENT ${c['nd.ra'] === true ? 'RECEIVED' : 'MISSING'}`]);
    if (stageId === 'route') return result(path.reachable && c['nd.nextHop'] === 'fe80::2', path.reason, [path.reason]);
    return result(c['nd.forwardRoute'] === true && c['nd.returnRoute'] === true && path.reachable, 'Both the forward and return IPv6 routes must exist.', [`FORWARD ${c['nd.forwardRoute'] === true ? 'READY' : 'MISSING'}`, `RETURN ${c['nd.returnRoute'] === true ? 'READY' : 'MISSING'}`]);
  }
  if (labId === 'spanning-tree-desk') {
    const tree = stpEvaluation(c); const rows = [`ROOT ${tree.rootId ?? 'NONE'}`, ...tree.roles.map((role) => `${role.switchId} ${role.linkId} / ${role.role.toUpperCase()} / ${role.forwarding ? 'FORWARDING' : 'DISCARDING'}`)];
    if (stageId === 'root') return result(c['stp.priorityA'] !== undefined && c['stp.priorityB'] !== undefined && c['stp.priorityC'] !== undefined && tree.rootId === 'SW2', 'The lowest bridge ID becomes root.', rows);
    if (stageId === 'ports') {
      const costsConfigured = ['stp.costAB', 'stp.costBC', 'stp.costAC'].every((key) => c[key] !== undefined);
      return result(costsConfigured && tree.roles.length === 6 && tree.roles.some((role) => role.role === 'alternate'), 'Every non-root switch selects its lowest-cost root path from the configured link costs.', rows);
    }
    if (stageId === 'block') return result(c['stp.redundantRole'] === 'alternate' && tree.roles.some((role) => role.role === 'alternate' && !role.forwarding), 'One inferior redundant port must discard ordinary frames.', rows);
    return result(c['stp.failedLink'] === 'AB' && tree.roles.every((role) => role.linkId !== 'AB'), 'The tree must be recalculated without the failed link.', rows);
  }
  if (labId === 'etherchannel-desk') {
    const bundle = lacpEvaluation(c); const rows = [`PORT-CHANNEL ${bundle.formed ? 'FORMED' : 'DOWN'}`, `ACTIVE ${bundle.activeMemberIds.join(', ') || 'NONE'}`, `SUSPENDED ${bundle.suspendedMemberIds.join(', ') || 'NONE'}`, bundle.reason];
    if (stageId === 'mode') return result(c['lacp.modeA'] === 'active' || c['lacp.modeB'] === 'active', bundle.reason, rows);
    if (stageId === 'members') return result(Number(c['lacp.speedA']) === Number(c['lacp.speedB']) && c['lacp.switchportMode'] === 'trunk', bundle.reason, rows);
    if (stageId === 'bundle') return result(bundle.formed && c['lacp.channel'] === 'Port-channel1', bundle.reason, rows);
    return result(bundle.formed && text(c['lacp.vlans']).split(',').map(Number).includes(10) && text(c['lacp.vlans']).split(',').map(Number).includes(20), 'The formed logical trunk must carry both required VLANs.', rows);
  }
  if (labId === 'route-source-desk') {
    const routes = routeCandidates(c); const selection = selectRouteSource(text(c['route.destination'], '0.0.0.0'), routes); const rows = [...selection.candidates.map((route) => `MATCH ${route.source.toUpperCase()} ${route.prefix}/${route.prefixLength} AD ${route.administrativeDistance} METRIC ${route.metric}`), selection.selected ? `INSTALLED ${selection.selected.source.toUpperCase()} ${selection.selected.prefix}/${selection.selected.prefixLength}` : 'NO ROUTE INSTALLED'];
    if (stageId === 'sources') return result(routes.some((route) => route.source === 'connected') && routes.some((route) => route.source === 'static') && routes.some((route) => route.source === 'ospf'), 'Load each supplied source before comparing candidates.', rows);
    if (stageId === 'prefix') return result(selection.selected?.prefixLength === 24, selection.reason, rows);
    if (stageId === 'ad') return result(selection.selected?.source === 'static' && selection.selected.administrativeDistance < Number(c['route.ospfAd']), selection.reason, rows);
    return result(c['route.staticAvailable'] === false && selection.selected?.source === 'ospf', selection.reason, rows);
  }
  if (labId === 'ospf-area-desk') {
    const { topology, routes } = ospfEvaluation(c); const rows = [...topology.errors, ...topology.adjacencies.map((link) => `NEIGHBOR ${link.a} <-> ${link.b} / AREA ${link.area}`), ...routes.map((route) => `ROUTE ${route.prefix} COST ${route.cost} VIA ${route.nextHopRouterId}`)];
    if (stageId === 'identity') {
      const routerIds = [c['ospf.r1'], c['ospf.r2'], c['ospf.r3']];
      return result(topology.errors.length === 0 && new Set(routerIds).size === 3 && routerIds.every((value) => value !== undefined), topology.errors[0] ?? 'Router IDs are unique.', rows);
    }
    if (stageId === 'neighbor') return result(topology.adjacencies.length === 2, 'Both links must be active and compatible in area 0.', rows);
    if (stageId === 'spf') return result(routes.some((route) => route.prefix === '192.168.30.0/24' && route.cost === 20), 'SPF must install the advertised R3 LAN through the two-link path.', rows);
    return result(c['ospf.failedLink'] === 'r2-r3-down' && c['ospf.response'] === 'recalculate' && !routes.some((route) => route.prefix === '192.168.30.0/24'), 'The failed adjacency must be removed before SPF is recalculated.', rows);
  }
  if (labId === 'network-operations-capstone') return capstoneObjective(stageId, c);
  return result(false, 'No specialized simulation adapter is registered for this lab.', ['SIMULATOR ADAPTER MISSING']);
}

function capstoneReadiness(c: Configuration) {
  const spanningTree = calculateSpanningTree([
    { id: 'SW1', priority: 32768, mac: '00:00:00:00:00:0A' },
    { id: 'SW2', priority: c['cap.stp'] === 'SW2' ? 24576 : 32768, mac: '00:00:00:00:00:0B' },
    { id: 'SW3', priority: 32768, mac: '00:00:00:00:00:0C' },
  ], [{ id: 'AB', a: 'SW1', b: 'SW2', cost: 4, up: true }, { id: 'BC', a: 'SW2', b: 'SW3', cost: 4, up: true }, { id: 'AC', a: 'SW1', b: 'SW3', cost: 8, up: true }]);
  const vlans = text(c['cap.vlans'], '').split(',').filter(Boolean).map(Number);
  const lacpModes = c['cap.lacp'] === 'active-passive' ? ['active', 'passive'] as const : ['passive', 'passive'] as const;
  const channel = negotiateEtherChannel([
    { id: 'A1', side: 'a', mode: lacpModes[0], up: true, speed: 1000, switchportMode: 'trunk', allowedVlans: vlans },
    { id: 'B1', side: 'b', mode: lacpModes[1], up: true, speed: 1000, switchportMode: 'trunk', allowedVlans: vlans },
  ]);
  const stpReady = spanningTree.rootId === 'SW2' && spanningTree.roles.some((role) => role.role === 'alternate');
  const lacpReady = channel.formed && vlans.includes(10) && vlans.includes(20);

  const lease = allocateDhcpLease({ pool: { network: '192.168.10.0', prefix: 24, start: '192.168.10.100', end: '192.168.10.110', excluded: ['192.168.10.100'], gateway: '192.168.10.1' }, leases: [] }, 'OFFICE-PC');
  const dns = resolveDnsQuery({ records: [{ name: 'server.netbite.test', type: 'A', value: text(c['cap.dns'], ''), ttl: 60, authoritativeServer: 'DNS1' }], cache: [], resolverReachable: true }, 'server.netbite.test', 'A');
  const servicesReady = lease.state.leases[0]?.address === c['cap.dhcp'] && dns.state.cache[0]?.value === '192.168.20.20';

  const forwardSelection = selectRouteSource('192.168.20.20', [{ prefix: text(c['cap.ospfForward'], '0.0.0.0').replace(/\/\d+$/, ''), prefixLength: Number(text(c['cap.ospfForward'], '').split('/')[1] ?? 0), source: 'ospf', administrativeDistance: 110, metric: 20, nextHop: '10.0.12.2' }]);
  const returnSelection = selectRouteSource('192.168.10.10', [{ prefix: text(c['cap.ospfReturn'], '0.0.0.0').replace(/\/\d+$/, ''), prefixLength: Number(text(c['cap.ospfReturn'], '').split('/')[1] ?? 0), source: 'ospf', administrativeDistance: 110, metric: 20, nextHop: '10.0.12.1' }]);
  const routesReady = forwardSelection.selected?.prefixLength === 24 && returnSelection.selected?.prefixLength === 24;

  const acl = evaluateIpv4Acl({ protocol: 'tcp', source: '192.168.10.101', destination: '192.168.20.20', destinationPort: 443 }, c['cap.acl'] === 'permit-https-deny-other' ? [{ id: 'PERMIT-HTTPS', action: 'permit', protocol: 'tcp', source: '192.168.10.0', sourceWildcard: '0.0.0.255', destination: '192.168.20.20', destinationWildcard: '0.0.0.0', destinationPort: 443 }] : []);
  const translated = translateNatFlow({ insideNetworks: [{ network: '192.168.10.0', prefix: 24 }], globalAddress: text(c['cap.pat'], '0.0.0.0'), nextPort: 40000, entries: [], insideUp: true, outsideUp: true }, { protocol: 'tcp', source: '192.168.10.101', sourcePort: 49152, destination: '198.51.100.20', destinationPort: 443 });
  const edgeReady = acl.action === 'permit' && translated.mutated && translated.state.entries[0]?.globalAddress === '203.0.113.10';
  const ipv6Address = parseIPv6Address(text(c['cap.ipv6Address'], ''));
  const neighbor = resolveIPv6Neighbor([], text(c['cap.ndp'], ''), c['cap.ndp'] === 'fe80::1' ? '02:00:00:00:00:01' : undefined);
  const forwardV6 = traceIPv6Path('2001:db8:20::20', [{ prefix: text(c['cap.ipv6Forward'], '::'), prefixLength: 64, nextHop: 'fe80::2', exitInterface: 'G0/1' }]);
  const returnV6 = traceIPv6Path('2001:db8:10::10', [{ prefix: text(c['cap.ipv6Return'], '::'), prefixLength: 64, nextHop: 'fe80::1', exitInterface: 'G0/0' }]);
  const neighborReady = neighbor.action === 'neighbor-advertisement';
  const ipv6RoutesReady = forwardV6.reachable && returnV6.reachable;
  const parentReady = c['cap.parentUp'] === 'up';
  return { stpReady, lacpReady, servicesReady, routesReady, edgeReady, ipv6Address: Boolean(ipv6Address), neighborReady, ipv6RoutesReady, parentReady };
}

function capstoneObjective(stageId: string, c: Configuration) {
  const ready = capstoneReadiness(c);
  const ipv4Forward = ready.stpReady && ready.lacpReady && ready.servicesReady && ready.routesReady && ready.edgeReady;
  const ipv6Forward = ready.ipv6Address && ready.neighborReady && ready.ipv6RoutesReady && ready.parentReady;
  const validation = validateOperationsCapstone({
    ipv4: { vlans: ready.lacpReady, etherChannel: ready.lacpReady, spanningTree: ready.stpReady, dhcp: ready.servicesReady, dns: ready.servicesReady, ospf: ready.routesReady, pat: ready.edgeReady, acl: ready.edgeReady, forward: ipv4Forward, returnPath: ipv4Forward },
    ipv6: { addressing: ready.ipv6Address, routerDiscovery: ready.neighborReady, neighborDiscovery: ready.neighborReady, staticRoutes: ready.ipv6RoutesReady, injectedFaultCorrected: ready.parentReady, forward: ipv6Forward, returnPath: ipv6Forward },
  });
  const stageReady: Record<string, boolean> = { 'office-l2': ready.stpReady && ready.lacpReady, 'office-services': ready.servicesReady, 'office-routing': ready.routesReady, 'office-edge': ready.edgeReady, 'office-verify': ipv4Forward, 'branch-local': ready.ipv6Address && ready.neighborReady, 'branch-route': ready.ipv6RoutesReady, 'branch-fault': validation.complete };
  const rows = [`L2 ${ready.stpReady && ready.lacpReady ? 'READY' : 'INCOMPLETE'}`, `SERVICES ${ready.servicesReady ? 'READY' : 'INCOMPLETE'}`, `IPV4 ROUTING ${ready.routesReady ? 'READY' : 'INCOMPLETE'}`, `EDGE POLICY / PAT ${ready.edgeReady ? 'READY' : 'INCOMPLETE'}`, `IPV6 LOCAL ${ready.ipv6Address && ready.neighborReady ? 'READY' : 'INCOMPLETE'}`, `IPV6 ROUTES ${ready.ipv6RoutesReady ? 'READY' : 'INCOMPLETE'}`, `INTEGRATED LAB ${validation.complete ? 'COMPLETE' : 'INCOMPLETE'}`, ...validation.failures];
  return result(Boolean(stageReady[stageId]), stageReady[stageId] ? 'The current combined network state satisfies this phase.' : 'A required dependency in the combined network is still incomplete.', rows);
}

function deviceRecord(labId: string, deviceId: string, label: string, session: OperationsSimulationSession): OperationsDeviceRecord {
  const c = session.configuration;
  const upper = label.toUpperCase();
  let lines: string[] = [];
  if (labId === 'transport-service-desk') {
    if (upper === 'PC1') lines = [`SOURCE 192.168.10.10:${text(c['transport.sourcePort'])}`, `PROTOCOL ${text(c['transport.protocol']).toUpperCase()}`, `STATE ${c['transport.event'] === 'handshake' ? 'ESTABLISHED' : 'CLOSED'}`];
    else if (upper === 'WEB1') lines = [`SERVER 192.168.10.20`, `LISTENER ${text(c['transport.protocol']).toUpperCase()} ${text(c['transport.listeningPort'])}`, `DESTINATION PORT ${text(c['transport.destinationPort'])}`];
    else lines = ['FORWARDS USING IP INFORMATION', 'DOES NOT SELECT APPLICATION PORTS'];
  } else if (labId === 'dhcp-lease-desk') {
    const state = dhcpState(session); const lease = state?.leases.find((item) => item.clientId === label); const availability = state ? inspectDhcpPool(state) : undefined;
    if (upper.includes('DHCP')) lines = [`POOL / ${state ? `${state.pool.network}/${state.pool.prefix}` : 'POOL NOT CONFIGURED'}`, `GATEWAY / ${state?.pool.gateway ?? text(c['dhcp.gateway'])}`, `LEASE STEPS / ${text(c['dhcp.leaseSteps'])}`, `AVAILABLE / ${availability?.available.join(', ') || 'NONE'}`, `BINDINGS / ${state?.leases.length ?? 0}`];
    else if (upper.includes('R1')) lines = [`RELAY ${text(c['dhcp.relay'])}`, `SERVER PATH ${enabled(c['dhcp.serverReachable'])}`];
    else if (/^PC\d+$/.test(upper)) lines = [`CLIENT ${label}`, `LEASE ${lease?.address ?? 'NONE'}`, `STATE ${lease?.state?.toUpperCase() ?? 'INIT'}`];
    else lines = ['VLAN 20', 'CLIENT BROADCAST BOUNDARY'];
  } else if (labId === 'dns-resolution-desk') {
    if (upper === 'PC1') lines = [`RESOLVER ${text(c['dns.resolver'])}`, 'STUB CACHE / LOCAL'];
    else if (upper === 'DNS1') { const cache = (session.protocolState?.dns as DnsState | undefined)?.cache ?? []; lines = [`ROLE RECURSIVE RESOLVER`, `PATH ${enabled(c['dns.reachable'])}`, `CACHE ${cache.length ? cache.map((entry) => `${entry.name} ${entry.type} / TTL ${entry.remaining}`).join(' | ') : 'EMPTY'}`]; }
    else if (upper === 'DNS3') lines = [`ROLE AUTHORITATIVE SERVER`, 'ZONE netbite.test', `A ${text(c['dns.name'])} -> ${text(c['dns.value'])}`];
    else if (upper === 'DNS2') lines = ['ROLE ROOT / TLD REFERRAL', 'POINTS DNS1 TOWARD DNS3', 'NO HOST RECORD STORED HERE'];
    else lines = ['REFERRAL SOURCE', 'NO HOST RECORD CONFIGURED HERE'];
  } else if (labId === 'acl-policy-desk') {
    const acl = aclEvaluation(c);
    if (upper.includes('R1')) lines = [`ACL NETBITE-IN / ${text(c['acl.interface'])} ${text(c['acl.direction']).toUpperCase()}`, `MATCH ${acl.matchedRuleId}`, `ACTION ${acl.action.toUpperCase()}`];
    else if (/^PC\d+$/.test(upper)) lines = [`SOURCE ${text(c['acl.source'])}`, `${text(c['acl.protocol']).toUpperCase()} -> ${text(c['acl.destination'])}:${text(c['acl.port'])}`];
    else lines = ['LISTENER TCP/443', `POLICY RESULT ${acl.action.toUpperCase()}`];
  } else if (labId === 'nat-translation-desk') {
    const translations = (session.protocolState?.nat as NatState | undefined)?.entries ?? [];
    if (upper.includes('R1')) lines = [`INSIDE ${enabled(c['nat.insideUp'])}`, `OUTSIDE ${enabled(c['nat.outsideUp'])}`, `GLOBAL ${text(c['nat.global'])}`, `TRANSLATIONS ${translations.length}`, ...translations.map((entry) => `${entry.insideAddress}:${entry.insidePort} -> ${entry.globalAddress}:${entry.globalPort}`)];
    else if (/^PC\d+$/.test(upper)) lines = ['INSIDE LOCAL 192.168.10.10:49152', `ELIGIBLE NETWORK ${text(c['nat.network'])}/${text(c['nat.prefix'])}`];
    else lines = ['OUTSIDE SERVICE 198.51.100.20:443', `REPLY TARGET ${text(c['nat.global'])}:40000`];
  } else if (labId === 'ipv6-address-desk') {
    const address = upper.includes('PC1') ? c['ipv6.hostA'] ?? c['ipv6.address'] : c['ipv6.hostB']; const parsed = parseIPv6Address(text(address, ''));
    lines = upper === 'SW1' ? ['LOCAL ETHERNET LINK', 'NO IPV6 ADDRESS REQUIRED'] : [`ADDRESS ${parsed?.compressed ?? text(address)}`, `PREFIX /${text(c['ipv6.prefix'])}`, `EXPANDED ${parsed?.expanded ?? 'NOT AVAILABLE'}`];
  } else if (labId === 'ipv6-neighbor-desk') {
    const path = traceIPv6Path('2001:db8:20::20', [{ prefix: text(c['nd.routePrefix'], '::'), prefixLength: Number(c['nd.routeLength'] ?? 0), nextHop: text(c['nd.nextHop'], ''), exitInterface: 'G0/1' }]);
    if (upper.includes('PC1')) { const neighbors = (session.protocolState?.ipv6Neighbors as IPv6Neighbor[] | undefined) ?? []; lines = [`DEFAULT ROUTER ${text(c['nd.router'])}`, `NEIGHBOR CACHE ${neighbors.length ? neighbors.map((entry) => `${entry.address} -> ${entry.mac}`).join(' | ') : 'EMPTY'}`]; }
    else if (upper.includes('R1')) lines = [`RA ${c['nd.ra'] === true ? 'SENT' : 'NOT SENT'}`, `ROUTE ${text(c['nd.routePrefix'])}/${text(c['nd.routeLength'])}`];
    else lines = [path.reason, `RETURN ${c['nd.returnRoute'] === true ? 'READY' : 'MISSING'}`];
  } else if (labId === 'spanning-tree-desk') {
    const tree = stpEvaluation(c); lines = [`ROOT ${tree.rootId ?? 'UNKNOWN'}`, `PRIORITY ${text(c[`stp.priority${upper.at(-1)}`])}`, ...tree.roles.filter((role) => role.switchId === upper).map((role) => `${role.linkId} ${role.role.toUpperCase()} / ${role.forwarding ? 'FORWARDING' : 'DISCARDING'}`)];
  } else if (labId === 'etherchannel-desk') {
    const bundle = lacpEvaluation(c); lines = [`MODE ${upper.includes('SW1') ? text(c['lacp.modeA']) : text(c['lacp.modeB'])}`, `PORT-CHANNEL ${bundle.formed ? 'UP' : 'DOWN'}`, `MEMBERS ${bundle.activeMemberIds.join(', ') || 'NONE'}`, `VLANS ${text(c['lacp.vlans'])}`];
  } else if (labId === 'route-source-desk') {
    const selected = selectRouteSource(text(c['route.destination'], '0.0.0.0'), routeCandidates(c)); lines = upper.includes('R1') ? [...selected.candidates.map((route) => `${route.source.toUpperCase()} ${route.prefix}/${route.prefixLength} AD ${route.administrativeDistance}`), `INSTALLED ${selected.selected ? `${selected.selected.source.toUpperCase()} ${selected.selected.prefix}/${selected.selected.prefixLength}` : 'NONE'}`] : [`DESTINATION ${text(c['route.destination'])}`, selected.reason];
  } else if (labId === 'ospf-area-desk') {
    const ospf = ospfEvaluation(c); const routerKey = upper.replace('-', '').toLowerCase(); lines = [`ROUTER ID ${text(c[`ospf.${routerKey}`])}`, ...ospf.topology.adjacencies.filter((link) => link.a === label || link.b === label).map((link) => `NEIGHBOR ${link.a === label ? link.b : link.a} / AREA ${link.area}`), ...ospf.routes.filter((route) => upper === 'R1').map((route) => `${route.prefix} COST ${route.cost} VIA ${route.nextHopRouterId}`)];
  } else if (labId === 'network-operations-capstone') {
    const ready = capstoneReadiness(c);
    if (upper === 'PC1') lines = [`LEASE ${text(c['cap.dhcp'])}`, `DNS RESULT ${text(c['cap.dns'])}`, `IPV4 TEST ${ready.servicesReady && ready.routesReady && ready.edgeReady ? 'READY' : 'BLOCKED'}`];
    else if (upper === 'SW1' || upper === 'SW2') lines = [`VLANS ${text(c['cap.vlans'])}`, `LACP ${ready.lacpReady ? 'FORMED' : 'INCOMPLETE'}`, `SPANNING TREE ROOT ${text(c['cap.stp'])}`];
    else if (upper === 'R1') lines = [`OSPF FORWARD ${text(c['cap.ospfForward'])}`, `OSPF RETURN ${text(c['cap.ospfReturn'])}`, `ACL ${text(c['cap.acl'])}`, `PAT ${text(c['cap.pat'])}`];
    else if (upper === 'DHCP1') lines = [`FIRST LEASE ${text(c['cap.dhcp'])}`, `SERVICE ${ready.servicesReady ? 'READY' : 'INCOMPLETE'}`];
    else if (upper === 'DNS1') lines = ['A RECORD server.netbite.test', `VALUE ${text(c['cap.dns'])}`];
    else if (upper === 'WEB1') lines = ['LISTENER TCP 443', `REQUIRED FLOW ${ready.edgeReady && ready.routesReady ? 'PERMITTED' : 'BLOCKED'}`];
    else if (upper === 'R2') lines = [`FORWARD PREFIX ${text(c['cap.ipv6Forward'])}/64`, `RETURN PREFIX ${text(c['cap.ipv6Return'])}/64`, `PARENT ${ready.parentReady ? 'UP' : 'DOWN'}`];
    else lines = [`ADDRESS ${text(c['cap.ipv6Address'])}/64`, `ROUTER ${text(c['cap.ndp'])}`, `IPV6 TEST ${ready.ipv6Address && ready.neighborReady && ready.ipv6RoutesReady && ready.parentReady ? 'READY' : 'BLOCKED'}`];
  }
  if (!lines.length) lines = ['NO MODELED STATE FOR THIS DEVICE'];
  return { id: `${labId}:${deviceId}`, title: label, lines, status: lines.some((line) => /NOT |NONE|MISSING|INCOMPLETE|DOWN|FAILED/.test(line)) ? 'attention' : 'ready' };
}

const traceLabels: Record<string, Record<string, string[]>> = {
  'dhcp-lease-desk': { pool: ['DHCP1'], dora: ['PC1', 'SW1', 'R1', 'DHCP1'], renew: ['PC1', 'SW1', 'R1', 'DHCP1'], exhaust: ['PC1', 'PC2', 'SW1', 'R1', 'DHCP1'], release: ['PC2', 'SW1', 'R1', 'DHCP1'], relay: ['PC1', 'SW1', 'R1', 'DHCP1'] },
  'dns-resolution-desk': { stub: ['PC1', 'DNS1'], hierarchy: ['PC1', 'DNS1', 'DNS2', 'DNS3'], cache: ['PC1', 'DNS1'], expiry: ['DNS1', 'DNS3'] },
  'acl-policy-desk': { tuple: ['PC1'], wildcard: ['R1'], match: ['PC1', 'R1', 'WEB1'], direction: ['PC1', 'R1', 'WEB1'] },
  'nat-translation-desk': { roles: ['R1'], selection: ['PC1', 'R1'], pat: ['PC1', 'R1', 'WEB1'], return: ['WEB1', 'R1', 'PC1'] },
  'ipv6-address-desk': { parse: ['PC1'], compress: ['PC1'], scope: ['PC1'], prefix: ['PC1', 'SW1', 'PC2'] },
  'ipv6-neighbor-desk': { ns: ['PC1', 'R1'], ra: ['R1', 'PC1'], route: ['R1', 'R2'], return: ['PC1', 'R1', 'R2', 'PC2'] },
  'spanning-tree-desk': { root: ['SW1', 'SW2', 'SW3'], ports: ['SW1', 'SW2', 'SW3'], block: ['SW1', 'SW2', 'SW3'], change: ['SW1', 'SW2', 'SW3'] },
  'etherchannel-desk': { mode: ['SW1', 'SW2'], members: ['SW1', 'SW2'], bundle: ['SW1', 'SW2'], reach: ['SW1', 'SW2'] },
  'route-source-desk': { sources: ['R1'], prefix: ['PC1', 'R1'], ad: ['R1'], withdraw: ['PC1', 'R1', 'PC2'] },
  'ospf-area-desk': { identity: ['R1', 'R2', 'R3'], neighbor: ['R1', 'R2', 'R3'], spf: ['R1', 'R2', 'R3'], failure: ['R1', 'R2', 'R3'] },
  'network-operations-capstone': { 'office-l2': ['PC1', 'SW1', 'SW2'], 'office-services': ['PC1', 'SW1', 'SW2', 'R1', 'DHCP1', 'DNS1'], 'office-routing': ['PC1', 'SW1', 'SW2', 'R1', 'WEB1'], 'office-edge': ['PC1', 'SW1', 'SW2', 'R1', 'WEB1'], 'office-verify': ['PC1', 'SW1', 'SW2', 'R1', 'DNS1', 'WEB1'], 'branch-local': ['PC2', 'R2'], 'branch-route': ['PC2', 'R2', 'R1'], 'branch-fault': ['PC2', 'R2', 'R1'] },
};

function visualTrace(labId: string, stageId: string, session: OperationsSimulationSession, nodes: readonly { id: string; label: string }[], links: readonly { id: string; a: string; b: string }[]): OperationsVisualTrace | undefined {
  const currentEvidence = session.evidence[session.traceIndex];
  if (!currentEvidence) return undefined;
  const labels = traceLabels[labId]?.[stageId] ?? [];
  const activeDeviceIds = nodes.filter((node) => labels.includes(node.label)).map((node) => node.id);
  const activeSet = new Set(activeDeviceIds);
  const activeLinkIds = links.filter((link) => activeSet.has(link.a) && activeSet.has(link.b)).map((link) => link.id);
  const failed = currentEvidence.tone === 'warning';
  return {
    activeDeviceIds,
    activeLinkIds,
    failedDeviceId: failed ? activeDeviceIds.at(-1) : undefined,
    failedLinkId: failed ? activeLinkIds.at(-1) : undefined,
    text: currentEvidence.text,
  };
}

function createAdapter(id: string): OperationsSimulationAdapter {
  return {
    id,
    createInitialState: () => ({}),
    validateAction: (_state, action) => ({ accepted: Boolean(action && typeof action === 'object'), message: action && typeof action === 'object' ? undefined : 'The action must contain modeled configuration.' }),
    applyAction: (state, action) => ({ accepted: true, state: { ...state, ...action } }),
    inspectDevice: (deviceId, label, session) => deviceRecord(id, deviceId, label, session),
    deriveTables: (session) => evaluate(id, session.completedObjectiveIds.at(-1) ?? '', session).tables,
    deriveTrace: (stageId, session, nodes, links) => visualTrace(id, stageId, session, nodes, links),
    evaluateObjective: (stageId, session) => evaluate(id, stageId, session),
    evaluateObjectives: (session, stageIds) => stageIds.map((stageId) => evaluate(id, stageId, session)),
  };
}

const ids = ['transport-service-desk', 'dhcp-lease-desk', 'dns-resolution-desk', 'acl-policy-desk', 'nat-translation-desk', 'ipv6-address-desk', 'ipv6-neighbor-desk', 'spanning-tree-desk', 'etherchannel-desk', 'route-source-desk', 'ospf-area-desk', 'network-operations-capstone'];

export const operationsSimulationAdapters: Record<string, OperationsSimulationAdapter> = Object.fromEntries(ids.map((id) => [id, createAdapter(id)]));

export function getOperationsDeviceRecord(labId: string, deviceId: string, label: string, session: OperationsSimulationSession) {
  return operationsSimulationAdapters[labId]?.inspectDevice(deviceId, label, session) ?? { id: `${labId}:${deviceId}`, title: label, lines: ['SIMULATOR ADAPTER UNAVAILABLE'], status: 'attention' as const };
}

export function deriveOperationsVisualTrace(labId: string, stageId: string, session: OperationsSimulationSession, nodes: readonly { id: string; label: string }[], links: readonly { id: string; a: string; b: string }[]) {
  return operationsSimulationAdapters[labId]?.deriveTrace(stageId, session, nodes, links);
}

export function evaluateOperationsAdapterObjective(labId: string, stageId: string, session: OperationsSimulationSession) {
  return operationsSimulationAdapters[labId]?.evaluateObjective(stageId, session) ?? result(false, 'Simulator adapter unavailable.', ['NO ADAPTER']);
}
